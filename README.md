# Secure Multimodal RAG

Secure enterprise knowledge platform with permission-aware multimodal evidence retrieval.

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+ (for later phases — not required for Phase 0 foundation)

### Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment config
cp .env.example .env
# Edit .env with your configuration
```

### Run Tests

```bash
pytest
```

### Run Application

```bash
# Development server
uvicorn srag.main:app --reload

# Or directly
python -m srag.main
```

### Health Check

```
GET /api/v1/health
```

## Project Structure

```
src/srag/
├── __init__.py
├── app.py              # FastAPI application factory
├── main.py             # Application entrypoint
├── settings.py         # Environment-driven configuration
├── logging.py          # Structured logging
├── api/
│   ├── __init__.py
│   └── health.py       # Health endpoint
├── contracts/
│   ├── __init__.py
│   ├── health.py       # Health response models
│   ├── identity.py     # User/tenant identity models
│   └── evidence.py     # EvidenceUnit domain model
└── db/
    ├── __init__.py
    └── session.py       # Async database session management

migrations/
├── env.py              # Alembic async configuration
├── script.py.mako      # Migration template
└── versions/           # Migration files

tests/
├── conftest.py         # Test fixtures
├── test_health.py      # Health endpoint tests
├── test_settings.py    # Configuration tests
└── test_contracts.py   # Domain contract tests
```

## Architecture

See `secure_multimodal_rag_agent_pack/architecture.md` for the full system architecture.

## Current Phase

**Phase 0 — Engineering Foundation** (complete)

The repository has a working backend, configuration layer, database integration boundary, typed domain contracts, health endpoint, and automated tests.
