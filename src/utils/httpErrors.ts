/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, expose = true, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
