# Secure Multimodal RAG — Architecture

## Core Pipeline

```text
USER
 ↓
IDENTITY
 ↓
POLICY
 ↓
QUERY UNDERSTANDING
 ↓
MULTIMODAL RETRIEVAL
 ↓
CANDIDATE FUSION
 ↓
FINAL AUTHORIZATION
 ↓
EVIDENCE BUNDLE
 ↓
LLM/VLM
 ↓
CITATION VERIFICATION
 ↓
ANSWER
 ↓
AUDIT
```

## Components

### API
FastAPI owns request validation and application orchestration.

### Identity/Policy
Resolves authenticated identity, tenant, roles, and authorization context.

### Ingestion
Turns source documents into typed EvidenceUnits.

### Retrieval
Uses lexical, semantic, visual, and structured signals where appropriate.

### Evidence
Creates the authorized evidence bundle that is allowed to reach the model.

### Generation
Invokes a replaceable LLM/VLM provider.

### Citation
Maps claims/results back to source evidence.

### Audit
Records security-relevant lifecycle events.

## Database

PostgreSQL is the system of record.

pgvector provides vector retrieval.

PostgreSQL FTS provides lexical retrieval where useful.

RLS provides database-level tenant/security isolation.

## EvidenceUnit

The system does not treat every document as plain text.

Conceptually:

```text
EvidenceUnit
├── evidence_id
├── tenant_id
├── document_id
├── page_id
├── element_id
├── element_type
├── source location
├── text
├── visual reference
├── structured content
├── security scope
└── provenance
```

## Security

The fundamental invariant is:

```text
MODEL_CONTEXT ⊆ AUTHORIZED_EVIDENCE
```

The model cannot:
- query the database
- decide authorization
- access arbitrary documents

## Retrieval

Initial architecture:

```text
                 QUERY
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
        FTS      VECTOR    VISUAL/
                          STRUCTURED
          │        │        │
          └────────┼────────┘
                   ▼
             FUSION/RERANK
                   ▼
              AUTHORIZATION
                   ▼
             EVIDENCE BUNDLE
```

## Framework Boundary

LangChain/LangGraph may be used where they reduce implementation cost.

They must not own:
- authorization
- RLS
- evidence security
- tenant isolation

## Architecture Rule

Build the smallest correct vertical slice before introducing complex orchestration or distributed infrastructure.
