CREATE DATABASE IF NOT EXISTS promo_code_manager;

CREATE TABLE IF NOT EXISTS promo_code_manager.users
(
    user_id String,
    email String,
    name String,
    phone String,
    is_active UInt8,
    created_at DateTime64(3, 'UTC'),
    updated_at DateTime64(3, 'UTC'),
    version UInt64
)
ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id);

CREATE TABLE IF NOT EXISTS promo_code_manager.promocodes
(
    promocode_id String,
    code String,
    discount_percent UInt8,
    usage_limit_total UInt32,
    usage_limit_per_user UInt16,
    date_from Nullable(DateTime64(3, 'UTC')),
    date_to Nullable(DateTime64(3, 'UTC')),
    is_active UInt8,
    created_at DateTime64(3, 'UTC'),
    updated_at DateTime64(3, 'UTC'),
    version UInt64
)
ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(created_at)
ORDER BY (promocode_id, code);

CREATE TABLE IF NOT EXISTS promo_code_manager.orders
(
    order_id String,
    user_id String,
    user_email String,
    user_name String,
    amount Decimal(12, 2),
    promocode_id Nullable(String),
    promocode_code Nullable(String),
    discount_amount Decimal(12, 2),
    final_amount Decimal(12, 2),
    created_at DateTime64(3, 'UTC'),
    updated_at DateTime64(3, 'UTC'),
    version UInt64
)
ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, order_id, user_id);

CREATE TABLE IF NOT EXISTS promo_code_manager.promo_usages
(
    usage_id String,
    order_id String,
    user_id String,
    user_email String,
    user_name String,
    promocode_id String,
    promocode_code String,
    order_amount Decimal(12, 2),
    discount_amount Decimal(12, 2),
    final_amount Decimal(12, 2),
    used_at DateTime64(3, 'UTC'),
    created_at DateTime64(3, 'UTC'),
    version UInt64
)
ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(used_at)
ORDER BY (used_at, usage_id, promocode_id, user_id);
