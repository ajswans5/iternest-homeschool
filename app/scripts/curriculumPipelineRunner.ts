import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildCurriculumKnowledgeModel } from '../src/features/curriculum-intelligence/curriculumKnowledgeModel';
import { buildCurriculumIntelligenceSummary } from '../src/features/curriculum-intelligence/curriculumIntelligenceSummary';
import { evaluateKnowledgePromotion } from '../src/features/curriculum-intelligence/knowledgePreservation';
import { buildCurriculumReasoningResult } from '../src/features/curriculum-intelligence/reasoningEngine';
import { buildReasoningReadyCurriculumRepresentation } from '../src/features/curriculum-intelligence/representationEngine';
import { buildCurriculumSourceArtifact } from '../src/features/curriculum-intelligence/sourceArtifact';
import { buildCurriculumUnderstandingProfile } from '../src/features/curriculum-intelligence/understandingEngine';
import type {
  CurriculumEvidence,
  CurriculumHumanConfirmation,
  CurriculumIntelligenceSummary,
  CurriculumKnowledgeModel,
  CurriculumObservedFact,
  CurriculumReasoningResult,
  CurriculumRepresentationEntity,
  CurriculumRepresentationRelationship,
  CurriculumSourceArtifact,
  CurriculumUnderstandingHypothesis,
  CurriculumUnderstandingProfile,
  CurriculumUnknown,
  CurriculumValidatedFinding,
  KnowledgePromotionDecision,
  ReasoningReadyCurriculumRepresentation,
} from '../src/features/curriculum-intelligence/contracts';

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    printUsageAndExit();
  }

  const absolutePath = path.resolve(filePath);
  const file = await readLocalFileAsFile(absolutePath);

  const sourceArtifact = await buildCurriculumSourceArtifact(file);
  const understandingProfile = buildCurriculumUnderstandingProfile(sourceArtifact);
  const preservation = evaluateKnowledgePromotion({
    validatedFindings: understandingProfile.validatedFindings,
  });
  const knowledgeModel = buildCurriculumKnowledgeModel({
    id: `knowledge-model-${sourceArtifact.id}`,
    understandingProfileId: understandingProfile.id,
    promotionDecisions: preservation.promotionDecisions,
  });
  const representation = buildReasoningReadyCurriculumRepresentation(knowledgeModel);
  const reasoning = buildCurriculumReasoningResult(representation);
  const summary = buildCurriculumIntelligenceSummary(reasoning);

  printPipelineReport({
    sourceFilePath: absolutePath,
    sourceArtifact,
    understandingProfile,
    promotionDecisions: preservation.promotionDecisions,
    knowledgeModel,
    representation,
    reasoning,
    summary,
  });
}

function printUsageAndExit(): never {
  console.error('Usage: npm run curriculum:pipeline -- <path-to-curriculum-file>');
  process.exit(1);
}

async function readLocalFileAsFile(filePath: string) {
  const buffer = await readFile(filePath);
  const fileName = path.basename(filePath);

  return new File([buffer], fileName, {
    type: detectMimeType(fileName),
  });
}

function detectMimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const mimeTypesByExtension: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };

  return mimeTypesByExtension[extension] ?? 'application/octet-stream';
}

function printPipelineReport({
  sourceFilePath,
  sourceArtifact,
  understandingProfile,
  promotionDecisions,
  knowledgeModel,
  representation,
  reasoning,
  summary,
}: {
  sourceFilePath: string;
  sourceArtifact: CurriculumSourceArtifact;
  understandingProfile: CurriculumUnderstandingProfile;
  promotionDecisions: KnowledgePromotionDecision[];
  knowledgeModel: CurriculumKnowledgeModel;
  representation: ReasoningReadyCurriculumRepresentation;
  reasoning: CurriculumReasoningResult;
  summary: CurriculumIntelligenceSummary;
}) {
  printHeading('IterNest Curriculum Intelligence Pipeline');
  printKeyValue('Generated from', sourceArtifact.fileName);
  printKeyValue('Source artifact ID', sourceArtifact.id);
  printKeyValue('Report target', pathToFileURL(sourceFilePath).pathname);

  printSourceArtifact(sourceArtifact);
  printObservedFacts(understandingProfile.observedFacts);
  printHypotheses(understandingProfile.hypotheses);
  printValidatedFindings(understandingProfile.validatedFindings);
  printUnknowns(understandingProfile.unknowns);
  printPromotionDecisions(promotionDecisions);
  printKnowledgeModel(knowledgeModel);
  printRepresentation(representation);
  printReasoning(reasoning);
  printCurriculumIntelligenceSummary(summary);
}

