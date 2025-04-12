import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        // Check if user is logged in from local storage or server session
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await axios.get('/api/auth/validate', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.valid) {
            setUser(response.data.user);
          } else {
            localStorage.removeItem('authToken');
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Session validation error:', err);
        setError('Oturum doğrulama hatası');
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', credentials);
      localStorage.setItem('authToken', response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş başarısız');
      return { success: false, error: err.response?.data?.message || 'Giriş başarısız' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    }
    localStorage.removeItem('authToken');
    setUser(null);
    router.push('/login');
  };

  const hasPermission = (requiredPermission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(requiredPermission);
  };

  return (
    <UserContext.Provider value={{ user, loading, error, login, logout, hasPermission, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
