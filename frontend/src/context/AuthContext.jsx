// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tokenStorage, handleApiError } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!tokenStorage.getAccessToken()) {
        setLoading(false);
        setAuthChecked(true);
        return;
      }
      try {
        const response = await authAPI.checkAuth();
        if (response.data?.user) {
          setUser(response.data.user);
        } else if (response.data && !response.data.user) {
          setUser(response.data);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          tokenStorage.clearTokens();
          setUser(null);
        }
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({
        username: username.trim(),
        password: password,
      });

      const { access, refresh, user: userData } = response.data || {};

      if (access) {
        tokenStorage.setTokens(access, refresh);
      }

      if (userData) {
        setUser(userData);
        return { success: true, user: userData };
      }

      if (access) {
        const userResponse = await authAPI.checkAuth();
        const fallbackUser = userResponse.data?.user || userResponse.data;
        setUser(fallbackUser);
        return { success: true, user: fallbackUser };
      }

      return { success: false, error: 'Réponse serveur invalide.' };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);

      if (response.status === 201) {
        // Le backend renvoie directement la session : pas de second login
        const { access, refresh, user: newUser } = response.data || {};
        if (access && newUser) {
          tokenStorage.setTokens(access, refresh);
          setUser(newUser);
          return { success: true, user: newUser };
        }
        // Repli : se connecter avec le nom d'utilisateur tel qu'enregistré (en minuscules)
        return await login(newUser?.username || userData.username, userData.password);
      }
      
      return { success: false, error: 'Erreur lors de l\'inscription' };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // Ignorer les erreurs (ex: déjà déconnecté)
    }
    tokenStorage.clearTokens();
    setUser(null);
  };

  const updateProfile = async (userData) => {
    try {
      const response = await authAPI.updateProfile(userData);
      const userDataFromApi = response.data.user ?? response.data;
      const updatedUser = { ...user, ...userDataFromApi };
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  };

  const value = {
    user,
    loading,
    authChecked,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.is_staff || user?.is_superuser || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;