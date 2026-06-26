import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44, getToken, clearToken } from '@/api/base44Client';
import { disconnectSocket } from '@/api/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoadingAuth(false);
      return;
    }
    try {
      const me = await base44.auth.me();
      setUser(me);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (e) {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    await base44.auth.login(email, password);
    await loadMe();
  };
  const register = async (email, password, name) => {
    await base44.auth.register(email, password, name);
    await loadMe();
  };
  const loginWithGoogle = async (idToken) => {
    await base44.auth.loginWithGoogle(idToken);
    await loadMe();
  };
  const loginWithApple = async (identityToken, name) => {
    await base44.auth.loginWithApple(identityToken, name);
    await loadMe();
  };
  const resetPassword = async (email, token, password) => {
    await base44.auth.resetPassword(email, token, password);
    await loadMe();
  };
  const forgotPassword = (email) => base44.auth.forgotPassword(email);
  const logout = () => {
    clearToken();
    disconnectSocket();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false, // compat com App.jsx
        authChecked: !isLoadingAuth, // compat com ProtectedRoute
        authError,
        login,
        register,
        loginWithGoogle,
        loginWithApple,
        forgotPassword,
        resetPassword,
        logout,
        refresh: loadMe,
        checkUserAuth: loadMe,
        navigateToLogin: () => {
          if (typeof window !== 'undefined') window.location.href = '/login';
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
