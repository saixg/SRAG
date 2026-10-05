# Secure Multimodal RAG — System Architecture

## 1. Architectural Principle

The architecture is evidence-first and security-first.

The canonical pipeline is:

```text
USER
  ↓
IDENTITY
  ↓
POLICY / AUTHORIZATION CONTEXT
  ↓
QUERY UNDERSTANDING
  ↓
AUTHORIZED RETRIEVAL SPACE
  ↓
MULTIMODAL RETRIEVAL
  ↓
CANDIDATE FUSION / RERANKING
  ↓
FINAL AUTHORIZATION
  ↓
EVIDENCE BUNDLE
  ↓
LLM / VLM GENERATION
  ↓
CITATION / CLAIM VERIFICATION
  ↓
ANSWER + EVIDENCE
  ↓
AUDIT
```

Security must not be bolted onto the end.

---

## 2. High-Level Components

```text
┌──────────────────────────────────────────────────────────────┐
│                         WEB CLIENT                           │
│  Workspace │ Documents │ Ask │ Evidence │ Security │ Audit  │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         FASTAPI                              │
│ Auth │ Documents │ Query │ Evidence │ Audit │ Health         │
└─────────────────────────────┬────────────────────────────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
       Identity/Policy   Ingestion         Query Service
              │               │                │
              │               ▼                ▼
              │         Parser/OCR       Query Router
              │               │                │
              │               ▼        ┌───────┼────────┐
              │        Evidence Units   ▼       ▼        ▼
              │               │       FTS   Vector   Visual/
              │               │             Search   Structured
              │               │       └───────┼────────┘
              │               │               ▼
              └───────────────┼──── Authorization
                              │               │
                              ▼               ▼
                         PostgreSQL      Evidence Bundle
                         + pgvector            │
                              │                ▼
                              │          Generation
                              │             LLM/VLM
                              │                │
                              │                ▼
                              │       Citation Verification
                              │                │
                              └───────────► Audit
```

---

## 3. Trust Boundaries

### Boundary A — Client → API
Treat all client input as untrusted.

### Boundary B — API → authorization
Identity and authorization context must be established before protected retrieval.

### Boundary C — retrieval → evidence
Retrieved candidates are untrusted until authorization is enforced.

### Boundary D — evidence → model
Only the final authorized evidence bundle may enter model context.

### Boundary E — model → answer
Model output is untrusted until citation/evidence checks are applied.

---

## 4. Data Architecture

PostgreSQL is the system of record.

Conceptual entities:

```text
Tenant
 ├── User
 │    └── Role / Policy
 │
 └── Document
      ├── DocumentVersion
      │    └── Page
      │         └── EvidenceUnit
      │
      └── SecurityScope

EvidenceUnit
 ├── text representation
 ├── embedding representation
 ├── visual representation
 ├── structured representation
 └── provenance
```

Vector and lexical retrieval indexes reference evidence records rather than becoming independent security stores.

---

## 5. Security Architecture

### Database-level isolation

PostgreSQL RLS is a core security boundary.

The application must not assume:

```text
WHERE tenant_id = current_user_tenant
```

in application code is sufficient.

The database must independently enforce the boundary.

### Authorization context

Conceptually:

```text
Request
├── user_id
├── tenant_id
├── roles
└── policy claims
```

This context must flow into every protected operation.

### Retrieval rule

A candidate is usable only if:

```text
candidate is relevant
AND
candidate is authorized
AND
candidate belongs to the active security scope
```

### Generation rule

```text
ModelContext ⊆ AuthorizedEvidence
```

This invariant must be testable.

---

## 6. Ingestion Architecture

```text
Upload
  ↓
Validate file/type/size
  ↓
Assign tenant + security metadata
  ↓
Document parsing
  ↓
Layout-aware decomposition
  ↓
EvidenceUnit creation
  ↓
Text/OCR/table/visual representations
  ↓
Embeddings / indexes
  ↓
Persist
  ↓
Verification
  ↓
Document ready
```

Do not mark a document ready until the required ingestion steps have succeeded.

---

## 7. Multimodal Representation

Do not reduce every PDF into plain text.

A document may contain:

```text
Page
├── paragraph
├── heading
├── table
├── figure
├── image
├── diagram
├── OCR region
└── layout relationships
```

Each meaningful object becomes an EvidenceUnit or is linked to one.

This allows retrieval to answer questions such as:

