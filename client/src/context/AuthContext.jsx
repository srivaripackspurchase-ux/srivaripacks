import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || null);
  const [adminUser, setAdminUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // Helper to decode JWT payloads natively
  const decodeToken = (jwtToken) => {
    try {
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('JWT decoding error:', e);
      return null;
    }
  };

  // User session sync
  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setUser({
          id: decoded.userId,
          username: decoded.username,
          role: decoded.role || 'user',
          full_name: decoded.full_name || decoded.username
        });
      } else {
        logout();
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  // Admin session sync
  useEffect(() => {
    if (adminToken) {
      const decoded = decodeToken(adminToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setAdminUser({
          id: decoded.userId,
          username: decoded.username,
          role: 'admin',
          full_name: decoded.full_name || decoded.username
        });
      } else {
        adminLogout();
      }
    } else {
      setAdminUser(null);
    }
  }, [adminToken]);

  // User Login Flow
  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'User login failed');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setLoading(false);
      return { success: true, role: 'user' };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  // Separate Admin Login Flow
  const adminLogin = async (username, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Admin authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('adminToken', data.token);
      setToken(data.token);
      setAdminToken(data.token);
      setLoading(false);
      return { success: true, role: 'admin' };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  // In-flight GET request promises map to prevent duplicate simultaneous fetches
  const inFlightRequests = React.useRef(new Map());
  // User-scoped short-lived GET response cache map
  const responseCache = React.useRef(new Map());

  const clearCache = () => {
    inFlightRequests.current.clear();
    responseCache.current.clear();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    setToken(null);
    setUser(null);
    setAdminToken(null);
    setAdminUser(null);
    clearCache();
  };

  const adminLogout = () => {
    logout();
  };

  const authenticatedFetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();

    // If method is POST, PUT, DELETE -> clear short-lived GET response cache for freshness
    if (method !== 'GET') {
      responseCache.current.clear();
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // For GET requests, deduplicate simultaneous calls & use short-lived user-scoped cache
    if (method === 'GET') {
      const cacheKey = `${token || ''}:${url}`;

      // Check short-lived (3s) cache first
      if (responseCache.current.has(cacheKey)) {
        const cached = responseCache.current.get(cacheKey);
        if (Date.now() - cached.timestamp < 3000) {
          return cached.response.clone();
        } else {
          responseCache.current.delete(cacheKey);
        }
      }

      // Check if exact GET request is already in-flight
      if (inFlightRequests.current.has(cacheKey)) {
        const existingPromise = inFlightRequests.current.get(cacheKey);
        const res = await existingPromise;
        return res.clone();
      }

      // Create new fetch promise and store in inFlightRequests
      const fetchPromise = (async () => {
        try {
          const response = await fetch(url, { ...options, headers });
          if (response.status === 401) {
            logout();
          } else if (response.ok) {
            responseCache.current.set(cacheKey, {
              timestamp: Date.now(),
              response: response.clone()
            });
          }
          return response;
        } finally {
          inFlightRequests.current.delete(cacheKey);
        }
      })();

      inFlightRequests.current.set(cacheKey, fetchPromise);
      const res = await fetchPromise;
      return res.clone();
    }

    // For non-GET requests (POST, PUT, DELETE)
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      logout();
    }
    return response;
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      adminToken,
      adminUser,
      loading, 
      login, 
      adminLogin, 
      logout, 
      adminLogout,
      authenticatedFetch 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
