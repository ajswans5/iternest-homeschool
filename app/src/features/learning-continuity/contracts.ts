export type LearningContinuityConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'
  | 'requires-human-confirmation';

export type LearningContinuitySourceType =
  | 'completion-record'
  | 'parent-note'
  | 'lesson-progress-record'
  | 'assessment-progress-record'
  | 'manual-entry'
  | 'unknown';

export type LearningContinuityEvidenceType =
  | 'completion-record'
  | 'parent-declared-input'
  | 'lesson-progress-record'
  | 'assessment-progress-record'
  | 'human-confirmation'
  | 'unknown';

export type LearningContinuityEvidence = {
  id: string;
  sourceId: string;
  sourceType: LearningContinuitySourceType;
  sourceTitle: string;
  sourceLocation: string;
  quotedText: string;
  evidenceType: LearningContinuityEvidenceType;
};

export type LearningContinuityConfidence = {
  level: LearningContinuityConfidenceLevel;
  rationale: string;
  evidence: LearningContinuityEvidence[];
};

export type LearningContinuityCategory =
  | 'completed-work'
  | 'partially-completed-work'
  | 'interrupted-work'
  | 'postponed-lesson'
  | 'skipped-lesson'
  | 'resumable-work'
  | 'last-completed-lesson'
  | 'current-lesson-position'
  | 'unfinished-assessment'
  | 'accumulated-delay'
  | 'carry-over-work';

export type LearningContinuitySourceArtifact = {
  id: string;
  sourceType: LearningContinuitySourceType;
  title: string;
  capturedAt: string;
  learnerId?: string;
  curriculumId?: string;
  limitations: string[];
};

export type LearningContinuityClaim = {
  id: string;
  category: LearningContinuityCategory;
  claim: string;
  interpretationType: 'observed-fact' | 'evidence-backed-interpretation' | 'unknown';
  confidence: LearningContinuityConfidence;
};

export type LearningContinuityObservedFact = {
  id: string;
  category: LearningContinuityCategory;
  fact: string;
  sourceArtifactIds: string[];
  evidence: LearningContinuityEvidence[];
  confidence: LearningContinuityConfidence;
};

export type LearningContinuityUnknown = {
  id: string;
  category: LearningContinuityCategory;
  question: string;
  reason: string;
  relatedEvidence: LearningContinuityEvidence[];
  blocksProfileReadiness: boolean;
};

export type LearningContinuityHumanConfirmation = {
  id: string;
  targetId: string;
  targetType: 'continuity-profile' | 'observed-fact' | 'unknown';
  confirmedValue: string;
  confirmedBy: string;
  confirmedAt: string;
  evidence: LearningContinuityEvidence[];
  note?: string;
};

export type LearningContinuityLifecycleStage = 'continuity-reality-observation';

export type LearningContinuityProfile = {
  id: string;
  learnerId?: string;
  curriculumId?: string;
  sourceArtifactIds: string[];
  generatedAt: string;
  lifecycleStage: LearningContinuityLifecycleStage;
  completedWork: LearningContinuityClaim[];
  partiallyCompletedWork: LearningContinuityClaim[];
  interruptedWork: LearningContinuityClaim[];
  postponedLessons: LearningContinuityClaim[];
  skippedLessons: LearningContinuityClaim[];
  resumableWork: LearningContinuityClaim[];
  lastCompletedLessons: LearningContinuityClaim[];
  currentLessonPositions: LearningContinuityClaim[];
  unfinishedAssessments: LearningContinuityClaim[];
  accumulatedDelays: LearningContinuityClaim[];
  carryOverWork: LearningContinuityClaim[];
  observedFacts: LearningContinuityObservedFact[];
  unknowns: LearningContinuityUnknown[];
  humanConfirmations: LearningContinuityHumanConfirmation[];
  profileReadiness: {
    readyForDownstreamReasoning: boolean;
    confidence: LearningContinuityConfidence;
    blockingUnknownIds: string[];
  };
};

export type LearningContinuityObservationInput = {
  id: string;
  category: LearningContinuityCategory;
  statement: string;
  sourceArtifactId: string;
  sourceLocation: string;
  quotedText: string;
  confidenceLevel?: LearningContinuityConfidenceLevel;
  requiresHumanConfirmation?: boolean;
};

export type LearningContinuityInput = {
  id?: string;
  learnerId?: string;
  curriculumId?: string;
  sourceArtifacts: LearningContinuitySourceArtifact[];
  observations: LearningContinuityObservationInput[];
  humanConfirmations?: LearningContinuityHumanConfirmation[];
};

export type LearningContinuitySummaryCategory =
  | 'current-lesson-position'
  | 'completed-work'
  | 'partially-completed-work'
  | 'interrupted-work'
  | 'postponed-lessons'
  | 'skipped-lessons'
  | 'resumable-work'
  | 'last-completed-lessons'
  | 'unfinished-assessments'
  | 'accumulated-delays'
  | 'carry-over-work';

export type LearningContinuitySummaryTrace = {
  learningContinuityObservedFactIds: string[];
  sourceArtifactIds: string[];
  evidence: LearningContinuityEvidence[];
  confidence: LearningContinuityConfidence;
};

export type LearningContinuitySummarySignal = {
  id: string;
  category: LearningContinuitySummaryCategory;
  statement: string;
  status: 'available' | 'limited' | 'unknown' | 'requires-human-confirmation';
  sourceObservedFactIds: string[];
  unknownIds: string[];
  confirmationIds: string[];
  trace: LearningContinuitySummaryTrace[];
};

export type LearningContinuitySummary = {
  id: string;
  contractVersion: '1.0';
  learningContinuityProfileId: string;
  learnerId?: string;
  curriculumId?: string;
  generatedAt: string;
  summaryStatus: 'available' | 'limited' | 'blocked' | 'empty';
  currentLessonPosition: LearningContinuitySummarySignal[];
  completedWork: LearningContinuitySummarySignal[];
  partiallyCompletedWork: LearningContinuitySummarySignal[];
  interruptedWork: LearningContinuitySummarySignal[];
  postponedLessons: LearningContinuitySummarySignal[];
  skippedLessons: LearningContinuitySummarySignal[];
  resumableWork: LearningContinuitySummarySignal[];
  lastCompletedLessons: LearningContinuitySummarySignal[];
  unfinishedAssessments: LearningContinuitySummarySignal[];
  accumulatedDelays: LearningContinuitySummarySignal[];
  carryOverWork: LearningContinuitySummarySignal[];
  unknowns: LearningContinuityUnknown[];
  humanConfirmations: LearningContinuityHumanConfirmation[];
  evidenceProfile: {
    observedFactCount: number;
    evidenceCount: number;
    confidenceCounts: Record<LearningContinuityConfidenceLevel, number>;
  };
};
