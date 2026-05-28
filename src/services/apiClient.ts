// Lightweight API client wrapper for Supabase calls.
// Provides retry/backoff and normalized error shape for services to consume.
type ApiError = {
  message: string;
  code?: string | number;
  status?: number | null;
  original?: unknown;
};

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 2, backoff = 300): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await delay(backoff);
      return withRetry(fn, retries - 1, backoff * 2);
    }
    throw err;
  }
}

function toApiError(err: unknown): ApiError {
  // Normalize different error shapes coming from Supabase or fetch
  if (!err) return { message: 'Unknown error' };
  const anyErr = err as any;
  if (typeof anyErr === 'string') return { message: anyErr };
  if (anyErr?.message) {
    return {
      message: anyErr.message,
      code: anyErr.code ?? anyErr.status ?? undefined,
      status: anyErr.status ?? null,
      original: anyErr,
    };
  }
  return { message: String(anyErr) };
}

export async function callSupabase<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await withRetry(fn);
  } catch (err) {
    const apiErr = toApiError(err);
    // Keep logging here; services can further handle or rethrow
    // eslint-disable-next-line no-console
    console.error(`[apiClient:${operationName}]`, apiErr);
    throw apiErr;
  }
}

export type { ApiError };
