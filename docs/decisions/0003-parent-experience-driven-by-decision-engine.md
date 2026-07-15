# Decision 0003: Parent Experience Is Driven by the Decision Engine

## Status

Accepted

## Context

IterNest may eventually parse and understand large amounts of curriculum data. However, parser output is not the product experience. If raw parser output drives the UI directly, parents may see too much information, unclear debug output, or decisions they do not need to make yet.

The Constitution requires IterNest to reduce cognitive overload, preserve trust, show evidence, and ask for parent approval only when meaningful.

## Decision

The parent experience will be driven by the Decision Engine, not directly by the parser.

The parser is responsible for producing reliable models. The Decision Engine is responsible for determining what information, approvals, and teaching actions should be surfaced to the parent each day.

## Responsibilities

The parser should produce:

- Source evidence
- Curriculum structure
- Lesson boundaries
- Lesson models
- Confidence levels
- Unknowns

The Decision Engine should decide:

- What the parent needs to see now
- What approval is being requested
- Which teaching actions matter today
- What should remain hidden or deferred
- What should be labeled as parser/debug evidence
- Whether confidence is high enough to proceed

## Consequences

- Parser output should not be treated as parent-facing UI by default.
- Debug views may exist, but they must be clearly labeled.
- Lesson models become inputs to the Decision Engine.
- Future daily teaching screens should ask the Decision Engine what to show instead of reading parser output directly.
- Single Real Lesson Reliability remains the immediate milestone, but its output should be a reliable Lesson Model that the Decision Engine can use.
