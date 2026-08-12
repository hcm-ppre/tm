import React, { createContext, useContext, useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = unauth, object = auth

  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/me")
      .then((res) => mounted && setUser(res.data))
      .catch(() => mounted && setUser(false));
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      /* ignore */
    }
    setUser(false);
  };

  const isAdmin = user && user.role === "admin";

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
