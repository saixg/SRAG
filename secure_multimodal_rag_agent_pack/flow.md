# Secure Multimodal RAG — Execution Flows

## Development Flow

Every task:

```text
READ CONTEXT
→ INSPECT REPOSITORY
→ CHECK CURRENT STATE
→ CHECK CONTRACTS
→ PLAN
→ IMPLEMENT
→ TEST
→ SECURITY VERIFY
→ UPDATE STATE
→ REPORT
```

## Phase 0 Flow

```text
Repository
→ Python project
→ FastAPI
→ settings
→ database boundary
→ typed contracts
→ health endpoint
→ pytest
→ verified foundation
```

## Phase 1 Flow

```text
Identity
→ Tenant
→ Document
→ Parse text
→ Evidence
→ Embed
→ pgvector/FTS
→ RLS
→ Retrieve
→ Authorize
→ Evidence bundle
→ Generate
→ Cite
```

## Ingestion Flow

```text
UPLOAD
→ VALIDATE
→ AUTHENTICATE
→ RESOLVE TENANT
→ CREATE DOCUMENT
→ PARSE
→ DECOMPOSE
→ CREATE EVIDENCE
→ REPRESENT
→ INDEX
→ VERIFY
→ READY
```

## Query Flow

```text
QUESTION
→ AUTHENTICATE
→ RESOLVE POLICY
→ UNDERSTAND QUERY
→ SELECT RETRIEVAL MODES
→ RETRIEVE CANDIDATES
→ APPLY AUTHORIZATION
→ FUSE/RERANK
→ BUILD EVIDENCE
→ GENERATE
→ VERIFY CITATIONS
→ ANSWER
→ AUDIT
```

## Security Flow

```text
REQUEST
→ IDENTITY
→ TENANT
→ POLICY
→ DATABASE/RLS
→ AUTHORIZED EVIDENCE
→ MODEL
```

If authorization cannot be established:

```text
DENY
```

## Multimodal Evolution

### Slice 1
Text.

### Slice 2
OCR.

### Slice 3
Tables.

### Slice 4
Images/figures/diagrams.

### Slice 5
Cross-modal retrieval fusion.

## Demo Flow

```text
Authorized user
→ technical question
→ text + diagram evidence
→ answer
→ inspect evidence
→ switch to unauthorized user
→ same question
→ evidence denied
→ run canary leakage test
→ prove forbidden evidence never reaches model
```
