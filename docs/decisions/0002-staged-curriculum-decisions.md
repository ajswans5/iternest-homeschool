# Decision 0002: Stage Curriculum Decisions Over Time

## Status

Accepted

## Context

IterNest aims to reduce parent cognitive overload. A curriculum parser may eventually understand an entire curriculum, but showing all parsed content and all possible decisions at once would recreate the overload IterNest exists to solve.

The parent should not be asked to make curriculum-wide decisions before those decisions are necessary for teaching.

## Decision

IterNest will separate internal curriculum understanding from parent-facing decision flow.

The engine may understand broadly, but it should ask narrowly.

Parent-facing decisions should be staged over time so the parent is asked for the minimum number of decisions necessary to begin teaching successfully.

## Design Rule

The decision engine should ask a parent for input only when the answer affects:

- Immediate teaching
- Instructional intent
- Confidence
- Plan changes
- Flexibility decisions such as move, combine, delay, simplify, review, or protect

If a decision does not affect one of those things yet, IterNest should defer it.

## Consequences

- The parser may process more curriculum than the UI exposes.
- Debug output must be clearly labeled and should not be the primary parent-facing result.
- The main product experience should progressively disclose only the current lesson, current evidence, current unknowns, and current approval.
- Curriculum-wide import remains deferred until single-lesson reliability is proven.
- Scheduling and plan repair remain deferred until lesson understanding and staged decision flow are trustworthy.

## Current Milestone Impact

This decision reinforces the current milestone: Single Real Lesson Reliability.

For now, IterNest should focus on one complete real lesson from one uploaded curriculum PDF and ask only the decisions needed to confirm that lesson understanding.
