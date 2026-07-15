export type CurriculumConfidenceLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'
  | 'requires-human-confirmation';

export type CurriculumEvidenceType =
  | 'direct-source'
  | 'structural-pattern'
  | 'cross-source-pattern'
  | 'human-confirmation'
  | 'unknown';

export type CurriculumEvidence = {
  id: string;
  sourceArtifactId: string;
  sourceTitle: string;
  sourceLocation: string;
  quotedText: string;
  evidenceType: CurriculumEvidenceType;
};

export type CurriculumConfidence = {
  level: CurriculumConfidenceLevel;
  rationale: string;
  evidence: CurriculumEvidence[];
};

export type CurriculumUnknown = {
  id: string;
  question: string;
  reason: string;
  relatedEvidence: CurriculumEvidence[];
  blocksProfileReadiness: boolean;
};

export type CurriculumUnderstandingCategory =
  | 'identity'
  | 'philosophy'
  | 'structure'
  | 'roles'
  | 'activities'
  | 'dependencies'
  | 'expectations'
  | 'constraints'
  | 'risks';

export type CurriculumObservedFact = {
  id: string;
  category: CurriculumUnderstandingCategory;
  fact: string;
  sourceArtifactIds: string[];
  evidence: CurriculumEvidence[];
  confidence: CurriculumConfidence;
};

export type CurriculumHypothesisType =
  | 'artifact-type'
  | 'structural-organization'
  | 'participant-pattern'
  | 'action-pattern'
  | 'source-completeness'
  | 'document-function'
  | 'other';

export type CurriculumUnderstandingHypothesis = {
  id: string;
  category: CurriculumUnderstandingCategory;
  hypothesisType: CurriculumHypothesisType;
  claim: string;
  status: 'proposed' | 'needs-more-evidence' | 'retired' | 'requires-human-confirmation';
  originatingObservedFactIds: string[];
  supportingEvidence: CurriculumEvidence[];
  limitingEvidence: CurriculumEvidence[];
  competingHypothesisIds: string[];
  testsNeeded: string[];
  humanConfirmationNeeded: boolean;
  confidence: CurriculumConfidence;
  confidenceHistory: Array<{
    id: string;
    changedAt: string;
    confidence: CurriculumConfidence;
    rationale: string;
  }>;
};

export type CurriculumValidatedFinding = {
  id: string;
  category: CurriculumUnderstandingCategory;
  finding: string;
  validationStatus:
    | 'supported'
    | 'partially-supported'
    | 'contradicted'
    | 'requires-human-confirmation';
  sourceHypothesisIds: string[];
  sourceObservedFactIds: string[];
  supportingEvidence: CurriculumEvidence[];
  contradictingEvidence: CurriculumEvidence[];
  remainingUnknownIds: string[];
  confidence: CurriculumConfidence;
  confidenceHistory: Array<{
    id: string;
    changedAt: string;
    confidence: CurriculumConfidence;
    rationale: string;
  }>;
  validationSummary: string;
};

export type KnowledgePromotionDecisionOutcome =
  | 'preserve-as-knowledge'
  | 'remain-validated-finding'
  | 'requires-additional-evidence'
  | 'requires-human-confirmation'
  | 'retire';

export type KnowledgePromotionDecision = {
  id: string;
  validatedFindingId: string;
  category: CurriculumUnderstandingCategory;
  finding: string;
  outcome: KnowledgePromotionDecisionOutcome;
  durableCurriculumMeaning: boolean;
  rationale: string;
  provenance: {
    validatedFindingId: string;
    sourceHypothesisIds: string[];
    sourceObservedFactIds: string[];
    sourceArtifactIds: string[];
  };
  supportingEvidence: CurriculumEvidence[];
  limitingEvidence: CurriculumEvidence[];
  confidence: CurriculumConfidence;
  confidenceHistory: CurriculumValidatedFinding['confidenceHistory'];
  humanConfirmationRequired: boolean;
  blockingReasons: string[];
};

export type CurriculumHumanConfirmation = {
  id: string;
  targetId: string;
  targetType:
    | 'understanding-profile'
    | 'knowledge-claim'
    | 'representation-entity'
    | 'representation-relationship'
    | 'unknown';
  confirmedValue: string;
  confirmedBy: string;
  confirmedAt: string;
  evidence: CurriculumEvidence[];
  note?: string;
};

export type CurriculumSourceArtifact = {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  pageCount: number | null;
  readableTextLength: number;
  extractionStatus: 'readable-text' | 'ocr-required' | 'unsupported-file-type' | 'failed';
  limitations: string[];
  physicalStructure: {
    pageCount: number | null;
    lineCount: number;
    hasSelectableText: boolean;
    pageSummaries: Array<{
      pageNumber: number;
      lineCount: number;
      characterCount: number;
    }>;
  };
  pages: CurriculumSourcePage[];
  observedLines: Array<{
    id: string;
    text: string;
    sourceLocation: string;
    sourceOrder: number;
    rawContentRef: string;
  }>;
  observableStructuralPatterns: CurriculumObservableStructuralPattern[];
};