function printSourceArtifact(sourceArtifact: CurriculumSourceArtifact) {
  printSection('1. Curriculum Source Artifact');
  printKeyValue('File name', sourceArtifact.fileName);
  printKeyValue('File type', sourceArtifact.fileType);
  printKeyValue('File size', `${sourceArtifact.fileSizeBytes} bytes`);
  printKeyValue('Pages', sourceArtifact.pageCount ?? 'Unknown');
  printKeyValue('Extraction status', sourceArtifact.extractionStatus);
  printKeyValue('Readable text length', sourceArtifact.readableTextLength);
  printList('Limitations', sourceArtifact.limitations);
  printList(
    'Page summaries',
    sourceArtifact.physicalStructure.pageSummaries.map(
      (page) =>
        `Page ${page.pageNumber}: ${page.lineCount} line(s), ${page.characterCount} character(s)`,
    ),
  );
  printList(
    'Observable structural patterns',
    sourceArtifact.observableStructuralPatterns.map(
      (pattern) =>
        `${pattern.patternType}: ${pattern.description} (${pattern.sourceLocations.join(', ')})`,
    ),
  );
}

function printObservedFacts(observedFacts: CurriculumObservedFact[]) {
  printSection('2. Observed Facts');
  printKeyValue('Count', observedFacts.length);
  observedFacts.forEach((fact) => {
    printItem(fact.fact);
    printKeyValue('Category', fact.category, 4);
    printConfidence(fact.confidence.level, fact.confidence.rationale, 4);
    printEvidence(fact.evidence, 4);
  });
}

function printHypotheses(hypotheses: CurriculumUnderstandingHypothesis[]) {
  printSection('3. Hypotheses');
  printKeyValue('Count', hypotheses.length);
  hypotheses.forEach((hypothesis) => {
    printItem(hypothesis.claim);
    printKeyValue('Type', hypothesis.hypothesisType, 4);
    printKeyValue('Status', hypothesis.status, 4);
    printConfidence(hypothesis.confidence.level, hypothesis.confidence.rationale, 4);
    printList('Tests needed', hypothesis.testsNeeded, 4);
    printList('Competing hypotheses', hypothesis.competingHypothesisIds, 4);
    printEvidence(hypothesis.supportingEvidence, 4);
  });
}

function printValidatedFindings(validatedFindings: CurriculumValidatedFinding[]) {
  printSection('4. Validated Findings');
  printKeyValue('Count', validatedFindings.length);
  validatedFindings.forEach((finding) => {
    printItem(finding.finding);
    printKeyValue('Category', finding.category, 4);
    printKeyValue('Validation status', finding.validationStatus, 4);
    printConfidence(finding.confidence.level, finding.confidence.rationale, 4);
    printKeyValue('Validation summary', finding.validationSummary, 4);
    printList('Source hypotheses', finding.sourceHypothesisIds, 4);
    printList('Source observed facts', finding.sourceObservedFactIds, 4);
    printEvidence(finding.supportingEvidence, 4);
  });
}

function printUnknowns(unknowns: CurriculumUnknown[]) {
  printSection('5. Unknowns');
  printKeyValue('Count', unknowns.length);
  unknowns.forEach((unknown) => {
    printItem(unknown.question);
    printKeyValue('Reason', unknown.reason, 4);
    printKeyValue('Blocks profile readiness', unknown.blocksProfileReadiness, 4);
    printEvidence(unknown.relatedEvidence, 4);
  });
}

function printPromotionDecisions(promotionDecisions: KnowledgePromotionDecision[]) {
  printSection('6. Knowledge Promotion Decisions');
  printKeyValue('Count', promotionDecisions.length);
  promotionDecisions.forEach((decision) => {
    printItem(decision.finding);
    printKeyValue('Outcome', decision.outcome, 4);
    printKeyValue('Durable curriculum meaning', decision.durableCurriculumMeaning, 4);
    printKeyValue('Rationale', decision.rationale, 4);
    printList('Blocking reasons', decision.blockingReasons, 4);
  });
}

function printKnowledgeModel(knowledgeModel: CurriculumKnowledgeModel) {
  printSection('7. Curriculum Knowledge Model');
  printKeyValue('Stable claims', knowledgeModel.stableClaims.length);
  printKeyValue('Relationships', knowledgeModel.relationships.length);
  printKeyValue('Unknowns', knowledgeModel.unknowns.length);
  printHumanConfirmations(knowledgeModel.humanConfirmations);
  knowledgeModel.stableClaims.forEach((claim) => {
    printItem(claim.stableMeaning);
    printKeyValue('Category', claim.category, 4);
    printConfidence(claim.confidence.level, claim.confidence.rationale, 4);
    printList('Validated finding IDs', claim.sourceValidatedFindingIds, 4);
    printList('Hypothesis IDs', claim.sourceHypothesisIds, 4);
    printList('Observed fact IDs', claim.sourceObservedFactIds, 4);
    printList('Source artifact IDs', claim.sourceArtifactIds, 4);
  });
}

