// Lightweight zero-dependency validation helpers for Edge Functions.
// We deliberately avoid pulling Zod (extra cold-start cost) for these small schemas.

export class ValidationError extends Error {
  status = 400;
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

export function requireString(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; pattern?: RegExp } = {},
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`, field);
  }
  const trimmed = value.trim();
  if (opts.min !== undefined && trimmed.length < opts.min) {
    throw new ValidationError(`${field} must be at least ${opts.min} characters`, field);
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw new ValidationError(`${field} must be at most ${opts.max} characters`, field);
  }
  if (opts.pattern && !opts.pattern.test(trimmed)) {
    throw new ValidationError(`${field} has an invalid format`, field);
  }
  return trimmed;
}

export function optionalString(
  value: unknown,
  field: string,
  opts: { max?: number } = {},
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field, opts);
}

export function requireArray<T = unknown>(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): T[] {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`, field);
  if (opts.min !== undefined && value.length < opts.min) {
    throw new ValidationError(`${field} must have at least ${opts.min} items`, field);
  }
  if (opts.max !== undefined && value.length > opts.max) {
    throw new ValidationError(`${field} must have at most ${opts.max} items`, field);
  }
  return value as T[];
}

export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const cl = req.headers.get("content-length");
  if (cl && Number(cl) > maxBytes) {
    throw new ValidationError(`Request body too large (max ${maxBytes} bytes)`);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

export function validationErrorResponse(err: unknown, corsHeaders: Record<string, string>): Response {
  if (err instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: err.message, field: err.field }),
      { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({ error: "Invalid request" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