export type CurriculumSourcePage = {
  id: string;
  pageNumber: number;
  lineCount: number;
  characterCount: number;
  rawContentRef: string;
};

export type CurriculumObservableStructuralPattern = {
  id: string;
  patternType:
    | 'blank-line-break'
    | 'numbered-line'
    | 'checkbox-marker'
    | 'repeated-line'
    | 'short-uppercase-line'
    | 'page-boundary';
  description: string;
  sourceLocations: string[];
  evidenceText: string[];
};

export type UnderstandingLifecycleStage =
  | 'artifact-orientation'
  | 'surface-structure-mapping'
  | 'role-detection'
  | 'activity-taxonomy-discovery'
  | 'hypothesis-formation'
  | 'pattern-testing'
  | 'evidence-inference-separation'
  | 'question-generation'
  | 'mental-model-formation'
  | 'profile-readiness'
  | 'domain-understanding-profile';

export type CurriculumUnderstandingClaim = {
  id: string;
  category: CurriculumUnderstandingCategory;
  claim: string;
  interpretationType: 'observed-fact' | 'evidence-backed-interpretation' | 'hypothesis' | 'unknown';
  confidence: CurriculumConfidence;
};

export type CurriculumUnderstandingProfile = {
  id: string;
  sourceArtifactIds: string[];
  generatedAt: string;
  lifecycleStage: UnderstandingLifecycleStage;
  identity: CurriculumUnderstandingClaim[];
  philosophy: CurriculumUnderstandingClaim[];
  structure: CurriculumUnderstandingClaim[];
  roles: CurriculumUnderstandingClaim[];
  activities: CurriculumUnderstandingClaim[];
  dependencies: CurriculumUnderstandingClaim[];
  expectations: CurriculumUnderstandingClaim[];
  constraints: CurriculumUnderstandingClaim[];
  risks: CurriculumUnderstandingClaim[];
  observedFacts: CurriculumObservedFact[];
  hypotheses: CurriculumUnderstandingHypothesis[];
  validatedFindings: CurriculumValidatedFinding[];
  unknowns: CurriculumUnknown[];
  profileReadiness: {
    readyForKnowledgeModel: boolean;
    confidence: CurriculumConfidence;
    blockingUnknownIds: string[];
  };
};

export type CurriculumKnowledgeCategory =
  | 'identity'
  | 'philosophy'
  | 'structure'
  | 'roles'
  | 'activities'
  | 'dependencies'
  | 'expectations'
  | 'constraints'
  | 'risks'
  | 'evidence-and-confidence';

export type CurriculumKnowledgeClaim = {
  id: string;
  category: CurriculumKnowledgeCategory;
  stableMeaning: string;
  sourceUnderstandingClaimIds: string[];
  sourceValidatedFindingIds: string[];
  sourceHypothesisIds: string[];
  sourceObservedFactIds: string[];
  sourceArtifactIds: string[];
  supportingEvidence: CurriculumEvidence[];
  limitingEvidence: CurriculumEvidence[];
  confidenceHistory: CurriculumValidatedFinding['confidenceHistory'];
  preservationRationale: string;
  confidence: CurriculumConfidence;
  revisionHistory: Array<{
    id: string;
    changedAt: string;
    reason: string;
    evidence: CurriculumEvidence[];
  }>;
};

export type CurriculumKnowledgeRelationship = {
  id: string;
  fromClaimId: string;
  toClaimId: string;
  relationshipType:
    | 'contains'
    | 'depends-on'
    | 'supports'
    | 'requires'
    | 'reviews'
    | 'measures'
    | 'prepares-for'
    | 'uses'
    | 'assigns'
    | 'constrains'
    | 'explains'
    | 'validates';
  confidence: CurriculumConfidence;
};

export type CurriculumKnowledgeModel = {
  id: string;
  understandingProfileId: string;
  generatedAt: string;
  stableClaims: CurriculumKnowledgeClaim[];
  relationships: CurriculumKnowledgeRelationship[];
  unknowns: CurriculumUnknown[];
  humanConfirmations: CurriculumHumanConfirmation[];
};

export type CurriculumRepresentationEntity = {
  id: string;
  entityType:
    | 'curriculum'
    | 'source-section'
    | 'instructional-unit'
    | 'lesson'
    | 'activity-type'
    | 'role'
    | 'resource'
    | 'assessment'
    | 'constraint'
    | 'risk'
    | 'unknown';
  label: string;
  semanticClassification: string;
  knowledgeClaimIds: string[];
  evidence: CurriculumEvidence[];
  confidence: CurriculumConfidence;
};

