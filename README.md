# Fraud Triage Engine

Laravel 11 demo application for asynchronous fraud review. Orders are stored in SQLite, triaged through either a database-backed queue worker or Redis Horizon, monitored in an operations dashboard, and reviewed in an Inertia React UI built with `shadcn/ui`.

## Assignment Fit

This project was built to satisfy a technical interview assignment focused on agentic coding and modern PHP workflows. It demonstrates:

- A real Laravel application with clear background-processing use cases
- Queued jobs for order triage and demo queue activity
- Iterative development with an AI coding assistant used for implementation, review, and refinement
- A codebase that is still explainable and defendable without treating AI output as final by default

## AI Tool And Setup

- AI tool used: `Codex CLI`
- How it was used:
  - repository exploration and architecture iteration
  - controller, job, test, and UI implementation
  - debugging failing flows and tightening queue-driven behavior
  - README and submission preparation
- Working style:
  - I used the AI conversationally rather than as a copy-paste generator
  - I guided the implementation, challenged weak suggestions, and adjusted the product scope as the codebase evolved
  - I kept the AI focused on concrete repository changes, then verified behavior with tests and build output

## Development Approach

The development approach was to pick a project where queued jobs are core to the user experience, not an afterthought. Fraud triage was a good fit because it naturally separates:

- synchronous order intake
- asynchronous heuristic scoring
- on-demand analyst enrichment
- operational visibility into queued work

The build process followed a practical loop:

1. Define the user-facing workflow and queue boundaries.
2. Implement the Laravel backend and job pipeline.
3. Add operations visibility so queued work can be demonstrated clearly.
4. Add tests around job dispatch, scoring, note generation, and analyst actions.
5. Refine the UI to make the system easy to explain during a demo.

## Architectural Decisions

### Why This Project

Fraud review is a strong assignment fit because it has obvious background-processing needs. Orders can be accepted immediately, scored asynchronously, inspected by an analyst later, and monitored through a queue dashboard.

### Queue Design

- `ProcessOrderTriage` handles asynchronous risk scoring for new orders
- `DemoQueuePulse` provides visible non-triage background work for demos
- The application works with the database queue by default, with optional Redis Horizon support for a richer operations path

This was intentional: the database queue keeps local setup simple, while Horizon demonstrates that the same application can move to a more production-style operational model.

### Risk Analysis Design

- Heuristic scoring runs first and produces a deterministic baseline score
- AI analysis is not triggered on every order automatically
- OpenRouter analysis runs only when an analyst opens a flagged order and wants more context

That decision keeps queued processing meaningful without making the system dependent on AI for every request. It also makes the trade-off easier to justify: heuristics drive the workflow, AI supports analyst review.

### Analyst Workflow Design

- Orders can be filtered by review status, risk band, search terms, and analyst decision state
- Investigation notes are cached in session for the current review flow
- Final analyst decisions are stored on the order record with a timestamp and optional note

This gives the demo a full operational lifecycle instead of stopping at “job completed successfully.”

### Demoability

The application includes:

- demo order batching
- demo queue jobs
- reset actions
- queue-monitor visibility
- optional local Horizon bootstrapping

These pieces were added so the application is easy to show live in an interview setting without relying on stale seeded data alone.

## Key Discoveries

- The best queued-job demo is one where the user can actually see work moving through the system. That led to the queue monitor, demo jobs, and visible job-drain behavior.
- Always-on AI generation was a weaker design than analyst-triggered AI enrichment. On-demand generation made the architecture easier to explain and cheaper to operate.
- Submission quality depends on the process being visible. Tests, queue visibility, and README clarity matter as much as the raw feature list for this assignment.
- The database queue is a useful default for local development, but adding optional Horizon support makes the project more credible as a modern operations-focused PHP application.

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

## How It Showcases Queued Jobs

- New orders dispatch `ProcessOrderTriage` onto the `triage` queue
- Demo activity can dispatch `DemoQueuePulse` onto the `default` queue
- The queue monitor exposes pending jobs, failures, recent processing activity, and demo job runs
- Local development can use either the database-backed worker path or Redis Horizon

This makes queued work central to the application rather than a hidden implementation detail.

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
