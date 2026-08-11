.PHONY: help install dev docker-up docker-down build lint typecheck test db-migrate db-seed

help:
	@echo "CV Studio AI monorepo"
	@echo "  make install     - pnpm install"
	@echo "  make docker-up   - Postgres + Redis"
	@echo "  make dev         - API + Web"
	@echo "  make build       - turbo build"
	@echo "  make lint        - turbo lint"
	@echo "  make typecheck   - turbo typecheck"
	@echo "  make test        - turbo test"
	@echo "  make db-migrate  - prisma migrate"
	@echo "  make db-seed     - prisma seed"

install:
	pnpm install

docker-up:
	pnpm docker:up

docker-down:
	pnpm docker:down

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed
