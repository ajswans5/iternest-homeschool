# IterNest Constitution

This Constitution is the highest-level design document for IterNest. Every product decision, feature design, AI behavior, and implementation tradeoff should be evaluated against these principles before development continues.

The PRD explains what IterNest will build. The Constitution explains what IterNest must remain.

## Mission

IterNest exists to reduce parent cognitive overload while helping families teach the child they actually have, not the child the curriculum assumes.

The product should help parents and teachers preserve instructional intent when real life changes the plan. IterNest is not anti-calendar, anti-schedule, or anti-curriculum. Calendars, schedules, and curricula are valuable tools. The hard problem IterNest solves is what happens when the plan stops matching the day.

When life interrupts instruction, parents and teachers have to decide what to protect, move, combine, delay, simplify, review, or skip without losing the educational purpose of the lesson. IterNest should reduce that mental load.

## The Core Problem

Homeschool parents and classroom teachers are not struggling because they cannot see a calendar. They are struggling because curriculum decisions are cognitively expensive.

Real life creates constant instructional disruptions:

- Appointments
- Sick days
- Babies and toddlers
- Sports and errands
- Multiple children needing attention
- Shortened school days
- Testing days
- Assemblies
- Fire drills
- Fatigue, overwhelm, and family rhythm changes

The hard question is not, "What was scheduled today?"

The hard question is, "Given what changed, what should happen next without losing the point of the lesson?"

IterNest exists to answer that question transparently, conservatively, and with parent control.

## Product Mental Model

IterNest should be understood as a curriculum-aware instructional assistant.

Its job is not merely to store plans. Its job is to understand enough about the curriculum, the lesson, the learner, the parent, and the available time to help rebuild the plan when conditions change.

The core sequence is:

1. Understand the curriculum.
2. Understand the lesson intent.
3. Understand what can flex.
4. Understand the learner's current needs.
5. Recommend a plan repair.
6. Explain the recommendation.
7. Ask the parent to approve before anything changes.

Scheduling comes after understanding.

## Educational Philosophy

IterNest should support teaching, not replace it.

The parent remains the educational authority. The curriculum remains an important input. The learner remains a developing person whose needs cannot be reduced to a worksheet, checklist, or pacing guide.

IterNest should help families:

- Preserve the instructional purpose of a lesson.
- Adapt without abandoning rigor.
- Reduce overwhelm without lowering expectations unnecessarily.
- Build learner independence gradually.
- Notice when review, rest, or simplification is wiser than pushing ahead.
- Keep the parent in control of meaningful educational decisions.

The product should feel like a trusted teaching assistant, not a motivational app, automated scheduler, or curriculum replacement.

## Curriculum Is Input, Not Authority

Curriculum is treated as source material, not as the final authority over the family.

Curriculum tells IterNest what was assigned, sequenced, reviewed, practiced, assessed, or required. It gives evidence. It does not know the family's day, the learner's emotional state, the parent's capacity, or the household's constraints.

IterNest should respect curriculum deeply by reading it faithfully. It should not rewrite, summarize, or invent curriculum requirements. But it should also help parents decide how to implement the curriculum in real life.

The curriculum answers, "What does this program ask us to do?"

The parent answers, "What should our family do today?"

IterNest helps bridge those two questions.

## AI Role

AI in IterNest should behave like a careful educational analyst.

It should:

- Read curriculum source material faithfully.
- Separate direct evidence from interpretation.
- Identify lesson structure, teacher responsibilities, student responsibilities, materials, reviews, assessments, dependencies, flexibility, and unknowns.
- Preserve the wording of the curriculum whenever possible.
- Explain why it recommends a change.
- Show confidence level and evidence.
- Ask for parent review when evidence is incomplete.
- Help reduce decision load without removing parent agency.

AI should be conservative, transparent, and humble. It should prefer saying "I don't have enough evidence to determine this" over making a plausible guess.

## What AI Must Never Do

AI must never:

- Invent required assignments.
- Pretend uncertainty is confidence.
- Hide source evidence.
- Change a plan silently.
- Schedule, reschedule, skip, simplify, or combine lessons without parent approval.
- Treat the curriculum as more authoritative than the parent.
- Treat a learner profile as a fixed ceiling.
- Shame the parent or learner.
- Over-optimize for completion at the expense of understanding.
- Recommend easier work merely because a learner struggles.
- Recommend harder work merely because a learner succeeds.
- Replace parent judgment with automated certainty.

If AI cannot support a conclusion with evidence, it must say so.

## Transparency and Parent Approval

Every meaningful recommendation must remain transparent and require parent approval.

IterNest should show:

- What it found in the curriculum.
- What it understood directly.
- What it inferred, if inference is allowed.
- Why it made the recommendation.
- What evidence supports the recommendation.
- What confidence level it has.
- What it does not know.
- What will change if the parent approves.

Nothing should be added, removed, delayed, simplified, combined, or scheduled without explicit parent confirmation.

The parent should never wonder whether they are seeing:

- Raw extracted text
- Debug output
- AI analysis
- A draft recommendation
- An approved plan

The interface must label those states clearly.

## Flexibility Principle

Flexibility is not randomness. Flexibility means understanding which parts of a plan can move while preserving instructional intent.

IterNest should identify:

