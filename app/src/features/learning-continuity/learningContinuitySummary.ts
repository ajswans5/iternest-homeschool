import type {
  LearningContinuityCategory,
  LearningContinuityConfidenceLevel,
  LearningContinuityHumanConfirmation,
  LearningContinuityObservedFact,
  LearningContinuityProfile,
  LearningContinuitySummary,
  LearningContinuitySummaryCategory,
  LearningContinuitySummarySignal,
  LearningContinuitySummaryTrace,
  LearningContinuityUnknown,
} from './contracts';

type SummaryCategoryConfig = {
  summaryCategory: LearningContinuitySummaryCategory;
  sourceCategory: LearningContinuityCategory;
  availableStatement: string;
  unknownStatement: string;
};

const summaryCategoryConfigs: SummaryCategoryConfig[] = [
  {
    summaryCategory: 'current-lesson-position',
    sourceCategory: 'current-lesson-position',
    availableStatement:
      'Current lesson position information is available for downstream context assembly.',
    unknownStatement: 'Current lesson position information is not yet available.',
  },
  {
    summaryCategory: 'completed-work',
    sourceCategory: 'completed-work',
    availableStatement: 'Completed work information is available for downstream context assembly.',
    unknownStatement: 'Completed work information is not yet available.',
  },
  {
    summaryCategory: 'partially-completed-work',
    sourceCategory: 'partially-completed-work',
    availableStatement:
      'Partially completed work information is available for downstream context assembly.',
    unknownStatement: 'Partially completed work information is not yet available.',
  },
  {
    summaryCategory: 'interrupted-work',
    sourceCategory: 'interrupted-work',
    availableStatement: 'Interrupted work information is available for downstream context assembly.',
    unknownStatement: 'Interrupted work information is not yet available.',
  },
  {
    summaryCategory: 'postponed-lessons',
    sourceCategory: 'postponed-lesson',
    availableStatement: 'Postponed lesson information is available for downstream context assembly.',
    unknownStatement: 'Postponed lesson information is not yet available.',
  },
  {
    summaryCategory: 'skipped-lessons',
    sourceCategory: 'skipped-lesson',
    availableStatement: 'Skipped lesson information is available for downstream context assembly.',
    unknownStatement: 'Skipped lesson information is not yet available.',
  },
  {
    summaryCategory: 'resumable-work',
    sourceCategory: 'resumable-work',
    availableStatement: 'Resumable work information is available for downstream context assembly.',
    unknownStatement: 'Resumable work information is not yet available.',
  },
  {
    summaryCategory: 'last-completed-lessons',
    sourceCategory: 'last-completed-lesson',
    availableStatement:
      'Last completed lesson information is available for downstream context assembly.',
    unknownStatement: 'Last completed lesson information is not yet available.',
  },
  {
    summaryCategory: 'unfinished-assessments',
    sourceCategory: 'unfinished-assessment',
    availableStatement:
      'Unfinished assessment information is available for downstream context assembly.',
    unknownStatement: 'Unfinished assessment information is not yet available.',
  },
  {
    summaryCategory: 'accumulated-delays',
    sourceCategory: 'accumulated-delay',
    availableStatement:
      'Accumulated delay information is available for downstream context assembly.',
    unknownStatement: 'Accumulated delay information is not yet available.',
  },
  {
    summaryCategory: 'carry-over-work',
    sourceCategory: 'carry-over-work',
    availableStatement: 'Carry-over work information is available for downstream context assembly.',
    unknownStatement: 'Carry-over work information is not yet available.',
  },
];

export function buildLearningContinuitySummary(
  profile: LearningContinuityProfile,
): LearningContinuitySummary {
  const signals = summaryCategoryConfigs.map((config) => buildSummarySignal(profile, config));

  return {
    id: `learning-continuity-summary-${profile.id}`,
    contractVersion: '1.0',
    learningContinuityProfileId: profile.id,
    learnerId: profile.learnerId,
    curriculumId: profile.curriculumId,
    generatedAt: new Date().toISOString(),
    summaryStatus: determineSummaryStatus(profile),
    currentLessonPosition: signalsForCategory(signals, 'current-lesson-position'),
    completedWork: signalsForCategory(signals, 'completed-work'),
    partiallyCompletedWork: signalsForCategory(signals, 'partially-completed-work'),
    interruptedWork: signalsForCategory(signals, 'interrupted-work'),
    postponedLessons: signalsForCategory(signals, 'postponed-lessons'),
    skippedLessons: signalsForCategory(signals, 'skipped-lessons'),
    resumableWork: signalsForCategory(signals, 'resumable-work'),
    lastCompletedLessons: signalsForCategory(signals, 'last-completed-lessons'),
    unfinishedAssessments: signalsForCategory(signals, 'unfinished-assessments'),
    accumulatedDelays: signalsForCategory(signals, 'accumulated-delays'),
    carryOverWork: signalsForCategory(signals, 'carry-over-work'),
    unknowns: profile.unknowns,
    humanConfirmations: profile.humanConfirmations,
    evidenceProfile: {
      observedFactCount: profile.observedFacts.length,
      evidenceCount: countUniqueEvidence(profile.observedFacts),
      confidenceCounts: countConfidenceLevels(profile.observedFacts),
    },
  };
}

