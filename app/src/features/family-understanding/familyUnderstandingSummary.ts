import type {
  FamilyConfidenceLevel,
  FamilyHumanConfirmation,
  FamilyObservedFact,
  FamilyUnderstandingCategory,
  FamilyUnderstandingProfile,
  FamilyUnderstandingSummary,
  FamilyUnderstandingSummaryCategory,
  FamilyUnderstandingSummarySignal,
  FamilyUnderstandingSummaryTrace,
  FamilyUnknown,
} from './contracts';

type SummaryCategoryConfig = {
  summaryCategory: FamilyUnderstandingSummaryCategory;
  sourceCategory: FamilyUnderstandingCategory;
  availableStatement: string;
  unknownStatement: string;
};

const summaryCategoryConfigs: SummaryCategoryConfig[] = [
  {
    summaryCategory: 'family-members',
    sourceCategory: 'family-identity',
    availableStatement: 'Family member information is available for downstream context assembly.',
    unknownStatement: 'Family member information is not yet available.',
  },
  {
    summaryCategory: 'students',
    sourceCategory: 'student-identity',
    availableStatement: 'Student identity information is available for downstream context assembly.',
    unknownStatement: 'Student identity information is not yet available.',
  },
  {
    summaryCategory: 'curriculum-assignments',
    sourceCategory: 'curriculum-assignment',
    availableStatement:
      'Student curriculum assignment information is available for downstream context assembly.',
    unknownStatement: 'Student curriculum assignment information is not yet available.',
  },
  {
    summaryCategory: 'teaching-rhythm',
    sourceCategory: 'teaching-rhythm',
    availableStatement: 'Family teaching rhythm information is available for downstream context assembly.',
    unknownStatement: 'Family teaching rhythm information is not yet available.',
  },
  {
    summaryCategory: 'recurring-commitments',
    sourceCategory: 'recurring-commitment',
    availableStatement:
      'Recurring family commitment information is available for downstream context assembly.',
    unknownStatement: 'Recurring family commitment information is not yet available.',
  },
  {
    summaryCategory: 'instructional-time',
    sourceCategory: 'instructional-time',
    availableStatement:
      'Available instructional time information is available for downstream context assembly.',
    unknownStatement: 'Available instructional time information is not yet available.',
  },
  {
    summaryCategory: 'constraints',
    sourceCategory: 'constraint',
    availableStatement: 'Family constraint information is available for downstream context assembly.',
    unknownStatement: 'Family constraint information is not yet available.',
  },
];

export function buildFamilyUnderstandingSummary(
  profile: FamilyUnderstandingProfile,
): FamilyUnderstandingSummary {
  const signals = summaryCategoryConfigs.map((config) => buildSummarySignal(profile, config));

  return {
    id: `family-understanding-summary-${profile.id}`,
    contractVersion: '1.0',
    familyUnderstandingProfileId: profile.id,
    generatedAt: new Date().toISOString(),
    summaryStatus: determineSummaryStatus(profile),
    familyMembers: signalsForCategory(signals, 'family-members'),
    students: signalsForCategory(signals, 'students'),
    curriculumAssignments: signalsForCategory(signals, 'curriculum-assignments'),
    teachingRhythm: signalsForCategory(signals, 'teaching-rhythm'),
    recurringCommitments: signalsForCategory(signals, 'recurring-commitments'),
    instructionalTime: signalsForCategory(signals, 'instructional-time'),
    constraints: signalsForCategory(signals, 'constraints'),
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
  profile: FamilyUnderstandingProfile,
  config: SummaryCategoryConfig,
): FamilyUnderstandingSummarySignal {
  const observedFacts = factsForCategory(profile.observedFacts, config.sourceCategory);
  const unknowns = unknownsForCategory(profile.unknowns, config.sourceCategory);
  const confirmations = confirmationsForFactsAndUnknowns(
    profile.humanConfirmations,
    observedFacts,
    unknowns,
  );
  const status = determineSignalStatus(observedFacts, unknowns, confirmations);

  return {
    id: `family-summary-signal-${config.summaryCategory}`,
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
  observedFacts: FamilyObservedFact[],
  unknowns: FamilyUnknown[],
  confirmations: FamilyHumanConfirmation[],
): FamilyUnderstandingSummarySignal['status'] {
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
  profile: FamilyUnderstandingProfile,
): FamilyUnderstandingSummary['summaryStatus'] {
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

function toSummaryTrace(fact: FamilyObservedFact): FamilyUnderstandingSummaryTrace {
  return {
    familyObservedFactIds: [fact.id],
    sourceArtifactIds: fact.sourceArtifactIds,
    evidence: fact.evidence,
    confidence: fact.confidence,
  };
}

function factsForCategory(
  facts: FamilyObservedFact[],
  category: FamilyUnderstandingCategory,
) {
  return facts.filter((fact) => fact.category === category);
}

function unknownsForCategory(
  unknowns: FamilyUnknown[],
  category: FamilyUnderstandingCategory,
) {
  return unknowns.filter((unknown) => unknown.category === category);
}

function confirmationsForFactsAndUnknowns(
  confirmations: FamilyHumanConfirmation[],
  facts: FamilyObservedFact[],
  unknowns: FamilyUnknown[],
) {
  const targetIds = new Set([
    ...facts.map((fact) => fact.id),
    ...unknowns.map((unknown) => unknown.id),
  ]);

  return confirmations.filter((confirmation) => targetIds.has(confirmation.targetId));
}

function signalsForCategory(
  signals: FamilyUnderstandingSummarySignal[],
  category: FamilyUnderstandingSummaryCategory,
) {
  return signals.filter((signal) => signal.category === category);
}

function countUniqueEvidence(facts: FamilyObservedFact[]) {
  return new Set(facts.flatMap((fact) => fact.evidence.map((evidence) => evidence.id))).size;
}

function countConfidenceLevels(
  facts: FamilyObservedFact[],
): Record<FamilyConfidenceLevel, number> {
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
    } satisfies Record<FamilyConfidenceLevel, number>,
  );
}