- "What does the diagram show?"
- "Which component is connected to the pump?"
- "What is the value in the third row?"
- "What does the chart indicate?"
- "Where is this statement written?"

---

## 8. Retrieval Architecture

Initial retrieval should support multiple signals:

```text
                 QUERY
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
        FTS      Vector   Visual/
                           Structured
          │        │        │
          └────────┼────────┘
                   ▼
            Candidate Fusion
                   ▼
               Reranking
                   ▼
          Authorization Check
                   ▼
             Evidence Bundle
```

Do not assume one retrieval method is universally best.

---

## 9. Authorization Placement

Authorization exists at multiple layers:

### Layer 1 — Database
RLS prevents unauthorized rows from being accessed.

### Layer 2 — Service
Policy-aware services validate requested scope.

### Layer 3 — Retrieval
Only authorized candidates can proceed.

### Layer 4 — Evidence
Final evidence is independently validated before model context creation.

### Layer 5 — Output
Citations and answer claims are checked against evidence.

No single layer should be treated as the entire security system.

---

## 10. Generation Architecture

The model should receive a structured evidence package, not arbitrary database results.

Conceptually:

```json
{
  "question": "...",
  "evidence": [
    {
      "evidence_id": "...",
      "type": "text|table|image|diagram",
      "source": "...",
      "content": "...",
      "provenance": "..."
    }
  ],
  "instructions": {
    "use_only_evidence": true,
    "cite_sources": true
  }
}
```

The model must not receive:
- unauthorized candidates
- hidden database fields
- raw security policy data
- unrelated tenant material
- unrestricted database access

---

## 11. Evidence and Citation Architecture

A citation is not just a page number.

It should resolve to an evidence object with:

```text
document
version
page
element
type
source location
optional bounding box
retrieval provenance
```

For visual evidence, the UI should eventually support a source crop or highlighted region.

---

## 12. Audit Architecture

Each query should be traceable:

```text
request_id
  ↓
user
  ↓
query
  ↓
retrieval operations
  ↓
candidate evidence IDs
  ↓
authorization decisions
  ↓
final evidence IDs
  ↓
model generation
  ↓
citations
  ↓
final response
```

Never log raw confidential content unnecessarily.

Prefer identifiers, hashes, metadata, and security-relevant events.

---

## 13. Component Ownership

### AuthService
Owns identity authentication.

Does not own retrieval.

### PolicyService
Owns authorization decisions and policy interpretation.

Does not generate answers.

### IngestionService
Owns document processing orchestration.

Does not answer queries.

### Parser
Owns document/layout extraction.

### OCRService
Owns OCR.

### EmbeddingService
Owns embedding generation through provider interfaces.

### RetrievalService
Owns candidate retrieval and ranking.

Does not decide identity.

### EvidenceService
Owns evidence normalization, authorization validation, provenance, and evidence bundles.

### GenerationService
Owns model invocation.

Does not bypass EvidenceService.

### CitationService
Owns citation construction and verification.

### AuditService
Owns security/audit event recording.

---

## 14. Framework Boundary

LangChain/LangGraph are optional orchestration utilities.

They must not become:
- the source of truth for authorization
- the database security layer
- the evidence model
- an uncontrolled agent loop

Prefer explicit Python services/interfaces for security-critical logic.

---

## 15. Model Provider Boundary

Models must be behind interfaces.

Conceptually:

```text
EmbeddingProvider
├── embed_text()
├── embed_batch()
└── optional multimodal methods

OCRProvider
└── extract()

GenerationProvider
└── generate()

VisionProvider
└── analyze()
```

Changing the provider must not require rewriting authorization or retrieval architecture.

---

## 16. Architectural Anti-Patterns

Do not implement:

```text
LLM decides whether user is authorized
```

```text
Retrieve everything, then ask the LLM to hide secrets
```

```text
Separate vector database with no authorization metadata
```

```text
Application-only tenant filtering
```

```text
Global cache for user-specific retrieval
```

```text
Every PDF → one giant text blob
```

```text
Agent can directly query PostgreSQL
```

```text
UI controls security
```

---

## 17. Scalability Direction

The initial implementation should prioritize correctness.

Future separation may include:

```text
API
Ingestion workers
OCR workers
Embedding workers
Retrieval service
Generation service
Audit/observability
```

Do not prematurely distribute the system.

Build a correct vertical slice first.
