import type {
  DecisionContext,
  DecisionContextConfirmationRequirement,
  DecisionContextEvidenceTrace,
  DecisionContextSourceSummary,
  DecisionContextSubsystemKind,
  DecisionContextUnknown,
} from '../decision-context/contracts';

export type ParentDecisionV2ReadinessStatus = 'ready' | 'limited' | 'blocked' | 'empty';

export type ParentDecisionV2Readiness = {
  status: ParentDecisionV2ReadinessStatus;
  rationale: string;
  sourceSummaryStatuses: Array<{
    subsystem: DecisionContextSubsystemKind;
    status: DecisionContextSourceSummary['status'];
  }>;
};

export type ParentDecisionV2ConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'
  | 'requires-human-confirmation';

export type ParentDecisionV2Confidence = {
  level: ParentDecisionV2ConfidenceLevel;
  rationale: string;
  evidenceTraceIds: string[];
};

export type ParentDecisionV2AttentionItem = {
  id: string;
  sourceType: 'blocker' | 'confirmation' | 'uncertainty' | 'source-summary';
  subsystem: DecisionContextSubsystemKind;
  label: string;
  reason: string;
  requiredBeforeNextParentDecision: boolean;
  evidenceTraceIds: string[];
  confidence: ParentDecisionV2Confidence;
};

export type ParentDecisionV2ConfirmationItem = {
  id: string;
  subsystem: DecisionContextSubsystemKind;
  targetId: string;
  prompt: string;
  reason: string;
  requiredBeforeNextParentDecision: boolean;
  evidenceTraceIds: string[];
  sourceConfirmationId: DecisionContextConfirmationRequirement['id'];
};

export type ParentDecisionV2Blocker = {
  id: string;
  subsystem: DecisionContextSubsystemKind;
  label: string;
  reason: string;
  sourceUnknownId?: DecisionContextUnknown['id'];
  sourceSummaryStatus?: DecisionContextSourceSummary['status'];
  evidenceTraceIds: string[];
};

export type ParentDecisionV2UncertaintyItem = {
  id: string;
  subsystem: DecisionContextSubsystemKind;
  question: string;
  reason: string;
  blocksDecisionReadiness: boolean;
  evidenceTraceIds: string[];
  sourceUnknownId: DecisionContextUnknown['id'];
};

export type ParentDecisionV2DeferredItem = {
  id: string;
  subsystem: DecisionContextSubsystemKind;
  reason: string;
  sourceSummaryStatus: DecisionContextSourceSummary['status'];
  evidenceTraceIds: string[];
};

export type ParentDecisionV2 = {
  id: string;
  contractVersion: '2.0';
  decisionContextId: DecisionContext['id'];
  generatedAt: string;
  readiness: ParentDecisionV2Readiness;
  attentionRequired: ParentDecisionV2AttentionItem[];
  confirmationsRequired: ParentDecisionV2ConfirmationItem[];
  blockers: ParentDecisionV2Blocker[];
  unresolvedUncertainty: ParentDecisionV2UncertaintyItem[];
  deferredItems: ParentDecisionV2DeferredItem[];
  evidenceTraces: DecisionContextEvidenceTrace[];
  confidence: ParentDecisionV2Confidence;
};
