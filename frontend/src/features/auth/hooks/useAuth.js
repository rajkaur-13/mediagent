import { useState, useEffect } from 'react';
import { api } from '../../../services/api';

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check for existing token on mount (NO auto-login)
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchAppointments(savedToken);
    }
  }, []);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      setIsAuthenticated(true);
      localStorage.setItem('token', data.token);
      if (data.user) {
        setUser(data.user);
      }
      await fetchAppointments(data.token);
      console.log('✅ Login successful!');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    console.log('👋 Logged out');
  };

  const fetchAppointments = async (authToken) => {
    try {
      const data = await api.getAppointments(authToken);
      setRecentAppointments(data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    loading,
    handleLogin,
    handleLogout,
    recentAppointments,
    setRecentAppointments,
    fetchAppointments
  };
};

export default useAuth;
