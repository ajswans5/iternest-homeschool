import type {
  CurriculumConfidence,
  CurriculumReasoningBlock,
  CurriculumReasoningPath,
  CurriculumReasoningResult,
  CurriculumReasoningTrace,
  CurriculumRepresentationEntity,
  CurriculumRepresentationRelationship,
  ReasoningReadyCurriculumRepresentation,
} from './contracts';

export function buildCurriculumReasoningResult(
  representation: ReasoningReadyCurriculumRepresentation,
): CurriculumReasoningResult {
  const generatedAt = new Date().toISOString();
  const traces: CurriculumReasoningTrace[] = [];
  const blocks: CurriculumReasoningBlock[] = [];
  const entityPaths = representation.entities.map((entity) =>
    buildEntityPath(entity),
  );
  const dependencyPaths = representation.dependencies.map((relationship) =>
    buildRelationshipPath(relationship, representation, 'dependency-chain'),
  );
  const relationshipPaths = representation.relationships
    .filter((relationship) => relationship.relationshipType !== 'depends-on')
    .map((relationship) =>
      buildRelationshipPath(relationship, representation, 'relationship-chain'),
    );
  const allPaths = [...entityPaths, ...dependencyPaths, ...relationshipPaths].map((path) =>
    applyStructuralBlocks(path, representation, blocks),
  );

  for (const path of allPaths) {
    traces.push(path.trace);
  }

  return {
    id: `curriculum-reasoning-${representation.id}`,
    representationId: representation.id,
    generatedAt,
    queryIndex: buildQueryIndex(representation),
    applicablePaths: allPaths.filter((path) => path.status === 'applicable'),
    blockedPaths: allPaths.filter((path) => path.status === 'blocked'),
    blocks,
    traces,
    unknowns: representation.unknowns,
    humanConfirmations: representation.humanConfirmations,
  };
}

function buildEntityPath(
  entity: CurriculumRepresentationEntity,
): CurriculumReasoningPath {
  const trace = buildTrace({
    id: `trace-entity-${entity.id}`,
    entities: [entity],
    relationships: [],
    confidence: entity.confidence,
  });

  return {
    id: `path-entity-${entity.id}`,
    pathType: 'entity',
    entityIds: [entity.id],
    relationshipIds: [],
    status: 'applicable',
    explanation: `Entity "${entity.label}" is available from the representation.`,
    trace,
  };
}

function buildRelationshipPath(
  relationship: CurriculumRepresentationRelationship,
  representation: ReasoningReadyCurriculumRepresentation,
  pathType: CurriculumReasoningPath['pathType'],
): CurriculumReasoningPath {
  const entities = [
    representation.entities.find((entity) => entity.id === relationship.fromEntityId),
    representation.entities.find((entity) => entity.id === relationship.toEntityId),
  ].filter((entity): entity is CurriculumRepresentationEntity => Boolean(entity));
  const trace = buildTrace({
    id: `trace-relationship-${relationship.id}`,
    entities,
    relationships: [relationship],
    confidence: relationship.confidence,
  });

  return {
    id: `path-relationship-${relationship.id}`,
    pathType,
    entityIds: entities.map((entity) => entity.id),
    relationshipIds: [relationship.id],
    status: 'applicable',
    explanation: `Relationship "${relationship.relationshipType}" is traversable from the representation.`,
    trace,
  };
}

function applyStructuralBlocks(
  path: CurriculumReasoningPath,
  representation: ReasoningReadyCurriculumRepresentation,
  blocks: CurriculumReasoningBlock[],
): CurriculumReasoningPath {
  const pathBlocks = [
    ...findConfirmationBlocks(path, representation),
    ...findConstraintBlocks(path, representation),
    ...findBoundaryBlocks(path, representation),
    ...findWarningBlocks(path, representation),
  ];

  blocks.push(...pathBlocks);

  if (pathBlocks.length === 0) {
    return path;
  }

  return {
    ...path,
    status: 'blocked',
    explanation: `${path.explanation} It is blocked by ${pathBlocks
      .map((block) => block.reason)
      .join(', ')}.`,
  };
}

function findConfirmationBlocks(
  path: CurriculumReasoningPath,
  representation: ReasoningReadyCurriculumRepresentation,
): CurriculumReasoningBlock[] {
  return representation.humanConfirmations
    .filter(
      (confirmation) =>
        confirmation.confirmedValue.trim().length === 0 &&
        (path.entityIds.includes(confirmation.targetId) ||
          path.relationshipIds.includes(confirmation.targetId)),
    )
    .map((confirmation) => ({
      id: `block-confirmation-${path.id}-${confirmation.id}`,
      blockedPathId: path.id,
      reason: 'required-human-confirmation',
      relatedEntityIds: path.entityIds.filter((entityId) => entityId === confirmation.targetId),
      relatedRelationshipIds: path.relationshipIds.filter(
        (relationshipId) => relationshipId === confirmation.targetId,
      ),
      trace: path.trace,
    }));
}

