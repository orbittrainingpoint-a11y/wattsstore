/**
 * Typed application error. Carries an HTTP status, a stable machine `code`, and an
 * optional `field` for form-level errors. Thrown anywhere; caught by errorHandler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly field?: string;
  public readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string, field?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // ── Common factories ──
  static badRequest(code: string, message: string, field?: string) {
    return new AppError(400, code, message, field);
  }
  static unauthorized(message = 'Authentication required.') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action.') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(code = 'NOT_FOUND', message = 'Resource not found.') {
    return new AppError(404, code, message);
  }
  static conflict(code: string, message: string, field?: string) {
    return new AppError(409, code, message, field);
  }
  static tooMany(message = 'Too many requests. Please slow down.') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
  static internal(message = 'An unexpected error occurred.') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
