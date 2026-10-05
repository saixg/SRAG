# Anti-Drift Contract

This project must not gradually become something easier but strategically weaker.

## Never Drift Into

### 1. Generic Chatbot

Avoid:

```text
upload PDF
→ chunk
→ vector search
→ chat
```

That is only a component of the product.

### 2. LLM-Based Security

Never:

```text
retrieve unauthorized content
→ tell LLM not to reveal it
```

Security happens before generation.

### 3. Text-Only RAG

Do not design the data model around text chunks only.

The domain object is EvidenceUnit.

### 4. Framework-First Architecture

Do not build the architecture around LangChain/LangGraph APIs.

Build domain services and contracts first.

### 5. UI-First Development

Do not spend time making a beautiful dashboard while ingestion/security/retrieval are unverified.

### 6. Premature Agents

Autonomous agents are not the goal.

Controlled retrieval is the goal.

### 7. Database Bypass

Do not replace RLS with application filtering because it is easier.

### 8. Untraceable Answers

Every answer should eventually be explainable through evidence.

### 9. Infrastructure Theater

Do not introduce:
- microservices
- Kubernetes
- distributed queues
- multiple vector databases
- complex event buses

without a real requirement.

### 10. Feature Sprawl

Every new feature must strengthen one of:

```text
security
multimodality
retrieval
evidence
provenance
auditability
product usability
evaluation
```

If it does not, challenge its inclusion.
