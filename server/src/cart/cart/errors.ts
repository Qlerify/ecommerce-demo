export type DomainErrorType =
  | "NOT_FOUND"
  | "INVALID_DATA"
  | "NOT_ALLOWED"
  | "CONFLICT"

export class DomainError extends Error {
  type: DomainErrorType
  details?: Record<string, unknown>

  constructor(type: DomainErrorType, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = "DomainError"
    this.type = type
    this.details = details
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError
