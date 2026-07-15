import type {
  CurriculumConfidenceLevel,
  CurriculumIntelligenceSummary,
  CurriculumIntelligenceSummaryCategory,
  CurriculumIntelligenceSummarySignal,
  CurriculumIntelligenceSummaryTrace,
  CurriculumReasoningResult,
  CurriculumReasoningTrace,
} from './contracts';

export function buildCurriculumIntelligenceSummary(
  reasoningResult: CurriculumReasoningResult,
): CurriculumIntelligenceSummary {
  const signals = [
    buildCurriculumIdentitySignal(reasoningResult),
    buildInstructionCharacteristicsSignal(reasoningResult),
    buildResourceEcosystemSignal(reasoningResult),
    buildLearningStructureSignal(reasoningResult),
    buildOperationalCharacteristicsSignal(reasoningResult),
  ];

  return {
    id: `curriculum-intelligence-summary-${reasoningResult.id}`,
    contractVersion: '1.0',
    reasoningResultId: reasoningResult.id,
    representationId: reasoningResult.representationId,
    generatedAt: new Date().toISOString(),
    summaryStatus: determineSummaryStatus(reasoningResult),
    curriculumIdentity: signals.filter((signal) => signal.category === 'curriculum-identity'),
    instructionCharacteristics: signals.filter(
      (signal) => signal.category === 'instruction-characteristics',
    ),
    resourceEcosystem: signals.filter((signal) => signal.category === 'resource-ecosystem'),
    learningStructure: signals.filter((signal) => signal.category === 'learning-structure'),
    operationalCharacteristics: signals.filter(
      (signal) => signal.category === 'operational-characteristics',
    ),
    unknowns: reasoningResult.unknowns,
    humanConfirmations: reasoningResult.humanConfirmations,
    evidenceProfile: {
      traceCount: reasoningResult.traces.length,
      evidenceCount: countUniqueEvidence(reasoningResult.traces),
      confidenceCounts: countConfidenceLevels(reasoningResult.traces),
    },
  };
}

function buildCurriculumIdentitySignal(
  reasoningResult: CurriculumReasoningResult,
): CurriculumIntelligenceSummarySignal {
  const pathIds = reasoningResult.queryIndex.entityIdsByType.curriculum.flatMap((entityId) =>
    pathIdsForEntity(reasoningResult, entityId),
  );

  return buildSignal({
    id: 'summary-signal-curriculum-identity',
    category: 'curriculum-identity',
    statement:
      pathIds.length > 0
        ? 'Curriculum identity information is available for downstream reasoning.'
        : 'Curriculum identity information is not yet available in the reasoning result.',
    status: pathIds.length > 0 ? 'available' : 'unknown',
    reasoningResult,
    sourceReasoningPathIds: pathIds,
    sourceReasoningBlockIds: [],
  });
}

function buildInstructionCharacteristicsSignal(
  reasoningResult: CurriculumReasoningResult,
): CurriculumIntelligenceSummarySignal {
  const entityIds = [
    ...reasoningResult.queryIndex.entityIdsByType['instructional-unit'],
    ...reasoningResult.queryIndex.entityIdsByType.lesson,
    ...reasoningResult.queryIndex.entityIdsByType['activity-type'],
    ...reasoningResult.queryIndex.entityIdsByType.role,
    ...reasoningResult.queryIndex.entityIdsByType.assessment,
  ];
  const pathIds = entityIds.flatMap((entityId) => pathIdsForEntity(reasoningResult, entityId));

  return buildSignal({
    id: 'summary-signal-instruction-characteristics',
    category: 'instruction-characteristics',
    statement:
      pathIds.length > 0
        ? 'Instruction characteristics are available for downstream reasoning.'
        : 'Instruction characteristics are not yet available in the reasoning result.',
    status: pathIds.length > 0 ? 'available' : 'unknown',
    reasoningResult,
    sourceReasoningPathIds: unique(pathIds),
    sourceReasoningBlockIds: [],
  });
}

function buildResourceEcosystemSignal(
  reasoningResult: CurriculumReasoningResult,
): CurriculumIntelligenceSummarySignal {
  const resourceEntityIds = reasoningResult.queryIndex.entityIdsByType.resource;
  const resourceRelationshipIds = [
    ...reasoningResult.queryIndex.relationshipIdsByType.uses,
    ...reasoningResult.queryIndex.relationshipIdsByType.requires,
  ];
  const pathIds = [
    ...resourceEntityIds.flatMap((entityId) => pathIdsForEntity(reasoningResult, entityId)),
    ...resourceRelationshipIds.flatMap((relationshipId) =>
      pathIdsForRelationship(reasoningResult, relationshipId),
    ),
  ];

  return buildSignal({
    id: 'summary-signal-resource-ecosystem',
    category: 'resource-ecosystem',
    statement:
      pathIds.length > 0
        ? 'Resource relationships are available for downstream reasoning.'
        : 'Resource relationships are not yet available in the reasoning result.',
    status: pathIds.length > 0 ? 'available' : 'unknown',
    reasoningResult,
    sourceReasoningPathIds: unique(pathIds),
    sourceReasoningBlockIds: [],
  });
}

