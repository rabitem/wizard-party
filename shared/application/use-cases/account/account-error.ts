export type AccountErrorCode = 'invalid_input' | 'not_found' | 'conflict' | 'quota_exceeded' | 'already_imported' | 'unavailable';

/** Expected failures of account use cases; adapters map the code to a transport status. */
export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AccountError';
  }
}
