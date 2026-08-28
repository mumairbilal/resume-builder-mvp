import { createContext, useContext, useEffect, useState } from "react";
import * as api from "./api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // If the backend is slow/unreachable, don't leave the whole app stuck
    // on a blank screen forever — give up after a few seconds and let the
    // user see the app (they'll be redirected to /login if truly unauth'd).
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    }, 8000);

    api
      .getMe()
      .then((me) => {
        if (!settled) setUser(me);
      })
      .catch(() => {
        api.setToken(null);
      })
      .finally(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          setLoading(false);
        }
      });

    return () => clearTimeout(timeout);
  }, []);

  async function login(email, password) {
    const res = await api.login({ email, password });
    api.setToken(res.access_token);
    const me = await api.getMe();
    setUser(me);
  }

  async function signup(email, password, name) {
    await api.signup({ email, password, name });
    await login(email, password);
  }

  function logout() {
    api.logout().catch(() => {});
    api.setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
