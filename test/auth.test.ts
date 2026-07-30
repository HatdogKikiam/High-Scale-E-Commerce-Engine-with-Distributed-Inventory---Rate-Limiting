import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth } from '../src/middleware/auth';

test('requires a valid API key when auth is enabled', async () => {
  const req: any = {
    headers: {},
    path: '/orders/123'
  };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    }
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  process.env.AUTH_REQUIRED = 'true';
  process.env.API_KEYS = 'demo-key';

  requireAuth(req, res, next);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('allows requests when a matching API key is provided', async () => {
  const req: any = {
    headers: { 'x-api-key': 'demo-key' },
    path: '/orders/123'
  };
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    }
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  process.env.AUTH_REQUIRED = 'true';
  process.env.API_KEYS = 'demo-key';

  requireAuth(req, res, next);

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
