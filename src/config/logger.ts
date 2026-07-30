/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: true,
  redact: ["authorization", "stripe-signature"],
  formatters: {
    level: (label) => ({ level: label })
  }
});
