import type {
  CurriculumConfidence,
  CurriculumEvidence,
  CurriculumReasoningResult,
  CurriculumRepresentationEntity,
  CurriculumRepresentationRelationship,
  CurriculumUnknown,
} from '../curriculum-intelligence/contracts';
import { buildCurriculumIntelligenceSummary } from '../curriculum-intelligence/curriculumIntelligenceSummary';
import { assembleDecisionContext } from '../decision-context/decisionContextAssembly';
import { buildFamilyUnderstandingProfile } from '../family-understanding/familyUnderstandingEngine';
import { buildFamilyUnderstandingSummary } from '../family-understanding/familyUnderstandingSummary';
import { buildLearnerUnderstandingProfile } from '../learner-understanding/learnerUnderstandingEngine';
import { buildLearnerUnderstandingSummary } from '../learner-understanding/learnerUnderstandingSummary';
import { buildLearningContinuityProfile } from '../learning-continuity/learningContinuityEngine';
import { buildLearningContinuitySummary } from '../learning-continuity/learningContinuitySummary';
import { buildPersistedCurriculumRecord, type PersistedCurriculumRecord } from '../daily-cycle/dailyCyclePersistence';
import type { ParentDecisionV2 } from '../parent-decision/contracts';
import { buildParentDecisionV2FromDecisionContext } from '../parent-decision/parentDecisionV2Engine';
import type { SourceEvidence } from '../../domain/contracts';
import { buildSingleLessonModel } from './lessonUnderstandingEngine';
import { analyzeUploadedCurriculumFile } from './realFileAnalysis';
import type { UploadedCurriculumAnalysis } from './types';

export type CurriculumImportDecisionResult = {
  decision: ParentDecisionV2;
  curriculumRecord: PersistedCurriculumRecord;
};

const entityTypes: CurriculumRepresentationEntity['entityType'][] = [
  'curriculum',
  'source-section',
  'instructional-unit',
  'lesson',
  'activity-type',
  'role',
  'resource',
  'assessment',
  'constraint',
  'risk',
  'unknown',
];

const relationshipTypes: CurriculumRepresentationRelationship['relationshipType'][] = [
  'contains',
  'depends-on',
  'supports',
  'requires',
  'reviews',
  'measures',
  'prepares-for',
  'uses',
  'assigns',
  'constrains',
  'explains',
  'validates',
];

export async function analyzeCurriculumForParentDecision(
  file: File,
): Promise<CurriculumImportDecisionResult> {
  const sourceAnalysis = await analyzeUploadedCurriculumFile(file);
  const lessonModel = buildSingleLessonModel(sourceAnalysis);
  const curriculumSummary = buildCurriculumIntelligenceSummary(
    buildImportCurriculumReasoningResult(sourceAnalysis, lessonModel?.sourceEvidence ?? []),
  );
  const familySummary = buildFamilyUnderstandingSummary(
    buildFamilyUnderstandingProfile({
      id: `import-family-profile-${slugify(sourceAnalysis.fileName)}`,
      sourceArtifacts: [],
      observations: [],
    }),
  );
  const learnerSummary = buildLearnerUnderstandingSummary(
    buildLearnerUnderstandingProfile({
      id: `import-learner-profile-${slugify(sourceAnalysis.fileName)}`,
      learnerId: 'unknown-learner',
      sourceArtifacts: [],
      observations: [],
    }),
  );
  const learningContinuitySummary = buildLearningContinuitySummary(
    buildLearningContinuityProfile({
      id: `import-continuity-profile-${slugify(sourceAnalysis.fileName)}`,
      learnerId: 'unknown-learner',
      curriculumId: slugify(sourceAnalysis.fileName),
      sourceArtifacts: [],
      observations: [],
    }),
  );
  const decisionContext = assembleDecisionContext({
    id: `curriculum-import-decision-context-${slugify(sourceAnalysis.fileName)}`,
    curriculum: curriculumSummary,
    family: familySummary,
    learner: learnerSummary,
    learningContinuity: learningContinuitySummary,
  });
  const decision = buildParentDecisionV2FromDecisionContext(decisionContext);

  return {
    decision,
    curriculumRecord: buildPersistedCurriculumRecord({
      sourceAnalysis,
      lessonModel,
      decision,
    }),
  };
}

