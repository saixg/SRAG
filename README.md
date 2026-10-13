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

## Enterprise dataset (EnterpriseRAG-Bench)

[EnterpriseRAG-Bench](https://github.com/onyx-dot-app/EnterpriseRAG-Bench) (MIT) supplies
~500k simulated internal documents for a fictional company, plus 600 questions with gold
answers and the document ids each should retrieve. The corpus carries no permissions of
its own, so the adapter derives an ACL from the source system each document came out of.

```bash
python scripts/download_enterprise_bench.py          # subset only, via range requests
python scripts/ingest_enterprise_bench.py            # into the benchmark tenant
python scripts/eval_enterprise_bench.py              # recall and ACL enforcement
```

The download reads the 1.2GB `all_documents.zip` index remotely and fetches only what is
needed: every document a question expects, plus a bounded distractor sample per source.
Ingestion goes through the normal `IngestService` path — the documents are `.txt`, so
parsing, chunking, embedding and tenant stamping are identical to an HTTP upload.

Scope mapping (`src/srag/datasets/enterprise_bench.py`): `github`/`jira`/`linear` require
collection `engineering`, `hubspot` requires `sales`, `confluence`/`google_drive` require
`docs`; `slack`/`gmail`/`fireflies` stay open, with some distractors restricted to `admin`.
An unrecognised source fails closed. Gold documents are never admin-restricted, so an
evaluation stays reproducible without an admin token. Personas `demo_bench_engineer`,
`demo_bench_sales` and `demo_bench_admin` differ by collection, not only by role.

`scripts/eval_enterprise_bench.py` reports recall per persona and re-checks every returned
hit against `role_allows` independently of the retrieval engine; it exits non-zero if any
evidence reached a persona not entitled to it. The admin figure is the retrieval-quality
number, since admin bypasses scope checks — a scoped persona scores lower whenever a gold
document sits in a collection it does not hold, which is the access control working.

### Demo

Start the API and the Vite app, then switch identity in the sidebar between
**Bench engineer**, **Bench sales** and **Bench admin** and ask the same question:

> What are the default per file and total request size limits for multipart uploads?

The engineer gets `The default per-file limit is 10 MiB and the default total request limit
is 50 MiB.` with a citation to `dsid_ae068ee4aa9640159427cd941bef0238` — which is exactly the
document `questions.jsonl` lists under `expected_doc_ids` for that question. The sales
persona gets `No authorized evidence`, with the same wording it would use if the document
did not exist, so an answer cannot be used to probe for hidden documents.

### Measured results

Against 2,163 ingested documents / 19,577 evidence units, BGE-M3 on a GPU, 60 scored
questions (`scripts/eval_enterprise_bench.py --top-k 10 --limit 60`):

| Persona | recall@10 | Leaks |
| --- | --- | --- |
| admin (bypasses scope) | 0.92 | 0 |
| engineer (`engineering`) | 0.63 | 0 |
| sales (`sales`) | 0.35 | 0 |

`cross_tenant_leaks=0`. The scoped personas score lower because gold documents they are not
entitled to are withheld, which is the control working.

Limitations: the ingested corpus is a subset, not all ~500k documents, and the figures above
score 60 of the 500 questions; answer correctness is not graded automatically (only retrieval
and provenance), so the benchmark's `answer_facts` and its `answer_evaluation/` LLM judge are
unused; the benchmark data must never be used as training data (it carries a canary GUID);
and retrieval latency is dominated by the database, not the model — roughly 3.6s per hybrid
search against a remote pooler versus 21ms to embed the query on the GPU, partly because
`RetrievalEngine` fetches whole evidence rows including their 1024-dim embeddings.

## Embeddings and device

`EMBEDDER_PROVIDER=local` uses BGE-M3 (1024-dim, matching the `evidence_units.embedding`
column). `EMBEDDER_DEVICE` is `auto` (CUDA when usable, else CPU), `cpu`, or `cuda`, which
fails loudly rather than falling back silently. On CUDA the model is loaded in fp16, since
fp32 weights are 2.3GB and leave a 4GB card no room for activations; `EMBEDDER_BATCH_SIZE`
bounds that further. Ingest and query must use the same provider — BGE-M3 and hashing
vectors do not share a space. A CPU-only torch build makes BGE-M3 roughly 30x slower, so
`EMBEDDER_DEVICE=cuda` is the way to find out before throughput tells you.

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
