import type {
  CurriculumIntelligenceSummary,
  CurriculumIntelligenceSummaryTrace,
} from '../curriculum-intelligence/contracts';
import type {
  FamilyUnderstandingSummary,
  FamilyUnderstandingSummaryTrace,
} from '../family-understanding/contracts';
import type {
  LearnerUnderstandingSummary,
  LearnerUnderstandingSummaryTrace,
} from '../learner-understanding/contracts';
import type {
  LearningContinuitySummary,
  LearningContinuitySummaryTrace,
} from '../learning-continuity/contracts';
import type {
  DecisionContext,
  DecisionContextAssemblyInput,
  DecisionContextConfirmationRequirement,
  DecisionContextEvidence,
  DecisionContextEvidenceTrace,
  DecisionContextSourceSummary,
  DecisionContextSummaryStatus,
  DecisionContextUnknown,
} from './contracts';

export function assembleDecisionContext({
  id = 'decision-context',
  curriculum,
  family,
  learner,
  learningContinuity,
}: DecisionContextAssemblyInput): DecisionContext {
  const sourceSummaries: DecisionContextSourceSummary[] = [
    {
      subsystem: 'curriculum-intelligence',
      status: curriculum.summaryStatus,
      summary: curriculum,
    },
    {
      subsystem: 'family-understanding',
      status: family.summaryStatus,
      summary: family,
    },
    {
      subsystem: 'learner-understanding',
      status: learner.summaryStatus,
      summary: learner,
    },
    {
      subsystem: 'learning-continuity',
      status: learningContinuity.summaryStatus,
      summary: learningContinuity,
    },
  ];
  const evidenceTraces = [
    ...curriculumTracesToDecisionContext(curriculum),
    ...familyTracesToDecisionContext(family),
    ...learnerTracesToDecisionContext(learner),
    ...learningContinuityTracesToDecisionContext(learningContinuity),
  ];

  return {
    id,
    contractVersion: '1.0',
    generatedAt: new Date().toISOString(),
    sourceSummaries,
    contextStatus: determineContextStatus(sourceSummaries),
    unknowns: buildUnknowns(curriculum, family, learner, learningContinuity),
    confirmationRequirements: buildConfirmationRequirements(
      curriculum,
      family,
      learner,
      learningContinuity,
    ),
    evidenceTraces,
    evidenceProfile: buildEvidenceProfile(sourceSummaries),
  };
}

function determineContextStatus(
  sourceSummaries: DecisionContextSourceSummary[],
): DecisionContextSummaryStatus {
  if (sourceSummaries.some((summary) => summary.status === 'blocked')) {
    return 'blocked';
  }

  if (sourceSummaries.some((summary) => summary.status === 'limited')) {
    return 'limited';
  }

  if (sourceSummaries.every((summary) => summary.status === 'empty')) {
    return 'empty';
  }

  return 'available';
}

function buildUnknowns(
  curriculum: CurriculumIntelligenceSummary,
  family: FamilyUnderstandingSummary,
  learner: LearnerUnderstandingSummary,
  learningContinuity: LearningContinuitySummary,
): DecisionContextUnknown[] {
  return [
    ...curriculum.unknowns.map((unknown) => ({
      id: `decision-context-unknown-${unknown.id}`,
      subsystem: 'curriculum-intelligence' as const,
      question: unknown.question,
      reason: unknown.reason,
      blocksDecisionReadiness: unknown.blocksProfileReadiness,
    })),
    ...family.unknowns.map((unknown) => ({
      id: `decision-context-unknown-${unknown.id}`,
      subsystem: 'family-understanding' as const,
      question: unknown.question,
      reason: unknown.reason,
      blocksDecisionReadiness: unknown.blocksProfileReadiness,
    })),
    ...learner.unknowns.map((unknown) => ({
      id: `decision-context-unknown-${unknown.id}`,
      subsystem: 'learner-understanding' as const,
      question: unknown.question,
      reason: unknown.reason,
      blocksDecisionReadiness: unknown.blocksProfileReadiness,
    })),
    ...learningContinuity.unknowns.map((unknown) => ({
      id: `decision-context-unknown-${unknown.id}`,
      subsystem: 'learning-continuity' as const,
      question: unknown.question,
      reason: unknown.reason,
      blocksDecisionReadiness: unknown.blocksProfileReadiness,
    })),
  ];
}

