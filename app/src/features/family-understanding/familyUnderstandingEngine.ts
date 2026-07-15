import type {
  FamilyConfidence,
  FamilyEvidence,
  FamilyEvidenceType,
  FamilyObservationInput,
  FamilyRealitySourceArtifact,
  FamilyUnderstandingCategory,
  FamilyUnderstandingClaim,
  FamilyUnderstandingInput,
  FamilyUnderstandingProfile,
  FamilyUnknown,
} from './contracts';

const requiredObservationCategories: Array<{
  category: FamilyUnderstandingCategory;
  question: string;
  reason: string;
  blocksProfileReadiness: boolean;
}> = [
  {
    category: 'family-identity',
    question: 'Who is in the family?',
    reason: 'No explicit family identity observation has been supplied.',
    blocksProfileReadiness: true,
  },
  {
    category: 'student-identity',
    question: 'Which students exist?',
    reason: 'No explicit student identity observation has been supplied.',
    blocksProfileReadiness: true,
  },
  {
    category: 'curriculum-assignment',
    question: 'Which curricula belong to each student?',
    reason: 'No explicit curriculum assignment observation has been supplied.',
    blocksProfileReadiness: true,
  },
  {
    category: 'teaching-rhythm',
    question: "What is the family's normal teaching rhythm?",
    reason: 'No explicit teaching rhythm observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'recurring-commitment',
    question: 'What recurring commitments affect instruction?',
    reason: 'No explicit recurring commitment observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'instructional-time',
    question: 'What instructional time is typically available?',
    reason: 'No explicit instructional time observation has been supplied.',
    blocksProfileReadiness: false,
  },
  {
    category: 'constraint',
    question: 'What constraints consistently affect teaching?',
    reason: 'No explicit family constraint observation has been supplied.',
    blocksProfileReadiness: false,
  },
];

export function buildFamilyUnderstandingProfile({
  id = 'family-understanding-profile',
  sourceArtifacts,
  observations,
  humanConfirmations = [],
}: FamilyUnderstandingInput): FamilyUnderstandingProfile {
  const claims = observations.map((observation) =>
    toObservedClaim(observation, sourceArtifacts),
  );
  const observedFacts = claims.map((claim) => ({
    id: `family-observed-fact-${claim.id}`,
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
    sourceArtifactIds: sourceArtifacts.map((artifact) => artifact.id),
    generatedAt: new Date().toISOString(),
    lifecycleStage: 'family-reality-observation',
    familyIdentity: claimsForCategory(claims, 'family-identity'),
    students: claimsForCategory(claims, 'student-identity'),
    curriculumAssignments: claimsForCategory(claims, 'curriculum-assignment'),
    teachingRhythm: claimsForCategory(claims, 'teaching-rhythm'),
    recurringCommitments: claimsForCategory(claims, 'recurring-commitment'),
    instructionalTime: claimsForCategory(claims, 'instructional-time'),
    constraints: claimsForCategory(claims, 'constraint'),
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
  observation: FamilyObservationInput,
  sourceArtifacts: FamilyRealitySourceArtifact[],
): FamilyUnderstandingClaim {
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
        ? 'This family observation was supplied explicitly but still requires human confirmation.'
        : 'This family observation was supplied explicitly and is preserved as an observed fact.',
      evidence,
    },
  };
}

function toEvidence(
  observation: FamilyObservationInput,
  sourceArtifacts: FamilyRealitySourceArtifact[],
): FamilyEvidence {
  const sourceArtifact = sourceArtifacts.find(
    (artifact) => artifact.id === observation.sourceArtifactId,
  );

  return {
    id: `family-evidence-${observation.id}`,
    sourceId: observation.sourceArtifactId,
    sourceType: sourceArtifact?.sourceType ?? 'unknown',
    sourceTitle: sourceArtifact?.title ?? 'Unknown family source',
    sourceLocation: observation.sourceLocation,
    quotedText: observation.quotedText,
    evidenceType: evidenceTypeForSource(sourceArtifact),
  };
}

function evidenceTypeForSource(
  sourceArtifact: FamilyRealitySourceArtifact | undefined,
): FamilyEvidenceType {
  if (!sourceArtifact) {
    return 'unknown';
  }

  if (sourceArtifact.sourceType === 'calendar-import') {
    return 'calendar-record';
  }

  if (sourceArtifact.sourceType === 'curriculum-assignment-record') {
    return 'curriculum-assignment-record';
  }

  if (
    sourceArtifact.sourceType === 'family-profile-form' ||
    sourceArtifact.sourceType === 'manual-entry'
  ) {
    return 'direct-family-input';
  }

  return 'family-record';
}

function buildUnknowns(claims: FamilyUnderstandingClaim[]): FamilyUnknown[] {
  return requiredObservationCategories
    .filter(({ category }) => claimsForCategory(claims, category).length === 0)
    .map(({ category, question, reason, blocksProfileReadiness }) => ({
      id: `family-unknown-${category}`,
      category,
      question,
      reason,
      relatedEvidence: [],
      blocksProfileReadiness,
    }));
}

function buildProfileReadinessConfidence(
  claims: FamilyUnderstandingClaim[],
  unknowns: FamilyUnknown[],
): FamilyConfidence {
  const evidence = claims.flatMap((claim) => claim.confidence.evidence);
  const blockingUnknowns = unknowns.filter((unknown) => unknown.blocksProfileReadiness);

  if (blockingUnknowns.length > 0) {
    return {
      level: 'requires-human-confirmation',
      rationale:
        'Family Understanding has explicit observations, but required family identity, student, or curriculum assignment facts are still unknown.',
      evidence,
    };
  }

  if (claims.length === 0) {
    return {
      level: 'unknown',
      rationale: 'No explicit family observations have been supplied.',
      evidence: [],
    };
  }

  return {
    level: 'medium',
    rationale:
      'Required family observation categories are present. Later lifecycle stages may test and preserve durable family knowledge.',
    evidence,
  };
}

function claimsForCategory(
  claims: FamilyUnderstandingClaim[],
  category: FamilyUnderstandingCategory,
) {
  return claims.filter((claim) => claim.category === category);
}
