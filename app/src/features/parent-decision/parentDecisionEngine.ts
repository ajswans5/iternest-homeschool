import type { ParentDecision, ParentDecisionItem } from '../../domain/contracts';
import type { DecisionContext } from '../decision-context/contracts';

export function buildParentDecisionFromDecisionContext(
  context: DecisionContext,
): ParentDecision {
  const unresolvedItems = [
    ...context.unknowns.map(toUnknownDecisionItem),
    ...context.confirmationRequirements.map(toConfirmationDecisionItem),
  ];
  const isBlocked =
    context.contextStatus === 'blocked' ||
    unresolvedItems.some((item) => item.requiredForToday);

  return {
    id: `parent-decision-${context.id}`,
    generatedAt: new Date().toISOString(),
    learnerId: 'learner-understanding-not-implemented',
    stage: isBlocked ? 'blocked-needs-parent-review' : 'daily-teaching',
    headline: isBlocked
      ? 'Decision context needs review before parent-facing actions can be produced.'
      : 'Decision context is assembled and ready for future parent-decision logic.',
    summary:
      'This context-native Parent Decision output is generated only from DecisionContext. It does not inspect subsystem internals or create teaching actions.',
    lessonModelIds: [],
    decisionsRequiredNow: unresolvedItems,
    teachingActionsToSurface: [],
    stagedForLater: context.sourceSummaries.map((summary) => ({
      id: `staged-summary-${summary.subsystem}`,
      reason: `${summary.subsystem} summary status is ${summary.status}.`,
    })),
    approvalRequired: unresolvedItems.length > 0,
    approvalMeaning: 'Approval resolves context uncertainty only.',
    confidence: isBlocked ? 'needs-parent-review' : 'high',
  };
}

function toUnknownDecisionItem(
  unknown: DecisionContext['unknowns'][number],
): ParentDecisionItem {
  return {
    id: `decision-item-${unknown.id}`,
    type: 'answer-uncertainty',
    prompt: unknown.question,
    whyNow: unknown.reason,
    requiredForToday: unknown.blocksDecisionReadiness,
    confidence: 'needs-parent-review',
    evidence: [],
  };
}

function toConfirmationDecisionItem(
  confirmation: DecisionContext['confirmationRequirements'][number],
): ParentDecisionItem {
  return {
    id: `decision-item-${confirmation.id}`,
    type: 'answer-uncertainty',
    prompt: confirmation.prompt,
    whyNow: confirmation.reason,
    requiredForToday: confirmation.requiredBeforeParentDecision,
    confidence: 'needs-parent-review',
    evidence: [],
  };
}
