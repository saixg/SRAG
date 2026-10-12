# Secure Multimodal RAG

Bevel is a tenant-isolated evidence platform. Answers are generated only from rows Postgres RLS already scoped to the caller, then checked by a fail-closed citation verifier.

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
copy .env.example .env
alembic upgrade head
uvicorn srag.main:app --reload
```

API: `http://127.0.0.1:8000`  
Health: `GET /api/v1/health`  
Dev bearer: `DEV_AUTH_TOKEN` (development and testing only)

Vite workspace and Copilot:

```bash
cd srag-frontend
npm install
npm run dev
```

Next.js marketing site and Copilot: `web/` (`npm install` then `npm run dev`). See `docs/PRODUCTION.md` for the production lock list and the single-deploy runbook.

## What is implemented

- Supabase JWT auth, dev personas, and `POST /api/v1/tenants/bootstrap`
- Hybrid retrieval (vector + full text), role and collection scope, tenant-keyed cache
- `POST /api/v1/query` and `POST /api/v1/query/stream`
- Document upload, workspace, collections, audit, evidence inspect
- Async accept path for PDF and images (`202`, status `processing`)
- Golden retrieval check: `python scripts/eval_golden.py`

Pilot embeddings should be `EMBEDDER_PROVIDER=local` (BGE-M3). Tests and CI force the hashing embedder so they stay offline.

## Tests

```bash
pytest
python scripts/eval_golden.py
```

## Layout

```
src/srag/          API, retrieval, ingestion, generation
srag-frontend/     Vite app served from dist/ when built
web/               Next.js App Router site
migrations/        Alembic
docs/PRODUCTION.md Production checklist and deploy runbook
```
