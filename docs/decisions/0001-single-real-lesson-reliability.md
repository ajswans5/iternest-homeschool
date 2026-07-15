# Decision 0001: Single Real Lesson Reliability Comes Before Broader MVP Work

## Status

Accepted

## Context

IterNest has reached the Trust Foundation + Single Lesson Understanding Prototype stage. The PDF reader, source evidence report, and trust-first lesson understanding flow are moving in the right direction, but the product is not ready for a full end-to-end MVP path test.

The strategic goal remains proving a usable homeschool MVP. However, the prerequisite proof is narrower: IterNest must first demonstrate that it can reliably understand one complete real lesson from one real uploaded curriculum PDF.

## Decision

The next IterNest milestone is Single Real Lesson Reliability.

The team will not move on to scheduling, plan repair, calendar logic, learner profiles, curriculum-wide import, or broader MVP path testing until this milestone is proven.

## Acceptance Criteria

1. Select one real lesson from the PDF.
2. Avoid showing a confusing raw text dump as the main user result.
3. Clearly identify what the parent teaches.
4. Clearly identify what the student does.
5. Identify materials, review, time, dependencies, and flexibility only when supported by source evidence.
6. Mark unclear or unsupported items as Needs Parent Review.
7. Attach source evidence to every conclusion.
8. Allow the parent to confirm: "Yes, that is what this lesson is asking me to teach."

## Consequences

- IterNest prioritizes trust and educational understanding over breadth.
- The next development work should focus on real PDF lesson-block detection, source-backed classification, and a clear one-lesson analysis UI.
- Scheduling and plan repair remain important, but they are intentionally deferred until lesson understanding is reliable.
- FounderFlow should be refined to identify prerequisite proof milestones when a project has not yet reached a vertical-slice stage.
