import { useState, useEffect } from 'react';
import { api } from '../../../services/api';

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);

  // Auto-login on mount
  useEffect(() => {
    const login = async () => {
      try {
        const data = await api.login('doctor@mediagent.com', 'password123');
        setToken(data.token);
        console.log('✅ Auto-login successful!');
        fetchAppointments(data.token);
      } catch (error) {
        console.error('❌ Login failed:', error);
      }
    };
    login();
  }, []);

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
    setToken,
    recentAppointments,
    setRecentAppointments,
    fetchAppointments
  };
};

export default useAuth;
