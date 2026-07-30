/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import type { NextFunction, Request, Response } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authRequired = process.env.AUTH_REQUIRED === "true" || process.env.AUTH_REQUIRED === "1";
  if (!authRequired) {
    // When auth is disabled, continue without setting a user context
    return next();
  }

  const getHeaderValue = (name: string) => {
    if (typeof req.header === "function") {
      return req.header(name);
    }

    const headerValue = req.headers[name.toLowerCase()];
    if (Array.isArray(headerValue)) {
      return headerValue[0];
    }
    return headerValue as string | undefined;
  };

  const suppliedApiKey = getHeaderValue("x-api-key");
  const authorization = getHeaderValue("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined;
  const configuredKeys = (process.env.API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const configuredBearerToken = process.env.OAUTH2_ACCESS_TOKEN?.trim();

  const hasValidApiKey = suppliedApiKey ? configuredKeys.includes(suppliedApiKey) : false;
  const hasValidBearerToken = configuredBearerToken ? bearerToken === configuredBearerToken : false;

  if (hasValidApiKey || hasValidBearerToken) {
    // Attach a minimal user context. Prefer an explicit header if provided for testing/dev purposes.
    const suppliedUser = getHeaderValue("x-user-id");
    (req as any).user = { id: suppliedUser ?? "00000000-0000-0000-0000-000000000001" };
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}
