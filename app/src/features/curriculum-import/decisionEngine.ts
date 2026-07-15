import type {
  LearnerContext,
  LessonModel,
  ParentDecision,
  ParentDecisionItem,
  ParentTeachingAction,
} from '../../domain/contracts';

type BuildParentDecisionInput = {
  learnerContext: LearnerContext;
  lessonModels: LessonModel[];
};

export function buildParentDecision({
  learnerContext,
  lessonModels,
}: BuildParentDecisionInput): ParentDecision {
  const firstLesson = lessonModels[0];

  if (!firstLesson) {
    return {
      id: 'decision-blocked-no-lesson-model',
      generatedAt: new Date().toISOString(),
      learnerId: learnerContext.learnerId,
      stage: 'blocked-needs-parent-review',
      headline: "I don't have enough evidence to identify one complete lesson.",
      summary:
        'The parser has not produced a reliable Lesson Model yet, so the Decision Engine will not ask the parent to approve teaching actions.',
      lessonModelIds: [],
      decisionsRequiredNow: [
        {
          id: 'review-source-evidence',
          type: 'answer-uncertainty',
          prompt: 'Review the source evidence or upload a more readable curriculum file.',
          whyNow:
            'IterNest needs one reliable Lesson Model before it can decide what the parent needs to see today.',
          requiredForToday: true,
          confidence: 'not-enough-evidence',
          evidence: [],
        },
      ],
      teachingActionsToSurface: [],
      stagedForLater: [],
      approvalRequired: false,
      approvalMeaning: 'No approval is available until one reliable Lesson Model exists.',
      confidence: 'not-enough-evidence',
    };
  }

  const teachingActions = buildTeachingActions(firstLesson, learnerContext);
  const uncertaintyDecisions = buildUncertaintyDecisions(firstLesson);

  return {
    id: `decision-confirm-${firstLesson.id}`,
    generatedAt: new Date().toISOString(),
    learnerId: learnerContext.learnerId,
    stage: firstLesson.confidence === 'high' ? 'lesson-confirmation' : 'blocked-needs-parent-review',
    headline: 'Confirm this lesson model before anything is scheduled.',
    summary:
      'The Decision Engine is surfacing only the information needed now: whether this one Lesson Model accurately reflects what the curriculum asks the parent and student to do.',
    lessonModelIds: [firstLesson.id],
    decisionsRequiredNow: [
      {
        id: `confirm-${firstLesson.id}`,
        type: 'confirm-lesson-model',
        prompt: 'Confirm that this Lesson Model is accurate enough to use later.',
        whyNow:
          'A confirmed Lesson Model is required before IterNest can reason about teaching, scheduling, or plan repair.',
        requiredForToday: true,
        confidence: firstLesson.confidence,
        evidence: firstLesson.sourceEvidence,
      },
      ...uncertaintyDecisions,
    ],
    teachingActionsToSurface: teachingActions,
    stagedForLater: lessonModels.slice(1).map((lesson) => ({
      id: `staged-${lesson.id}`,
      lessonModelId: lesson.id,
      reason:
        'This lesson remains staged for later. The parent only needs to confirm the current lesson model now.',
    })),
    approvalRequired: true,
    approvalMeaning:
      'Approval confirms one Lesson Model. It does not approve scheduling, plan repair, or curriculum-wide import.',
    confidence: firstLesson.confidence,
  };
}

function buildTeachingActions(
  lesson: LessonModel,
  learnerContext: LearnerContext,
): ParentTeachingAction[] {
  return [
    ...lesson.teacherResponsibilities.map((item) => ({
      id: `teach-${item.id}`,
      label: item.text,
      actionType: 'teach' as const,
      lessonModelId: lesson.id,
      learnerId: learnerContext.learnerId,
      reason: 'This is teacher-led work supported by the Lesson Model.',
      evidence: item.evidence,
      confidence: item.confidence,
    })),
    ...lesson.materialsRequired.map((item) => ({
      id: `prepare-${item.id}`,
      label: item.text,
      actionType: 'prepare' as const,
      lessonModelId: lesson.id,
      learnerId: learnerContext.learnerId,
      reason: 'This material or preparation item is supported by source evidence.',
      evidence: item.evidence,
      confidence: item.confidence,
    })),
    ...lesson.studentResponsibilities.map((item) => ({
      id: `student-${item.id}`,
      label: item.text,
      actionType: 'assign-independent-work' as const,
      lessonModelId: lesson.id,
      learnerId: learnerContext.learnerId,
      reason: 'This is student work supported by the Lesson Model.',
      evidence: item.evidence,
      confidence: item.confidence,
    })),
    ...lesson.reviewsAndAssessments.map((item) => ({
      id: `review-${item.id}`,
      label: item.text,
      actionType: item.type === 'assessment' ? ('assess' as const) : ('review' as const),
      lessonModelId: lesson.id,
      learnerId: learnerContext.learnerId,
      reason: 'This review or assessment item is supported by source evidence.',
      evidence: item.evidence,
      confidence: item.confidence,
    })),
    ...lesson.unknowns.map((unknown) => ({
      id: `ask-${unknown.id}`,
      label: unknown.question,
      actionType: 'ask-parent' as const,
      lessonModelId: lesson.id,
      learnerId: learnerContext.learnerId,
      reason: unknown.reason,
      evidence: unknown.relatedEvidence,
      confidence: 'needs-parent-review' as const,
    })),
  ];
}

function buildUncertaintyDecisions(lesson: LessonModel): ParentDecisionItem[] {
  return lesson.unknowns.map((unknown) => ({
    id: `uncertainty-${unknown.id}`,
    type: 'answer-uncertainty',
    prompt: unknown.question,
    whyNow: unknown.reason,
    requiredForToday: true,
    confidence: 'needs-parent-review',
    evidence: unknown.relatedEvidence,
  }));
}
