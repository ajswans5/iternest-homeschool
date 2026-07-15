import type {
  CurriculumKnowledgeClaim,
  CurriculumKnowledgeModel,
  KnowledgePromotionDecision,
} from './contracts';

export type CurriculumKnowledgeModelInput = {
  id: string;
  understandingProfileId: string;
  promotionDecisions: KnowledgePromotionDecision[];
  generatedAt?: string;
};

export function buildCurriculumKnowledgeModel({
  id,
  understandingProfileId,
  promotionDecisions,
  generatedAt = new Date().toISOString(),
}: CurriculumKnowledgeModelInput): CurriculumKnowledgeModel {
  return {
    id,
    understandingProfileId,
    generatedAt,
    stableClaims: promotionDecisions
      .filter((decision) => decision.outcome === 'preserve-as-knowledge')
      .map((decision) => toKnowledgeClaim(decision, generatedAt)),
    relationships: [],
    unknowns: [],
    humanConfirmations: [],
  };
}

function toKnowledgeClaim(
  decision: KnowledgePromotionDecision,
  generatedAt: string,
): CurriculumKnowledgeClaim {
  return {
    id: `knowledge-claim-${decision.validatedFindingId}`,
    category: decisionCategoryToKnowledgeCategory(decision),
    stableMeaning: decision.finding,
    sourceUnderstandingClaimIds: [],
    sourceValidatedFindingIds: [decision.validatedFindingId],
    sourceHypothesisIds: decision.provenance.sourceHypothesisIds,
    sourceObservedFactIds: decision.provenance.sourceObservedFactIds,
    sourceArtifactIds: decision.provenance.sourceArtifactIds,
    supportingEvidence: decision.supportingEvidence,
    limitingEvidence: decision.limitingEvidence,
    confidenceHistory: decision.confidenceHistory,
    preservationRationale: decision.rationale,
    confidence: decision.confidence,
    revisionHistory: [
      {
        id: `knowledge-claim-${decision.validatedFindingId}-created`,
        changedAt: generatedAt,
        reason: 'Created from a Knowledge Preservation decision marked preserve-as-knowledge.',
        evidence: decision.supportingEvidence,
      },
    ],
  };
}

function decisionCategoryToKnowledgeCategory(
  decision: KnowledgePromotionDecision,
): CurriculumKnowledgeClaim['category'] {
  return decision.category;
}
