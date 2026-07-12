import { useState } from 'react';

export const useAppointments = (recentAppointments) => {
  const getRelativeDate = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(dateStr);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const diffTime = appointmentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays > 7) return `In ${Math.floor(diffDays / 7)} weeks`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    return dateStr;
  };

  const upcomingAppointments = recentAppointments
    .filter(apt => new Date(apt.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return {
    getRelativeDate,
    upcomingAppointments
  };
};

export default useAppointments;
