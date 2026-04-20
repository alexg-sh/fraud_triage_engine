# Fraud Triage Engine

Laravel 11 demo application for asynchronous fraud review. Orders are stored in SQLite, triaged through either a database-backed queue worker or Redis Horizon, monitored in an operations dashboard, and reviewed in an Inertia React UI built with `shadcn/ui`.

## Stack

- Backend: Laravel 11, PHP 8.5
- Frontend: Inertia React, Vite, Tailwind CSS, `shadcn/ui`
- Local database: SQLite
- Queue and cache: database-backed by default, Redis-backed when Horizon is enabled
- Monitoring: app-owned queue monitor at `/queue-monitor`, Laravel Horizon at `/horizon`
- AI enrichment: OpenRouter via `.env`

## What It Does

- Persists orders with `customer_email`, `total_amount`, `ip_address`, billing and shipping addresses, `risk_score`, and an optional AI investigation note.
- Dispatches `ProcessOrderTriage` to the `triage` queue on every order creation.
- Applies weighted fraud heuristics for:
  - billing and shipping country mismatch
  - order totals above `£2,000`
  - repeated orders from the same IP
  - disposable-looking email domains
- Stores heuristic risk scores asynchronously. OpenRouter analysis is requested only when an analyst opens a flagged order.
- Seeds 1,000 synthetic orders with a 95/5 normal-to-suspicious split.
- Exposes a dashboard at `/orders`, a queue monitor at `/queue-monitor`, and Horizon at `/horizon` when Redis is configured.

## Docker Setup

1. Copy `.env.example` to `.env` if needed.
2. Set `OPENROUTER_API_KEY` in `.env` if you want live note generation.
3. Build and start the app plus worker:

```bash
docker compose up --build -d
```

4. Seed demo data:

```bash
docker compose exec app php artisan migrate:fresh --seed
```

Then open:

- Dashboard: `http://localhost:8000/orders`
- Queue monitor: `http://localhost:8000/queue-monitor`
- Horizon: `http://localhost:8000/horizon`

## Useful Commands

```bash
docker compose up --build -d
docker compose logs -f app worker
docker compose exec app php artisan migrate:fresh --seed
docker compose exec app php artisan test
docker compose down -v
php -d error_reporting=24575 ./vendor/bin/phpunit
npm run build
composer dev:horizon
QUEUE_CONNECTION=sync CACHE_STORE=array SESSION_DRIVER=array php -d error_reporting=24575 artisan migrate:fresh --seed
```

## Notes

- Secrets stay in `.env`.
- `composer dev` uses the database worker fallback. `composer dev:horizon` starts a local Redis server plus Laravel Horizon with `QUEUE_CONNECTION=redis`.
- `TRIAGE_JOB_DELAY_MS` defaults to `150` locally so demo jobs visibly drain through the queue monitor one by one.
- The Docker stack uses SQLite plus the database queue so it works without Redis or Sail.
- The current Laravel 11 release still emits a PHP 8.5 deprecation from the framework’s vendor `database.php` config when running some Artisan and test commands. Application code is passing verification; the remaining deprecation is upstream.
