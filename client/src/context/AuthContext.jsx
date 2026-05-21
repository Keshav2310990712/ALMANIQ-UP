import { createContext, useContext, useState, useEffect, useMemo } from "react";

const AuthContext = createContext({
  user: null,
  token: null,
  signin: () => {},
  signout: () => {},
  loading: true
});

const TOKEN_KEY = "almaniq_token";

// Standard base64 decoding to extract JWT payloads safely without external dependencies
function decodeToken(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Token decoding failed:", err);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and read the token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      const decoded = decodeToken(storedToken);
      if (decoded) {
        setToken(storedToken);
        setUser({
          id: decoded.id,
          email: decoded.email,
          name: decoded.name
        });
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signin = (newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    const decoded = decodeToken(newToken);
    if (decoded) {
      setToken(newToken);
      setUser({
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      });
    }
  };

  const signout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      signin,
      signout,
      loading
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
