import type {
  DecisionContext,
  DecisionContextEvidenceTrace,
  DecisionContextSourceSummary,
  DecisionContextSubsystemKind,
} from '../decision-context/contracts';
import type {
  ParentDecisionV2,
  ParentDecisionV2AttentionItem,
  ParentDecisionV2Blocker,
  ParentDecisionV2Confidence,
  ParentDecisionV2ConfirmationItem,
  ParentDecisionV2DeferredItem,
  ParentDecisionV2Readiness,
  ParentDecisionV2UncertaintyItem,
} from './contracts';

export function buildParentDecisionV2FromDecisionContext(
  context: DecisionContext,
): ParentDecisionV2 {
  const readiness = buildReadiness(context);
  const blockers = buildBlockers(context);
  const confirmationsRequired = buildConfirmationsRequired(context);
  const unresolvedUncertainty = buildUnresolvedUncertainty(context);
  const deferredItems = buildDeferredItems(context);
  const confidence = buildDecisionConfidence(context, blockers, confirmationsRequired);

  return {
    id: `parent-decision-v2-${context.id}`,
    contractVersion: '2.0',
    decisionContextId: context.id,
    generatedAt: new Date().toISOString(),
    readiness,
    attentionRequired: buildAttentionRequired(
      context,
      blockers,
      confirmationsRequired,
      unresolvedUncertainty,
    ),
    confirmationsRequired,
    blockers,
    unresolvedUncertainty,
    deferredItems,
    evidenceTraces: context.evidenceTraces,
    confidence,
  };
}

function buildReadiness(context: DecisionContext): ParentDecisionV2Readiness {
  return {
    status: context.contextStatus === 'available' ? 'ready' : context.contextStatus,
    rationale: readinessRationale(context),
    sourceSummaryStatuses: context.sourceSummaries.map((summary) => ({
      subsystem: summary.subsystem,
      status: summary.status,
    })),
  };
}

function readinessRationale(context: DecisionContext) {
  if (context.contextStatus === 'blocked') {
    return 'At least one source summary is blocked or a required context item needs attention.';
  }

  if (context.contextStatus === 'limited') {
    return 'Decision Context is usable, but unresolved unknowns or limited source summaries remain.';
  }

  if (context.contextStatus === 'empty') {
    return 'Decision Context contains no available observed realities.';
  }

  return 'Decision Context is available with no blocking source summary status.';
}

function buildBlockers(context: DecisionContext): ParentDecisionV2Blocker[] {
  return [
    ...context.sourceSummaries
      .filter((summary) => summary.status === 'blocked')
      .map((summary) => ({
        id: `parent-decision-v2-blocker-summary-${summary.subsystem}`,
        subsystem: summary.subsystem,
        label: `${summary.subsystem} is blocked.`,
        reason: 'The source summary reports a blocked status.',
        sourceSummaryStatus: summary.status,
        evidenceTraceIds: traceIdsForSubsystem(context.evidenceTraces, summary.subsystem),
      })),
    ...context.unknowns
      .filter((unknown) => unknown.blocksDecisionReadiness)
      .map((unknown) => ({
        id: `parent-decision-v2-blocker-${unknown.id}`,
        subsystem: unknown.subsystem,
        label: unknown.question,
        reason: unknown.reason,
        sourceUnknownId: unknown.id,
        evidenceTraceIds: traceIdsForSubsystem(context.evidenceTraces, unknown.subsystem),
      })),
  ];
}

function buildConfirmationsRequired(
  context: DecisionContext,
): ParentDecisionV2ConfirmationItem[] {
  return context.confirmationRequirements
    .filter((confirmation) => confirmation.requiredBeforeParentDecision)
    .map((confirmation) => ({
      id: `parent-decision-v2-confirmation-${confirmation.id}`,
      subsystem: confirmation.subsystem,
      targetId: confirmation.targetId,
      prompt: confirmation.prompt,
      reason: confirmation.reason,
      requiredBeforeNextParentDecision: confirmation.requiredBeforeParentDecision,
      evidenceTraceIds: traceIdsForSubsystem(context.evidenceTraces, confirmation.subsystem),
      sourceConfirmationId: confirmation.id,
    }));
}

function buildUnresolvedUncertainty(
  context: DecisionContext,
): ParentDecisionV2UncertaintyItem[] {
  return context.unknowns.map((unknown) => ({
    id: `parent-decision-v2-uncertainty-${unknown.id}`,
    subsystem: unknown.subsystem,
    question: unknown.question,
    reason: unknown.reason,
    blocksDecisionReadiness: unknown.blocksDecisionReadiness,
    evidenceTraceIds: traceIdsForSubsystem(context.evidenceTraces, unknown.subsystem),
    sourceUnknownId: unknown.id,
  }));
}

