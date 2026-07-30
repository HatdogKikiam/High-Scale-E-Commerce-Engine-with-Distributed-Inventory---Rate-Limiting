/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;

  constructor(message: string, statusCode = 500, expose = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
