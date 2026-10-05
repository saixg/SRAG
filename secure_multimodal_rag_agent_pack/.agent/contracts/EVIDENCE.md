# Evidence Contract

## Purpose

Evidence is the central object connecting ingestion, retrieval, security, generation, and citations.

## Conceptual Schema

```text
EvidenceUnit
├── evidence_id
├── tenant_id
├── document_id
├── document_version_id
├── page_id
├── element_id
├── element_type
├── source_location
├── text
├── visual_reference
├── bounding_box
├── structured_content
├── metadata
├── security_scope
└── provenance
```

## Element Types

Initial supported conceptual types:

```text
text
table
image
figure
diagram
ocr
layout
```

## Rules

1. Every EvidenceUnit has provenance.
2. Every EvidenceUnit has tenant/security scope.
3. Evidence may have multiple representations.
4. Retrieval results reference EvidenceUnits.
5. The final model context contains only authorized EvidenceUnits.
6. Citations resolve to EvidenceUnits.
7. Evidence IDs must be stable enough for audit/provenance.

## Future Representation Types

Potential representations:

```text
text embedding
visual embedding
lexical index
structured table representation
OCR tokens
layout relationships
```

Do not implement all representations during Phase 0.
