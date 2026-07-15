import type {
  LearnerConfidence,
  LearnerEvidence,
  LearnerEvidenceType,
  LearnerObservationInput,
  LearnerRealitySourceArtifact,
  LearnerUnderstandingCategory,
  LearnerUnderstandingClaim,
  LearnerUnderstandingInput,
  LearnerUnderstandingProfile,
  LearnerUnknown,
} from './contracts';

const requiredObservationCategories: Array<{
  category: LearnerUnderstandingCategory;
  question: string;
  reason: string;
  blocksProfileReadiness: boolean;
}> = [
  {
    category: 'independence',
    question: 'What level of independence has been explicitly observed for this learner?',
    reason: 'No explicit learner independence observation has been supplied.',
    blocksProfileReadiness: true,
  },
  {
    category: 'direct-instruction-need',
    question: 'What direct instruction needs have been explicitly observed for this learner?',
    reason: 'No explicit direct instruction need observation has been supplied.',
    blocksProfileReadiness: true,
  },
  {
    category: 'writing-stamina',
    question: 'What writing stamina has been explicitly observed for this learner?',
    reason: 'No explicit writing stamina observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'reading-independence',
    question: 'What reading independence has been explicitly observed for this learner?',
    reason: 'No explicit reading independence observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'accommodation',
    question: 'What accommodations have been explicitly supplied for this learner?',
    reason: 'No explicit accommodation observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'strength',
    question: 'What strengths have been parent-confirmed for this learner?',
    reason: 'No explicit learner strength observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'support-need',
    question: 'What support needs have been parent-confirmed for this learner?',
    reason: 'No explicit learner support need observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'recurring-habit',
    question: 'What recurring learner habits have been explicitly observed?',
    reason: 'No explicit recurring learner habit observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'work-behavior',
    question: 'What observable work behaviors have been explicitly supplied?',
    reason: 'No explicit learner work behavior observation has been supplied.',
    blocksProfileReadiness: false,
  },
];

export function buildLearnerUnderstandingProfile({
  id = 'learner-understanding-profile',
  learnerId,
  sourceArtifacts,
  observations,
  humanConfirmations = [],
}: LearnerUnderstandingInput): LearnerUnderstandingProfile {
  const claims = observations.map((observation) =>
    toObservedClaim(observation, sourceArtifacts),
  );
  const observedFacts = claims.map((claim) => ({
    id: `learner-observed-fact-${claim.id}`,
    category: claim.category,
    fact: claim.claim,
    sourceArtifactIds: Array.from(
      new Set(claim.confidence.evidence.map((evidence) => evidence.sourceId)),
    ),
    evidence: claim.confidence.evidence,
    confidence: claim.confidence,
  }));
  const unknowns = buildUnknowns(claims);
  const blockingUnknownIds = unknowns
    .filter((unknown) => unknown.blocksProfileReadiness)
    .map((unknown) => unknown.id);

  return {
    id,
    learnerId,
    sourceArtifactIds: sourceArtifacts.map((artifact) => artifact.id),
    generatedAt: new Date().toISOString(),
    lifecycleStage: 'learner-reality-observation',
    independence: claimsForCategory(claims, 'independence'),
    directInstructionNeeds: claimsForCategory(claims, 'direct-instruction-need'),
    writingStamina: claimsForCategory(claims, 'writing-stamina'),
    readingIndependence: claimsForCategory(claims, 'reading-independence'),
    accommodations: claimsForCategory(claims, 'accommodation'),
    strengths: claimsForCategory(claims, 'strength'),
    supportNeeds: claimsForCategory(claims, 'support-need'),
    recurringHabits: claimsForCategory(claims, 'recurring-habit'),
    workBehaviors: claimsForCategory(claims, 'work-behavior'),
    observedFacts,
    unknowns,
    humanConfirmations,
    profileReadiness: {
      readyForDownstreamReasoning: blockingUnknownIds.length === 0,
      confidence: buildProfileReadinessConfidence(claims, unknowns),
      blockingUnknownIds,
    },
  };
}

