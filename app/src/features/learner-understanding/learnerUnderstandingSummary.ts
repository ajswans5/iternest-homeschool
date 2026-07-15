import type {
  LearnerConfidenceLevel,
  LearnerHumanConfirmation,
  LearnerObservedFact,
  LearnerUnderstandingCategory,
  LearnerUnderstandingProfile,
  LearnerUnderstandingSummary,
  LearnerUnderstandingSummaryCategory,
  LearnerUnderstandingSummarySignal,
  LearnerUnderstandingSummaryTrace,
  LearnerUnknown,
} from './contracts';

type SummaryCategoryConfig = {
  summaryCategory: Exclude<LearnerUnderstandingSummaryCategory, 'learner-identity'>;
  sourceCategory: LearnerUnderstandingCategory;
  availableStatement: string;
  unknownStatement: string;
};

const summaryCategoryConfigs: SummaryCategoryConfig[] = [
  {
    summaryCategory: 'independence',
    sourceCategory: 'independence',
    availableStatement: 'Learner independence information is available for downstream context assembly.',
    unknownStatement: 'Learner independence information is not yet available.',
  },
  {
    summaryCategory: 'direct-instruction-needs',
    sourceCategory: 'direct-instruction-need',
    availableStatement:
      'Learner direct instruction need information is available for downstream context assembly.',
    unknownStatement: 'Learner direct instruction need information is not yet available.',
  },
  {
    summaryCategory: 'writing-stamina',
    sourceCategory: 'writing-stamina',
    availableStatement: 'Learner writing stamina information is available for downstream context assembly.',
    unknownStatement: 'Learner writing stamina information is not yet available.',
  },
  {
    summaryCategory: 'reading-independence',
    sourceCategory: 'reading-independence',
    availableStatement:
      'Learner reading independence information is available for downstream context assembly.',
    unknownStatement: 'Learner reading independence information is not yet available.',
  },
  {
    summaryCategory: 'accommodations',
    sourceCategory: 'accommodation',
    availableStatement: 'Learner accommodation information is available for downstream context assembly.',
    unknownStatement: 'Learner accommodation information is not yet available.',
  },
  {
    summaryCategory: 'strengths',
    sourceCategory: 'strength',
    availableStatement:
      'Parent-confirmed learner strength information is available for downstream context assembly.',
    unknownStatement: 'Parent-confirmed learner strength information is not yet available.',
  },
  {
    summaryCategory: 'support-needs',
    sourceCategory: 'support-need',
    availableStatement:
      'Parent-confirmed learner support need information is available for downstream context assembly.',
    unknownStatement: 'Parent-confirmed learner support need information is not yet available.',
  },
  {
    summaryCategory: 'recurring-habits',
    sourceCategory: 'recurring-habit',
    availableStatement:
      'Recurring learner behavior information is available for downstream context assembly.',
    unknownStatement: 'Recurring learner behavior information is not yet available.',
  },
  {
    summaryCategory: 'work-behaviors',
    sourceCategory: 'work-behavior',
    availableStatement: 'Observable learner work habit information is available for downstream context assembly.',
    unknownStatement: 'Observable learner work habit information is not yet available.',
  },
];