function buildSummarySignal(
  profile: LearningContinuityProfile,
  config: SummaryCategoryConfig,
): LearningContinuitySummarySignal {
  const observedFacts = factsForCategory(profile.observedFacts, config.sourceCategory);
  const unknowns = unknownsForCategory(profile.unknowns, config.sourceCategory);
  const confirmations = confirmationsForFactsAndUnknowns(
    profile.humanConfirmations,
    observedFacts,
    unknowns,
  );
  const status = determineSignalStatus(observedFacts, unknowns, confirmations);

  return {
    id: `learning-continuity-summary-signal-${config.summaryCategory}`,
    category: config.summaryCategory,
    statement: observedFacts.length > 0 ? config.availableStatement : config.unknownStatement,
    status,
    sourceObservedFactIds: observedFacts.map((fact) => fact.id),
    unknownIds: unknowns.map((unknown) => unknown.id),
    confirmationIds: confirmations.map((confirmation) => confirmation.id),
    trace: observedFacts.map(toSummaryTrace),
  };
}

function determineSignalStatus(
  observedFacts: LearningContinuityObservedFact[],
  unknowns: LearningContinuityUnknown[],
  confirmations: LearningContinuityHumanConfirmation[],
): LearningContinuitySummarySignal['status'] {
  if (confirmations.some((confirmation) => confirmation.confirmedValue.trim().length === 0)) {
    return 'requires-human-confirmation';
  }

  if (observedFacts.some((fact) => fact.confidence.level === 'requires-human-confirmation')) {
    return 'requires-human-confirmation';
  }

  if (observedFacts.length > 0 && unknowns.length > 0) {
    return 'limited';
  }

  if (observedFacts.length > 0) {
    return 'available';
  }

  return 'unknown';
}

function determineSummaryStatus(
  profile: LearningContinuityProfile,
): LearningContinuitySummary['summaryStatus'] {
  if (profile.observedFacts.length === 0) {
    return 'empty';
  }

  if (profile.profileReadiness.blockingUnknownIds.length > 0) {
    return 'blocked';
  }

  if (
    profile.unknowns.length > 0 ||
    profile.humanConfirmations.some((confirmation) => confirmation.confirmedValue.trim().length === 0)
  ) {
    return 'limited';
  }

  return 'available';
}

function toSummaryTrace(
  fact: LearningContinuityObservedFact,
): LearningContinuitySummaryTrace {
  return {
    learningContinuityObservedFactIds: [fact.id],
    sourceArtifactIds: fact.sourceArtifactIds,
    evidence: fact.evidence,
    confidence: fact.confidence,
  };
}

function factsForCategory(
  facts: LearningContinuityObservedFact[],
  category: LearningContinuityCategory,
) {
  return facts.filter((fact) => fact.category === category);
}

function unknownsForCategory(
  unknowns: LearningContinuityUnknown[],
  category: LearningContinuityCategory,
) {
  return unknowns.filter((unknown) => unknown.category === category);
}

function confirmationsForFactsAndUnknowns(
  confirmations: LearningContinuityHumanConfirmation[],
  facts: LearningContinuityObservedFact[],
  unknowns: LearningContinuityUnknown[],
) {
  const targetIds = new Set([
    ...facts.map((fact) => fact.id),
    ...unknowns.map((unknown) => unknown.id),
  ]);

  return confirmations.filter((confirmation) => targetIds.has(confirmation.targetId));
}

function signalsForCategory(
  signals: LearningContinuitySummarySignal[],
  category: LearningContinuitySummaryCategory,
) {
  return signals.filter((signal) => signal.category === category);
}

function countUniqueEvidence(facts: LearningContinuityObservedFact[]) {
  return new Set(facts.flatMap((fact) => fact.evidence.map((evidence) => evidence.id))).size;
}

function countConfidenceLevels(
  facts: LearningContinuityObservedFact[],
): Record<LearningContinuityConfidenceLevel, number> {
  return facts.reduce(
    (counts, fact) => ({
      ...counts,
      [fact.confidence.level]: counts[fact.confidence.level] + 1,
    }),
    {
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
      'requires-human-confirmation': 0,
    } satisfies Record<LearningContinuityConfidenceLevel, number>,
  );
}
