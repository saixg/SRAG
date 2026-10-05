# Database Contract

## Database

PostgreSQL is the system of record.

pgvector is the initial vector extension.

PostgreSQL full-text search may provide lexical retrieval.

## Conceptual Entities

```text
Tenant
User
Role
Document
DocumentVersion
Page
EvidenceUnit
AuditEvent
```

Later retrieval-specific tables/indexes may be added as needed.

## Security

Protected tenant data must use PostgreSQL RLS.

Application filtering is not a substitute for RLS.

## Initial Design Principles

- normalized relational metadata
- explicit tenant ownership
- explicit document ownership
- explicit evidence ownership
- migration-based schema evolution
- indexes justified by actual query paths
- no hard-coded credentials

## Phase 0 Scope

Do not implement the complete production schema yet.

Establish:
- connection abstraction
- configuration
- migration strategy
- test database strategy

## Phase 1 Scope

Implement the minimum schema required for:

```text
tenant
user/identity context
document
document version
evidence
RLS
```
