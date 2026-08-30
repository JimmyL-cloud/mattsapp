# Mattsapp Recovery SOP

## Promotion States

- `ORIGINAL`: untouched recovered evidence.
- `DUPLICATE`: content-equivalent copy grouped by hash or verified comparison.
- `PROTOTYPE`: generated or experimental implementation.
- `NORMALIZED`: readable copy derived from an original.
- `PROMOTED`: reviewed material accepted into a canonical specification or implementation.
- `REJECTED`: reviewed and intentionally excluded, with rationale retained.

## Immutable Originals

- Never edit, rename destructively, or delete an ORIGINAL.
- Store normalized copies separately.
- Record the original source system, stable source ID/URL, retrieval time, format, size, and SHA-256.
- Mark sensitivity and avoid placing secret-bearing artifacts in Git.

## Duplicate Handling

- Group exact matches by SHA-256.
- For Google-native documents, use stable Drive IDs and compare exported content before declaring equality.
- Keep one canonical candidate while preserving identities of duplicates.
- Never assume same title means same content or newest means authoritative.

## Durable Formats

- Google Docs: export as DOCX and PDF or Markdown when available.
- Google Sheets: export as XLSX and CSV for relevant tables.
- Google Slides: export as PPTX and PDF.
- Stored PDFs, images, code, JSON, YAML, and Markdown: preserve native bytes.
- NotebookLM chat and source lists: preserve a readable export plus a manifest.

## Promotion

Promotion requires origin metadata, conflict review, and a linked issue. Normalized research moves into `docs/valuation` only through formula governance. Prototype code moves into production only through a separate tested implementation issue.

## Cleanup

Cleanup is a distinct owner-approved issue. Until then, uncertain material remains preserved. Generated caches such as `.pyc` may be classified as noncanonical but are not deleted during inventory work.