function findConstraintBlocks(
  path: CurriculumReasoningPath,
  representation: ReasoningReadyCurriculumRepresentation,
): CurriculumReasoningBlock[] {
  return representation.constraints
    .filter((constraint) => path.entityIds.includes(constraint.id))
    .map((constraint) => ({
      id: `block-constraint-${path.id}-${constraint.id}`,
      blockedPathId: path.id,
      reason: 'curriculum-constraint',
      relatedEntityIds: [constraint.id],
      relatedRelationshipIds: [],
      trace: path.trace,
    }));
}

function findBoundaryBlocks(
  path: CurriculumReasoningPath,
  representation: ReasoningReadyCurriculumRepresentation,
): CurriculumReasoningBlock[] {
  return representation.adaptationBoundaries
    .filter((boundary) =>
      boundary.sourceEntityIds.some((entityId) => path.entityIds.includes(entityId)),
    )
    .map((boundary) => ({
      id: `block-boundary-${path.id}-${boundary.id}`,
      blockedPathId: path.id,
      reason: 'adaptation-boundary',
      relatedEntityIds: boundary.sourceEntityIds.filter((entityId) =>
        path.entityIds.includes(entityId),
      ),
      relatedRelationshipIds: [],
      trace: path.trace,
    }));
}

function findWarningBlocks(
  path: CurriculumReasoningPath,
  representation: ReasoningReadyCurriculumRepresentation,
): CurriculumReasoningBlock[] {
  return representation.warnings
    .filter((warning) =>
      warning.relatedEntityIds.some((entityId) => path.entityIds.includes(entityId)),
    )
    .map((warning) => ({
      id: `block-warning-${path.id}-${warning.id}`,
      blockedPathId: path.id,
      reason: 'representation-warning',
      relatedEntityIds: warning.relatedEntityIds.filter((entityId) =>
        path.entityIds.includes(entityId),
      ),
      relatedRelationshipIds: [],
      trace: path.trace,
    }));
}

function buildTrace({
  id,
  entities,
  relationships,
  confidence,
}: {
  id: string;
  entities: CurriculumRepresentationEntity[];
  relationships: CurriculumRepresentationRelationship[];
  confidence: CurriculumConfidence;
}): CurriculumReasoningTrace {
  return {
    id,
    representationEntityIds: entities.map((entity) => entity.id),
    representationRelationshipIds: relationships.map((relationship) => relationship.id),
    knowledgeClaimIds: Array.from(
      new Set([
        ...entities.flatMap((entity) => entity.knowledgeClaimIds),
        ...relationships.flatMap((relationship) => relationship.knowledgeClaimIds),
      ]),
    ),
    knowledgeRelationshipIds: Array.from(
      new Set(relationships.flatMap((relationship) => relationship.knowledgeRelationshipIds)),
    ),
    evidence: entities.flatMap((entity) => entity.evidence),
    confidence,
  };
}

function buildQueryIndex(
  representation: ReasoningReadyCurriculumRepresentation,
): CurriculumReasoningResult['queryIndex'] {
  return {
    entityIdsByType: representation.entities.reduce(
      (index, entity) => ({
        ...index,
        [entity.entityType]: [...index[entity.entityType], entity.id],
      }),
      emptyEntityIndex(),
    ),
    relationshipIdsByType: representation.relationships.reduce(
      (index, relationship) => ({
        ...index,
        [relationship.relationshipType]: [
          ...index[relationship.relationshipType],
          relationship.id,
        ],
      }),
      emptyRelationshipIndex(),
    ),
  };
}

function emptyEntityIndex(): Record<CurriculumRepresentationEntity['entityType'], string[]> {
  return {
    curriculum: [],
    'source-section': [],
    'instructional-unit': [],
    lesson: [],
    'activity-type': [],
    role: [],
    resource: [],
    assessment: [],
    constraint: [],
    risk: [],
    unknown: [],
  };
}

function emptyRelationshipIndex(): Record<
  CurriculumRepresentationRelationship['relationshipType'],
  string[]
> {
  return {
    contains: [],
    'depends-on': [],
    supports: [],
    requires: [],
    reviews: [],
    measures: [],
    'prepares-for': [],
    uses: [],
    assigns: [],
    constrains: [],
    explains: [],
    validates: [],
  };
}