export type CurriculumRepresentationRelationship = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationshipType: CurriculumKnowledgeRelationship['relationshipType'];
  knowledgeRelationshipIds: string[];
  knowledgeClaimIds: string[];
  confidence: CurriculumConfidence;
};

export type ReasoningReadyCurriculumRepresentation = {
  id: string;
  knowledgeModelId: string;
  generatedAt: string;
  entities: CurriculumRepresentationEntity[];
  relationships: CurriculumRepresentationRelationship[];
  constraints: CurriculumRepresentationEntity[];
  dependencies: CurriculumRepresentationRelationship[];
  adaptationBoundaries: Array<{
    id: string;
    boundary: string;
    sourceEntityIds: string[];
    confidence: CurriculumConfidence;
  }>;
  unknowns: CurriculumUnknown[];
  humanConfirmations: CurriculumHumanConfirmation[];
  warnings: Array<{
    id: string;
    message: string;
    relatedEntityIds: string[];
    confidence: CurriculumConfidence;
  }>;
};

export type CurriculumReasoningTrace = {
  id: string;
  representationEntityIds: string[];
  representationRelationshipIds: string[];
  knowledgeClaimIds: string[];
  knowledgeRelationshipIds: string[];
  evidence: CurriculumEvidence[];
  confidence: CurriculumConfidence;
};

export type CurriculumReasoningPath = {
  id: string;
  pathType: 'entity' | 'dependency-chain' | 'relationship-chain';
  entityIds: string[];
  relationshipIds: string[];
  status: 'applicable' | 'blocked';
  explanation: string;
  trace: CurriculumReasoningTrace;
};

export type CurriculumReasoningBlock = {
  id: string;
  blockedPathId: string;
  reason:
    | 'required-human-confirmation'
    | 'curriculum-constraint'
    | 'adaptation-boundary'
    | 'representation-warning'
    | 'unknown';
  relatedEntityIds: string[];
  relatedRelationshipIds: string[];
  trace: CurriculumReasoningTrace;
};

export type CurriculumReasoningResult = {
  id: string;
  representationId: string;
  generatedAt: string;
  queryIndex: {
    entityIdsByType: Record<CurriculumRepresentationEntity['entityType'], string[]>;
    relationshipIdsByType: Record<CurriculumRepresentationRelationship['relationshipType'], string[]>;
  };
  applicablePaths: CurriculumReasoningPath[];
  blockedPaths: CurriculumReasoningPath[];
  blocks: CurriculumReasoningBlock[];
  traces: CurriculumReasoningTrace[];
  unknowns: CurriculumUnknown[];
  humanConfirmations: CurriculumHumanConfirmation[];
};

export type CurriculumIntelligenceSummaryTrace = {
  reasoningTraceId: string;
  representationEntityIds: string[];
  representationRelationshipIds: string[];
  knowledgeClaimIds: string[];
  knowledgeRelationshipIds: string[];
  evidence: CurriculumEvidence[];
  confidence: CurriculumConfidence;
};

export type CurriculumIntelligenceSummaryCategory =
  | 'curriculum-identity'
  | 'instruction-characteristics'
  | 'resource-ecosystem'
  | 'learning-structure'
  | 'operational-characteristics';

export type CurriculumIntelligenceSummarySignal = {
  id: string;
  category: CurriculumIntelligenceSummaryCategory;
  statement: string;
  status: 'available' | 'limited' | 'blocked' | 'unknown';
  sourceReasoningPathIds: string[];
  sourceReasoningBlockIds: string[];
  trace: CurriculumIntelligenceSummaryTrace[];
};

export type CurriculumIntelligenceSummary = {
  id: string;
  contractVersion: '1.0';
  reasoningResultId: string;
  representationId: string;
  generatedAt: string;
  summaryStatus: 'available' | 'limited' | 'blocked' | 'empty';
  curriculumIdentity: CurriculumIntelligenceSummarySignal[];
  instructionCharacteristics: CurriculumIntelligenceSummarySignal[];
  resourceEcosystem: CurriculumIntelligenceSummarySignal[];
  learningStructure: CurriculumIntelligenceSummarySignal[];
  operationalCharacteristics: CurriculumIntelligenceSummarySignal[];
  unknowns: CurriculumUnknown[];
  humanConfirmations: CurriculumHumanConfirmation[];
  evidenceProfile: {
    traceCount: number;
    evidenceCount: number;
    confidenceCounts: Record<CurriculumConfidenceLevel, number>;
  };
};
