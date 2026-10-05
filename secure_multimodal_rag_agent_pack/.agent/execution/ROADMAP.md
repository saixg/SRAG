# Build Roadmap

## Phase 0 — Foundation

Goal:
Create a clean, testable backend foundation.

Exit:
- backend runs
- health endpoint works
- tests run
- settings work
- database boundary exists
- domain contracts exist

## Phase 1 — Secure Text RAG

Build:

```text
identity
→ tenant
→ document
→ text extraction
→ evidence
→ embeddings
→ pgvector
→ FTS
→ RLS
→ retrieval
→ evidence bundle
→ generation
→ citation
```

Exit:
A tenant-isolated text RAG vertical slice works end-to-end.

## Phase 2 — Evidence UX

Build:
- evidence endpoint
- source page metadata
- citation resolution
- evidence viewer foundation

Exit:
Every answer can be inspected back to source evidence.

## Phase 3 — OCR and Tables

Build:
- OCR extraction
- table evidence
- structured representations
- retrieval

Exit:
Questions over OCR/table content work.

## Phase 4 — Visual Evidence

Build:
- images
- figures
- diagrams
- visual representation
- visual retrieval

Exit:
Visual questions work with source evidence.

## Phase 5 — Multimodal Fusion

Build:

```text
text retrieval
+
table retrieval
+
visual retrieval
→ candidate fusion
→ reranking
→ evidence bundle
```

Exit:
Cross-modal questions work.

## Phase 6 — Security Hardening

Build:
- canary leakage suite
- prompt injection tests
- cache isolation
- citation authorization
- direct endpoint attack tests

Exit:
Security suite passes.

## Phase 7 — Productization

Build:
- workspace
- document explorer
- collections
- evidence UX
- security/audit views

## Phase 8 — Evaluation

Measure:
- retrieval quality
- citation correctness
- authorization correctness
- multimodal reasoning
- attack resistance
- latency
- cost

## Rule

Do not skip to a later phase because it looks more impressive.