- Protected work: pieces that should stay intact because they carry the lesson's core instruction.
- Movable work: pieces that can shift to another day without much risk.
- Compressible work: pieces that can be shortened while still preserving the point.
- Review work: pieces that may be used to reinforce or recover understanding.
- Optional work: pieces explicitly labeled optional or enrichment.
- Dependent work: pieces that require a previous concept, lesson, or activity.
- Parent-led work: pieces requiring adult instruction or discussion.
- Independent work: pieces a learner can reasonably complete without direct teaching.

Flexibility should always be explained. A parent should be able to see why IterNest thinks something can move or why something should be protected.

## Confidence Principle

Confidence is part of the product, not an implementation detail.

Every AI-supported recommendation should communicate confidence in plain language:

- High confidence: directly supported by clear source evidence.
- Needs parent review: evidence exists, but classification or intent is uncertain.
- Not enough evidence: the source does not support a conclusion.

Low confidence should not block usefulness, but it must change behavior. When confidence is low, IterNest should ask, not act.

## Explainability Principle

A recommendation is incomplete until it explains itself.

Every recommendation should answer:

1. What did IterNest notice?
2. What does IterNest recommend?
3. Why does that recommendation preserve or repair instructional intent?
4. What source evidence supports it?
5. What assumptions or uncertainties remain?
6. What will happen only if the parent approves?

Explainability should be visible in the product experience, not hidden in logs or developer tools.

## Growth Principle

IterNest should never simply keep a learner where they currently are.

Every recommendation should answer three questions:

1. Can this learner succeed today?
2. Does this recommendation stretch them slightly beyond their current comfort zone?
3. Is that stretch small enough to build confidence rather than frustration?

Recommendations should encourage steady growth toward greater independence while avoiding overwhelm.

Support should not become stagnation. Flexibility should not become avoidance. IterNest should help learners experience success while continuing to grow.

## Dynamic Potential Principle

Learner Profiles describe where a learner is today.

They do not define the learner's future potential.

IterNest should continually look for opportunities to help students develop new skills, increase independence, and expand their abilities through appropriately challenging experiences.

The goal is to meet learners where they are while believing they are capable of more.

Learner data should guide support, not limit ambition.

## Learner Profile Principle

Learner Profiles should help IterNest understand present needs, not create permanent labels.

Profiles may include:

- Current independence level
- Confidence patterns
- Subjects that need more support
- Subjects that invite stretch
- Attention and energy patterns
- Parent notes
- Successful teaching strategies
- Pacing history

These profiles should remain editable, contextual, and humble. A profile should never become a prediction that confines a learner.

## Recommendation Standard

Before IterNest recommends a plan change, it should be able to answer:

- What is the instructional goal or lesson intent?
- Which parts of the lesson are required by the source?
- Which parts are teacher-led?
- Which parts are independent?
- Which parts require materials or preparation?
- Which parts are review, assessment, optional, or flexible?
- What depends on what?
- What does the learner need today?
- What changed in the family's time or capacity?
- What is the smallest useful adjustment?
- What evidence supports the adjustment?
- What remains uncertain?

If these questions cannot be answered, IterNest should ask the parent instead of manufacturing certainty.

## Plan Repair Principle

IterNest's highest-value workflow is plan repair.

When time changes, IterNest should help the parent decide what to:

- Protect
- Move
- Combine
- Delay
- Simplify
- Review
- Skip only when appropriate and parent-approved

Plan repair should preserve instructional intent. It should reduce the parent's cognitive load while keeping the parent in charge.

The best IterNest recommendation should feel like:

"I see what changed. I understand what this lesson was trying to accomplish. Here is the safest adjustment, here is why, and here is what I need you to approve."

## Emotional UX Principle

IterNest should be calm, respectful, and steady.

It should not sound like a motivational app. It should not flatter, scold, pressure, or dramatize. It should feel like a trusted teaching assistant who understands that family life is real and learning still matters.

The product should reduce shame and decision fatigue.

Good IterNest language is:

- Clear
- Specific
- Honest
- Encouraging without being performative
- Calm under disruption
- Respectful of parent authority

## Source Fidelity Principle

IterNest must preserve the distinction between source, interpretation, and recommendation.

Source is what the curriculum actually says.

Interpretation is what IterNest understands from the source.

Recommendation is what IterNest suggests the family do.

These must not be blurred.

Parents should always be able to trace a recommendation back to source evidence and see where IterNest made an interpretive step.

## Implementation Principle

Features should be built in the same order as trust:

1. Read the source.
2. Show what was read.
3. Identify one lesson.
4. Understand that lesson.
5. Explain confidence and unknowns.
6. Ask for parent approval.
7. Only then scale to many lessons.
8. Only then recommend plan repairs.
9. Only then connect to schedules or calendars.

If a feature skips a trust step, it should not ship.

## Constitution Check for Future Features

Before implementing a future feature, ask:

- Does this reduce parent cognitive overload?
- Does this help teach the child the family actually has?
- Does this preserve instructional intent?
- Does this distinguish source, interpretation, and recommendation?
- Does this show evidence?
- Does this communicate confidence?
- Does this require approval before meaningful changes?
- Does this support growth without overwhelm?
- Does this treat learner potential as dynamic?
- Does this make real-life plan repair easier?

If the answer is no, the feature should be redesigned before implementation.
