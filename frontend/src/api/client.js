const BASE_URL = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.detail) || "Something went wrong";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

async function uploadFile(path, file) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: formData });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data && data.detail) || "Something went wrong";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

// ---- Auth ----
export const signup = (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false });
export const login = (payload) => request("/auth/login", { method: "POST", body: payload, auth: false });
export const logout = () => request("/auth/logout", { method: "POST" });
export const getMe = () => request("/auth/me");
export const updateProfile = (payload) => request("/auth/me", { method: "PUT", body: payload });
export const updatePassword = (payload) => request("/auth/me/password", { method: "PUT", body: payload });
export const checkPasswordStrength = (password) => request("/auth/password-strength", { method: "POST", body: { password }, auth: false });

// ---- Resumes ----
export const listResumes = () => request("/resumes/");
export const createResume = (payload) => request("/resumes/", { method: "POST", body: payload });
export const parseUploadedResume = (file) => uploadFile("/resumes/parse", file);
export const getResume = (id) => request(`/resumes/${id}`);
export const updateResume = (id, payload) => request(`/resumes/${id}`, { method: "PUT", body: payload });
export const deleteResume = (id) => request(`/resumes/${id}`, { method: "DELETE" });
export const getResumeHistory = (id) => request(`/resumes/${id}/history`);
export const restoreVersion = (id, versionId) => request(`/resumes/${id}/restore/${versionId}`, { method: "POST" });
export const shareResume = (id, payload) => request(`/resumes/${id}/share`, { method: "POST", body: payload });

// ---- Admin ----
export function getAdminToken() {
  return localStorage.getItem("admin_token");
}
export function setAdminToken(token) {
  if (token) localStorage.setItem("admin_token", token);
  else localStorage.removeItem("admin_token");
}
async function adminRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getAdminToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const message = (data && data.detail) || "Something went wrong";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}
export const adminLogin = (payload) => adminRequest("/admin/login", { method: "POST", body: payload });
export const adminGetStats = () => adminRequest("/admin/stats");
export const adminListUsers = () => adminRequest("/admin/users");
export const adminDeleteUser = (id) => adminRequest(`/admin/users/${id}`, { method: "DELETE" });
export const adminUpdateUser = (id, payload) => adminRequest(`/admin/users/${id}`, { method: "PUT", body: payload });
export const adminListResumes = () => adminRequest("/admin/resumes");
export const adminGetResume = (id) => adminRequest(`/admin/resumes/${id}`);
export const adminUpdateResume = (id, payload) => adminRequest(`/admin/resumes/${id}`, { method: "PUT", body: payload });
export const adminDeleteResume = (id) => adminRequest(`/admin/resumes/${id}`, { method: "DELETE" });
export const adminGetProfile = () => adminRequest("/admin/profile");
export const adminUpdateProfile = (payload) => adminRequest("/admin/profile", { method: "PUT", body: payload });
