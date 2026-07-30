import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1000,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500']
  }
};

export default function () {
  const payload = JSON.stringify({
    quantity: 1,
    orderId: `order-${__VU}-${__ITER}`
  });

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const res = http.post('http://127.0.0.1:3000/products/123/reserve', payload, params);
  check(res, {
    'status is 2xx or 409': (r) => r.status === 201 || r.status === 409,
    'response time < 500ms': (r) => r.timings.duration < 500
  });

  sleep(0.1);
}
