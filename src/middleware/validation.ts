/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { z } from "zod";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/httpErrors";

export const reserveSchema = z.object({
  quantity: z.number().int().positive(),
  orderId: z.string().min(1)
});

export const webhookSchema = z.object({
  type: z.string().optional(),
  data: z.any().optional()
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError("Invalid request payload", 400, true, error.flatten()));
        return;
      }

      next(new AppError("Invalid request payload", 400));
    }
  };
}
