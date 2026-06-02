// ─── Error message extraction ──────────────────────────────────────────────────
// Supabase/PostgREST errors are plain objects ({ message, details, hint, code }),
// NOT instances of Error — so `err instanceof Error` misses them and callers fall
// back to a useless generic string. This helper digs out the most useful message.

interface SupabaseLikeError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

/** Best-effort human-readable message from any thrown value. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (!err) return fallback;
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === 'object') {
    const e = err as SupabaseLikeError;
    // RLS violations come back as code 42501 — give an actionable message.
    if (e.code === '42501' || /row-level security/i.test(e.message ?? '')) {
      return 'Permission denied — your session may have expired. Please sign out and sign in again.';
    }
    if (e.message) return e.message;
    if (e.details) return e.details;
  }

  if (typeof err === 'string') return err;
  return fallback;
}
