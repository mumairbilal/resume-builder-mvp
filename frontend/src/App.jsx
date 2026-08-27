import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ResumeForm from "./pages/ResumeForm.jsx";
import ResumeView from "./pages/ResumeView.jsx";
import ResumeHistory from "./pages/ResumeHistory.jsx";
import Profile from "./pages/Profile.jsx";
import Navbar from "./pages/Navbar.jsx";
import AuthNav from "./pages/AuthNav.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminProfile from "./pages/AdminProfile.jsx";
import { getAdminToken } from "./api/client";

function Boxed({ children }) {
  return <div className="container">{children}</div>;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Boxed><p>Loading...</p></Boxed>;
  return user ? <Boxed>{children}</Boxed> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  return getAdminToken() ? children : <Navigate to="/admin/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  // While we're still verifying the token from localStorage (getMe() in
  // flight), don't render Landing yet — otherwise a logged-in user briefly
  // sees the "Sign In / Get Started" buttons on every refresh before the
  // redirect to /dashboard kicks in. Show a tiny loader instead of nothing
  // so a slow/unreachable backend is visibly "loading" rather than a blank
  // page that looks broken (AuthContext also times this out after 8s).
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <><AuthNav /><Boxed><Login /></Boxed></>} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <><AuthNav /><Boxed><Signup /></Boxed></>} />
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/resumes/new" element={<PrivateRoute><ResumeForm /></PrivateRoute>} />
        <Route path="/resumes/:id/edit" element={<PrivateRoute><ResumeForm /></PrivateRoute>} />
        <Route path="/resumes/:id" element={<PrivateRoute><ResumeView /></PrivateRoute>} />
        <Route path="/resumes/:id/history" element={<PrivateRoute><ResumeHistory /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/admin/login" element={<><AuthNav backTo="/" /><Boxed><AdminLogin /></Boxed></>} />
        <Route path="/admin/dashboard" element={<AdminRoute><AuthNav backTo="/dashboard" backLabel="Back to app" /><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/profile" element={<AdminRoute><AuthNav backTo="/dashboard" backLabel="Back to app" /><AdminProfile /></AdminRoute>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