function buildDeferredItems(context: DecisionContext): ParentDecisionV2DeferredItem[] {
  return context.sourceSummaries
    .filter((summary) => summary.status !== 'blocked')
    .map((summary) => ({
      id: `parent-decision-v2-deferred-${summary.subsystem}`,
      subsystem: summary.subsystem,
      reason: `${summary.subsystem} summary is preserved for later parent-decision phases.`,
      sourceSummaryStatus: summary.status,
      evidenceTraceIds: traceIdsForSubsystem(context.evidenceTraces, summary.subsystem),
    }));
}

function buildAttentionRequired(
  context: DecisionContext,
  blockers: ParentDecisionV2Blocker[],
  confirmationsRequired: ParentDecisionV2ConfirmationItem[],
  unresolvedUncertainty: ParentDecisionV2UncertaintyItem[],
): ParentDecisionV2AttentionItem[] {
  return [
    ...blockers.map((blocker) => ({
      id: `parent-decision-v2-attention-${blocker.id}`,
      sourceType: 'blocker' as const,
      subsystem: blocker.subsystem,
      label: blocker.label,
      reason: blocker.reason,
      requiredBeforeNextParentDecision: true,
      evidenceTraceIds: blocker.evidenceTraceIds,
      confidence: confidenceForSubsystem(context, blocker.subsystem),
    })),
    ...confirmationsRequired.map((confirmation) => ({
      id: `parent-decision-v2-attention-${confirmation.id}`,
      sourceType: 'confirmation' as const,
      subsystem: confirmation.subsystem,
      label: confirmation.prompt,
      reason: confirmation.reason,
      requiredBeforeNextParentDecision: confirmation.requiredBeforeNextParentDecision,
      evidenceTraceIds: confirmation.evidenceTraceIds,
      confidence: confidenceForSubsystem(context, confirmation.subsystem),
    })),
    ...unresolvedUncertainty
      .filter((uncertainty) => uncertainty.blocksDecisionReadiness)
      .map((uncertainty) => ({
        id: `parent-decision-v2-attention-${uncertainty.id}`,
        sourceType: 'uncertainty' as const,
        subsystem: uncertainty.subsystem,
        label: uncertainty.question,
        reason: uncertainty.reason,
        requiredBeforeNextParentDecision: true,
        evidenceTraceIds: uncertainty.evidenceTraceIds,
        confidence: confidenceForSubsystem(context, uncertainty.subsystem),
      })),
  ];
}

function buildDecisionConfidence(
  context: DecisionContext,
  blockers: ParentDecisionV2Blocker[],
  confirmationsRequired: ParentDecisionV2ConfirmationItem[],
): ParentDecisionV2Confidence {
  const evidenceTraceIds = context.evidenceTraces.map((trace) => trace.sourceSummaryId);

  if (blockers.length > 0 || confirmationsRequired.length > 0) {
    return {
      level: 'requires-human-confirmation',
      rationale:
        'Parent Decision v2 preserved required attention items from Decision Context.',
      evidenceTraceIds,
    };
  }

  if (context.contextStatus === 'limited') {
    return {
      level: 'medium',
      rationale:
        'Parent Decision v2 can classify attention items, but Decision Context still contains unresolved uncertainty.',
      evidenceTraceIds,
    };
  }

  if (context.contextStatus === 'empty') {
    return {
      level: 'unknown',
      rationale: 'Parent Decision v2 has no observed context evidence to classify.',
      evidenceTraceIds: [],
    };
  }

  return {
    level: 'high',
    rationale: 'Parent Decision v2 classified the available Decision Context without blocking items.',
    evidenceTraceIds,
  };
}

function confidenceForSubsystem(
  context: DecisionContext,
  subsystem: DecisionContextSubsystemKind,
): ParentDecisionV2Confidence {
  const traces = context.evidenceTraces.filter((trace) => trace.subsystem === subsystem);
  const evidenceTraceIds = traces.map((trace) => trace.sourceSummaryId);

  if (traces.some((trace) => trace.confidence.level === 'requires-human-confirmation')) {
    return {
      level: 'requires-human-confirmation',
      rationale: `${subsystem} evidence requires human confirmation.`,
      evidenceTraceIds,
    };
  }

  if (traces.some((trace) => trace.confidence.level === 'low')) {
    return {
      level: 'low',
      rationale: `${subsystem} evidence includes low-confidence traces.`,
      evidenceTraceIds,
    };
  }

  if (traces.length === 0) {
    return {
      level: 'unknown',
      rationale: `${subsystem} has no evidence traces attached to this attention item.`,
      evidenceTraceIds: [],
    };
  }

  return {
    level: 'medium',
    rationale: `${subsystem} evidence is present and preserved from Decision Context.`,
    evidenceTraceIds,
  };
}

function traceIdsForSubsystem(
  traces: DecisionContextEvidenceTrace[],
  subsystem: DecisionContextSubsystemKind,
) {
  return traces
    .filter((trace) => trace.subsystem === subsystem)
    .map((trace) => trace.sourceSummaryId);
}
