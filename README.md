# Fraud Triage Engine

Fraud Triage Engine is a Laravel 13 app for asynchronous fraud review. Orders are ingested, pushed through a queue-backed triage flow, surfaced in an operations dashboard, and reviewed in an Inertia React interface.

It exists to show a practical queued-job workflow in a small but explainable product. The project focuses on showing how background processing, operational visibility, and analyst review can fit together in one application instead of treating queues as hidden infrastructure.

Selected user messages that shaped the build are collected in [fraud-triage-selected-user-messages.md](./fraud-triage-selected-user-messages.md).

## Run And Build

### Local development

1. Install dependencies:

```bash
composer install
npm install
```

2. Prepare the environment:

```bash
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
```

Set `OPENROUTER_API_KEY` in `.env` before running the app if you want AI investigation notes to work. The app expects a valid OpenRouter API key for that part of the workflow.

3. Start the app:

```bash
composer dev
```

This runs the Laravel server, Vite, logs, and the database queue worker.

4. Open:

- App: `http://127.0.0.1:8000/orders`
- Queue monitor: `http://127.0.0.1:8000/queue-monitor`
- Horizon: `http://127.0.0.1:8000/horizon` when running Redis mode

### Redis / Horizon mode

```bash
composer dev:horizon
```

### Production build

```bash
npm run build
```

## Development Approach

The development approach was to make queued work central to the product. Fraud review was a good fit because it naturally separates immediate order intake from asynchronous scoring, investigation support, and operational monitoring.

The implementation was iterated in a tight loop: define the user-facing workflow, wire the queue boundaries, add visibility into job activity, then refine the UI and tests until the system was easy to explain and defend.

## Design

The design centers on an operations-first workflow:

- Orders are triaged asynchronously so the queue is part of the core behavior.
- The dashboard emphasizes scanability for review decisions rather than generic CRUD.
- The queue monitor makes job activity visible in local development, with Horizon available when Redis is enabled.
- Heuristic scoring drives the system first; AI investigation is supporting context rather than the primary decision-maker.

## Stack

- Backend: Laravel 13, PHP, Horizon
- Frontend: Inertia React, TypeScript, Vite
- UI: Tailwind CSS, `shadcn/ui`
- Data store: SQLite
- Queue: database-backed by default, Redis-backed when Horizon is enabled
- AI integration: OpenRouter
