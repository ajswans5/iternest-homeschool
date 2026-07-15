import type {
  CurriculumValidatedFinding,
  KnowledgePromotionDecision,
  KnowledgePromotionDecisionOutcome,
} from './contracts';

export type KnowledgePreservationInput = {
  validatedFindings: CurriculumValidatedFinding[];
};

export type KnowledgePreservationResult = {
  promotionDecisions: KnowledgePromotionDecision[];
};

export function evaluateKnowledgePromotion({
  validatedFindings,
}: KnowledgePreservationInput): KnowledgePreservationResult {
  return {
    promotionDecisions: validatedFindings.map(evaluateValidatedFinding),
  };
}

function evaluateValidatedFinding(
  finding: CurriculumValidatedFinding,
): KnowledgePromotionDecision {
  const durableCurriculumMeaning = representsDurableCurriculumMeaning(finding);
  const blockingReasons = getBlockingReasons(finding, durableCurriculumMeaning);
  const outcome = determinePromotionOutcome(finding, durableCurriculumMeaning, blockingReasons);

  return {
    id: `knowledge-promotion-decision-${finding.id}`,
    validatedFindingId: finding.id,
    category: finding.category,
    finding: finding.finding,
    outcome,
    durableCurriculumMeaning,
    rationale: buildPromotionRationale(outcome, blockingReasons),
    provenance: {
      validatedFindingId: finding.id,
      sourceHypothesisIds: finding.sourceHypothesisIds,
      sourceObservedFactIds: finding.sourceObservedFactIds,
      sourceArtifactIds: Array.from(
        new Set(finding.supportingEvidence.map((evidence) => evidence.sourceArtifactId)),
      ),
    },
    supportingEvidence: finding.supportingEvidence,
    limitingEvidence: finding.contradictingEvidence,
    confidence: finding.confidence,
    confidenceHistory: finding.confidenceHistory,
    humanConfirmationRequired:
      finding.validationStatus === 'requires-human-confirmation' ||
      finding.remainingUnknownIds.length > 0,
    blockingReasons,
  };
}

function determinePromotionOutcome(
  finding: CurriculumValidatedFinding,
  durableCurriculumMeaning: boolean,
  blockingReasons: string[],
): KnowledgePromotionDecisionOutcome {
  if (finding.validationStatus === 'contradicted') {
    return 'retire';
  }

  if (
    finding.validationStatus === 'requires-human-confirmation' ||
    finding.remainingUnknownIds.length > 0
  ) {
    return 'requires-human-confirmation';
  }

  if (
    finding.validationStatus === 'partially-supported' ||
    finding.confidence.level === 'low' ||
    finding.confidence.level === 'unknown' ||
    finding.supportingEvidence.length === 0
  ) {
    return 'requires-additional-evidence';
  }

  if (!durableCurriculumMeaning) {
    return 'remain-validated-finding';
  }

  if (blockingReasons.length === 0 && confidenceMeetsPromotionThreshold(finding)) {
    return 'preserve-as-knowledge';
  }

  return 'remain-validated-finding';
}

function getBlockingReasons(
  finding: CurriculumValidatedFinding,
  durableCurriculumMeaning: boolean,
) {
  const reasons: string[] = [];

  if (!confidenceMeetsPromotionThreshold(finding)) {
    reasons.push('Confidence does not meet the preservation threshold.');
  }

  if (finding.supportingEvidence.length === 0) {
    reasons.push('Supporting evidence is missing.');
  }

  if (finding.contradictingEvidence.length > 0) {
    reasons.push('Contradictory evidence remains unresolved.');
  }

  if (finding.remainingUnknownIds.length > 0) {
    reasons.push('Human confirmation or unresolved unknowns remain.');
  }

  if (!durableCurriculumMeaning) {
    reasons.push('Finding does not yet represent durable curriculum meaning.');
  }

  if (finding.validationStatus !== 'supported') {
    reasons.push(`Validation status is ${finding.validationStatus}.`);
  }

  return reasons;
}

function confidenceMeetsPromotionThreshold(finding: CurriculumValidatedFinding) {
  return finding.confidence.level === 'medium' || finding.confidence.level === 'high';
}

function representsDurableCurriculumMeaning(finding: CurriculumValidatedFinding) {
  if (isTemporaryObservation(finding.finding)) {
    return false;
  }

  return [
    'identity',
    'structure',
    'roles',
    'activities',
    'dependencies',
    'expectations',
    'constraints',
    'risks',
    'philosophy',
  ].includes(finding.category);
}

function isTemporaryObservation(value: string) {
  return /\b(page|line|temporary|today|current session|upload status|file size|readable character)\b/i.test(
    value,
  );
}

function buildPromotionRationale(
  outcome: KnowledgePromotionDecisionOutcome,
  blockingReasons: string[],
) {
  if (outcome === 'preserve-as-knowledge') {
    return 'The validated finding satisfies preservation requirements and may become durable curriculum knowledge in a later Knowledge Model step.';
  }

  if (outcome === 'retire') {
    return 'The validated finding is contradicted and should not be preserved.';
  }

  if (blockingReasons.length > 0) {
    return blockingReasons.join(' ');
  }

  return 'The validated finding remains valid but is not ready for preservation as durable knowledge.';
}
