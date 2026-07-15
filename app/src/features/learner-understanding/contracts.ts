export type LearnerConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'
  | 'requires-human-confirmation';

export type LearnerRealitySourceType =
  | 'learner-profile-form'
  | 'parent-note'
  | 'work-sample'
  | 'assessment-record'
  | 'accommodation-record'
  | 'manual-entry'
  | 'unknown';

export type LearnerEvidenceType =
  | 'direct-learner-input'
  | 'parent-confirmed-input'
  | 'work-sample-record'
  | 'assessment-record'
  | 'accommodation-record'
  | 'human-confirmation'
  | 'unknown';

export type LearnerEvidence = {
  id: string;
  sourceId: string;
  sourceType: LearnerRealitySourceType;
  sourceTitle: string;
  sourceLocation: string;
  quotedText: string;
  evidenceType: LearnerEvidenceType;
};

export type LearnerConfidence = {
  level: LearnerConfidenceLevel;
  rationale: string;
  evidence: LearnerEvidence[];
};

export type LearnerUnderstandingCategory =
  | 'independence'
  | 'direct-instruction-need'
  | 'writing-stamina'
  | 'reading-independence'
  | 'accommodation'
  | 'strength'
  | 'support-need'
  | 'recurring-habit'
  | 'work-behavior';

export type LearnerRealitySourceArtifact = {
  id: string;
  sourceType: LearnerRealitySourceType;
  title: string;
  capturedAt: string;
  learnerId?: string;
  limitations: string[];
};

export type LearnerUnderstandingClaim = {
  id: string;
  category: LearnerUnderstandingCategory;
  claim: string;
  interpretationType: 'observed-fact' | 'evidence-backed-interpretation' | 'unknown';
  confidence: LearnerConfidence;
};

export type LearnerObservedFact = {
  id: string;
  category: LearnerUnderstandingCategory;
  fact: string;
  sourceArtifactIds: string[];
  evidence: LearnerEvidence[];
  confidence: LearnerConfidence;
};

export type LearnerUnknown = {
  id: string;
  category: LearnerUnderstandingCategory;
  question: string;
  reason: string;
  relatedEvidence: LearnerEvidence[];
  blocksProfileReadiness: boolean;
};

export type LearnerHumanConfirmation = {
  id: string;
  targetId: string;
  targetType: 'understanding-profile' | 'observed-fact' | 'unknown';
  confirmedValue: string;
  confirmedBy: string;
  confirmedAt: string;
  evidence: LearnerEvidence[];
  note?: string;
};

export type LearnerUnderstandingLifecycleStage = 'learner-reality-observation';

export type LearnerUnderstandingProfile = {
  id: string;
  learnerId: string;
  sourceArtifactIds: string[];
  generatedAt: string;
  lifecycleStage: LearnerUnderstandingLifecycleStage;
  independence: LearnerUnderstandingClaim[];
  directInstructionNeeds: LearnerUnderstandingClaim[];
  writingStamina: LearnerUnderstandingClaim[];
  readingIndependence: LearnerUnderstandingClaim[];
  accommodations: LearnerUnderstandingClaim[];
  strengths: LearnerUnderstandingClaim[];
  supportNeeds: LearnerUnderstandingClaim[];
  recurringHabits: LearnerUnderstandingClaim[];
  workBehaviors: LearnerUnderstandingClaim[];
  observedFacts: LearnerObservedFact[];
  unknowns: LearnerUnknown[];
  humanConfirmations: LearnerHumanConfirmation[];
  profileReadiness: {
    readyForDownstreamReasoning: boolean;
    confidence: LearnerConfidence;
    blockingUnknownIds: string[];
  };
};

export type LearnerObservationInput = {
  id: string;
  category: LearnerUnderstandingCategory;
  statement: string;
  sourceArtifactId: string;
  sourceLocation: string;
  quotedText: string;
  confidenceLevel?: LearnerConfidenceLevel;
  requiresHumanConfirmation?: boolean;
};

export type LearnerUnderstandingInput = {
  id?: string;
  learnerId: string;
  sourceArtifacts: LearnerRealitySourceArtifact[];
  observations: LearnerObservationInput[];
  humanConfirmations?: LearnerHumanConfirmation[];
};

export type LearnerUnderstandingSummaryCategory =
  | 'learner-identity'
  | 'independence'
  | 'direct-instruction-needs'
  | 'writing-stamina'
  | 'reading-independence'
  | 'accommodations'
  | 'strengths'
  | 'support-needs'
  | 'recurring-habits'
  | 'work-behaviors';

export type LearnerUnderstandingSummaryTrace = {
  learnerObservedFactIds: string[];
  sourceArtifactIds: string[];
  evidence: LearnerEvidence[];
  confidence: LearnerConfidence;
};

export type LearnerUnderstandingSummarySignal = {
  id: string;
  category: LearnerUnderstandingSummaryCategory;
  statement: string;
  status: 'available' | 'limited' | 'unknown' | 'requires-human-confirmation';
  sourceObservedFactIds: string[];
  unknownIds: string[];
  confirmationIds: string[];
  trace: LearnerUnderstandingSummaryTrace[];
};

export type LearnerUnderstandingSummary = {
  id: string;
  contractVersion: '1.0';
  learnerUnderstandingProfileId: string;
  learnerId: string;
  generatedAt: string;
  summaryStatus: 'available' | 'limited' | 'blocked' | 'empty';
  learnerIdentity: LearnerUnderstandingSummarySignal[];
  independence: LearnerUnderstandingSummarySignal[];
  directInstructionNeeds: LearnerUnderstandingSummarySignal[];
  observableWorkHabits: LearnerUnderstandingSummarySignal[];
  parentConfirmedStrengths: LearnerUnderstandingSummarySignal[];
  parentConfirmedSupportNeeds: LearnerUnderstandingSummarySignal[];
  accommodations: LearnerUnderstandingSummarySignal[];
  recurringLearnerBehaviors: LearnerUnderstandingSummarySignal[];
  writingStamina: LearnerUnderstandingSummarySignal[];
  readingIndependence: LearnerUnderstandingSummarySignal[];
  unknowns: LearnerUnknown[];
  humanConfirmations: LearnerHumanConfirmation[];
  evidenceProfile: {
    observedFactCount: number;
    evidenceCount: number;
    confidenceCounts: Record<LearnerConfidenceLevel, number>;
  };
};
