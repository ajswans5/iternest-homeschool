import type {
  LearningContinuityCategory,
  LearningContinuityClaim,
  LearningContinuityConfidence,
  LearningContinuityEvidence,
  LearningContinuityEvidenceType,
  LearningContinuityInput,
  LearningContinuityObservationInput,
  LearningContinuityProfile,
  LearningContinuitySourceArtifact,
  LearningContinuityUnknown,
} from './contracts';

const requiredObservationCategories: Array<{
  category: LearningContinuityCategory;
  question: string;
  reason: string;
  blocksProfileReadiness: boolean;
}> = [
  {
    category: 'last-completed-lesson',
    question: 'What was the last explicitly completed lesson?',
    reason: 'No explicit last completed lesson observation has been supplied.',
    blocksProfileReadiness: true,
  },
  {
    category: 'current-lesson-position',
    question: 'What is the current explicitly supplied lesson position?',
    reason: 'No explicit current lesson position observation has been supplied.',
    blocksProfileReadiness: true,
  },
  {
    category: 'completed-work',
    question: 'What work has been explicitly marked complete?',
    reason: 'No explicit completed work observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'partially-completed-work',
    question: 'What work has been explicitly marked partially complete?',
    reason: 'No explicit partially completed work observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'interrupted-work',
    question: 'What work has been explicitly marked interrupted?',
    reason: 'No explicit interrupted work observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'postponed-lesson',
    question: 'What lessons have been explicitly postponed?',
    reason: 'No explicit postponed lesson observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'skipped-lesson',
    question: 'What lessons have been explicitly skipped?',
    reason: 'No explicit skipped lesson observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'resumable-work',
    question: 'What work has been explicitly marked resumable?',
    reason: 'No explicit resumable work observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'unfinished-assessment',
    question: 'What assessments are explicitly unfinished?',
    reason: 'No explicit unfinished assessment observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'accumulated-delay',
    question: 'What accumulated delays have been explicitly recorded?',
    reason: 'No explicit accumulated delay observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'carry-over-work',
    question: 'What carry-over work has the parent explicitly declared?',
    reason: 'No explicit carry-over work observation has been supplied.',
    blocksProfileReadiness: false,
  },
];

export function buildLearningContinuityProfile({
  id = 'learning-continuity-profile',
  learnerId,
  curriculumId,
  sourceArtifacts,
  observations,
  humanConfirmations = [],
}: LearningContinuityInput): LearningContinuityProfile {
  const claims = observations.map((observation) =>
    toObservedClaim(observation, sourceArtifacts),
  );
  const observedFacts = claims.map((claim) => ({
    id: `learning-continuity-observed-fact-${claim.id}`,
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
    curriculumId,
    sourceArtifactIds: sourceArtifacts.map((artifact) => artifact.id),
    generatedAt: new Date().toISOString(),
    lifecycleStage: 'continuity-reality-observation',
    completedWork: claimsForCategory(claims, 'completed-work'),
    partiallyCompletedWork: claimsForCategory(claims, 'partially-completed-work'),
    interruptedWork: claimsForCategory(claims, 'interrupted-work'),
    postponedLessons: claimsForCategory(claims, 'postponed-lesson'),
    skippedLessons: claimsForCategory(claims, 'skipped-lesson'),
    resumableWork: claimsForCategory(claims, 'resumable-work'),
    lastCompletedLessons: claimsForCategory(claims, 'last-completed-lesson'),
    currentLessonPositions: claimsForCategory(claims, 'current-lesson-position'),
    unfinishedAssessments: claimsForCategory(claims, 'unfinished-assessment'),
    accumulatedDelays: claimsForCategory(claims, 'accumulated-delay'),
    carryOverWork: claimsForCategory(claims, 'carry-over-work'),
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
  observation: LearningContinuityObservationInput,
  sourceArtifacts: LearningContinuitySourceArtifact[],
): LearningContinuityClaim {
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
        ? 'This learning continuity observation was supplied explicitly but still requires human confirmation.'
        : 'This learning continuity observation was supplied explicitly and is preserved as an observed fact.',
      evidence,
    },
  };
}

function toEvidence(
  observation: LearningContinuityObservationInput,
  sourceArtifacts: LearningContinuitySourceArtifact[],
): LearningContinuityEvidence {
  const sourceArtifact = sourceArtifacts.find(
    (artifact) => artifact.id === observation.sourceArtifactId,
  );

  return {
    id: `learning-continuity-evidence-${observation.id}`,
    sourceId: observation.sourceArtifactId,
    sourceType: sourceArtifact?.sourceType ?? 'unknown',
    sourceTitle: sourceArtifact?.title ?? 'Unknown learning continuity source',
    sourceLocation: observation.sourceLocation,
    quotedText: observation.quotedText,
    evidenceType: evidenceTypeForSource(sourceArtifact),
  };
}

function evidenceTypeForSource(
  sourceArtifact: LearningContinuitySourceArtifact | undefined,
): LearningContinuityEvidenceType {
  if (!sourceArtifact) {
    return 'unknown';
  }

  if (sourceArtifact.sourceType === 'completion-record') {
    return 'completion-record';
  }

  if (sourceArtifact.sourceType === 'lesson-progress-record') {
    return 'lesson-progress-record';
  }

  if (sourceArtifact.sourceType === 'assessment-progress-record') {
    return 'assessment-progress-record';
  }

  if (
    sourceArtifact.sourceType === 'parent-note' ||
    sourceArtifact.sourceType === 'manual-entry'
  ) {
    return 'parent-declared-input';
  }

  return 'unknown';
}

function buildUnknowns(
  claims: LearningContinuityClaim[],
): LearningContinuityUnknown[] {
  return requiredObservationCategories
    .filter(({ category }) => claimsForCategory(claims, category).length === 0)
    .map(({ category, question, reason, blocksProfileReadiness }) => ({
      id: `learning-continuity-unknown-${category}`,
      category,
      question,
      reason,
      relatedEvidence: [],
      blocksProfileReadiness,
    }));
}

function buildProfileReadinessConfidence(
  claims: LearningContinuityClaim[],
  unknowns: LearningContinuityUnknown[],
): LearningContinuityConfidence {
  const evidence = claims.flatMap((claim) => claim.confidence.evidence);
  const blockingUnknowns = unknowns.filter((unknown) => unknown.blocksProfileReadiness);

  if (blockingUnknowns.length > 0) {
    return {
      level: 'requires-human-confirmation',
      rationale:
        'Learning Continuity has explicit observations, but required last completed lesson or current lesson position facts are still unknown.',
      evidence,
    };
  }

  if (claims.length === 0) {
    return {
      level: 'unknown',
      rationale: 'No explicit learning continuity observations have been supplied.',
      evidence: [],
    };
  }

  return {
    level: 'medium',
    rationale:
      'Required learning continuity observation categories are present. Later lifecycle stages may test and preserve durable continuity knowledge.',
    evidence,
  };
}

function claimsForCategory(
  claims: LearningContinuityClaim[],
  category: LearningContinuityCategory,
) {
  return claims.filter((claim) => claim.category === category);
}
