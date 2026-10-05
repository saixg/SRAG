# Project Context

## Name

Secure Multimodal RAG

## One-Sentence Definition

A secure enterprise knowledge platform that retrieves authorized evidence from multimodal confidential documents and generates answers grounded only in that evidence.

## Core Thesis

Traditional RAG optimizes relevance.

Enterprise RAG must optimize:

```text
RELEVANCE
+
AUTHORIZATION
+
PROVENANCE
+
AUDITABILITY
```

Multimodal enterprise documents additionally require:

```text
TEXT
+
TABLES
+
OCR
+
IMAGES
+
FIGURES
+
DIAGRAMS
+
LAYOUT
```

The system must preserve security across all of them.

## Product

Build a secure intelligence workspace containing:

- document ingestion
- document collections
- secure search
- conversational querying
- multimodal retrieval
- evidence inspection
- citations
- provenance
- security controls
- audit history

## Primary User Experience

A user asks:

> "Which valve connects subsystem A to pump B, and what pressure is specified?"

The system should be able to:

1. understand the question
2. retrieve relevant diagram evidence
3. retrieve relevant text/table evidence
4. enforce authorization
5. combine only authorized evidence
6. answer
7. cite the exact source
8. allow the user to inspect the evidence

## What Makes This Different

Do not compete by saying:

> "We added RBAC to RAG."

The differentiator is:

> Permission-aware multimodal evidence retrieval.

The system should be able to prove that unauthorized evidence never reached the model.

## Initial Technical Direction

Backend:
- Python
- FastAPI

Database:
- PostgreSQL
- pgvector
- PostgreSQL FTS

Document understanding:
- Docling
- PaddleOCR

Embedding:
- BGE-M3 baseline

Generation:
- provider abstraction for LLM/VLM

Frontend:
- modern web application

## Security Model

The core invariant is:

```text
MODEL_CONTEXT ⊆ AUTHORIZED_EVIDENCE
```

Security must exist before generation.

## Current Repository State

This repository is intentionally starting from an empty initialized Git repository.

No application code should be assumed to exist.

This context describes the target system, not implemented functionality.

## Current Phase

Phase 0 — Engineering Foundation.

## Current Objective

Create the engineering foundation required to begin a trustworthy implementation:

- repository structure
- Python backend foundation
- configuration
- database configuration
- migration strategy
- typed domain contracts
- health endpoint
- test infrastructure
- development documentation
- clean startup

Do not implement full multimodal retrieval during Phase 0.
