#!/bin/sh
set -eu

mkdir -p \
  /var/www/html/storage/app/public \
  /var/www/html/storage/framework/cache/data \
  /var/www/html/storage/framework/sessions \
  /var/www/html/storage/framework/views \
  /var/www/html/storage/logs \
  /var/www/html/storage/database \
  /var/www/html/bootstrap/cache

rm -f /var/www/html/public/hot

if [ -n "${DB_DATABASE:-}" ]; then
  mkdir -p "$(dirname "$DB_DATABASE")"

  if [ ! -f "$DB_DATABASE" ]; then
    touch "$DB_DATABASE"
  fi
fi

php artisan migrate --force

exec "$@"