function printRepresentation(representation: ReasoningReadyCurriculumRepresentation) {
  printSection('8. Reasoning-Ready Curriculum Representation');
  printKeyValue('Entities', representation.entities.length);
  printKeyValue('Relationships', representation.relationships.length);
  printKeyValue('Constraints', representation.constraints.length);
  printKeyValue('Dependencies', representation.dependencies.length);
  printKeyValue('Adaptation boundaries', representation.adaptationBoundaries.length);
  printKeyValue('Unknowns', representation.unknowns.length);
  printHumanConfirmations(representation.humanConfirmations);
  printRepresentationEntities(representation.entities);
  printRepresentationRelationships(representation.relationships);
}

function printReasoning(reasoning: CurriculumReasoningResult) {
  printSection('9. Curriculum Reasoning Result');
  printKeyValue('Applicable paths', reasoning.applicablePaths.length);
  printKeyValue('Blocked paths', reasoning.blockedPaths.length);
  printKeyValue('Blocks', reasoning.blocks.length);
  printKeyValue('Traces', reasoning.traces.length);
  reasoning.applicablePaths.forEach((path) => {
    printItem(path.explanation);
    printKeyValue('Path type', path.pathType, 4);
    printList('Entity IDs', path.entityIds, 4);
    printList('Relationship IDs', path.relationshipIds, 4);
    printList('Knowledge claim IDs', path.trace.knowledgeClaimIds, 4);
  });
  reasoning.blockedPaths.forEach((path) => {
    printItem(path.explanation);
    printKeyValue('Path type', path.pathType, 4);
    printList('Entity IDs', path.entityIds, 4);
    printList('Relationship IDs', path.relationshipIds, 4);
  });
}

function printCurriculumIntelligenceSummary(summary: CurriculumIntelligenceSummary) {
  printSection('10. Curriculum Intelligence Summary');
  printKeyValue('Contract version', summary.contractVersion);
  printKeyValue('Summary status', summary.summaryStatus);
  printKeyValue('Reasoning result ID', summary.reasoningResultId);
  printKeyValue('Representation ID', summary.representationId);
  printKeyValue('Evidence traces', summary.evidenceProfile.traceCount);
  printKeyValue('Evidence items', summary.evidenceProfile.evidenceCount);
  printList(
    'Confidence counts',
    Object.entries(summary.evidenceProfile.confidenceCounts).map(
      ([level, count]) => `${level}: ${count}`,
    ),
  );
  printSummarySignals('Curriculum identity', summary.curriculumIdentity);
  printSummarySignals('Instruction characteristics', summary.instructionCharacteristics);
  printSummarySignals('Resource ecosystem', summary.resourceEcosystem);
  printSummarySignals('Learning structure', summary.learningStructure);
  printSummarySignals('Operational characteristics', summary.operationalCharacteristics);
}

function printSummarySignals(
  label: string,
  signals: CurriculumIntelligenceSummary['curriculumIdentity'],
) {
  printList(
    label,
    signals.map(
      (signal) =>
        `${signal.status}: ${signal.statement} (${signal.trace.length} trace(s))`,
    ),
  );
}

function printRepresentationEntities(entities: CurriculumRepresentationEntity[]) {
  printList(
    'Entities',
    entities.map(
      (entity) =>
        `${entity.entityType}: ${entity.label} [claims: ${entity.knowledgeClaimIds.join(', ')}]`,
    ),
    2,
  );
}

function printRepresentationRelationships(relationships: CurriculumRepresentationRelationship[]) {
  printList(
    'Relationships',
    relationships.map(
      (relationship) =>
        `${relationship.relationshipType}: ${relationship.fromEntityId} -> ${relationship.toEntityId}`,
    ),
    2,
  );
}

function printHumanConfirmations(confirmations: CurriculumHumanConfirmation[]) {
  printList(
    'Human confirmations',
    confirmations.map(
      (confirmation) =>
        `${confirmation.targetType} ${confirmation.targetId}: ${confirmation.confirmedValue}`,
    ),
  );
}

function printHeading(label: string) {
  console.log(`\n${label}`);
  console.log('='.repeat(label.length));
}

function printSection(label: string) {
  console.log(`\n${label}`);
  console.log('-'.repeat(label.length));
}

function printItem(label: string) {
  console.log(`\n  - ${label}`);
}

function printKeyValue(label: string, value: string | number | boolean | null, indent = 0) {
  console.log(`${' '.repeat(indent)}${label}: ${value}`);
}

function printConfidence(level: string, rationale: string, indent = 0) {
  printKeyValue('Confidence', level, indent);
  printKeyValue('Confidence rationale', rationale, indent);
}

function printEvidence(evidence: CurriculumEvidence[], indent = 0) {
  printList(
    'Evidence',
    evidence.map(
      (item) =>
        `${item.sourceTitle} | ${item.sourceLocation} | ${truncate(item.quotedText, 140)}`,
    ),
    indent,
  );
}

function printList(label: string, values: string[], indent = 0) {
  console.log(`${' '.repeat(indent)}${label}:`);

  if (values.length === 0) {
    console.log(`${' '.repeat(indent + 2)}- None`);
    return;
  }

  values.forEach((value) => {
    console.log(`${' '.repeat(indent + 2)}- ${value}`);
  });
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
