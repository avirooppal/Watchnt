.PHONY: dev-infra dev-stop dev-clean dev-logs

dev:
	docker compose -f docker-compose.dev.yml up --build -d

dev-stop:
	docker compose -f docker-compose.dev.yml down

dev-clean:
	docker compose -f docker-compose.dev.yml down -v

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-logs-api:
	docker compose -f docker-compose.dev.yml logs -f api

dev-logs-worker:
	docker compose -f docker-compose.dev.yml logs -f worker
