# 0004: Curriculum Import Boundary

## Context

The curriculum import flow was beginning to expose parser-shaped output directly to the parent experience. That made the app feel like a document parser instead of a trusted teaching assistant.

IterNest needs a clearer boundary:

```text
PDF/source analysis
-> LessonModel
-> ParentDecision
-> UI
```

This keeps the parser from becoming the parent-facing intelligence layer.

## Decision

Curriculum import should be organized into four layers.

### PDF/source analysis

Owns:

- Reading the uploaded source file.
- Detecting whether selectable text is available.
- Extracting source lines, page locations, and direct source evidence.
- Reporting limitations such as OCR being required.

Must not own:

- Deciding what the parent should see.
- Asking for parent approval.
- Creating schedule items.
- Presenting raw extracted text as the main user result.

### LessonModel

Owns:

- Representing IterNest's best understanding of one lesson.
- Separating teacher responsibilities, student responsibilities, materials, reviews, assessments, dependencies, flexibility, confidence, unknowns, and source evidence.
- Preserving curriculum wording whenever possible.

Must not own:

- Deciding which decisions matter today.
- Scheduling or plan repair.
- Hiding uncertainty from the parent.

### ParentDecision

Owns:

- Deciding what information the parent needs right now.
- Identifying which approvals or clarifications are required.
- Surfacing teaching actions that are supported by the LessonModel.
- Staging future information for later instead of overwhelming the parent.

Must not own:

- Parsing files.
- Inventing curriculum details.
- Treating unsupported guesses as confirmed facts.

### UI

Owns:

- Rendering the current ParentDecision clearly and calmly.
- Showing confidence, approval meaning, teaching actions, and uncertainty in parent-friendly language.
- Letting the parent confirm or decline the surfaced decision.

Must not own:

- Reading parser output directly.
- Inspecting source-analysis structures.
- Building LessonModels.
- Running curriculum reasoning.
- Deciding what parser information should become parent-facing.

## Rule

The curriculum import UI renders `ParentDecision` only.

If the UI needs information that is not on `ParentDecision`, the answer is not to reach into parser output. The answer is to decide whether that information belongs on `ParentDecision`, `LessonModel`, or a separate debug/developer surface.

## Reason

This boundary protects the product's trust model.

Parents should experience IterNest as a decision assistant, not as a parser UI. The parser can read broadly and produce internal evidence, but the Decision Engine decides what is useful, timely, and safe to surface.

This prevents curriculum import from becoming a raw extraction interface and keeps the product aligned with the core principle:

Understand broadly. Ask narrowly. Reveal progressively.
