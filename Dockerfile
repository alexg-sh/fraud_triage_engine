FROM composer:2 AS composer_deps

WORKDIR /var/www/html

COPY composer.json composer.lock ./
COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY public ./public
COPY resources ./resources
COPY routes ./routes
COPY artisan ./
COPY vite.config.js postcss.config.js tailwind.config.js tsconfig.json components.json package.json package-lock.json ./

RUN composer install --prefer-dist --optimize-autoloader --no-interaction --ignore-platform-req=ext-pcntl

FROM node:22-bookworm-slim AS frontend_build

WORKDIR /var/www/html

COPY package.json package-lock.json ./
RUN npm ci

COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY public ./public
COPY resources ./resources
COPY routes ./routes
COPY artisan ./
COPY vite.config.js postcss.config.js tailwind.config.js tsconfig.json components.json ./

RUN npm run build

FROM php:8.4-cli-bookworm

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl unzip libsqlite3-dev libzip-dev \
    && docker-php-ext-install pdo_sqlite pcntl zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .
COPY --from=composer_deps /var/www/html/vendor ./vendor
COPY --from=frontend_build /var/www/html/public/build ./public/build
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint

RUN chmod +x /usr/local/bin/docker-entrypoint \
    && rm -f public/hot \
    && rm -f bootstrap/cache/*.php \
    && mkdir -p storage/app storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

ENTRYPOINT ["/usr/local/bin/docker-entrypoint"]

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
