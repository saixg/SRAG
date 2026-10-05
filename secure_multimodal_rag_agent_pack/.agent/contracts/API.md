# API Contract

The API is implemented through FastAPI.

## Phase 0

### GET /health

Purpose:
Determine whether the application process is alive.

Expected response:

```json
{
  "status": "ok"
}
```

No authentication required.

## Future Core Endpoints

### Documents

```text
POST /documents
GET /documents
GET /documents/{document_id}
```

### Query

```text
POST /query
```

### Evidence

```text
GET /evidence/{evidence_id}
```

### Audit

```text
GET /audit
```

These are contracts for future phases, not claims that endpoints currently exist.

## Rules

- Validate request models.
- Return structured errors.
- Never expose unauthorized records.
- Do not leak tenant existence through error behavior.
- Authentication/authorization requirements must be explicit for protected endpoints.
