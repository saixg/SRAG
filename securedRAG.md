SecureRAG — Master Architecture & Product Flow

Secure Multimodal Evidence Retrieval — not a generic RAG chatbot.

SecureRAG is designed to let organizations query sensitive, multimodal knowledge while ensuring that users can retrieve, see, and receive answers only from evidence they are authorized to access.

The central principle is:

Security must be enforced before information reaches the LLM—not delegated to the LLM itself.




This architecture is now part of our project context. We'll use it as the reference when assisting your coding agent, reviewing implementations, and planning subsequent phases.

1. The Complete SecureRAG Architecture
11

The architecture has six major layers. Each layer has a defined responsibility and security boundary.

┌───────────────────────────────────────────────────────────────┐
│                       1. PRODUCT LAYER                         │
│                                                               │
│  Knowledge Workspace │ AI Copilot │ Evidence Viewer            │
│  Security Center     │ Audit View │ Role-Based Demo             │
└─────────────────────────────┬─────────────────────────────────┘
                              │ HTTPS / API
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    2. API & IDENTITY LAYER                    │
│                                                               │
│  FastAPI │ Authentication │ Identity Resolution                │
│                                                               │
│  User Identity │ Tenant Context │ Roles │ Groups               │
│                                                               │
│  Establish who is making the request and the applicable        │
│  authorization context.                                       │
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                   3. POLICY & SECURITY LAYER                  │
│                                                               │
│  Authorization Policy │ PostgreSQL RLS │ Resource ACLs         │
│                                                               │
│  Tenant Isolation │ Default Deny │ Fail-Closed Validation     │
│                                                               │
│  Security is enforced by trusted backend and database controls.│
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                 4. RETRIEVAL & EVIDENCE LAYER                 │
│                                                               │
│  Query Router                                                 │
│      │                                                        │
│      ├── Text Retrieval: pgvector + PostgreSQL FTS             │
│      ├── OCR / Visual Evidence Retrieval                       │
│      └── Structured Queries: SQL under RLS                     │
│                         │                                     │
│                         ▼                                     │
│               Ranking & Evidence Selection                    │
│                         │                                     │
│                         ▼                                     │
│                Authorization Validation                       │
│                         │                                     │
│                         ▼                                     │
│                  EvidenceBundle                               │
│                                                               │
│  Only authorized, provenance-bearing evidence proceeds.       │
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                   5. GENERATION & VERIFICATION                │
│                                                               │
│  LLM / VLM Gateway                                             │
│       │                                                       │
│       ▼                                                       │
│  Structured Claims                                            │
│       │                                                       │
│       ▼                                                       │
│  Citation & Evidence Verification                              │
│       │                                                       │
│       ├── Valid evidence reference?                            │
│       ├── Supporting quote exists?                             │
│       ├── Citation location comes from trusted evidence?       │
│       └── Evidence remains authorized?                         │
│       │                                                       │
│       ▼                                                       │
│  Verified Response or Explicit Abstention                     │
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    6. TRUST & OBSERVABILITY                   │
│                                                               │
│  Security Audit │ Retrieval Metrics │ Citation Metrics         │
│  Denied Operations │ Leakage Tests │ Red-Team Evaluation      │
│                                                               │
│  Security traces are permission-restricted and must not leak   │
│  sensitive document information to ordinary users.            │
└───────────────────────────────────────────────────────────────┘

Important distinction: this is our target architecture, not a claim that every component is implemented. We will continue marking components as implemented only after the coding agent has built and verified them.

2. The Ingestion Pipeline: How Knowledge Enters SecureRAG

Before users can query documents, SecureRAG must convert them into searchable evidence without losing their security metadata or source locations.

Target ingestion architecture
                  ADMIN / AUTHORIZED UPLOADER
                            │
                            ▼
                   Document Upload API
                            │
                            ▼
                 Validate Type & Permissions
                            │
                            ▼
                  Secure Ingestion Pipeline
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          PDF Text        Tables       Scanned Pages
             │              │              │
             │              │              ▼
             │              │          PaddleOCR
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                  Document Structure
                       via Docling
                            │
                            ▼
                  Normalize into Evidence
                            │
                            ▼
                     EvidenceUnit
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          Content        Provenance      Security
          & Modality     & Location      Metadata
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                     BGE-M3 Embeddings
                            │
                            ▼
                  PostgreSQL Persistence
                            │
                            ▼
                   PostgreSQL RLS
                            │
                            ▼
                 Secure Searchable Evidence
The central contract: EvidenceUnit

Every piece of evidence must preserve the relationship between its content, source, and permissions.

For example, one PDF could produce:

Evidence unit	Content	Location
ev_001	Extracted paragraph	Page 2
ev_002	Table contents	Page 3, table identifier
ev_003	OCR-extracted text	Page 4, bounding box
ev_004	Figure description	Page 5, figure region

All four units must inherit the appropriate security restrictions from their source document.

Non-negotiable: missing or invalid authorization metadata must cause ingestion to fail closed. OCR text, extracted tables, and image descriptions must not accidentally become less restricted than the source.