function buildImportCurriculumReasoningResult(
  sourceAnalysis: UploadedCurriculumAnalysis,
  lessonEvidence: SourceEvidence[],
): CurriculumReasoningResult {
  const sourceArtifactId = `uploaded-curriculum-${slugify(sourceAnalysis.fileName)}`;
  const directEvidence = buildDirectEvidence(sourceAnalysis, sourceArtifactId, lessonEvidence);
  const confidence = buildImportConfidence(sourceAnalysis, directEvidence);
  const entityIdsByType = buildEntityIndex(sourceAnalysis);
  const trace = {
    id: `curriculum-import-trace-${slugify(sourceAnalysis.fileName)}`,
    representationEntityIds: entityTypes.flatMap((entityType) => entityIdsByType[entityType]),
    representationRelationshipIds: [],
    knowledgeClaimIds: [],
    knowledgeRelationshipIds: [],
    evidence: directEvidence,
    confidence,
  };
  const unknowns = buildCurriculumUnknowns(sourceAnalysis, sourceArtifactId);
  const hasUsableCurriculumEvidence =
    sourceAnalysis.readableTextLength > 0 &&
    (sourceAnalysis.directFindings.length > 0 || lessonEvidence.length > 0);

  return {
    id: `curriculum-import-reasoning-${slugify(sourceAnalysis.fileName)}`,
    representationId: `curriculum-import-representation-${slugify(sourceAnalysis.fileName)}`,
    generatedAt: new Date().toISOString(),
    queryIndex: {
      entityIdsByType,
      relationshipIdsByType: emptyRelationshipIndex(),
    },
    applicablePaths: hasUsableCurriculumEvidence
      ? [
          {
            id: `curriculum-import-path-${slugify(sourceAnalysis.fileName)}`,
            pathType: 'entity',
            entityIds: trace.representationEntityIds,
            relationshipIds: [],
            status: 'applicable',
            explanation:
              'Uploaded curriculum evidence is available as a stable Curriculum Intelligence Summary for ParentDecisionV2.',
            trace,
          },
        ]
      : [],
    blockedPaths: hasUsableCurriculumEvidence
      ? []
      : [
          {
            id: `curriculum-import-blocked-path-${slugify(sourceAnalysis.fileName)}`,
            pathType: 'entity',
            entityIds: entityIdsByType.unknown,
            relationshipIds: [],
            status: 'blocked',
            explanation:
              'The uploaded curriculum did not provide readable curriculum evidence for downstream reasoning.',
            trace,
          },
        ],
    blocks: hasUsableCurriculumEvidence
      ? []
      : [
          {
            id: `curriculum-import-block-${slugify(sourceAnalysis.fileName)}`,
            blockedPathId: `curriculum-import-blocked-path-${slugify(sourceAnalysis.fileName)}`,
            reason: 'unknown',
            relatedEntityIds: entityIdsByType.unknown,
            relatedRelationshipIds: [],
            trace,
          },
        ],
    traces: [trace],
    unknowns,
    humanConfirmations: [],
  };
}

function buildDirectEvidence(
  sourceAnalysis: UploadedCurriculumAnalysis,
  sourceArtifactId: string,
  lessonEvidence: SourceEvidence[],
): CurriculumEvidence[] {
  const findingEvidence = sourceAnalysis.directFindings.slice(0, 8).map((finding) => ({
    id: `curriculum-evidence-${finding.id}`,
    sourceArtifactId,
    sourceTitle: sourceAnalysis.fileName,
    sourceLocation: finding.sourceLocation,
    quotedText: finding.evidence,
    evidenceType: 'direct-source' as const,
  }));
  const lessonEvidenceItems = lessonEvidence.slice(0, 8).map((evidence) => ({
    id: `curriculum-evidence-${evidence.id}`,
    sourceArtifactId,
    sourceTitle: sourceAnalysis.fileName,
    sourceLocation: evidence.sourceLocation,
    quotedText: evidence.quotedText,
    evidenceType: 'direct-source' as const,
  }));

  if (findingEvidence.length > 0 || lessonEvidenceItems.length > 0) {
    return [...findingEvidence, ...lessonEvidenceItems];
  }

  return [
    {
      id: `curriculum-evidence-upload-${slugify(sourceAnalysis.fileName)}`,
      sourceArtifactId,
      sourceTitle: sourceAnalysis.fileName,
      sourceLocation: 'Uploaded file metadata',
      quotedText: `${sourceAnalysis.fileName} (${sourceAnalysis.fileType}, ${sourceAnalysis.fileSizeLabel})`,
      evidenceType: 'direct-source',
    },
  ];
}

