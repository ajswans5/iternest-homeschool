export type FamilyConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'
  | 'requires-human-confirmation';

export type FamilyRealitySourceType =
  | 'family-profile-form'
  | 'parent-note'
  | 'calendar-import'
  | 'curriculum-assignment-record'
  | 'manual-entry'
  | 'unknown';

export type FamilyEvidenceType =
  | 'direct-family-input'
  | 'family-record'
  | 'calendar-record'
  | 'curriculum-assignment-record'
  | 'human-confirmation'
  | 'unknown';

export type FamilyEvidence = {
  id: string;
  sourceId: string;
  sourceType: FamilyRealitySourceType;
  sourceTitle: string;
  sourceLocation: string;
  quotedText: string;
  evidenceType: FamilyEvidenceType;
};

export type FamilyConfidence = {
  level: FamilyConfidenceLevel;
  rationale: string;
  evidence: FamilyEvidence[];
};

export type FamilyUnderstandingCategory =
  | 'family-identity'
  | 'student-identity'
  | 'curriculum-assignment'
  | 'teaching-rhythm'
  | 'recurring-commitment'
  | 'instructional-time'
  | 'constraint';

export type FamilyRealitySourceArtifact = {
  id: string;
  sourceType: FamilyRealitySourceType;
  title: string;
  capturedAt: string;
  limitations: string[];
};

export type FamilyUnderstandingClaim = {
  id: string;
  category: FamilyUnderstandingCategory;
  claim: string;
  interpretationType: 'observed-fact' | 'evidence-backed-interpretation' | 'unknown';
  confidence: FamilyConfidence;
};

export type FamilyObservedFact = {
  id: string;
  category: FamilyUnderstandingCategory;
  fact: string;
  sourceArtifactIds: string[];
  evidence: FamilyEvidence[];
  confidence: FamilyConfidence;
};

export type FamilyUnknown = {
  id: string;
  category: FamilyUnderstandingCategory;
  question: string;
  reason: string;
  relatedEvidence: FamilyEvidence[];
  blocksProfileReadiness: boolean;
};

export type FamilyHumanConfirmation = {
  id: string;
  targetId: string;
  targetType: 'understanding-profile' | 'observed-fact' | 'unknown';
  confirmedValue: string;
  confirmedBy: string;
  confirmedAt: string;
  evidence: FamilyEvidence[];
  note?: string;
};

export type FamilyUnderstandingLifecycleStage = 'family-reality-observation';

export type FamilyUnderstandingProfile = {
  id: string;
  sourceArtifactIds: string[];
  generatedAt: string;
  lifecycleStage: FamilyUnderstandingLifecycleStage;
  familyIdentity: FamilyUnderstandingClaim[];
  students: FamilyUnderstandingClaim[];
  curriculumAssignments: FamilyUnderstandingClaim[];
  teachingRhythm: FamilyUnderstandingClaim[];
  recurringCommitments: FamilyUnderstandingClaim[];
  instructionalTime: FamilyUnderstandingClaim[];
  constraints: FamilyUnderstandingClaim[];
  observedFacts: FamilyObservedFact[];
  unknowns: FamilyUnknown[];
  humanConfirmations: FamilyHumanConfirmation[];
  profileReadiness: {
    readyForDownstreamReasoning: boolean;
    confidence: FamilyConfidence;
    blockingUnknownIds: string[];
  };
};

export type FamilyObservationInput = {
  id: string;
  category: FamilyUnderstandingCategory;
  statement: string;
  sourceArtifactId: string;
  sourceLocation: string;
  quotedText: string;
  confidenceLevel?: FamilyConfidenceLevel;
  requiresHumanConfirmation?: boolean;
};

export type FamilyUnderstandingInput = {
  id?: string;
  sourceArtifacts: FamilyRealitySourceArtifact[];
  observations: FamilyObservationInput[];
  humanConfirmations?: FamilyHumanConfirmation[];
};

export type FamilyUnderstandingSummaryCategory =
  | 'family-members'
  | 'students'
  | 'curriculum-assignments'
  | 'teaching-rhythm'
  | 'recurring-commitments'
  | 'instructional-time'
  | 'constraints';

export type FamilyUnderstandingSummaryTrace = {
  familyObservedFactIds: string[];
  sourceArtifactIds: string[];
  evidence: FamilyEvidence[];
  confidence: FamilyConfidence;
};

export type FamilyUnderstandingSummarySignal = {
  id: string;
  category: FamilyUnderstandingSummaryCategory;
  statement: string;
  status: 'available' | 'limited' | 'unknown' | 'requires-human-confirmation';
  sourceObservedFactIds: string[];
  unknownIds: string[];
  confirmationIds: string[];
  trace: FamilyUnderstandingSummaryTrace[];
};

export type FamilyUnderstandingSummary = {
  id: string;
  contractVersion: '1.0';
  familyUnderstandingProfileId: string;
  generatedAt: string;
  summaryStatus: 'available' | 'limited' | 'blocked' | 'empty';
  familyMembers: FamilyUnderstandingSummarySignal[];
  students: FamilyUnderstandingSummarySignal[];
  curriculumAssignments: FamilyUnderstandingSummarySignal[];
  teachingRhythm: FamilyUnderstandingSummarySignal[];
  recurringCommitments: FamilyUnderstandingSummarySignal[];
  instructionalTime: FamilyUnderstandingSummarySignal[];
  constraints: FamilyUnderstandingSummarySignal[];
  unknowns: FamilyUnknown[];
  humanConfirmations: FamilyHumanConfirmation[];
  evidenceProfile: {
    observedFactCount: number;
    evidenceCount: number;
    confidenceCounts: Record<FamilyConfidenceLevel, number>;
  };
};
