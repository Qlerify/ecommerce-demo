export type DomainErrorCode =
  | 'required-field'
  | 'not-found'
  | 'check-constraint'
  | 'ownership'
  | 'conflict';

export class DomainError extends Error {
  constructor(
    public code: DomainErrorCode,
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  toJSON() {
    return { code: this.code, message: this.message, field: this.field };
  }
}

export function requireField(value: unknown, field: string): asserts value {
  if (value === undefined || value === null || value === '') {
    throw new DomainError('required-field', `${field} is required`, field);
  }
}
