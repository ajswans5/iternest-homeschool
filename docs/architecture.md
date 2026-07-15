# Architecture

This document captures the technical and product architecture that supports the IterNest Constitution.

## Decision Engine: Staged Curriculum Decisions

The decision engine should stage curriculum over time instead of exposing the whole curriculum to the parent at once.

Internally, IterNest may parse, index, and understand a broad curriculum source. Externally, it should ask the parent only for the minimum decisions needed to begin teaching successfully.

The principle is:

> Understand broadly. Ask narrowly. Reveal progressively.

### Why This Matters

Parents do not need a second curriculum manual inside the app. They need help deciding what to do next without losing instructional intent.

If IterNest exposes every section, lesson, dependency, uncertainty, and schedule implication at once, it recreates the parent cognitive overload it exists to reduce.

The engine should therefore separate internal understanding from parent-facing decision flow.

### Internal Model

The engine may build a fuller model over time:

- Curriculum source structure
- Lesson boundaries
- Lesson intent
- Teacher-led tasks
- Independent student tasks
- Materials and prep
- Reviews and assessments
- Dependencies
- Flexible, movable, optional, or protected work
- Confidence levels
- Source evidence
- Known unknowns

This internal model is not automatically shown to the parent.

### Parent-Facing Decision Flow

Parent-facing decisions should be staged:

1. Ask only what is needed to confirm one real lesson.
2. Ask only what is needed to begin teaching that lesson.
3. Defer curriculum-wide decisions until they become necessary.
4. Defer scheduling decisions until lesson understanding is reliable.
5. Defer plan-repair decisions until a real time constraint exists.

The parent should never be asked to review the entire curriculum just because IterNest has parsed it.

### Progressive Disclosure Rules

Show the parent:

- The current lesson under review.
- The conclusions needed to teach that lesson.
- The source evidence for those conclusions.
- The unknowns that affect immediate teaching.
- The smallest approval needed to move forward.

Do not show by default:

- All parsed curriculum text.
- Every detected section.
- Every possible dependency.
- Every future lesson.
- Every inferred schedule implication.
- Large debug output as the main result.

Debug/evidence views may exist, but they must be labeled clearly and should not be mistaken for the main product experience.

### Decision Threshold

The engine should ask a parent for input only when one of these is true:

- The answer affects immediate teaching.
- The answer affects instructional intent.
- The answer affects whether work can safely move, combine, simplify, or delay.
- The confidence level is too low to proceed.
- The recommendation would change the family's plan.

If a question does not affect one of those things yet, defer it.

### Trust Boundary

Parent approval is required before IterNest:

- Treats a lesson analysis as confirmed.
- Uses lesson understanding for scheduling.
- Moves or modifies work.
- Combines, delays, simplifies, or skips work.
- Applies curriculum-wide assumptions to a learner's plan.

### Implementation Implication

The parser and decision engine should not share the same UI surface.

The parser can produce a large internal representation. The decision engine should turn that representation into small, timely, parent-reviewable decisions.

The parent experience should be driven by the Decision Engine, not directly by the parser.

The parser's job is to produce trustworthy models:

- Source evidence
- Curriculum structure
- Lesson boundaries
- Lesson models
- Confidence and unknowns

The Decision Engine's job is to decide what to surface:

- Which information matters today
- Which parent approval is needed now
- Which teaching actions should be visible
- Which uncertainties block progress
- Which parser output should remain hidden, deferred, or labeled as debug evidence

The parent should experience IterNest as a decision assistant, not as a parser UI.

The next milestone remains Single Real Lesson Reliability: prove this staged decision pattern on one real lesson before scaling to a full curriculum.
