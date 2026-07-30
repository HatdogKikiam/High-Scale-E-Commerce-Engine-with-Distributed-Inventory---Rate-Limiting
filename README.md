<div align="center">

# ⚡ High-Scale E-Commerce Engine

A production-oriented Node.js and TypeScript commerce platform that demonstrates distributed inventory reservation, rate limiting, idempotent webhooks, resilient payment flows, and operational observability.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

---

## 📖 Overview

This repository combines:

| Capability | Implementation |
|---|---|
| Atomic stock reservation | Redis-backed Lua scripts |
| Transactional consistency | PostgreSQL for orders and inventory state |
| API protection | Sliding-window rate limiting via Redis sorted sets |
| Payment safety | Idempotent, database-verified webhook processing |
| Self-healing | BullMQ workers for order expiration and stock restoration |
| Auth | API-key and Bearer-token support |
| Commerce workflows | Persistent carts, refunds, outbox events, and catalog search |

---

## 🏗️ Architecture

```text
                    Clients / Traffic
                          |
                          v
                  Express API Server
                 /         |          \
                v          v           v
            Redis     PostgreSQL    BullMQ Worker
          (Lua lock)  (Orders +     (Expiration
                       stock)        recovery)
```

---

## ✨ Core Features

- 🔒 **Distributed inventory reservation** — atomic Redis + PostgreSQL coordination
- 🛡️ **Flash-sale-safe stock handling** — prevents overselling under load
- 🚦 **Sliding-window request throttling** — API-level protection
- 🔁 **Idempotent, Stripe-style webhook processing** — DB-backed verification
- 🧹 **Background cleanup** for expired pending orders
- 🛒 **Persistent carts** for checkout workflows
- 🔄 **Refund and lifecycle support** for commerce operations
- 📬 **Outbox event storage** for reliable webhook emission
- 📊 **Metrics, structured logging, Swagger docs**, and containerized dev support

---

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

---

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

---

## ⚙️ Environment Variables

```bash
PORT=3000
DATABASE_URL=postgresql://ecommerce:ecommerce@127.0.0.1:5432/ecommerce
REDIS_URL=redis://127.0.0.1:6379
AUTH_REQUIRED=true
API_KEYS=demo-key
OAUTH2_ACCESS_TOKEN=demo-token
```

---

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

---

## 🛡️ Reliability & Operations

- Structured logging and trace context for full request lifecycle visibility
- Prometheus metrics at **`/metrics`**
- Swagger documentation at **`/docs`**
- Centralized validation and error handling at the API boundary
- Worker retry/backoff with dead-letter-style failure handling
- Fault-injection controls at **`/status`** and **`/admin/faults`**
- Local monitoring dashboard served from **`/dashboard.html`**

### Inventory Drift Detection & Reconciliation

If Redis `inventory:{productId}:available` and PostgreSQL `stock_quantity - reserved_quantity` ever diverge, follow these steps:

- Detect: run a periodic job that scans products and compares `stock_quantity - reserved_quantity` against the Redis key; log or emit mismatches to the outbox.
- Repair (best-effort): pause reservations, compute the authoritative value from Postgres, and write it back to Redis atomically (or via a maintenance script) while alerting operators.
- Prevent: code paths that mutate stock update both Postgres and Redis in the same logical operation; worker and refund flows include compensating reverts on partial failures.

This repository includes logic to revert Redis updates on partial failures in worker/refund flows; add a scheduled reconciliation job if you expect drift in production.

---

## ⌨️ Quick Commands

```bash
make install
make docker-up
make dev
```

---

## 📄 License

Copyright (c) 2026 — Released under the **MIT License**.
