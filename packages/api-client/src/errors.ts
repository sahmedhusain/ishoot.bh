/** An error answered by a backend service (RFC 9457 problem details). `code` is stable; show translated copy. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(
      `backend answered ${status} ${code}${requestId ? ` (request ${requestId})` : ""}`,
    );
    this.name = "ApiError";
  }
}

/** Builds an ApiError from a failed response. */
export async function apiError(
  response: Response,
  body?: unknown,
): Promise<ApiError> {
  let problem = body as
    | { code?: string; requestId?: string; extra?: Record<string, unknown> }
    | undefined;
  if (problem === undefined) {
    try {
      problem = (await response.json()) as typeof problem;
    } catch {
      problem = undefined;
    }
  }
  return new ApiError(
    response.status,
    problem?.code ?? "unknown_error",
    problem?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    problem?.extra ?? {},
  );
}

/** True when err is an ApiError with one of the codes. */
export const isApiError = (err: unknown, ...codes: string[]): err is ApiError =>
  err instanceof ApiError && (codes.length === 0 || codes.includes(err.code));
