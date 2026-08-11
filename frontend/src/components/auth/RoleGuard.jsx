import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { isRoleAllowedForPath } from '../../config/sidebarConfig';

const RoleGuard = ({ path, children }) => {
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';

  const isAllowed = isRoleAllowedForPath(path, userRole);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleGuard;
