import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from './services/supabase';
import { useAuthStore } from './store/authStore';
import { useBranchStore } from './store/branchStore';
import { fetchBranches } from './services/branches.service';
import { AppRouter } from './router/AppRouter';
import type { UserRole } from './types';

function mapSessionUser(user: any) {
  const meta = (user.user_metadata ?? {}) as { name?: string; role?: UserRole; ownerId?: string };
  return {
    id:      user.id as string,
    email:   (user.email ?? '') as string,
    name:    (meta.name ?? user.email ?? '') as string,
    role:    (meta.role ?? 'owner') as UserRole,
    ownerId: (meta.ownerId ?? user.id) as string,
  };
}

function App() {
  const { setUser, clearUser, isAuthenticated } = useAuthStore();
  const { setBranches } = useBranchStore();

  // ─── Auth initializer ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      clearUser();
      return;
    }

    // getSession() only reads the cached token from localStorage — it does NOT
    // verify it against the server, so an expired/revoked session still looks
    // "valid" and the persisted Zustand auth state keeps the user "logged in"
    // while every DB write silently fails RLS. Validate with getUser() to be sure.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!session?.user) { clearUser(); return; }
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          // Stale/invalid token — purge it so the app bounces to /login cleanly.
          await supabase.auth.signOut();
          clearUser();
        } else {
          setUser(mapSessionUser(data.user));
        }
      })
      .catch(() => clearUser());

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) { clearUser(); return; }
      if (event === 'SIGNED_OUT') { clearUser(); return; }
      if (session?.user) setUser(mapSessionUser(session.user));
      else clearUser();
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  // ─── Branch loader — runs whenever auth state becomes true ────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBranches()
      .then(setBranches)
      .catch((err) => console.warn('[App] branch load failed:', err));
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
