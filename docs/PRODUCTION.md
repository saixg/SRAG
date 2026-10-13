# Production checklist

Use this before a pilot deploy. Development and CI keep demo tokens and hashing embeddings. Production startup refuses that combination.

## Required environment

| Variable | Production value |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `SECRET_KEY` | long random secret, not the placeholder |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret |
| `DEV_AUTH_TOKEN` | unset |
| `EMBEDDER_PROVIDER` | `local` (BGE-M3, 1024 dimensions) |
| `CACHE_BACKEND` | `redis` or `disabled` |
| `REDIS_URL` | required when the cache backend is `redis` |
| `CORS_ORIGINS` | explicit origins, never `*` |
| `DATABASE_URL` | Supabase pooler URI |

### Connection pooler

`*.pooler.supabase.com` serves session mode on **5432** and transaction mode on
**6543**. Either works: the engine switches asyncpg's statement caches off by
itself when the URL names 6543 (`Settings.db_is_transaction_pooler`), because a
transaction-mode backend is shared between clients and cannot keep prepared
statements. Tenant isolation does not depend on the mode — `set_config(...,
true)` and `SET LOCAL ROLE` are transaction-local, so Postgres reverts them at
COMMIT and a recycled connection can never carry another tenant's binding.

asyncpg enables `TCP_NODELAY` but never `SO_KEEPALIVE`, so a connection held
across a long CPU/GPU-bound gap (embedding a batch) sends nothing and the flow
can be dropped between here and the pooler; the next statement then fails with
`connection was closed in the middle of operation`. `create_engine_from_settings`
turns keepalives on, bounds connection reuse with `pool_recycle` (keep it under
Supavisor's 3600s server lifetime) and pre-pings on checkout. **Scripts must use
that factory rather than calling `create_async_engine` directly.** Tunables:
`DB_KEEPALIVE_IDLE`, `DB_KEEPALIVE_INTERVAL`, `DB_KEEPALIVE_COUNT`,
`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE`, `DB_POOL_TIMEOUT`,
`DB_COMMAND_TIMEOUT`. Keep `DB_POOL_SIZE + DB_MAX_OVERFLOW` per process well
under the instance's `max_connections` (60 on the current plan).

Optional: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` so `POST /api/v1/tenants/bootstrap` writes `app_metadata.tenant_id` onto the Supabase user. Without them, bootstrap still creates the tenant and user rows and returns `claim_updated: false`. The next access token must carry `app_metadata.tenant_id` or queries return 401.

## Identity

1. User signs up in Supabase Auth.
2. Client calls `POST /api/v1/tenants/bootstrap` with the access token and a tenant name.
3. The API inserts `tenants` and `users`. The first user is `admin`.
4. Later requests use `GET /api/v1/me`. Demo personas (`demo_engineer`, and the rest) exist only when `APP_ENV` is `development` or `testing`.

## Single deploy

Build the Vite app, then start the API. FastAPI serves `srag-frontend/dist` at `/` when that directory exists. API routes stay under `/api/v1`.

```bash
cd srag-frontend
npm ci
npm run build
cd ..
alembic upgrade head
uvicorn srag.main:app --host 0.0.0.0 --port 8000
```

The Next.js app in `web/` is the marketing and app shell for the same API. Run it separately (`npm run dev` in `web/`) or host it on its own origin and set `CORS_ORIGINS`. `SRAG_API_ORIGIN` is the rewrite target, default `http://127.0.0.1:8000`.

## Gray code kept

- `sql_engine` and the employee CSV path stay. They prove model-written SQL is rejected.
- The Unstructured parser stays optional (`metadata.parser = unstructured`). Docling and PaddleOCR are the default.
- `evaluation/metrics.py` stays and is used by the golden check.

## Rotate these if they were ever committed

The deleted root scripts contained a Groq API key and a database password. Rotate both in Groq and Supabase before the next pilot, then put the new values only in `.env` or the host secret store.
