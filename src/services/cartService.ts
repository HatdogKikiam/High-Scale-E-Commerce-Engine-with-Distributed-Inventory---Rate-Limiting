/**
 * Copyright (c) 2026
 * Licensed under the MIT License.
 */

import { redis } from "../config/redis";

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  updatedAt: string;
}

export async function getCart(userId: string): Promise<Cart> {
  const cartKey = `cart:${userId}`;
  const raw = await redis.get(cartKey);
  if (!raw) {
    return { id: cartKey, items: [], updatedAt: new Date().toISOString() };
  }

  return JSON.parse(raw) as Cart;
}

export async function upsertCartItem(userId: string, productId: string, quantity: number) {
  const cart = await getCart(userId);
  const existing = cart.items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity = quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  cart.updatedAt = new Date().toISOString();
  await redis.set(`cart:${userId}`, JSON.stringify(cart), "EX", 60 * 60 * 24 * 7);
  return cart;
}

export async function clearCart(userId: string) {
  await redis.del(`cart:${userId}`);
}
