import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

interface Props {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

// When Supabase is not yet configured, run in demo mode (dev only).
const DEMO_MODE =
  import.meta.env.DEV &&
  (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY);

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (DEMO_MODE) return <>{children}</>;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="loader" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const roleRank: Record<UserRole, number> = { owner: 3, manager: 2, staff: 1 };
    const userRank = roleRank[user?.role ?? 'staff'];
    const requiredRank = roleRank[requiredRole];
    if (userRank < requiredRank) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