function buildConfirmationRequirements(
  curriculum: CurriculumIntelligenceSummary,
  family: FamilyUnderstandingSummary,
  learner: LearnerUnderstandingSummary,
  learningContinuity: LearningContinuitySummary,
): DecisionContextConfirmationRequirement[] {
  return [
    ...curriculum.humanConfirmations
      .filter((confirmation) => confirmation.confirmedValue.trim().length === 0)
      .map((confirmation) => ({
        id: `decision-context-confirmation-${confirmation.id}`,
        subsystem: 'curriculum-intelligence' as const,
        targetId: confirmation.targetId,
        prompt: `Confirm ${confirmation.targetType} ${confirmation.targetId}.`,
        reason: confirmation.note ?? 'Curriculum Intelligence requires human confirmation.',
        requiredBeforeParentDecision: true,
      })),
    ...family.humanConfirmations
      .filter((confirmation) => confirmation.confirmedValue.trim().length === 0)
      .map((confirmation) => ({
        id: `decision-context-confirmation-${confirmation.id}`,
        subsystem: 'family-understanding' as const,
        targetId: confirmation.targetId,
        prompt: `Confirm ${confirmation.targetType} ${confirmation.targetId}.`,
        reason: confirmation.note ?? 'Family Understanding requires human confirmation.',
        requiredBeforeParentDecision: true,
      })),
    ...learner.humanConfirmations
      .filter((confirmation) => confirmation.confirmedValue.trim().length === 0)
      .map((confirmation) => ({
        id: `decision-context-confirmation-${confirmation.id}`,
        subsystem: 'learner-understanding' as const,
        targetId: confirmation.targetId,
        prompt: `Confirm ${confirmation.targetType} ${confirmation.targetId}.`,
        reason: confirmation.note ?? 'Learner Understanding requires human confirmation.',
        requiredBeforeParentDecision: true,
      })),
    ...learningContinuity.humanConfirmations
      .filter((confirmation) => confirmation.confirmedValue.trim().length === 0)
      .map((confirmation) => ({
        id: `decision-context-confirmation-${confirmation.id}`,
        subsystem: 'learning-continuity' as const,
        targetId: confirmation.targetId,
        prompt: `Confirm ${confirmation.targetType} ${confirmation.targetId}.`,
        reason: confirmation.note ?? 'Learning Continuity requires human confirmation.',
        requiredBeforeParentDecision: true,
      })),
  ];
}

function curriculumTracesToDecisionContext(
  curriculum: CurriculumIntelligenceSummary,
): DecisionContextEvidenceTrace[] {
  return [
    ...curriculum.curriculumIdentity,
    ...curriculum.instructionCharacteristics,
    ...curriculum.resourceEcosystem,
    ...curriculum.learningStructure,
    ...curriculum.operationalCharacteristics,
  ].flatMap((signal) =>
    signal.trace.map((trace) => {
      const evidence = curriculumEvidenceToDecisionContext(trace);

      return {
        subsystem: 'curriculum-intelligence' as const,
        sourceSummaryId: curriculum.id,
        evidence,
        confidence: {
          level: trace.confidence.level,
          rationale: trace.confidence.rationale,
          evidence,
        },
      };
    }),
  );
}

function familyTracesToDecisionContext(
  family: FamilyUnderstandingSummary,
): DecisionContextEvidenceTrace[] {
  return [
    ...family.familyMembers,
    ...family.students,
    ...family.curriculumAssignments,
    ...family.teachingRhythm,
    ...family.recurringCommitments,
    ...family.instructionalTime,
    ...family.constraints,
  ].flatMap((signal) =>
    signal.trace.map((trace) => {
      const evidence = familyEvidenceToDecisionContext(trace);

      return {
        subsystem: 'family-understanding' as const,
        sourceSummaryId: family.id,
        evidence,
        confidence: {
          level: trace.confidence.level,
          rationale: trace.confidence.rationale,
          evidence,
        },
      };
    }),
  );
}

