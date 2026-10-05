# Test Strategy

## Layers

```text
Unit
 ↓
Integration
 ↓
Security
 ↓
End-to-End
```

## Unit

Test:
- parsing helpers
- policy logic
- data transformations
- ranking/fusion
- evidence normalization

## Integration

Test:
- API + database
- migrations
- RLS
- retrieval
- ingestion

## Security

Test:
- tenant isolation
- role restrictions
- direct endpoint access
- evidence access
- cache scope
- prompt injection
- multimodal leakage

## End-to-End

Eventually test:

```text
login
→ upload
→ ingest
→ query
→ retrieve
→ authorize
→ generate
→ cite
→ inspect evidence
```

## Testing Principle

A passing functional test is not sufficient for a security-sensitive feature.

Correctness and authorization must both be verified.
