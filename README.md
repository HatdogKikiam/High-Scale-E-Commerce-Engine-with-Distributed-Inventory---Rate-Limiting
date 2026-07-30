<div align="center">

# ⚡ High-Scale E-Commerce Engine

### Distributed Inventory · Rate Limiting · Idempotent Payments

A production-oriented Node.js and TypeScript commerce platform demonstrating
atomic stock reservation under load, sliding-window API throttling, verified
webhook processing, and self-healing order recovery.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

[Overview](#-overview) ·
[Architecture](#️-architecture) ·
[Features](#-core-features) ·
[Getting Started](#-getting-started) ·
[API](#-api-surface) ·
[Reliability](#️-reliability--operations) ·
[Testing](#-testing)

</div>

<br>

## 📖 Overview

This repository combines the pieces that usually break first when a commerce
API goes from "demo" to "flash sale":

| Capability | Implementation |
|---|---|
| Atomic stock reservation | Redis-backed Lua scripts + PostgreSQL row locks |
| Transactional consistency | PostgreSQL as source of truth for orders and inventory |
| API protection | Sliding-window rate limiting via Redis sorted sets |
| Payment safety | Idempotent, signature-verified, DB-checked webhook processing |
| Self-healing | BullMQ workers for order expiration and stock restoration |
| Auth | API-key and Bearer-token support |
| Commerce workflows | Persistent carts, refunds, outbox events, catalog search |

<br>

## 🏗️ Architecture

```text
                    Clients / Traffic
                          │
                          ▼
                  Express API Server
                 ╱         │          ╲
                ▼          ▼           ▼
            Redis     PostgreSQL    BullMQ Worker
          (Lua lock)  (Orders +     (Expiration +
                       stock)        stock recovery)
```

**Dual-write inventory model.** Redis holds a fast-path `available` counter
per SKU; PostgreSQL holds `stock_quantity` / `reserved_quantity` as the
authoritative record behind a row lock. A reservation must clear both before
it commits — and any partial failure reverts the Redis side to keep the two
in sync.

<br>

## ✨ Core Features

- 🔒 **Distributed inventory reservation** — atomic Redis + PostgreSQL coordination, no oversell under concurrent load
- 🛡️ **Flash-sale-safe stock handling** — Lua-scripted decrement gated behind a row-locked Postgres check
- 🚦 **Sliding-window request throttling** — Redis sorted sets, not fixed-window buckets
- 🔁 **Idempotent, Stripe-style webhook processing** — HMAC signature verification + DB-backed idempotency keys
- 🧹 **Background cleanup** for expired pending orders with exponential backoff + dead-letter handling
- 🛒 **Persistent carts** for checkout workflows
- 🔄 **Refund and lifecycle support** with compensating Redis reverts on partial failure
- 📬 **Outbox event storage** for reliable webhook emission
- 📊 **Metrics, structured logging, Swagger docs**, and containerized dev support

<br>

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22, TypeScript |
| API | Express |
| Database | PostgreSQL 16 |
| Cache / Locking | Redis 7 |
| Queues | BullMQ |
| Infra | Docker Compose |
| Load Testing | k6 |

<br>

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- Docker Desktop or Docker Engine

### 1. Install dependencies
```bash
npm install
```

### 2. Start infrastructure
```bash
docker compose up -d
```

### 3. Run the API
```bash
npm run dev
```

### 4. Run the load test
```bash
k6 run k6-stress-test.js
```

<br>

## ⚙️ Environment Variables

```bash
PORT=3000
DATABASE_URL=postgresql://ecommerce:ecommerce@127.0.0.1:5432/ecommerce
REDIS_URL=redis://127.0.0.1:6379
AUTH_REQUIRED=true
API_KEYS=demo-key
OAUTH2_ACCESS_TOKEN=demo-token
```

<br>

## 🔌 API Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/orders/reserve` | `POST` | Reserve stock and create a pending order |
| `/webhooks/stripe` | `POST` | Idempotent, signature-verified payment webhook |
| `/orders/:id/refund` | `POST` | Refund a paid order and restore stock |
| `/metrics` | `GET` | Prometheus metrics |
| `/docs` | `GET` | Swagger / OpenAPI documentation |
| `/status`, `/admin/faults` | `GET`/`POST` | Fault-injection controls for resilience testing |
| `/dashboard.html` | `GET` | Local monitoring dashboard |

> Full request/response schemas are documented live at `/docs` once the API is running.

<br>

## 📁 Project Structure

```text
.
├── docker/
│   └── init.sql
├── public/
├── src/
│   ├── app.ts
│   ├── config/
│   ├── middleware/
│   ├── observability/
│   ├── resilience/
│   ├── services/
│   ├── utils/
│   └── workers/
├── test/
├── docker-compose.yml
├── k6-stress-test.js
├── package.json
├── tsconfig.json
└── README.md
```

<br>

## 🛡️ Reliability & Operations

- Structured logging and trace context for full request-lifecycle visibility
- Prometheus metrics at **`/metrics`**
- Swagger documentation at **`/docs`**
- Centralized validation and error handling at the API boundary
- Worker retry/backoff with dead-letter-style failure handling
- Fault-injection controls at **`/status`** and **`/admin/faults`**
- Local monitoring dashboard served from **`/dashboard.html`**

### Inventory Drift Detection & Reconciliation

Redis `inventory:{productId}:available` and PostgreSQL
`stock_quantity - reserved_quantity` are two independent counters kept in
sync on every mutation path. If they ever diverge:

- **Detect** — run a periodic job comparing `stock_quantity - reserved_quantity` against the Redis key; log or emit mismatches to the outbox.
- **Repair** — pause reservations, compute the authoritative value from PostgreSQL, and write it back to Redis atomically while alerting operators.
- **Prevent** — every code path that mutates stock updates both stores in the same logical operation; worker and refund flows include compensating reverts on partial failure.

<br>

## 🧪 Testing

| Test | What it proves |
|---|---|
| `test/inventory.concurrent.test.ts` | N concurrent reservations against limited stock never oversell |
| `test/webhook.idempotency.test.ts` | Replaying the same Stripe event ID is a no-op the second time |
| `test/rateLimiter.test.ts` | Requests are throttled within the window and allowed after reset |
| `test/orders.test.ts` | Order state machine only permits valid lifecycle transitions |
| `test/auth.test.ts` | API-key / Bearer-token auth gates protected routes |

```bash
npm test
```

<br>

## ⌨️ Quick Commands

```bash
make install
make docker-up
make dev
```

<br>

## 📄 License

Copyright (c) 2026 — Released under the **MIT License**.
