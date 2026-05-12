import { supabase } from "@/integrations/supabase/client";

type ReportOpts = {
  message: string;
  stack?: string;
  source?: "boundary" | "window" | "promise" | "manual";
  severity?: "error" | "warning";
  component?: string;
  metadata?: Record<string, unknown>;
};

const sent = new Set<string>();

export async function reportError(opts: ReportOpts) {
  try {
    const key = `${opts.source ?? "window"}|${opts.message}|${(opts.stack ?? "").slice(0, 200)}`;
    if (sent.has(key)) return;
    sent.add(key);
    setTimeout(() => sent.delete(key), 30_000);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("error_logs").insert([{
      user_id: user?.id ?? null,
      message: (opts.message || "Unknown error").slice(0, 2000),
      stack: opts.stack?.slice(0, 8000) ?? null,
      source: opts.source ?? "window",
      severity: opts.severity ?? "error",
      url: window.location.href,
      route: window.location.pathname,
      component: opts.component ?? null,
      user_agent: navigator.userAgent,
      metadata: (opts.metadata ?? {}) as any,
    }]);
  } catch {
    /* best-effort */
  }
}

let installed = false;
export function installGlobalErrorReporting() {
  if (installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportError({
      message: event.message || String(event.error?.message || "window error"),
      stack: event.error?.stack,
      source: "window",
      metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    reportError({
      message: reason?.message ? String(reason.message) : String(reason),
      stack: reason?.stack,
      source: "promise",
    });
  });
}
