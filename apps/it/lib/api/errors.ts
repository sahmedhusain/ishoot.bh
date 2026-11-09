
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

export const isApiError = (err: unknown, ...codes: string[]): err is ApiError =>
  err instanceof ApiError && (codes.length === 0 || codes.includes(err.code));
