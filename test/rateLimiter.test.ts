import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/middleware/rateLimiter';

test('rate limiter returns 429 after exceeding maxRequests and allows after window reset', async () => {
  const mw = createRateLimiter({ windowMs: 500, maxRequests: 2, keyPrefix: `test-rate-${Date.now()}` });

  const makeReq = (ip = '1.2.3.4') => ({
    ip,
    get: () => undefined
  } as any);

  const makeRes = () => {
    const r: any = {};
    r.headers = {};
    r.status = (code: number) => {
      r.statusCode = code;
      return r;
    };
    r.json = (payload: unknown) => {
      r.payload = payload;
      return r;
    };
    r.setHeader = (k: string, v: string) => {
      r.headers[k] = v;
    };
    return r;
  };

  let nextCalled = 0;
  const next = () => { nextCalled += 1; };

  const req1 = makeReq();
  const res1 = makeRes();
  await mw(req1, res1, next as any);
  assert.equal(res1.statusCode, undefined);

  const req2 = makeReq();
  const res2 = makeRes();
  await mw(req2, res2, next as any);
  assert.equal(res2.statusCode, undefined);

  const req3 = makeReq();
  const res3 = makeRes();
  await mw(req3, res3, next as any);
  assert.equal(res3.statusCode, 429);

  // wait for window to expire
  await new Promise((r) => setTimeout(r, 600));

  const req4 = makeReq();
  const res4 = makeRes();
  await mw(req4, res4, next as any);
  assert.notEqual(res4.statusCode, 429);
});
