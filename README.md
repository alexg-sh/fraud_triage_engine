# Fraud Triage Engine

Laravel 11 demo application for asynchronous fraud review. Orders are stored in SQLite for local development, triaged through a Redis-backed queue, monitored with Horizon, and reviewed in an Inertia React dashboard built with `shadcn/ui`.

## Stack

- Backend: Laravel 11, PHP 8.5
- Frontend: Inertia React, Vite, Tailwind CSS, `shadcn/ui`
- Local database: SQLite
- Queue and cache: Redis
- Monitoring: Laravel Horizon
- AI enrichment: OpenRouter via `.env`

## What It Does

- Persists orders with `customer_email`, `total_amount`, `ip_address`, billing and shipping addresses, `risk_score`, and an optional AI investigation note.
- Dispatches `ProcessOrderTriage` to the `triage` Redis queue on every order creation.
- Applies weighted fraud heuristics for:
  - billing and shipping country mismatch
  - order totals above `£2,000`
  - repeated orders from the same IP
  - disposable-looking email domains
- Sends high-risk orders to OpenRouter and stores a one-sentence investigation note plus the adjusted risk score.
- Seeds 1,000 synthetic orders with a 95/5 normal-to-suspicious split.
- Exposes a dashboard at `/orders` and Horizon at `/horizon`.

## Local Setup

1. Copy `.env.example` to `.env` if needed.
2. Set `OPENROUTER_API_KEY` in `.env`.
3. Start the local stack:

```bash
./vendor/bin/sail up -d
```

4. Install PHP dependencies inside the app container if you rebuild from scratch:

```bash
./vendor/bin/sail composer install
```

5. Install frontend dependencies if needed:

```bash
npm install
```

6. Run migrations and seed sample data:

```bash
./vendor/bin/sail artisan migrate:fresh --seed
```

7. Start Horizon and Vite:

```bash
./vendor/bin/sail artisan horizon
npm run dev
```

Then open:

- Dashboard: `http://localhost/orders`
- Horizon: `http://localhost/horizon`

## Useful Commands

```bash
php -d error_reporting=24575 ./vendor/bin/phpunit
npm run build
QUEUE_CONNECTION=sync CACHE_STORE=array SESSION_DRIVER=array php -d error_reporting=24575 artisan migrate:fresh --seed
```

## Notes

- Secrets stay in `.env`.
- The current Laravel 11 release still emits a PHP 8.5 deprecation from the framework’s vendor `database.php` config when running some Artisan and test commands. Application code is passing verification; the remaining deprecation is upstream.
