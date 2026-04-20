#!/usr/bin/env sh
set -eu

HOST="${REDIS_HOST:-127.0.0.1}"
PORT="${REDIS_PORT:-6379}"

if command -v redis-cli >/dev/null 2>&1 && redis-cli -h "$HOST" -p "$PORT" ping >/dev/null 2>&1; then
  echo "Redis already running on ${HOST}:${PORT}"
  exec sh -c 'while true; do sleep 3600; done'
fi

exec redis-server --save "" --appendonly no --bind "$HOST" --port "$PORT"
