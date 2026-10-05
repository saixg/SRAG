# Security Architecture Contract

## Threat Model

Assume:

- users may intentionally request unauthorized data
- users may attempt tenant switching
- documents may contain prompt injection
- retrieved content is untrusted
- frontend requests are untrusted
- model output may be incorrect
- caches may accidentally cross security boundaries
- developers may accidentally bypass security through convenience code

## Trust Boundaries

```text
Browser
  ↓ untrusted
API
  ↓
Identity
  ↓
Policy
  ↓
Database/RLS
  ↓
Authorized Evidence
  ↓
Model
```

## Security Invariants

### S1
Unauthorized data must never enter model context.

### S2
RLS is mandatory for protected tenant data.

### S3
Every evidence type inherits security scope.

### S4
Authorization uncertainty means DENY.

### S5
Caches must include authorization scope.

### S6
Citations must reference real authorized evidence.

### S7
Document content is untrusted.

### S8
The model is never an authorization engine.

### S9
Security-sensitive operations require tests.

## Canary Strategy

Use explicit test values such as:

```text
TENANT_A_SECRET_CANARY
TENANT_B_SECRET_CANARY
ADMIN_ONLY_CANARY
ENGINEERING_ONLY_CANARY
```

Tests must prove forbidden canaries cannot reach:
- retrieval results
- evidence bundles
- model context
- citations
- API responses
