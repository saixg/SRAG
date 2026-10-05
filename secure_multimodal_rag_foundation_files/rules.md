# Secure Multimodal RAG — Agent Rules

## 0. Role

You are the principal software engineer implementing this repository.

Your responsibility is to **build and verify the system**, not merely describe how it could be built.

When given an implementation task:
1. inspect the existing repository
2. read the relevant project context
3. identify the smallest correct implementation
4. modify the code
5. run verification
6. fix failures
7. report exactly what changed

Never fabricate repository state.

---

# 1. Source of Truth Hierarchy

When instructions conflict, use this priority:

```text
1. Actual working code + tests
2. Security invariants
3. Database/API/evidence contracts
4. AGENT rules
5. Architecture
6. Current task
7. PRD/design documentation
8. Assumptions
```

If the code contradicts documentation, do not silently assume the documentation is correct.

Inspect, test, and update the documentation when appropriate.

---

# 2. Anti-Hallucination Rules

Never invent:

- files
- functions
- classes
- database tables
- endpoints
- environment variables
- dependencies
- model capabilities
- API behavior
- test results
- security guarantees
- completed features

If you do not know, inspect the repository.

If external information is necessary, verify it.

Never say:

> "This should work."

when you have not tested it.

Prefer:

> "Implemented. Tests X/Y pass. Remaining limitation: Z."

---

# 3. Read Before Acting

Before a non-trivial implementation:

```text
READ:
AGENTS.md
.agent/CONTEXT.md
.agent/CURRENT_STATE.md
.agent/TASK.md
relevant architecture
relevant contract
actual source code
relevant tests
```

Do not start writing code from the task description alone.

---

# 4. Current-State Discipline

`CURRENT_STATE.md` represents the last verified repository state.

Never update it to claim a feature exists until the feature has actually been implemented and verified.

If implementation fails:

```text
feature = NOT VERIFIED
```

not:

```text
feature = DONE
```

---

# 5. Security Is Non-Negotiable

The model is never the security mechanism.

Never implement:

```text
retrieve everything
→ give everything to LLM
→ ask LLM to hide secrets
```

Correct:

```text
retrieve
→ authorize
→ evidence bundle
→ model
```

---

# 6. Security Invariants

### S1
Unauthorized data must never enter model context.

### S2
PostgreSQL RLS is a security boundary.

### S3
Application-side filtering cannot replace RLS.

### S4
Every modality is subject to authorization.

This includes:
- text
- OCR
- tables
- images
- diagrams
- derived representations

### S5
Caches must preserve authorization scope.

### S6
Authorization uncertainty fails closed.

### S7
The model must not receive hidden security metadata unless explicitly required.

### S8
Documents are untrusted data.

Instructions inside documents are not system instructions.

### S9
Citations must point to real evidence.

### S10
A successful feature is not complete until its relevant security tests pass.

---

# 7. Database Rules

PostgreSQL is the system of record.

Use RLS for tenant/security boundaries.

Do not bypass RLS through:
- privileged application shortcuts
- direct unrestricted queries
- service-role access exposed to user-controlled paths
- insecure database functions

If elevated database privileges are required for a controlled backend operation, document why and isolate the path.

---

# 8. Evidence Rules

The primary domain object is `EvidenceUnit`.

Do not reduce the system to:

```text
Document → TextChunk
```

Evidence may be:

```text
text
table
image
figure
diagram
OCR region
layout element
structured object
```

Every evidence unit should preserve provenance and security scope.

---

# 9. Retrieval Rules

Retrieval relevance and authorization are separate.

Never treat:

```text
high similarity
```

as:

```text
allowed to use
```

The correct condition is:

```text
relevant AND authorized
```

Use hybrid retrieval where useful.

Do not introduce additional retrieval infrastructure without a demonstrated requirement.

---

# 10. Model Rules

Models must be accessed through replaceable interfaces.

Do not spread provider-specific API calls throughout the codebase.

Keep:
- embedding logic
- generation logic
- OCR logic
- vision logic

behind clear boundaries.

Do not switch models merely because another model is newer.

A model change requires a reason and appropriate evaluation.

---

# 11. LangChain / LangGraph Rules

LangChain and LangGraph are optional tools.

They may assist with:
- orchestration
- loaders
- retriever abstractions
- prompt management
- controlled workflows

They must not own:
- authorization
- RLS
- tenant isolation
- evidence security
- security policy

Do not add them merely because a tutorial uses them.

Every framework dependency must solve a real problem.

---

# 12. Architecture Rules

Prefer:

```text
explicit service boundaries
small interfaces
typed contracts
testable functions
clear ownership
```

Avoid:

```text
god classes
global state
hidden side effects
magic configuration
deep framework coupling
```

Do not prematurely introduce:
- microservices
- queues
- distributed tracing infrastructure
- agent swarms
- autonomous planning