export function buildLearnerUnderstandingSummary(
  profile: LearnerUnderstandingProfile,
): LearnerUnderstandingSummary {
  const signals = summaryCategoryConfigs.map((config) => buildSummarySignal(profile, config));

  return {
    id: `learner-understanding-summary-${profile.id}`,
    contractVersion: '1.0',
    learnerUnderstandingProfileId: profile.id,
    learnerId: profile.learnerId,
    generatedAt: new Date().toISOString(),
    summaryStatus: determineSummaryStatus(profile),
    learnerIdentity: [buildLearnerIdentitySignal(profile)],
    independence: signalsForCategory(signals, 'independence'),
    directInstructionNeeds: signalsForCategory(signals, 'direct-instruction-needs'),
    observableWorkHabits: signalsForCategory(signals, 'work-behaviors'),
    parentConfirmedStrengths: signalsForCategory(signals, 'strengths'),
    parentConfirmedSupportNeeds: signalsForCategory(signals, 'support-needs'),
    accommodations: signalsForCategory(signals, 'accommodations'),
    recurringLearnerBehaviors: signalsForCategory(signals, 'recurring-habits'),
    writingStamina: signalsForCategory(signals, 'writing-stamina'),
    readingIndependence: signalsForCategory(signals, 'reading-independence'),
    unknowns: profile.unknowns,
    humanConfirmations: profile.humanConfirmations,
    evidenceProfile: {
      observedFactCount: profile.observedFacts.length,
      evidenceCount: countUniqueEvidence(profile.observedFacts),
      confidenceCounts: countConfidenceLevels(profile.observedFacts),
    },
  };
}

function buildLearnerIdentitySignal(
  profile: LearnerUnderstandingProfile,
): LearnerUnderstandingSummarySignal {
  return {
    id: 'learner-summary-signal-learner-identity',
    category: 'learner-identity',
    statement: `Learner identity ${profile.learnerId} is available for downstream context assembly.`,
    status: profile.learnerId.trim().length > 0 ? 'available' : 'unknown',
    sourceObservedFactIds: [],
    unknownIds: [],
    confirmationIds: [],
    trace: [],
  };
}

function buildSummarySignal(
  profile: LearnerUnderstandingProfile,
  config: SummaryCategoryConfig,
): LearnerUnderstandingSummarySignal {
  const observedFacts = factsForCategory(profile.observedFacts, config.sourceCategory);
  const unknowns = unknownsForCategory(profile.unknowns, config.sourceCategory);
  const confirmations = confirmationsForFactsAndUnknowns(
    profile.humanConfirmations,
    observedFacts,
    unknowns,
  );
  const status = determineSignalStatus(observedFacts, unknowns, confirmations);

  return {
    id: `learner-summary-signal-${config.summaryCategory}`,
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
  observedFacts: LearnerObservedFact[],
  unknowns: LearnerUnknown[],
  confirmations: LearnerHumanConfirmation[],
): LearnerUnderstandingSummarySignal['status'] {
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
  profile: LearnerUnderstandingProfile,
): LearnerUnderstandingSummary['summaryStatus'] {
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

function toSummaryTrace(fact: LearnerObservedFact): LearnerUnderstandingSummaryTrace {
  return {
    learnerObservedFactIds: [fact.id],
    sourceArtifactIds: fact.sourceArtifactIds,
    evidence: fact.evidence,
    confidence: fact.confidence,
  };
}

function factsForCategory(
  facts: LearnerObservedFact[],
  category: LearnerUnderstandingCategory,
) {
  return facts.filter((fact) => fact.category === category);
}

function unknownsForCategory(
  unknowns: LearnerUnknown[],
  category: LearnerUnderstandingCategory,
) {
  return unknowns.filter((unknown) => unknown.category === category);
}

function confirmationsForFactsAndUnknowns(
  confirmations: LearnerHumanConfirmation[],
  facts: LearnerObservedFact[],
  unknowns: LearnerUnknown[],
) {
  const targetIds = new Set([
    ...facts.map((fact) => fact.id),
    ...unknowns.map((unknown) => unknown.id),
  ]);

  return confirmations.filter((confirmation) => targetIds.has(confirmation.targetId));
}

function signalsForCategory(
  signals: LearnerUnderstandingSummarySignal[],
  category: LearnerUnderstandingSummaryCategory,
) {
  return signals.filter((signal) => signal.category === category);
}

function countUniqueEvidence(facts: LearnerObservedFact[]) {
  return new Set(facts.flatMap((fact) => fact.evidence.map((evidence) => evidence.id))).size;
}

function countConfidenceLevels(
  facts: LearnerObservedFact[],
): Record<LearnerConfidenceLevel, number> {
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
    } satisfies Record<LearnerConfidenceLevel, number>,
  );
}