What we have versus what comes next

Our stated Phase 1 baseline already includes text ingestion, chunking, embeddings, PostgreSQL persistence, and tenant isolation.

Phase 2 extends that pipeline with advanced document parsing, OCR, bounding boxes, and richer evidence types.

3. The Query Pipeline: How SecureRAG Answers a Question

Consider this example:

A company has three users:

Alice: HR manager
Bob: Engineering manager
Charlie: Administrator with broader permissions

Alice asks:

"What is the current salary budget for my department?"

The system must not search all company data, generate an answer, and ask the LLM to hide unauthorized information afterward.

Instead, it must establish the applicable permissions before assembling the evidence sent to the model.

End-to-end query flow
User submits a question
          │
          ▼
1. Authenticate request
          │
          ▼
2. Resolve trusted identity and tenant context
          │
          ▼
3. Determine the applicable authorization scope
          │
          ▼
4. Route the query
          │
          ├───────────────┬──────────────────┐
          ▼               ▼                  ▼
      Text search      OCR/visual       Structured SQL
      pgvector + FTS   retrieval        under RLS
          │               │                  │
          └───────────────┼──────────────────┘
                          ▼
5. Retrieve evidence under enforced permissions
                          │
                          ▼
6. Rank and select relevant evidence
                          │
                          ▼
7. Validate the final evidence set
                          │
                          ▼
8. Build the authorized EvidenceBundle
                          │
                          ▼
9. Send only that bundle to the LLM
                          │
                          ▼
10. Generate structured claims and evidence references
                          │
                          ▼
11. Verify claims and citations
                          │
                          ▼
12. Return answer, citations, and source locations
                          │
                          ▼
13. Record appropriate security and audit events
The most important security decision

PostgreSQL RLS is an authoritative enforcement mechanism, not merely an additional application filter.

Our existing tenant isolation must remain intact as we add document-level or other resource-level authorization.

A tenant filter alone does not automatically enforce every possible permission model. If SecureRAG supports document ACLs, groups, roles, or ownership rules, those policies must also be enforced by the trusted backend/database boundary.

The LLM must never decide whether Alice is allowed to read Bob's document.

4. The EvidenceBundle: SecureRAG's Central Contract

This is the bridge between secure retrieval and AI generation.

The retrieval system may identify relevant evidence, but the generation system should receive only the evidence that has passed the required security checks.

Raw Search Results
        │
        ▼
Authorization Enforcement
        │
        ▼
Evidence Validation
        │
        ├── Missing provenance? ──► Reject
        │
        ├── Invalid tenant scope? ► Reject
        │
        ├── Invalid evidence? ────► Reject
        │
        ▼
EvidenceBundleBuilder
        │
        ▼
┌─────────────────────────────────┐
│          EvidenceBundle         │
│                                 │
│  Tenant context                 │
│  Original query                 │
│  Authorized evidence items      │
│  Stable evidence identifiers    │
│  Content and modality            │
│  Citation locations              │
│  Source provenance               │
└────────────────┬────────────────┘
                 │
                 ▼
            LLM Gateway

The bundle must not expose unauthorized document names, identifiers, snippets, counts, or other sensitive metadata.

One subtle but important point: if any authorization check fails, the system should not continue as though the bundle were trustworthy. Rejection must stop the affected operation.

Our current EvidenceBundle and EvidenceBundleBuilder are the starting point for this layer.

Why the bundle matters

Without a common evidence contract, each retrieval method could invent its own output format:

Text retrieval returns chunks.
OCR returns extracted strings.
Visual retrieval returns image references.
SQL returns database rows.

The bundle gives all of them a shared interface for downstream generation and verification.

That allows SecureRAG to expand without redesigning its entire query pipeline.

5. Citation Verification: From Generated Answer to Verifiable Evidence

A fluent answer is not necessarily a correct answer.

SecureRAG must separate generating a response from verifying its references.

Authorized EvidenceBundle
          │
          ▼
         LLM
          │
          ▼
Structured Claims
          │
          ├── Claim 1 → ev_001
          ├── Claim 2 → ev_003
          └── Claim 3 → ev_007
                    │
                    ▼
             CitationVerifier
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
  Evidence ID    Quote Check   Source Check
    Exists       Exact Match   Bundle-derived
       │            │            │
       └────────────┼────────────┘
                    ▼
             Verification Result
                    │
             ┌──────┴──────┐
             ▼             ▼
          Verified      Rejected /
           Claim        Unsupported
             │             │
             ▼             ▼
      Final Response   Abstention or
                       Safe Failure

The verifier should perform deterministic checks wherever possible.

For example:

Does the referenced evidence ID exist in the current bundle?
Does the supporting quote occur in that evidence?
Is the citation location taken from trusted evidence metadata rather than invented by the LLM?
Is the evidence authorized for the current request?

These checks establish traceability and citation integrity. They do not, by themselves, prove that every natural-language claim is logically entailed by the quote. Semantic support still needs appropriate evaluation and testing.

For Phase 1, our deterministic verifier provides the foundation. More sophisticated claim-support evaluation can follow later.