function buildImportConfidence(
  sourceAnalysis: UploadedCurriculumAnalysis,
  evidence: CurriculumEvidence[],
): CurriculumConfidence {
  if (sourceAnalysis.readableTextLength === 0) {
    return {
      level: 'requires-human-confirmation',
      rationale:
        'The uploaded curriculum did not expose readable text, so ParentDecisionV2 must preserve the limitation instead of treating it as understood curriculum.',
      evidence,
    };
  }

  if (sourceAnalysis.questions.length > 0 || sourceAnalysis.limitations.length > 0) {
    return {
      level: 'medium',
      rationale:
        'The uploaded curriculum provided source evidence, but unresolved questions or file limitations remain.',
      evidence,
    };
  }

  return {
    level: 'high',
    rationale: 'The uploaded curriculum provided direct readable evidence for this import decision.',
    evidence,
  };
}

function buildCurriculumUnknowns(
  sourceAnalysis: UploadedCurriculumAnalysis,
  sourceArtifactId: string,
): CurriculumUnknown[] {
  return [
    ...sourceAnalysis.limitations.map((limitation, index) => ({
      id: `curriculum-import-limitation-${index + 1}`,
      question: 'What is required before IterNest can understand this curriculum source?',
      reason: limitation,
      relatedEvidence: [
        {
          id: `curriculum-evidence-limitation-${index + 1}`,
          sourceArtifactId,
          sourceTitle: sourceAnalysis.fileName,
          sourceLocation: 'File analysis limitation',
          quotedText: limitation,
          evidenceType: 'unknown' as const,
        },
      ],
      blocksProfileReadiness: sourceAnalysis.readableTextLength === 0,
    })),
    ...sourceAnalysis.questions.map((question) => ({
      id: `curriculum-import-question-${question.id}`,
      question: question.question,
      reason: question.reason,
      relatedEvidence: [],
      blocksProfileReadiness: false,
    })),
  ];
}

function buildEntityIndex(
  sourceAnalysis: UploadedCurriculumAnalysis,
): Record<CurriculumRepresentationEntity['entityType'], string[]> {
  const entityIdsByType = emptyEntityIndex();
  entityIdsByType.curriculum.push(`curriculum-import-entity-${slugify(sourceAnalysis.fileName)}`);
  entityIdsByType['source-section'].push(
    ...sourceAnalysis.detectedSections.map((section) => `curriculum-import-section-${section.id}`),
  );
  entityIdsByType.lesson.push(
    ...sourceAnalysis.lessonHeadingsFound.map((heading) => `curriculum-import-lesson-${heading.id}`),
  );
  entityIdsByType['instructional-unit'].push(
    ...sourceAnalysis.subjectsFound.map((subject) => `curriculum-import-subject-${subject.id}`),
  );

  if (sourceAnalysis.readableTextLength === 0 || sourceAnalysis.limitations.length > 0) {
    entityIdsByType.unknown.push(`curriculum-import-unknown-${slugify(sourceAnalysis.fileName)}`);
  }

  return entityIdsByType;
}

function emptyEntityIndex(): Record<CurriculumRepresentationEntity['entityType'], string[]> {
  return Object.fromEntries(entityTypes.map((entityType) => [entityType, []])) as unknown as Record<
    CurriculumRepresentationEntity['entityType'],
    string[]
  >;
}

function emptyRelationshipIndex(): Record<
  CurriculumRepresentationRelationship['relationshipType'],
  string[]
> {
  return Object.fromEntries(relationshipTypes.map((relationshipType) => [relationshipType, []])) as unknown as Record<
    CurriculumRepresentationRelationship['relationshipType'],
    string[]
  >;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}
