# Resumly — Resume Builder

A full-stack resume builder: users sign up, build a resume through a guided
multi-step form, preview it live, download/share it as a PDF, keep full
version history, and admins get a separate dashboard to manage users and
resumes.

**Stack**
- **Frontend:** React (Vite), React Router, plain `fetch`-based API client — no Redux/React Query, state is local component state + one Auth context.
- **Backend:** FastAPI (Python), SQLAlchemy ORM, Pydantic for validation, JWT for auth, SQLite/Postgres (whatever `DATABASE_URL` points to) as the database.
- **Communication:** REST over HTTP. Frontend runs on `http://localhost:5173` (Vite dev server), backend on `http://localhost:8000`. They are two separate processes — the frontend never touches the database directly, everything goes through the API.

---

## 1. How the two halves are connected

There is **one single file** that owns the entire connection:
`frontend/src/api/client.js`

Every page (`Login.jsx`, `Dashboard.jsx`, `ResumeForm.jsx`, `Profile.jsx`, ...)
does:
```js
import * as api from "../api/client";
...
await api.createResume(payload);
```

No component ever calls `fetch()` directly — they all go through this one
layer. That's intentional: if the backend URL, auth header format, or error
handling ever changes, it only changes in one place.

### What `client.js` actually does

```js
const BASE_URL = "http://localhost:8000";
```
Hardcoded backend address. In a real deployment this would come from an
environment variable (e.g. `import.meta.env.VITE_API_URL`), but for local
dev it's fixed.

```js
function getToken() { return localStorage.getItem("token"); }
export function setToken(token) { ... }
```
The JWT (JSON Web Token) issued at login is stored in the browser's
`localStorage` under the key `"token"`. This is what makes the user "stay
logged in" across page refreshes — the token itself, not a server session.

```js
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  ...
}
```
This is the core wrapper around `fetch`. Every JSON API call (login, resume
CRUD, profile update, etc.) goes through this function. It:
1. Attaches `Authorization: Bearer <token>` automatically if `auth: true` (default).
2. JSON-encodes the request body.
3. Parses the JSON response.
4. Throws a JS `Error` with the backend's message if the response isn't OK (`res.ok === false`), so every page can just wrap calls in `try/catch`.

```js
async function uploadFile(path, file) { ... }
```
Same idea but for file uploads — uses `FormData` instead of JSON (used only
by resume-upload parsing, see §5).

At the bottom, every actual endpoint is just a one-line wrapper, e.g.:
```js
export const login = (payload) => request("/auth/login", { method: "POST", body: payload, auth: false });
export const listResumes = () => request("/resumes/");
export const createResume = (payload) => request("/resumes/", { method: "POST", body: payload });
export const updateResume = (id, payload) => request(`/resumes/${id}`, { method: "PUT", body: payload });
```

There's a second, separate mini-client at the bottom of the same file
(`adminRequest`, `adminLogin`, `adminGetStats`, ...) — this is for the admin
panel, which uses a **different token** (`admin_token` in `localStorage`,
not `token`) so a logged-in admin and a logged-in normal user don't collide.

---

## 2. Authentication flow (JWT)

**Backend:** `backend/app/auth.py`
- `hash_password()` / `verify_password()` — passwords are hashed with
  `bcrypt` before ever touching the database. The plain password is never
  stored.
- `create_access_token(data)` — builds a JWT signed with a secret key
  (from `.env`), containing the user's id/email and an expiry.
- `get_current_user()` — a FastAPI **dependency**. Any route that needs
  "who is logged in" just adds `user: models.User = Depends(auth.get_current_user)`
  as a parameter. This function reads the `Authorization: Bearer <token>`
  header, decodes/validates the JWT, looks the user up in the DB, and
  either returns the `User` row or raises `401 Unauthorized`.

