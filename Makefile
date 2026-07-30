PNPM ?= pnpm
NPM ?= npm

.PHONY: install dev build test seed docker-up docker-down

install:
	$(NPM) install

dev:
	$(NPM) run dev

build:
	$(NPM) run build

test:
	$(NPM) run test

seed:
	$(NPM) run seed

docker-up:
	docker compose up -d postgres redis redisinsight

docker-down:
	docker compose down
