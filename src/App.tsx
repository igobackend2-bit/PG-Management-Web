import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppRouter } from './router/AppRouter';
import type { UserRole } from './types';

function mapSessionUser(user: any) {
  const meta = (user.user_metadata ?? {}) as { name?: string; role?: UserRole; ownerId?: string };
  return {
    id: user.id as string,
    email: (user.email ?? '') as string,
    name: (meta.name ?? user.email ?? '') as string,
    role: (meta.role ?? 'owner') as UserRole,
    ownerId: (meta.ownerId ?? user.id) as string,
  };
}

function App() {
  const { setUser, clearUser } = useAuthStore();

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // If Supabase is not configured yet, skip the auth check and go to login.
    if (!supabaseUrl || !supabaseKey) {
      clearUser();
      return;
    }

    import('./services/supabase').then(({ supabase }) => {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (session?.user) {
            setUser(mapSessionUser(session.user));
          } else {
            clearUser();
          }
        })
        .catch(() => clearUser());

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(mapSessionUser(session.user));
        } else {
          clearUser();
        }
      });

      return () => { listener.subscription.unsubscribe(); };
    });
  }, []);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
