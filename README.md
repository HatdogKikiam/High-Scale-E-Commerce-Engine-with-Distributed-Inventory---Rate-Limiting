# High-Scale E-Commerce Engine

A production-oriented Node.js and TypeScript e-commerce platform designed to demonstrate distributed inventory reservation, rate limiting, idempotent webhook processing, and operational resilience under load.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Node.js](https://img.shields.io/badge/Node.js-22.x-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-blue) ![Redis](https://img.shields.io/badge/Redis-7.x-red)

## Overview

This repository models a high-throughput commerce backend that combines:

- Redis-backed atomic stock reservation using Lua scripts
- PostgreSQL transactional consistency for orders and inventory state
- Sliding-window rate limiting with Redis sorted sets
- Idempotent webhook processing for external payment events
- BullMQ background workers for order expiration and inventory restoration

## Architecture

```text
Clients / Traffic
      |
      v
Express API Server
   |        |        |
   |        |        |
   v        v        v
Redis     PostgreSQL   BullMQ Worker
(Lua lock) (Orders + stock) (Expiration recovery)
```

## Core Features

- Distributed inventory reservation with atomic Redis and PostgreSQL coordination
- Flash-sale-safe stock handling to prevent overselling
- Sliding-window request throttling for API protection
- Idempotent Stripe-style webhook processing with database-backed verification
- Background cleanup for expired pending orders
- Metrics, structured logging, Swagger docs, and containerized development support

## Tech Stack

- Node.js 22
- TypeScript
- Express
- PostgreSQL 16
- Redis 7
- BullMQ
- Docker Compose
- k6 for load testing

## Getting Started

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

## Environment Variables

```bash
PORT=3000
DATABASE_URL=postgresql://ecommerce:ecommerce@127.0.0.1:5432/ecommerce
REDIS_URL=redis://127.0.0.1:6379
```

## Project Structure

```text
.
├── .devcontainer/
├── .github/workflows/
├── docker/
│   └── init.sql
├── src/
│   ├── app.ts
│   ├── config/
│   ├── db/
│   ├── middleware/
│   ├── observability/
│   ├── resilience/
│   ├── services/
│   ├── types/
│   └── workers/
├── docker-compose.yml
├── k6-stress-test.js
├── package.json
├── tsconfig.json
└── README.md
```

## Reliability and Operations

- Structured logging and trace context for request lifecycle visibility
- Prometheus metrics available at `/metrics`
- Swagger documentation available at `/docs`
- Validation and error handling are centralized at the API boundary
- Worker failures are handled with retry/backoff and dead-letter-style handling
- Fault-injection controls available at `/status` and `/admin/faults`
- A local monitoring dashboard is served from `/dashboard.html`

## Quick Commands

```bash
make install
make docker-up
make dev
```

## License

Copyright (c) 2026

MIT License
