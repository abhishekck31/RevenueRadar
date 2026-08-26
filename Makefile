.PHONY: setup dev seed stop clean logs docker

# First-time setup
setup:
	@echo "🚀 Setting up RevenueRadar..."
	cp -n .env.example .env || true
	npm install
	docker compose up -d postgres redis
	@echo "⏳ Waiting for database..."
	sleep 5
	npx prisma db push --schema=prisma/schema.prisma --accept-data-loss
	npm run db:seed
	@echo "✅ Setup complete! Run 'make dev' to start"

# Development mode
dev:
	docker compose up -d postgres redis
	npm run dev

# Full Docker stack
docker:
	docker compose up --build

# Seed database
seed:
	npm run db:seed

# Stop everything
stop:
	docker compose down

# Clean everything (nuclear)
clean:
	docker compose down -v
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/.next apps/*/dist

# View logs
logs:
	docker compose logs -f api
