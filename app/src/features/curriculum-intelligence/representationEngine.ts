import type {
  CurriculumKnowledgeCategory,
  CurriculumKnowledgeClaim,
  CurriculumKnowledgeModel,
  CurriculumKnowledgeRelationship,
  CurriculumRepresentationEntity,
  CurriculumRepresentationRelationship,
  ReasoningReadyCurriculumRepresentation,
} from './contracts';

export function buildReasoningReadyCurriculumRepresentation(
  knowledgeModel: CurriculumKnowledgeModel,
): ReasoningReadyCurriculumRepresentation {
  const generatedAt = new Date().toISOString();
  const entities = knowledgeModel.stableClaims.map(toRepresentationEntity);
  const entityByClaimId = new Map(
    entities.flatMap((entity) =>
      entity.knowledgeClaimIds.map((claimId) => [claimId, entity] as const),
    ),
  );
  const relationships = knowledgeModel.relationships
    .map((relationship) => toRepresentationRelationship(relationship, entityByClaimId))
    .filter((relationship): relationship is CurriculumRepresentationRelationship =>
      relationship !== null,
    );

  return {
    id: `representation-${knowledgeModel.id}`,
    knowledgeModelId: knowledgeModel.id,
    generatedAt,
    entities,
    relationships,
    constraints: entities.filter((entity) => entity.entityType === 'constraint'),
    dependencies: relationships.filter(
      (relationship) => relationship.relationshipType === 'depends-on',
    ),
    adaptationBoundaries: knowledgeModel.stableClaims
      .filter((claim) => claim.category === 'constraints' || claim.category === 'risks')
      .map((claim) => ({
        id: `adaptation-boundary-${claim.id}`,
        boundary: claim.stableMeaning,
        sourceEntityIds: [`representation-entity-${claim.id}`],
        confidence: claim.confidence,
      })),
    unknowns: knowledgeModel.unknowns,
    humanConfirmations: knowledgeModel.humanConfirmations,
    warnings: knowledgeModel.relationships
      .filter(
        (relationship) =>
          !entityByClaimId.has(relationship.fromClaimId) ||
          !entityByClaimId.has(relationship.toClaimId),
      )
      .map((relationship) => ({
        id: `representation-warning-${relationship.id}`,
        message:
          'Knowledge relationship could not be represented because one or both source claims are missing.',
        relatedEntityIds: [
          entityByClaimId.get(relationship.fromClaimId)?.id,
          entityByClaimId.get(relationship.toClaimId)?.id,
        ].filter((id): id is string => Boolean(id)),
        confidence: relationship.confidence,
      })),
  };
}

function toRepresentationEntity(
  claim: CurriculumKnowledgeClaim,
): CurriculumRepresentationEntity {
  return {
    id: `representation-entity-${claim.id}`,
    entityType: categoryToEntityType(claim.category),
    label: claim.stableMeaning,
    semanticClassification: claim.category,
    knowledgeClaimIds: [claim.id],
    evidence: claim.supportingEvidence,
    confidence: claim.confidence,
  };
}

function toRepresentationRelationship(
  relationship: CurriculumKnowledgeRelationship,
  entityByClaimId: Map<string, CurriculumRepresentationEntity>,
): CurriculumRepresentationRelationship | null {
  const fromEntity = entityByClaimId.get(relationship.fromClaimId);
  const toEntity = entityByClaimId.get(relationship.toClaimId);

  if (!fromEntity || !toEntity) {
    return null;
  }

  return {
    id: `representation-relationship-${relationship.id}`,
    fromEntityId: fromEntity.id,
    toEntityId: toEntity.id,
    relationshipType: relationship.relationshipType,
    knowledgeRelationshipIds: [relationship.id],
    knowledgeClaimIds: [relationship.fromClaimId, relationship.toClaimId],
    confidence: relationship.confidence,
  };
}

function categoryToEntityType(
  category: CurriculumKnowledgeCategory,
): CurriculumRepresentationEntity['entityType'] {
  const entityTypesByCategory: Record<
    CurriculumKnowledgeCategory,
    CurriculumRepresentationEntity['entityType']
  > = {
    identity: 'curriculum',
    philosophy: 'instructional-unit',
    structure: 'source-section',
    roles: 'role',
    activities: 'activity-type',
    dependencies: 'instructional-unit',
    expectations: 'instructional-unit',
    constraints: 'constraint',
    risks: 'risk',
    'evidence-and-confidence': 'unknown',
  };

  return entityTypesByCategory[category];
}
