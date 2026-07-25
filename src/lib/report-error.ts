// Neutral client-side error reporter. Logs to the console and, when
// VITE_ERROR_ENDPOINT is configured, POSTs a compact payload. This replaces a
// former editor telemetry hook — it relies on no injected window globals.

type ErrorContext = {
  /** Overrides the auto-detected route (defaults to the current pathname). */
  route?: string;
  [key: string]: unknown;
};

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Response) {
    return {
      message: `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  if (typeof window === "undefined") return;

  const { message, stack } = describe(error);
  const route = context.route ?? window.location.pathname;

  // Full context (including any extra fields) goes to the console for the dev.
  console.error("[report-error]", message, { stack, route, ...context });

  const endpoint = import.meta.env.VITE_ERROR_ENDPOINT as string | undefined;
  if (!endpoint) return;

  try {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the report survive an unload/navigation after the error.
      keepalive: true,
      body: JSON.stringify({
        message,
        stack,
        route,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {
      // Reporting must never throw back into the boundary it is reporting from.
    });
  } catch {
    // Ignore serialization / fetch-setup failures for the same reason.
  }
}
