import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export class AppError extends Error {
  public readonly statusCode: ContentfulStatusCode;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: ContentfulStatusCode = 500,
    code = "INTERNAL_ERROR",
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Permintaan tidak valid.", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = "Tidak memiliki otorisasi (Unauthorized).",
    code = "UNAUTHORIZED",
  ) {
    super(message, 401, code);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Akses ditolak (Forbidden).", code = "FORBIDDEN") {
    super(message, 403, code);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = "Sumber daya tidak ditemukan (Not Found).",
    code = "NOT_FOUND",
  ) {
    super(message, 404, code);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Terjadi konflik data (Conflict).", code = "CONFLICT") {
    super(message, 409, code);
    this.name = "ConflictError";
  }
}
