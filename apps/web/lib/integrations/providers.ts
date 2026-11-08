export type Credentials = Record<string, string>;

export interface ConnectionCheck {
  validation?: "format";
  ok: boolean;
  accountName?: string;
  error?: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}
