// Minimal telemetry wrapper. Extend to integrate Sentry or other providers later.
type InitOptions = {
  dsn?: string;
};

let enabled = false;

export function initTelemetry(opts?: InitOptions) {
  const dsn = opts?.dsn ?? (import.meta.env.VITE_SENTRY_DSN as string | undefined);
  if (!dsn) {
    // telemetry disabled by default
    // eslint-disable-next-line no-console
    console.debug('[telemetry] disabled (no DSN)');
    enabled = false;
    return;
  }

  // Placeholder: if/when Sentry is added, initialize it here.
  // e.g. Sentry.init({ dsn })
  // For now we mark telemetry enabled so capture functions become no-ops that still log.
  // eslint-disable-next-line no-console
  console.info('[telemetry] DSN provided but provider not installed — enable after adding Sentry');
  enabled = true;
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  // If telemetry provider is configured, forward the event.
  // Otherwise, fallback to console.error for visibility.
  if (enabled) {
    // Forward to provider when implemented
    // Sentry.captureException(err, { extra: context })
    // eslint-disable-next-line no-console
    console.error('[telemetry] captureException (telemetry enabled but provider missing)', err, context);
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[telemetry] captureException (telemetry disabled)', err, context);
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (enabled) {
    // Sentry.captureMessage(message)
    // eslint-disable-next-line no-console
    console.info('[telemetry] captureMessage (telemetry enabled but provider missing)', message, context);
    return;
  }
  // eslint-disable-next-line no-console
  console.info('[telemetry] captureMessage', message, context);
}

export default {
  initTelemetry,
  captureException,
  captureMessage,
};
