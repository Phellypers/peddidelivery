import React, { createContext, useContext, useEffect, useState } from 'react';
import { peddiApi } from '@/services/api/peddiApi';
import { resetPresentationDemo } from '@/lib/presentationDemo';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState(null);

  const checkAppState = async () => {
    setAuthError(null);
    const token = localStorage.getItem('peddi_access_token');
    if (token) {
      try {
        const result = await peddiApi.me(token);
        setUser({ ...result.user, full_name: result.user.name });
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('peddi_access_token');
        localStorage.removeItem('peddi_refresh_token');
        if (error.status !== 401) setAuthError({ type: 'unknown', message: error.message });
      }
    }
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  useEffect(() => { checkAppState(); }, []);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const result = await peddiApi.me(localStorage.getItem('peddi_access_token') || '');
      setUser({ ...result.user, full_name: result.user.name });
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      if (error.status === 401) setAuthError({ type: 'auth_required', message: 'Autenticação necessária.' });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = (shouldRedirect = true) => {
    resetPresentationDemo();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('peddi_access_token');
    localStorage.removeItem('peddi_refresh_token');
    if (shouldRedirect) window.location.href = window.location.pathname.startsWith('/admin') ? '/gestor/login' : '/login';
  };

  const navigateToLogin = () => {
    const loginPath = window.location.pathname.startsWith('/admin') ? '/gestor/login' : '/login';
    window.location.href = `${loginPath}?returnTo=${encodeURIComponent(window.location.pathname)}`;
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
      authError, appPublicSettings, authChecked, logout, navigateToLogin,
      checkUserAuth, checkAppState,
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
