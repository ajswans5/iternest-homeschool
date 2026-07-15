import type { CurriculumIntelligenceSummary } from '../curriculum-intelligence/contracts';
import type { FamilyUnderstandingSummary } from '../family-understanding/contracts';
import type { LearnerUnderstandingSummary } from '../learner-understanding/contracts';
import type { LearningContinuitySummary } from '../learning-continuity/contracts';

export type DecisionContextSubsystemKind =
  | 'curriculum-intelligence'
  | 'family-understanding'
  | 'learner-understanding'
  | 'learning-continuity';

export type DecisionContextSummaryStatus =
  | 'available'
  | 'limited'
  | 'blocked'
  | 'empty';

export type DecisionContextSourceSummary =
  | {
      subsystem: 'curriculum-intelligence';
      status: CurriculumIntelligenceSummary['summaryStatus'];
      summary: CurriculumIntelligenceSummary;
    }
  | {
      subsystem: 'family-understanding';
      status: FamilyUnderstandingSummary['summaryStatus'];
      summary: FamilyUnderstandingSummary;
    }
  | {
      subsystem: 'learner-understanding';
      status: LearnerUnderstandingSummary['summaryStatus'];
      summary: LearnerUnderstandingSummary;
    }
  | {
      subsystem: 'learning-continuity';
      status: LearningContinuitySummary['summaryStatus'];
      summary: LearningContinuitySummary;
    };

export type DecisionContextConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'
  | 'requires-human-confirmation';

export type DecisionContextEvidence = {
  subsystem: DecisionContextSubsystemKind;
  sourceId: string;
  sourceTitle: string;
  sourceLocation: string;
  quotedText: string;
};

export type DecisionContextConfidence = {
  level: DecisionContextConfidenceLevel;
  rationale: string;
  evidence: DecisionContextEvidence[];
};

export type DecisionContextEvidenceTrace = {
  subsystem: DecisionContextSubsystemKind;
  sourceSummaryId: string;
  evidence: DecisionContextEvidence[];
  confidence: DecisionContextConfidence;
};

export type DecisionContextUnknown = {
  id: string;
  subsystem: DecisionContextSubsystemKind;
  question: string;
  reason: string;
  blocksDecisionReadiness: boolean;
};

export type DecisionContextConfirmationRequirement = {
  id: string;
  subsystem: DecisionContextSubsystemKind;
  targetId: string;
  prompt: string;
  reason: string;
  requiredBeforeParentDecision: boolean;
};

export type DecisionContext = {
  id: string;
  contractVersion: '1.0';
  generatedAt: string;
  sourceSummaries: DecisionContextSourceSummary[];
  contextStatus: DecisionContextSummaryStatus;
  unknowns: DecisionContextUnknown[];
  confirmationRequirements: DecisionContextConfirmationRequirement[];
  evidenceTraces: DecisionContextEvidenceTrace[];
  evidenceProfile: {
    sourceSummaryCount: number;
    availableSummaryCount: number;
    limitedSummaryCount: number;
    blockedSummaryCount: number;
  };
};

export type DecisionContextAssemblyInput = {
  id?: string;
  curriculum: CurriculumIntelligenceSummary;
  family: FamilyUnderstandingSummary;
  learner: LearnerUnderstandingSummary;
  learningContinuity: LearningContinuitySummary;
};