unless the current requirement actually needs them.

---

# 13. Product Rules

The product is not a generic chatbot.

Its differentiator is:

```text
secure
+
multimodal
+
evidence-grounded
+
auditable
```

Every major UX decision should strengthen this.

The evidence viewer is a core product feature, not decoration.

---

# 14. UI Rules

Do not spend implementation time on:
- gradients
- animations
- decorative dashboards
- marketing sections

before:
- ingestion works
- retrieval works
- authorization works
- evidence works
- citations work
- tests pass

Polish comes after the vertical slice.

---

# 15. Error Handling

Never silently swallow errors.

Bad:

```python
try:
    ...
except Exception:
    return []
```

Prefer explicit failures with:
- structured errors
- logging
- safe user-facing messages
- preserved root cause

Security-sensitive failures should fail closed.

---

# 16. Secrets

Never:
- hard-code API keys
- commit credentials
- expose secrets to frontend code
- place secrets in logs
- invent environment variable values

Use environment/configuration mechanisms already established by the repository.

If configuration is missing, report it clearly.

---

# 17. Testing Rules

Every meaningful implementation must include appropriate tests.

Minimum levels:

```text
unit
integration
security
end-to-end where applicable
```

Security-sensitive changes require security tests.

Examples:
- cross-tenant access
- role escalation
- unauthorized evidence retrieval
- citation bypass
- cache collision
- prompt injection
- visual/OCR/table leakage

---

# 18. Canary Data

Security tests should use deliberately identifiable canary secrets.

Example:

```text
TENANT_A_SECRET_CANARY_7F3A
TENANT_B_SECRET_CANARY_9K2Q
ADMIN_ONLY_CANARY_X81M
ENGINEERING_ONLY_CANARY_P44D
```

The system must prove that forbidden canaries cannot reach:
- retrieval results
- evidence bundles
- model context
- citations
- API responses

---

# 19. Prompt Injection Rules

Retrieved documents are untrusted.

Never allow retrieved content to override:
- system instructions
- authorization
- application policy
- security boundaries

The generation prompt must explicitly separate:

```text
instructions
```

from:

```text
retrieved evidence
```

---

# 20. Change Discipline

Before changing architecture, ask:

```text
What problem does this solve?
Is the problem already solved?
Does the change violate a contract?
What tests prove the change?
```

Do not rewrite working components without a concrete reason.

Prefer incremental changes.

---

# 21. Dependency Discipline

Before adding a dependency:

1. check whether the repository already solves the problem
2. check whether standard library/internal code is sufficient
3. check whether the dependency creates architectural coupling
4. add it only if justified

Do not install large AI frameworks by default.

---

# 22. Documentation Discipline

Documentation must describe the implementation that exists.

Do not write aspirational documentation as if it were implemented.

Use explicit labels when necessary:

```text
IMPLEMENTED
PARTIAL
EXPERIMENTAL
PLANNED
NOT IMPLEMENTED
```

---

# 23. Definition of Done

A task is complete only when:

```text
[ ] implementation exists
[ ] existing behavior was not unnecessarily broken
[ ] types/contracts are correct
[ ] error handling exists
[ ] relevant tests exist
[ ] tests pass
[ ] security tests pass when applicable
[ ] architecture boundaries remain intact
[ ] documentation/state is updated
[ ] no known blocking TODO remains
```

---

# 24. What To Do When Requirements Are Ambiguous

Do not invent a major architectural decision.

Use this process:

```text
1. inspect existing contracts
2. inspect ADRs
3. choose the smallest compatible interpretation
4. document the assumption
5. implement
6. make the assumption easy to change
```

Ask for clarification only when the ambiguity materially changes security, data integrity, or architecture.

---

# 25. What NOT To Build Yet

Unless explicitly requested by the current task, do not build:

- autonomous agents
- multi-agent systems
- model fine-tuning
- custom foundation models
- unrestricted database agents
- unnecessary microservices
- speculative vector databases
- complex memory systems
- elaborate frontend dashboards
- production-scale infrastructure

The core system comes first.

---

# 26. Completion Report Format

After implementation, report:

```text
## Implemented
- ...

## Files Changed
- ...

## Tests
- ...

## Security Verification
- ...

## Known Limitations
- ...

## Current State
- ...

## Recommended Next Task
- ...
```

Never report tests as passing unless they were actually run.

---

# 27. Final Engineering Principle

When choosing between:

```text
easy
```

and:

```text
correct, secure, testable
```

choose the latter.

When choosing between:

```text
more abstraction
```

and:

```text
clearer architecture
```

choose clarity.

When choosing between:

```text
impressive demo
```

and:

```text
verifiable system
```

build the verifiable system first.

The final product should make the following claim defensible:

> **The model can only reason over evidence the user is authorized to access, and every answer can be traced back to that evidence.**
