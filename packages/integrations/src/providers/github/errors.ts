const SAFE_MESSAGES = new Set([
  'Bad credentials',
  'Not Found',
  'Resource not accessible by integration',
  'Validation Failed',
  'Requires authentication',
]);

export class GitHubProviderError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly retryable: boolean;

  constructor(input: {
    operation: string;
    code: string;
    status?: number;
    requestId?: string;
    providerMessage?: string;
    cause?: unknown;
  }) {
    const safeProviderMessage =
      input.providerMessage && SAFE_MESSAGES.has(input.providerMessage)
        ? `: ${input.providerMessage}`
        : '';
    super(
      `GitHub ${input.operation} failed${input.status ? ` (${input.status})` : ''}${safeProviderMessage}`,
      {
        cause: input.cause,
      }
    );
    this.name = 'GitHubProviderError';
    this.code = input.code;
    this.status = input.status;
    this.requestId = input.requestId;
    this.retryable =
      input.status === undefined ||
      input.status === 408 ||
      input.status === 429 ||
      input.status >= 500;
  }
}
