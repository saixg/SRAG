# Current Agent Task

## Phase

Phase 0 — Engineering Foundation

## Objective

Build the minimum trustworthy software foundation for Secure Multimodal RAG.

This is the FIRST implementation task.

Do not jump to full RAG.

---

## Required Outcome

Create a clean repository foundation with:

### Backend

- Python project configuration
- FastAPI application
- application entrypoint
- settings/configuration layer
- health endpoint
- structured project modules

### Testing

- pytest configuration
- first health endpoint test
- test command documented

### Database

Prepare PostgreSQL integration architecture.

Create:
- database configuration
- migration directory
- migration tooling configuration if selected
- initial database connection abstraction

Do NOT yet implement the complete production schema.

### Contracts

Create initial typed contracts for:
- health
- user identity context
- tenant context
- EvidenceUnit placeholder/domain model

The EvidenceUnit contract must be designed so it can later represent:
- text
- table
- image
- diagram
- OCR
- figure

### Configuration

Use environment-driven configuration.

Do not hard-code:
- database URLs
- API keys
- model keys
- secrets

Provide a safe example environment file if useful.

### Documentation

Update the actual repository documentation only after implementation.

---

## Constraints

Do not implement yet:

- LangChain pipelines
- LangGraph agents
- autonomous agents
- document ingestion
- OCR processing
- vector indexing
- LLM generation
- frontend
- authentication provider integration
- production RLS policies

These belong to later phases.

---

## Required Verification

Run:

1. formatting/linting if configured
2. type checking if configured
3. pytest
4. application startup/import verification

Minimum expected result:

```text
health test passes
```

No fake tests.

---

## Definition of Done

Phase 0 foundation is complete when:

- repository has a coherent structure
- backend starts
- health endpoint works
- settings load safely
- tests execute
- database integration boundary exists
- typed domain contracts exist
- no secrets are committed
- documentation reflects actual implementation
- all relevant tests pass

---

## After Completion

Update:

`.agent/CURRENT_STATE.md`

with verified facts.

Then recommend the next task:

> Phase 1 — Secure Text RAG vertical slice.
