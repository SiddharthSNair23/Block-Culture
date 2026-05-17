import { createContext, useContext, useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8082/api';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    // Check session on mount — use a timeout so cookie is always ready
    const check = async () => {
      try {
        const res = await fetch(`${API}/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) setUser(data);
        }
      } catch (e) {
        // backend not running — stay logged out
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  const signup = async (username, email, password, role) => {
    const res = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email, password, role }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setUser(data.user);
    return data.user;
  };

  const login = async (username, password) => {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const API_URL = API;