function buildLearningStructureSignal(
  reasoningResult: CurriculumReasoningResult,
): CurriculumIntelligenceSummarySignal {
  const structuralRelationshipIds = [
    ...reasoningResult.queryIndex.relationshipIdsByType.contains,
    ...reasoningResult.queryIndex.relationshipIdsByType['depends-on'],
    ...reasoningResult.queryIndex.relationshipIdsByType['prepares-for'],
    ...reasoningResult.queryIndex.relationshipIdsByType.reviews,
    ...reasoningResult.queryIndex.relationshipIdsByType.measures,
  ];
  const pathIds = structuralRelationshipIds.flatMap((relationshipId) =>
    pathIdsForRelationship(reasoningResult, relationshipId),
  );

  return buildSignal({
    id: 'summary-signal-learning-structure',
    category: 'learning-structure',
    statement:
      pathIds.length > 0
        ? 'Learning structure relationships are available for downstream reasoning.'
        : 'Learning structure relationships are not yet available in the reasoning result.',
    status: pathIds.length > 0 ? 'available' : 'unknown',
    reasoningResult,
    sourceReasoningPathIds: unique(pathIds),
    sourceReasoningBlockIds: [],
  });
}

function buildOperationalCharacteristicsSignal(
  reasoningResult: CurriculumReasoningResult,
): CurriculumIntelligenceSummarySignal {
  const blockIds = reasoningResult.blocks.map((block) => block.id);
  const blockedPathIds = reasoningResult.blockedPaths.map((path) => path.id);

  return buildSignal({
    id: 'summary-signal-operational-characteristics',
    category: 'operational-characteristics',
    statement:
      blockIds.length > 0
        ? 'Operational limits are present in the reasoning result.'
        : 'No operational limits are present in the reasoning result.',
    status: blockIds.length > 0 ? 'limited' : 'available',
    reasoningResult,
    sourceReasoningPathIds: blockedPathIds,
    sourceReasoningBlockIds: blockIds,
  });
}

function buildSignal({
  id,
  category,
  statement,
  status,
  reasoningResult,
  sourceReasoningPathIds,
  sourceReasoningBlockIds,
}: {
  id: string;
  category: CurriculumIntelligenceSummaryCategory;
  statement: string;
  status: CurriculumIntelligenceSummarySignal['status'];
  reasoningResult: CurriculumReasoningResult;
  sourceReasoningPathIds: string[];
  sourceReasoningBlockIds: string[];
}): CurriculumIntelligenceSummarySignal {
  return {
    id,
    category,
    statement,
    status,
    sourceReasoningPathIds,
    sourceReasoningBlockIds,
    trace: tracesForPathsAndBlocks(reasoningResult, sourceReasoningPathIds, sourceReasoningBlockIds),
  };
}

function determineSummaryStatus(
  reasoningResult: CurriculumReasoningResult,
): CurriculumIntelligenceSummary['summaryStatus'] {
  const totalPaths = reasoningResult.applicablePaths.length + reasoningResult.blockedPaths.length;

  if (totalPaths === 0) {
    return 'empty';
  }

  if (reasoningResult.applicablePaths.length === 0) {
    return 'blocked';
  }

  if (reasoningResult.blockedPaths.length > 0) {
    return 'limited';
  }

  return 'available';
}

function tracesForPathsAndBlocks(
  reasoningResult: CurriculumReasoningResult,
  pathIds: string[],
  blockIds: string[],
): CurriculumIntelligenceSummaryTrace[] {
  const pathTraces = [...reasoningResult.applicablePaths, ...reasoningResult.blockedPaths]
    .filter((path) => pathIds.includes(path.id))
    .map((path) => path.trace);
  const blockTraces = reasoningResult.blocks
    .filter((block) => blockIds.includes(block.id))
    .map((block) => block.trace);

  return uniqueTraces([...pathTraces, ...blockTraces]).map(toSummaryTrace);
}

function pathIdsForEntity(reasoningResult: CurriculumReasoningResult, entityId: string) {
  return [...reasoningResult.applicablePaths, ...reasoningResult.blockedPaths]
    .filter((path) => path.entityIds.includes(entityId))
    .map((path) => path.id);
}

function pathIdsForRelationship(
  reasoningResult: CurriculumReasoningResult,
  relationshipId: string,
) {
  return [...reasoningResult.applicablePaths, ...reasoningResult.blockedPaths]
    .filter((path) => path.relationshipIds.includes(relationshipId))
    .map((path) => path.id);
}

function toSummaryTrace(trace: CurriculumReasoningTrace): CurriculumIntelligenceSummaryTrace {
  return {
    reasoningTraceId: trace.id,
    representationEntityIds: trace.representationEntityIds,
    representationRelationshipIds: trace.representationRelationshipIds,
    knowledgeClaimIds: trace.knowledgeClaimIds,
    knowledgeRelationshipIds: trace.knowledgeRelationshipIds,
    evidence: trace.evidence,
    confidence: trace.confidence,
  };
}

function countUniqueEvidence(traces: CurriculumReasoningTrace[]) {
  return new Set(traces.flatMap((trace) => trace.evidence.map((evidence) => evidence.id))).size;
}

function countConfidenceLevels(
  traces: CurriculumReasoningTrace[],
): Record<CurriculumConfidenceLevel, number> {
  return traces.reduce(
    (counts, trace) => ({
      ...counts,
      [trace.confidence.level]: counts[trace.confidence.level] + 1,
    }),
    {
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
      'requires-human-confirmation': 0,
    } satisfies Record<CurriculumConfidenceLevel, number>,
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function uniqueTraces(traces: CurriculumReasoningTrace[]) {
  return Array.from(new Map(traces.map((trace) => [trace.id, trace])).values());
}
