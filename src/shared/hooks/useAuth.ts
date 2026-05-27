import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import type { AppUser, UserRole } from '../../types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, clearUser, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata as { name?: string; role?: UserRole; ownerId?: string };
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: meta.name ?? session.user.email ?? '',
          role: meta.role ?? 'owner',
          ownerId: meta.ownerId ?? session.user.id,
        });
      } else {
        clearUser();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata as { name?: string; role?: UserRole; ownerId?: string };
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: meta.name ?? session.user.email ?? '',
          role: meta.role ?? 'owner',
          ownerId: meta.ownerId ?? session.user.id,
        });
      } else {
        clearUser();
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearUser();
    navigate('/login');
  };

  return { user, isAuthenticated, isLoading, signIn, signOut };
}

export function useRequireAuth(requiredRole?: UserRole) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const hasRole = !requiredRole || (user?.role === 'owner') ||
    (requiredRole === 'manager' && ['owner', 'manager'].includes(user?.role ?? '')) ||
    (requiredRole === 'staff' && ['owner', 'manager', 'staff'].includes(user?.role ?? ''));

  return { user, isAuthenticated, isLoading, hasRole };
}