**Backend routes:** `backend/app/routers/auth.py`
- `POST /auth/signup` — creates a `User` row (`schemas.UserSignup` → validate email format + hash password).
- `POST /auth/login` — verifies email+password, returns `{access_token, token_type}`.
- `GET /auth/me` — returns the current user's profile (used to "restore" a session on page load).
- `PUT /auth/me` — update name/profile picture.
- `PUT /auth/me/password` — change password.
- `POST /auth/logout` — mostly symbolic (JWTs are stateless, there's nothing to invalidate server-side unless a blocklist is added) — frontend just deletes the token.

**Frontend:** `frontend/src/AuthContext.jsx`
This is a React Context that wraps the whole app (`main.jsx` → `App.jsx` →
`<AuthProvider>`). It exposes `{ user, loading, login, signup, logout }` via
the `useAuth()` hook to any component.

- On first mount, it checks `localStorage` for a token. If found, it calls
  `api.getMe()` to verify the token is still valid and fetch fresh user
  data, setting `user`. `loading` stays `true` until this check finishes —
  this flag is what `App.jsx` uses to avoid flashing the Landing page
  before we know if someone's logged in (see the fix in §7).
- `login(email, password)` calls the API, stores the token, then fetches
  `getMe()` and sets `user`.
- `logout()` clears the token and `user`.

**Routing gate:** `frontend/src/App.jsx`
```jsx
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Boxed><p>Loading...</p></Boxed>;
  return user ? <Boxed>{children}</Boxed> : <Navigate to="/login" replace />;
}
```
Every protected page (`/dashboard`, `/resumes/*`, `/profile`) is wrapped in
`<PrivateRoute>`, which redirects to `/login` if there's no valid session.

---

## 3. Resume CRUD — the main feature

**Frontend page:** `frontend/src/pages/ResumeForm.jsx` (create + edit, same component)

- On mount, if editing (`isEdit`, from the `:id` URL param), it calls
  `api.getResume(id)` and fills the form with the existing data.
- The form is a multi-step "wizard" (Personal → Skills → Experience →
  Education → Projects), driven by `activeTab` state — **all steps are
  actually in the DOM at once**, just conditionally rendered, so the
  `<form>` wraps every tab.
- Every field change calls `update(field, value)`, which does an immutable
  update of the local `data` object — this is also what feeds the
  **live preview** on the right (`<ResumePDFTemplate resume={{ title, data, template_key }} />`, the exact same component used for the real PDF).
- On submit (`handleSubmit`): validates required fields (name/email/phone,
  valid email format, at least one experience entry unless "fresh
  graduate" is checked), then calls `api.createResume(payload)` or
  `api.updateResume(id, payload)`.

**Backend routes:** `backend/app/routers/resumes.py`
- `POST /resumes/` — `create_resume()`: builds a `models.Resume` row from
  the validated `schemas.ResumeCreate` payload, saves it, **and also**
  inserts a `models.ResumeVersion` snapshot (the first entry in that
  resume's history).
- `PUT /resumes/{id}` — `update_resume()`: same idea, but also checks
  ownership first (`_get_owned_resume`, compares `resume.owner_id ==
  user.id`, else `403`). Every update creates **another** version
  snapshot — this is what powers the "History → Restore" feature.
- `GET /resumes/`, `GET /resumes/{id}`, `DELETE /resumes/{id}` — standard list/read/delete, all ownership-checked.
- `GET /resumes/{id}/history` — lists all `ResumeVersion` rows for that resume.
- `POST /resumes/{id}/restore/{version_id}` — copies an old version's data back onto the live resume (and snapshots *that* as a new version too, so restoring is itself undoable).

**Data model — why it's flexible:**
`models.Resume.data` is a SQLAlchemy `JSON` column — the entire resume
(name, skills, experience, education, projects, photo, ...) is stored as
one JSON blob, not spread across many relational columns. This is why
adding a new resume field (like the `photo` fix below) mostly just means
updating the Pydantic schema, not writing a database migration.

**Validation layer — `backend/app/schemas.py`:**
```python
class ResumeData(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    phone_country_code: str = ""
    address: str = ""
    photo: str = ""
    summary: str = ""
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
```
Pydantic strips out any field the frontend sends that **isn't** declared
here — this is exactly what was silently eating the profile photo before
the fix (see §7).

---

## 4. PDF rendering, download, and email share

- `frontend/src/pages/ResumePDFTemplate.jsx` — a pure presentational React
  component that takes `{ title, data, template_key }` and renders one of
  three visual layouts (`modern` / `classic` / `minimal`). It's reused in
  **four** places: the live preview while editing, the template-picker
  thumbnails, the Dashboard's "Quick Templates" cards, and the final
  Web View / PDF Preview.
- **PDF generation is client-side** — the "Download PDF" button renders
  this same component and turns it into a PDF/image in the browser (no
  backend PDF service involved).
- **Sharing by email** (`ShareModal.jsx` → `api.shareResume(id, {email,
  pdf_base64, message})` → `POST /resumes/{id}/share` in
  `resumes.py`) sends the already-generated PDF (as base64) from the
  browser to the backend, which emails it via `backend/app/email_utils.py`
  (SMTP), and logs a `ShareEvent` row (`backend/app/models_extra.py`) for
  history/auditing.

---

## 5. Uploading an existing resume (auto-parse)

Entry point: the **"Upload Resume"** button on the Dashboard
(`Dashboard.jsx`), not the Landing page.

1. User picks a `.pdf` / `.docx` / `.txt` file → `handleFileUpload()` →
   `api.parseUploadedResume(file)` → `uploadFile()` in `client.js` (sends
   `multipart/form-data`).
2. Backend: `POST /resumes/parse` in `resumes.py` → `resume_parser.py`:
   - `extract_text(filename, content)` — pulls raw text out of the PDF/DOCX/TXT.
   - `parse_resume_text(text)` — **heuristic** parsing: regex + keyword-section matching (looks for "Experience", "Education", email patterns, etc.), not an AI model. It's a best-effort draft, not guaranteed-accurate.
3. The guessed `{title, data}` is returned to the frontend, which
   navigates to `/resumes/new` passing this data via React Router's
   `location.state`, so `ResumeForm` opens pre-filled and skips the
   template picker — the user is expected to review/clean it up before
   saving.

---

## 6. Admin panel

Completely separate auth track from normal users:
- Backend: `backend/app/routers/admin.py`. Credentials come from the
  `.env` file (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), **not** a `users` table
  row — there's no "admin flag" on the User model.
- `AdminProfile` (in `models.py`) is a single-row table just for the
  admin's display name/photo in the UI — login itself never touches it.
- Frontend keeps a second token in `localStorage["admin_token"]`, guarded
  by `AdminRoute` in `App.jsx`, and uses the separate `adminRequest()`
  helper in `client.js` so it never collides with a normal user session in
  the same browser.

---

## 7. Bugs found and fixed in this pass

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | After filling **Education**, the form auto-submits and you can never reach **Projects** | The whole wizard lived inside one native `<form>`. Pressing **Enter** in a text input — or, worse, confirming a date on the native `type="month"` calendar picker (Start/End date fields in Experience/Education) — triggers the browser's *implicit form submission*, even though the visible "Next" button is `type="button"`. A `preventDefault()` on `onKeyDown` catches plain Enter-in-text-input, but **not** the native date-picker's own Enter-to-confirm, since that happens inside browser chrome, outside React's event flow. | Removed the `<form>` element entirely and replaced it with a `<div>` — there's now nothing for the browser to implicitly submit, no matter what triggers Enter. "Save Resume" is a plain `type="button"` that calls `handleSubmit()` directly on click. `frontend/src/pages/ResumeForm.jsx` |
| 2 | No auto-save existed | Only a manual "Save Resume" button on the last step. | Added a debounced (1.5s) auto-save effect that runs only in **edit mode**, only once name+valid email are present, with a small "Saving… / Saved at hh:mm" indicator in the page header. `frontend/src/pages/ResumeForm.jsx` |
| 3 | Uploaded profile photo never shows up on the saved resume | `schemas.ResumeData` (backend) never declared a `photo` field (or `phone_country_code`). Pydantic **silently drops unknown fields**, so the base64 photo the frontend sends is thrown away before it ever reaches the database. | Added `photo: str = ""` and `phone_country_code: str = ""` to `ResumeData`. `backend/app/schemas.py` |
| 4 | Landing page briefly (or persistently, if `/auth/me` is slow) shows **Sign In / Get Started** even when already logged in | `App.jsx`'s `/` route checked `user` but never checked `loading` from `AuthContext` — so it rendered `<Landing/>` before the "is my token still valid?" check had finished. | `AppRoutes` now returns `null` while `loading` is true, before deciding between Landing and the redirect. `frontend/src/App.jsx` |
| 5 | No browser tab icon | `index.html` had no `<link rel="icon">` at all. | Added `frontend/public/favicon.svg` (matches the in-app document-logo mark) and linked it in `index.html`. |
| 6 | "Upload system nazar nahi aata" | Not actually missing — it's the **"Upload Resume"** button on the **Dashboard** page (top-right, next to "+ New Resume"), not on the Landing page. Documented here for clarity. | No code change — see §5 above for how it works. |
| 7 | PDF upload fails with a generic "Couldn't read that file" and no way to know why | `resumes.py` caught *every* exception from `extract_text()` with a blanket `except Exception`, so any real cause (encrypted PDF, a corrupt export, a broken page, an unsupported PDF structure) was thrown away with no logging. | `resume_parser.py`: added a `PyPDF2` fallback for when `pdfplumber` can't open a file, made page-by-page extraction skip a single broken page instead of aborting the whole document, and detects password-protected PDFs. `routers/resumes.py`: now logs the full traceback server-side (`logger.exception(...)`) so the real cause is visible in the backend console, while the user still sees a clean message. |
| 8 | Upload still failed with `ModuleNotFoundError: No module named 'pdfplumber'` even after fix #7 | Not a code bug — the Python environment simply didn't have `pdfplumber` installed (`pip install -r requirements.txt` hadn't been (re-)run after the dependency was added). | `resume_parser.py` now wraps the `pdfplumber` import itself in a check: if it's missing, extraction goes straight to the `PyPDF2` fallback instead of crashing — upload keeps working even with an incomplete environment. Still run `pip install -r requirements.txt` to get full pdfplumber-quality extraction. |
| 9 | The Education-tab date picker still triggered an early save (fix #1's `onKeyDown` guard didn't catch it) | `type="month"` fields use the browser's own native calendar widget; confirming a date there with Enter happens inside browser chrome, outside React's event flow, so it bypassed the `onKeyDown` guard on the form. | Removed the `<form>` element entirely (now a plain `<div>`), so there is no native form left to implicitly submit — from any input, any picker, any browser. "Save Resume" is a `type="button"` that calls `handleSubmit()` directly. `frontend/src/pages/ResumeForm.jsx` |

---

## 8. Project structure

```
resume-builder/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app entrypoint, mounts routers, CORS
│       ├── database.py        # SQLAlchemy engine/session setup
│       ├── models.py          # User, Resume, ResumeVersion, AdminProfile tables
│       ├── models_extra.py    # ShareEvent table
│       ├── schemas.py         # Pydantic request/response models (validation layer)
│       ├── auth.py            # password hashing, JWT create/verify, get_current_user
│       ├── security_utils.py  # password-strength checker used by /auth/password-strength
│       ├── email_utils.py     # SMTP sending for the "Share via email" feature
│       ├── resume_parser.py   # PDF/DOCX/TXT text extraction + heuristic resume parsing
│       └── routers/
│           ├── auth.py        # /auth/* endpoints
│           ├── resumes.py     # /resumes/* endpoints (CRUD, history, share, parse)
│           └── admin.py       # /admin/* endpoints
│
└── frontend/
    ├── index.html
    ├── public/favicon.svg
    └── src/
        ├── main.jsx            # React root render
        ├── App.jsx             # Router + route guards (PrivateRoute/AdminRoute)
        ├── AuthContext.jsx     # global auth state (user/loading/login/signup/logout)
        ├── api/client.js       # the ONE place all HTTP calls live
        ├── utils/              # validation.js (email regex), countryCodes.js
        ├── icons.jsx           # inline SVG icon components
        └── pages/
            ├── Landing.jsx           # public marketing page ("/")
            ├── Login.jsx / Signup.jsx
            ├── Dashboard.jsx         # resume list + Upload Resume + Quick Templates
            ├── ResumeForm.jsx        # create/edit wizard + template picker + live preview
            ├── ResumePDFTemplate.jsx # the actual visual resume layout (3 styles)
            ├── ResumeView.jsx        # Web View / PDF Preview / Download / Share
            ├── ResumeHistory.jsx     # version list + restore
            ├── Profile.jsx           # name/photo/password settings
            ├── Navbar.jsx / AuthNav.jsx
            └── Admin*.jsx            # admin login/dashboard/profile
```

---

## 9. Skill proficiency levels (Basic / Intermediate / Expert)

Each skill can now carry a proficiency level, which drives the Modern
template's sidebar progress bars (previously those bars were fake —
a hardcoded pseudo-random width with no real meaning).

- **Data shape:** `data.skills` is a list of `{ name, level }`, where
  `level` is one of `"basic" | "intermediate" | "expert"`.
- **Backward compatibility:** older saved resumes have `skills` as a plain
  list of strings (e.g. `["Python", "SQL"]`). Both the frontend
  (`normalizeSkill()` in `ResumeForm.jsx`, `skillObj()`/`skillName()` in
  `ResumePDFTemplate.jsx`) and the backend (`schemas.py`, `skills: List[Any]`)
  accept either shape — old resumes keep working and just render at a
  default "intermediate" bar width until the user sets a real level.
- **Editing:** on the Skills tab, pick a level from the dropdown before
  adding a skill, or change an existing chip's level any time via the small
  select inside the chip.
- **Rendering:** Classic and Minimal templates just show skill names
  (comma/dot separated, no bars) — level only visually shows up on Modern.

---

## 10. Running it locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY, DATABASE_URL, SMTP + ADMIN_* values
uvicorn app.main:app --reload   # runs on http://localhost:8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev   # runs on http://localhost:5173
```

Make sure the backend is running on port `8000` — that's the hardcoded
`BASE_URL` in `frontend/src/api/client.js`.
