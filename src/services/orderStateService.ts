/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

export type OrderState = "pending" | "paid" | "fulfilled" | "shipped" | "refunded" | "expired";

export interface OrderTransitionResult {
  canTransition: boolean;
  reason?: string;
}

export const ORDER_TRANSITIONS: Record<Exclude<OrderState, "expired">, OrderState[]> = {
  pending: ["paid", "expired"],
  paid: ["fulfilled", "refunded"],
  fulfilled: ["shipped", "refunded"],
  shipped: ["refunded"],
  refunded: []
};

export function transitionOrderState(from: OrderState, to: OrderState): OrderTransitionResult {
  if (from === to) {
    return { canTransition: true };
  }

  if (from === "expired") {
    return { canTransition: false, reason: "Expired orders cannot transition" };
  }

  if (from === "refunded") {
    return { canTransition: false, reason: "Refunded orders cannot transition" };
  }

  const allowedTargets = ORDER_TRANSITIONS[from as Exclude<OrderState, "expired">] ?? [];
  if (allowedTargets.includes(to)) {
    return { canTransition: true };
  }

  return { canTransition: false, reason: `Transition from ${from} to ${to} is not allowed` };
}