function toObservedClaim(
  observation: LearnerObservationInput,
  sourceArtifacts: LearnerRealitySourceArtifact[],
): LearnerUnderstandingClaim {
  const evidence = [toEvidence(observation, sourceArtifacts)];
  const requiresHumanConfirmation =
    observation.requiresHumanConfirmation ||
    observation.confidenceLevel === 'requires-human-confirmation';

  return {
    id: observation.id,
    category: observation.category,
    claim: observation.statement,
    interpretationType: 'observed-fact',
    confidence: {
      level: requiresHumanConfirmation
        ? 'requires-human-confirmation'
        : observation.confidenceLevel ?? 'high',
      rationale: requiresHumanConfirmation
        ? 'This learner observation was supplied explicitly but still requires human confirmation.'
        : 'This learner observation was supplied explicitly and is preserved as an observed fact.',
      evidence,
    },
  };
}

function toEvidence(
  observation: LearnerObservationInput,
  sourceArtifacts: LearnerRealitySourceArtifact[],
): LearnerEvidence {
  const sourceArtifact = sourceArtifacts.find(
    (artifact) => artifact.id === observation.sourceArtifactId,
  );

  return {
    id: `learner-evidence-${observation.id}`,
    sourceId: observation.sourceArtifactId,
    sourceType: sourceArtifact?.sourceType ?? 'unknown',
    sourceTitle: sourceArtifact?.title ?? 'Unknown learner source',
    sourceLocation: observation.sourceLocation,
    quotedText: observation.quotedText,
    evidenceType: evidenceTypeForSource(sourceArtifact),
  };
}

function evidenceTypeForSource(
  sourceArtifact: LearnerRealitySourceArtifact | undefined,
): LearnerEvidenceType {
  if (!sourceArtifact) {
    return 'unknown';
  }

  if (sourceArtifact.sourceType === 'work-sample') {
    return 'work-sample-record';
  }

  if (sourceArtifact.sourceType === 'assessment-record') {
    return 'assessment-record';
  }

  if (sourceArtifact.sourceType === 'accommodation-record') {
    return 'accommodation-record';
  }

  if (
    sourceArtifact.sourceType === 'learner-profile-form' ||
    sourceArtifact.sourceType === 'parent-note' ||
    sourceArtifact.sourceType === 'manual-entry'
  ) {
    return 'parent-confirmed-input';
  }

  return 'unknown';
}

function buildUnknowns(claims: LearnerUnderstandingClaim[]): LearnerUnknown[] {
  return requiredObservationCategories
    .filter(({ category }) => claimsForCategory(claims, category).length === 0)
    .map(({ category, question, reason, blocksProfileReadiness }) => ({
      id: `learner-unknown-${category}`,
      category,
      question,
      reason,
      relatedEvidence: [],
      blocksProfileReadiness,
    }));
}

function buildProfileReadinessConfidence(
  claims: LearnerUnderstandingClaim[],
  unknowns: LearnerUnknown[],
): LearnerConfidence {
  const evidence = claims.flatMap((claim) => claim.confidence.evidence);
  const blockingUnknowns = unknowns.filter((unknown) => unknown.blocksProfileReadiness);

  if (blockingUnknowns.length > 0) {
    return {
      level: 'requires-human-confirmation',
      rationale:
        'Learner Understanding has explicit observations, but required independence or direct instruction need facts are still unknown.',
      evidence,
    };
  }

  if (claims.length === 0) {
    return {
      level: 'unknown',
      rationale: 'No explicit learner observations have been supplied.',
      evidence: [],
    };
  }

  return {
    level: 'medium',
    rationale:
      'Required learner observation categories are present. Later lifecycle stages may test and preserve durable learner knowledge.',
    evidence,
  };
}

function claimsForCategory(
  claims: LearnerUnderstandingClaim[],
  category: LearnerUnderstandingCategory,
) {
  return claims.filter((claim) => claim.category === category);
}
