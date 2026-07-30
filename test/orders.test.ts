import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionOrderState, ORDER_TRANSITIONS, type OrderState } from '../src/services/orderStateService';

test('supports the canonical order lifecycle transitions', () => {
  const transitions: Array<[OrderState, OrderState]> = [
    ['pending', 'paid'],
    ['paid', 'fulfilled'],
    ['fulfilled', 'shipped'],
    ['shipped', 'refunded']
  ];

  for (const [current, next] of transitions) {
    assert.equal(transitionOrderState(current, next).canTransition, true);
  }
});

test('rejects invalid transitions to preserve integrity', () => {
  const result = transitionOrderState('pending', 'shipped');
  assert.equal(result.canTransition, false);
  assert.match(result.reason ?? '', /not allowed/i);
});

test('exposes the allowed transitions map', () => {
  assert.deepEqual(ORDER_TRANSITIONS.pending, ['paid', 'expired']);
  assert.deepEqual(ORDER_TRANSITIONS.paid, ['fulfilled', 'refunded']);
});
