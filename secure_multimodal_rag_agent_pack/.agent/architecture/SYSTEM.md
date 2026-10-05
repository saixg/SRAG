# System Architecture Contract

## Canonical Pipeline

```text
USER
 ↓
IDENTITY
 ↓
AUTHORIZATION CONTEXT
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

## Core Components

### Identity
Establishes:
- user
- tenant
- roles
- policy context

### Ingestion
Transforms source documents into typed EvidenceUnits.

### Retrieval
Finds candidates using appropriate retrieval signals.

### Authorization
Determines whether evidence is usable.

### Evidence
Creates the only context package that may reach the model.

### Generation
Produces an answer from the evidence package.

### Citation
Maps answer claims to source evidence.

### Audit
Records security-relevant lifecycle events.

## Core Rule

The model cannot query the database directly.

The model cannot decide authorization.

The model receives an explicit evidence bundle.