function learnerTracesToDecisionContext(
  learner: LearnerUnderstandingSummary,
): DecisionContextEvidenceTrace[] {
  return [
    ...learner.learnerIdentity,
    ...learner.independence,
    ...learner.directInstructionNeeds,
    ...learner.observableWorkHabits,
    ...learner.parentConfirmedStrengths,
    ...learner.parentConfirmedSupportNeeds,
    ...learner.accommodations,
    ...learner.recurringLearnerBehaviors,
    ...learner.writingStamina,
    ...learner.readingIndependence,
  ].flatMap((signal) =>
    signal.trace.map((trace) => {
      const evidence = learnerEvidenceToDecisionContext(trace);

      return {
        subsystem: 'learner-understanding' as const,
        sourceSummaryId: learner.id,
        evidence,
        confidence: {
          level: trace.confidence.level,
          rationale: trace.confidence.rationale,
          evidence,
        },
      };
    }),
  );
}

function learningContinuityTracesToDecisionContext(
  learningContinuity: LearningContinuitySummary,
): DecisionContextEvidenceTrace[] {
  return [
    ...learningContinuity.currentLessonPosition,
    ...learningContinuity.completedWork,
    ...learningContinuity.partiallyCompletedWork,
    ...learningContinuity.interruptedWork,
    ...learningContinuity.postponedLessons,
    ...learningContinuity.skippedLessons,
    ...learningContinuity.resumableWork,
    ...learningContinuity.lastCompletedLessons,
    ...learningContinuity.unfinishedAssessments,
    ...learningContinuity.accumulatedDelays,
    ...learningContinuity.carryOverWork,
  ].flatMap((signal) =>
    signal.trace.map((trace) => {
      const evidence = learningContinuityEvidenceToDecisionContext(trace);

      return {
        subsystem: 'learning-continuity' as const,
        sourceSummaryId: learningContinuity.id,
        evidence,
        confidence: {
          level: trace.confidence.level,
          rationale: trace.confidence.rationale,
          evidence,
        },
      };
    }),
  );
}

function curriculumEvidenceToDecisionContext(
  trace: CurriculumIntelligenceSummaryTrace,
): DecisionContextEvidence[] {
  return trace.evidence.map((evidence) => ({
    subsystem: 'curriculum-intelligence',
    sourceId: evidence.sourceArtifactId,
    sourceTitle: evidence.sourceTitle,
    sourceLocation: evidence.sourceLocation,
    quotedText: evidence.quotedText,
  }));
}

function familyEvidenceToDecisionContext(
  trace: FamilyUnderstandingSummaryTrace,
): DecisionContextEvidence[] {
  return trace.evidence.map((evidence) => ({
    subsystem: 'family-understanding',
    sourceId: evidence.sourceId,
    sourceTitle: evidence.sourceTitle,
    sourceLocation: evidence.sourceLocation,
    quotedText: evidence.quotedText,
  }));
}

function learnerEvidenceToDecisionContext(
  trace: LearnerUnderstandingSummaryTrace,
): DecisionContextEvidence[] {
  return trace.evidence.map((evidence) => ({
    subsystem: 'learner-understanding',
    sourceId: evidence.sourceId,
    sourceTitle: evidence.sourceTitle,
    sourceLocation: evidence.sourceLocation,
    quotedText: evidence.quotedText,
  }));
}

function learningContinuityEvidenceToDecisionContext(
  trace: LearningContinuitySummaryTrace,
): DecisionContextEvidence[] {
  return trace.evidence.map((evidence) => ({
    subsystem: 'learning-continuity',
    sourceId: evidence.sourceId,
    sourceTitle: evidence.sourceTitle,
    sourceLocation: evidence.sourceLocation,
    quotedText: evidence.quotedText,
  }));
}

function buildEvidenceProfile(sourceSummaries: DecisionContextSourceSummary[]) {
  return {
    sourceSummaryCount: sourceSummaries.length,
    availableSummaryCount: countSummariesByStatus(sourceSummaries, 'available'),
    limitedSummaryCount: countSummariesByStatus(sourceSummaries, 'limited'),
    blockedSummaryCount: countSummariesByStatus(sourceSummaries, 'blocked'),
  };
}

function countSummariesByStatus(
  sourceSummaries: DecisionContextSourceSummary[],
  status: DecisionContextSummaryStatus,
) {
  return sourceSummaries.filter((summary) => summary.status === status).length;
}
