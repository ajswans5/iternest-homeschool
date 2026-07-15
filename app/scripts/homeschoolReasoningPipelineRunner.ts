import { assembleDecisionContext } from '../src/features/decision-context/decisionContextAssembly';
import type { DecisionContext } from '../src/features/decision-context/contracts';
import { buildCurriculumIntelligenceSummary } from '../src/features/curriculum-intelligence/curriculumIntelligenceSummary';
import type {
  CurriculumEvidence,
  CurriculumReasoningResult,
  CurriculumIntelligenceSummary,
} from '../src/features/curriculum-intelligence/contracts';
import { buildFamilyUnderstandingProfile } from '../src/features/family-understanding/familyUnderstandingEngine';
import { buildFamilyUnderstandingSummary } from '../src/features/family-understanding/familyUnderstandingSummary';
import type {
  FamilyUnderstandingProfile,
  FamilyUnderstandingSummary,
} from '../src/features/family-understanding/contracts';
import { buildLearnerUnderstandingProfile } from '../src/features/learner-understanding/learnerUnderstandingEngine';
import { buildLearnerUnderstandingSummary } from '../src/features/learner-understanding/learnerUnderstandingSummary';
import type {
  LearnerUnderstandingProfile,
  LearnerUnderstandingSummary,
} from '../src/features/learner-understanding/contracts';
import { buildLearningContinuityProfile } from '../src/features/learning-continuity/learningContinuityEngine';
import { buildLearningContinuitySummary } from '../src/features/learning-continuity/learningContinuitySummary';
import type {
  LearningContinuityProfile,
  LearningContinuitySummary,
} from '../src/features/learning-continuity/contracts';
import { buildParentDecisionV2FromDecisionContext } from '../src/features/parent-decision/parentDecisionV2Engine';
import type { ParentDecisionV2 } from '../src/features/parent-decision/contracts';

function main() {
  const curriculumSummary = buildCurriculumIntelligenceSummary(buildSampleCurriculumReasoningResult());
  const familyProfile = buildSampleFamilyUnderstandingProfile();
  const familySummary = buildFamilyUnderstandingSummary(familyProfile);
  const learnerProfile = buildSampleLearnerUnderstandingProfile();
  const learnerSummary = buildLearnerUnderstandingSummary(learnerProfile);
  const learningContinuityProfile = buildSampleLearningContinuityProfile();
  const learningContinuitySummary = buildLearningContinuitySummary(learningContinuityProfile);
  const decisionContext = assembleDecisionContext({
    id: 'homeschool-runner-decision-context',
    curriculum: curriculumSummary,
    family: familySummary,
    learner: learnerSummary,
    learningContinuity: learningContinuitySummary,
  });
  const parentDecision = buildParentDecisionV2FromDecisionContext(decisionContext);

  runVerificationAssertions({
    curriculumSummary,
    familySummary,
    learnerSummary,
    learningContinuitySummary,
    decisionContext,
    parentDecision,
  });

  printReport({
    curriculumSummary,
    familyProfile,
    familySummary,
    learnerProfile,
    learnerSummary,
    learningContinuityProfile,
    learningContinuitySummary,
    decisionContext,
    parentDecision,
  });
}

function runVerificationAssertions({
  curriculumSummary,
  familySummary,
  learnerSummary,
  learningContinuitySummary,
  decisionContext,
  parentDecision,
}: {
  curriculumSummary: CurriculumIntelligenceSummary;
  familySummary: FamilyUnderstandingSummary;
  learnerSummary: LearnerUnderstandingSummary;
  learningContinuitySummary: LearningContinuitySummary;
  decisionContext: DecisionContext;
  parentDecision: ParentDecisionV2;
}) {
  assertEqual(
    decisionContext.sourceSummaries.length,
    4,
    'DecisionContext should contain exactly four source summary slots.',
  );
  assertEqual(
    decisionContext.evidenceProfile.sourceSummaryCount,
    4,
    'DecisionContext evidence profile should report four source summaries.',
  );
  assertArrayEqual(
    decisionContext.sourceSummaries.map((summary) => summary.subsystem),
    [
      'curriculum-intelligence',
      'family-understanding',
      'learner-understanding',
      'learning-continuity',
    ],
    'DecisionContext should preserve the four intentional source summary labels.',
  );
  assertEqual(
    decisionContext.evidenceProfile.availableSummaryCount,
    1,
    'DecisionContext should report one available source summary.',
  );
  assertEqual(
    decisionContext.evidenceProfile.limitedSummaryCount,
    3,
    'DecisionContext should report three limited source summaries.',
  );
  assertEqual(
    decisionContext.evidenceProfile.blockedSummaryCount,
    0,
    'DecisionContext should report zero blocked source summaries.',
  );
  assertEqual(
    decisionContext.contextStatus,
    'limited',
    'DecisionContext should be limited when one implemented source summary is limited.',
  );

  const curriculumUnknownIds = new Set(curriculumSummary.unknowns.map((unknown) => unknown.id));
  const familyUnknownIds = new Set(familySummary.unknowns.map((unknown) => unknown.id));
  const learnerUnknownIds = new Set(learnerSummary.unknowns.map((unknown) => unknown.id));
  const learningContinuityUnknownIds = new Set(
    learningContinuitySummary.unknowns.map((unknown) => unknown.id),
  );
  const decisionContextCurriculumUnknownIds = new Set(
    decisionContext.unknowns
      .filter((unknown) => unknown.subsystem === 'curriculum-intelligence')
      .map((unknown) => unknown.id.replace('decision-context-unknown-', '')),
  );
  const decisionContextFamilyUnknownIds = new Set(
    decisionContext.unknowns
      .filter((unknown) => unknown.subsystem === 'family-understanding')
      .map((unknown) => unknown.id.replace('decision-context-unknown-', '')),
  );
  const decisionContextLearnerUnknownIds = new Set(
    decisionContext.unknowns
      .filter((unknown) => unknown.subsystem === 'learner-understanding')
      .map((unknown) => unknown.id.replace('decision-context-unknown-', '')),
  );
  const decisionContextLearningContinuityUnknownIds = new Set(
    decisionContext.unknowns
      .filter((unknown) => unknown.subsystem === 'learning-continuity')
      .map((unknown) => unknown.id.replace('decision-context-unknown-', '')),
  );

  assertSetEqual(
    decisionContextCurriculumUnknownIds,
    curriculumUnknownIds,
    'DecisionContext should preserve curriculum unknowns from the Curriculum Intelligence Summary.',
  );
  assertSetEqual(
    decisionContextFamilyUnknownIds,
    familyUnknownIds,
    'DecisionContext should preserve family unknowns from the Family Understanding Summary.',
  );
  assertSetEqual(
    decisionContextLearnerUnknownIds,
    learnerUnknownIds,
    'DecisionContext should preserve learner unknowns from the Learner Understanding Summary.',
  );
  assertSetEqual(
    decisionContextLearningContinuityUnknownIds,
    learningContinuityUnknownIds,
    'DecisionContext should preserve learning continuity unknowns from the Learning Continuity Summary.',
  );
  assertEqual(
    decisionContext.evidenceTraces.length,
    curriculumSummary.evidenceProfile.traceCount +
      countFamilySummaryTraces(familySummary) +
      countLearnerSummaryTraces(learnerSummary) +
      countLearningContinuitySummaryTraces(learningContinuitySummary),
    'DecisionContext should preserve all evidence traces from stable subsystem summaries.',
  );
  assert(
    decisionContext.evidenceTraces.every((trace) =>
      trace.subsystem === 'curriculum-intelligence'
        ? trace.sourceSummaryId === curriculumSummary.id
        : trace.subsystem === 'family-understanding'
          ? trace.sourceSummaryId === familySummary.id
          : trace.subsystem === 'learner-understanding'
            ? trace.sourceSummaryId === learnerSummary.id
            : trace.subsystem === 'learning-continuity'
              ? trace.sourceSummaryId === learningContinuitySummary.id
              : false,
    ),
    'Every DecisionContext evidence trace should originate from a stable subsystem summary.',
  );
  assert(
    parentDecision.attentionRequired.every((item) =>
      ['blocker', 'confirmation', 'uncertainty', 'source-summary'].includes(item.sourceType),
    ),
    'Parent Decision v2 should only produce conservative attention item source types.',
  );
  assertEqual(
    parentDecision.confirmationsRequired.length,
    decisionContext.confirmationRequirements.filter(
      (confirmation) => confirmation.requiredBeforeParentDecision,
    ).length,
    'Parent Decision v2 should preserve required confirmations from Decision Context.',
  );
  assertEqual(
    parentDecision.unresolvedUncertainty.length,
    decisionContext.unknowns.length,
    'Parent Decision v2 should preserve unresolved uncertainty from Decision Context.',
  );
  assertEqual(
    parentDecision.evidenceTraces.length,
    decisionContext.evidenceTraces.length,
    'Parent Decision v2 should preserve Decision Context evidence traces.',
  );
  assert(
    parentDecision.blockers.every((blocker) =>
      decisionContext.unknowns.some((unknown) => unknown.id === blocker.sourceUnknownId) ||
      decisionContext.sourceSummaries.some(
        (summary) =>
          summary.subsystem === blocker.subsystem &&
          summary.status === blocker.sourceSummaryStatus,
      ),
    ),
    'Parent Decision v2 blockers should originate from Decision Context unknowns or source summaries.',
  );
  assert(
    parentDecision.id === `parent-decision-v2-${decisionContext.id}`,
    'Parent Decision v2 should be derived from DecisionContext identity.',
  );
  assert(
    decisionContext.evidenceTraces.every((trace) =>
      trace.evidence.every((evidence) => evidence.sourceTitle.includes('Fixture')),
    ),
    'Pipeline runner should use fixture sources only, not live curriculum or family input.',
  );
}

function buildSampleCurriculumReasoningResult(): CurriculumReasoningResult {
  const evidence: CurriculumEvidence = {
    id: 'sample-curriculum-evidence-1',
    sourceArtifactId: 'sample-curriculum-source',
    sourceTitle: 'Sample Curriculum Summary Fixture',
    sourceLocation: 'Summary fixture',
    quotedText: 'The curriculum contains a teacher-facing lesson sequence.',
    evidenceType: 'direct-source',
  };
  const curriculumTrace = {
    id: 'trace-entity-curriculum',
    representationEntityIds: ['entity-curriculum'],
    representationRelationshipIds: [],
    knowledgeClaimIds: ['knowledge-claim-curriculum-identity'],
    knowledgeRelationshipIds: [],
    evidence: [evidence],
    confidence: {
      level: 'medium' as const,
      rationale: 'Sample fixture includes a stable curriculum identity signal.',
      evidence: [evidence],
    },
  };
  const instructionalUnitTrace = {
    id: 'trace-entity-instructional-unit',
    representationEntityIds: ['entity-unit-1'],
    representationRelationshipIds: [],
    knowledgeClaimIds: ['knowledge-claim-instruction-characteristics'],
    knowledgeRelationshipIds: [],
    evidence: [evidence],
    confidence: {
      level: 'medium' as const,
      rationale: 'Sample fixture includes a stable instructional signal.',
      evidence: [evidence],
    },
  };

  return {
    id: 'sample-curriculum-reasoning-result',
    representationId: 'sample-curriculum-representation',
    generatedAt: new Date().toISOString(),
    queryIndex: {
      entityIdsByType: {
        curriculum: ['entity-curriculum'],
        'source-section': [],
        'instructional-unit': ['entity-unit-1'],
        lesson: [],
        'activity-type': [],
        role: [],
        resource: [],
        assessment: [],
        constraint: [],
        risk: [],
        unknown: [],
      },
      relationshipIdsByType: {
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
      },
    },
    applicablePaths: [
      {
        id: 'path-entity-curriculum',
        pathType: 'entity',
        entityIds: ['entity-curriculum'],
        relationshipIds: [],
        status: 'applicable',
        explanation: 'Curriculum identity is available from the summary fixture.',
        trace: curriculumTrace,
      },
      {
        id: 'path-entity-instructional-unit',
        pathType: 'entity',
        entityIds: ['entity-unit-1'],
        relationshipIds: [],
        status: 'applicable',
        explanation: 'Instruction characteristics are available from the summary fixture.',
        trace: instructionalUnitTrace,
      },
    ],
    blockedPaths: [],
    blocks: [],
    traces: [curriculumTrace, instructionalUnitTrace],
    unknowns: [
      {
        id: 'curriculum-unknown-confirm-lesson-sequence',
        question: 'Which lesson sequence should be considered active for this family?',
        reason: 'The sample curriculum summary does not identify an active family-specific sequence.',
        relatedEvidence: [evidence],
        blocksProfileReadiness: false,
      },
    ],
    humanConfirmations: [],
  };
}

function buildSampleFamilyUnderstandingProfile(): FamilyUnderstandingProfile {
  const sourceArtifact = {
    id: 'sample-family-profile',
    sourceType: 'family-profile-form' as const,
    title: 'Sample Family Profile Fixture',
    capturedAt: new Date().toISOString(),
    limitations: ['Sample fixture for architecture verification only.'],
  };

  return buildFamilyUnderstandingProfile({
    id: 'sample-family-understanding-profile',
    sourceArtifacts: [sourceArtifact],
    observations: [
      {
        id: 'family-members-observation',
        category: 'family-identity',
        statement: 'The family profile includes one teaching parent.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Family profile fixture',
        quotedText: 'Teaching parent: Alex',
      },
      {
        id: 'student-observation',
        category: 'student-identity',
        statement: 'The family profile includes one student.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Family profile fixture',
        quotedText: 'Student: Emma',
      },
      {
        id: 'curriculum-assignment-observation',
        category: 'curriculum-assignment',
        statement: 'The student is associated with the sample curriculum.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Family profile fixture',
        quotedText: 'Emma uses Sample Curriculum.',
      },
      {
        id: 'teaching-rhythm-observation',
        category: 'teaching-rhythm',
        statement: 'The family usually teaches in the morning.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Family profile fixture',
        quotedText: 'Normal teaching rhythm: mornings.',
      },
      {
        id: 'instructional-time-observation',
        category: 'instructional-time',
        statement: 'The family usually has a two-hour teaching window.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Family profile fixture',
        quotedText: 'Typical instruction time: 9:00-11:00.',
      },
    ],
  });
}

function buildSampleLearnerUnderstandingProfile(): LearnerUnderstandingProfile {
  const sourceArtifact = {
    id: 'sample-learner-profile',
    sourceType: 'learner-profile-form' as const,
    title: 'Sample Learner Fixture',
    capturedAt: new Date().toISOString(),
    learnerId: 'learner-emma',
    limitations: ['Sample fixture for architecture verification only.'],
  };

  return buildLearnerUnderstandingProfile({
    id: 'sample-learner-understanding-profile',
    learnerId: 'learner-emma',
    sourceArtifacts: [sourceArtifact],
    observations: [
      {
        id: 'learner-independence-observation',
        category: 'independence',
        statement: 'The learner can complete short independent math practice after direct teaching.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Learner profile fixture',
        quotedText: 'Completes short independent math practice after direct teaching.',
      },
      {
        id: 'learner-direct-instruction-observation',
        category: 'direct-instruction-need',
        statement: 'The learner needs direct teaching before beginning new math concepts.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Learner profile fixture',
        quotedText: 'Needs direct teaching before new math concepts.',
      },
    ],
  });
}

function buildSampleLearningContinuityProfile(): LearningContinuityProfile {
  const sourceArtifact = {
    id: 'sample-learning-continuity-record',
    sourceType: 'lesson-progress-record' as const,
    title: 'Sample Learning Continuity Fixture',
    capturedAt: new Date().toISOString(),
    learnerId: 'learner-emma',
    curriculumId: 'sample-curriculum',
    limitations: ['Sample fixture for architecture verification only.'],
  };

  return buildLearningContinuityProfile({
    id: 'sample-learning-continuity-profile',
    learnerId: 'learner-emma',
    curriculumId: 'sample-curriculum',
    sourceArtifacts: [sourceArtifact],
    observations: [
      {
        id: 'last-completed-lesson-observation',
        category: 'last-completed-lesson',
        statement: 'The last completed lesson is Lesson 12.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Learning continuity fixture',
        quotedText: 'Last completed lesson: Lesson 12.',
      },
      {
        id: 'current-lesson-position-observation',
        category: 'current-lesson-position',
        statement: 'The current lesson position is Lesson 13.',
        sourceArtifactId: sourceArtifact.id,
        sourceLocation: 'Learning continuity fixture',
        quotedText: 'Current lesson: Lesson 13.',
      },
    ],
  });
}

function printReport({
  curriculumSummary,
  familyProfile,
  familySummary,
  learnerProfile,
  learnerSummary,
  learningContinuityProfile,
  learningContinuitySummary,
  decisionContext,
  parentDecision,
}: {
  curriculumSummary: CurriculumIntelligenceSummary;
  familyProfile: FamilyUnderstandingProfile;
  familySummary: FamilyUnderstandingSummary;
  learnerProfile: LearnerUnderstandingProfile;
  learnerSummary: LearnerUnderstandingSummary;
  learningContinuityProfile: LearningContinuityProfile;
  learningContinuitySummary: LearningContinuitySummary;
  decisionContext: DecisionContext;
  parentDecision: ParentDecisionV2;
}) {
  printHeading('IterNest Homeschool Reasoning Pipeline');
  printKeyValue('Verification assertions', 'passed');
  printCurriculumSummary(curriculumSummary);
  printFamilySummary(familyProfile, familySummary);
  printLearnerSummary(learnerProfile, learnerSummary);
  printLearningContinuitySummary(learningContinuityProfile, learningContinuitySummary);
  printDecisionContext(decisionContext);
  printParentDecision(parentDecision);
}

function printCurriculumSummary(summary: CurriculumIntelligenceSummary) {
  printSection('1. Curriculum Intelligence Summary');
  printKeyValue('Status', summary.summaryStatus);
  printKeyValue('Evidence traces', summary.evidenceProfile.traceCount);
  printKeyValue('Evidence items', summary.evidenceProfile.evidenceCount);
  printList('Unknowns', summary.unknowns.map((unknown) => `${unknown.question} | ${unknown.reason}`));
  printList(
    'Confirmation requirements',
    summary.humanConfirmations.map(
      (confirmation) => `${confirmation.targetType} ${confirmation.targetId}`,
    ),
  );
  printSignals('Curriculum identity', summary.curriculumIdentity);
  printSignals('Instruction characteristics', summary.instructionCharacteristics);
  printSignals('Resource ecosystem', summary.resourceEcosystem);
  printSignals('Learning structure', summary.learningStructure);
  printSignals('Operational characteristics', summary.operationalCharacteristics);
}

function printFamilySummary(
  profile: FamilyUnderstandingProfile,
  summary: FamilyUnderstandingSummary,
) {
  printSection('2. Family Understanding Summary');
  printKeyValue('Profile stage', profile.lifecycleStage);
  printKeyValue('Status', summary.summaryStatus);
  printKeyValue('Observed facts', summary.evidenceProfile.observedFactCount);
  printKeyValue('Evidence items', summary.evidenceProfile.evidenceCount);
  printList('Unknowns', summary.unknowns.map((unknown) => `${unknown.question} | ${unknown.reason}`));
  printList(
    'Confirmation requirements',
    summary.humanConfirmations.map(
      (confirmation) => `${confirmation.targetType} ${confirmation.targetId}`,
    ),
  );
  printSignals('Family members', summary.familyMembers);
  printSignals('Students', summary.students);
  printSignals('Curriculum assignments', summary.curriculumAssignments);
  printSignals('Teaching rhythm', summary.teachingRhythm);
  printSignals('Recurring commitments', summary.recurringCommitments);
  printSignals('Instructional time', summary.instructionalTime);
  printSignals('Constraints', summary.constraints);
}

function countFamilySummaryTraces(summary: FamilyUnderstandingSummary) {
  return [
    ...summary.familyMembers,
    ...summary.students,
    ...summary.curriculumAssignments,
    ...summary.teachingRhythm,
    ...summary.recurringCommitments,
    ...summary.instructionalTime,
    ...summary.constraints,
  ].reduce((count, signal) => count + signal.trace.length, 0);
}

function printLearnerSummary(
  profile: LearnerUnderstandingProfile,
  summary: LearnerUnderstandingSummary,
) {
  printSection('3. Learner Understanding Summary');
  printKeyValue('Profile stage', profile.lifecycleStage);
  printKeyValue('Status', summary.summaryStatus);
  printKeyValue('Learner ID', summary.learnerId);
  printKeyValue('Observed facts', summary.evidenceProfile.observedFactCount);
  printKeyValue('Evidence items', summary.evidenceProfile.evidenceCount);
  printList('Unknowns', summary.unknowns.map((unknown) => `${unknown.question} | ${unknown.reason}`));
  printList(
    'Confirmation requirements',
    summary.humanConfirmations.map(
      (confirmation) => `${confirmation.targetType} ${confirmation.targetId}`,
    ),
  );
  printSignals('Learner identity', summary.learnerIdentity);
  printSignals('Independence', summary.independence);
  printSignals('Direct instruction needs', summary.directInstructionNeeds);
  printSignals('Observable work habits', summary.observableWorkHabits);
  printSignals('Parent-confirmed strengths', summary.parentConfirmedStrengths);
  printSignals('Parent-confirmed support needs', summary.parentConfirmedSupportNeeds);
  printSignals('Accommodations', summary.accommodations);
  printSignals('Recurring learner behaviors', summary.recurringLearnerBehaviors);
  printSignals('Writing stamina', summary.writingStamina);
  printSignals('Reading independence', summary.readingIndependence);
}

function countLearnerSummaryTraces(summary: LearnerUnderstandingSummary) {
  return [
    ...summary.learnerIdentity,
    ...summary.independence,
    ...summary.directInstructionNeeds,
    ...summary.observableWorkHabits,
    ...summary.parentConfirmedStrengths,
    ...summary.parentConfirmedSupportNeeds,
    ...summary.accommodations,
    ...summary.recurringLearnerBehaviors,
    ...summary.writingStamina,
    ...summary.readingIndependence,
  ].reduce((count, signal) => count + signal.trace.length, 0);
}

function printLearningContinuitySummary(
  profile: LearningContinuityProfile,
  summary: LearningContinuitySummary,
) {
  printSection('4. Learning Continuity Summary');
  printKeyValue('Profile stage', profile.lifecycleStage);
  printKeyValue('Status', summary.summaryStatus);
  printKeyValue('Learner ID', summary.learnerId ?? 'None');
  printKeyValue('Curriculum ID', summary.curriculumId ?? 'None');
  printKeyValue('Observed facts', summary.evidenceProfile.observedFactCount);
  printKeyValue('Evidence items', summary.evidenceProfile.evidenceCount);
  printList('Unknowns', summary.unknowns.map((unknown) => `${unknown.question} | ${unknown.reason}`));
  printList(
    'Confirmation requirements',
    summary.humanConfirmations.map(
      (confirmation) => `${confirmation.targetType} ${confirmation.targetId}`,
    ),
  );
  printSignals('Current lesson position', summary.currentLessonPosition);
  printSignals('Completed work', summary.completedWork);
  printSignals('Partially completed work', summary.partiallyCompletedWork);
  printSignals('Interrupted work', summary.interruptedWork);
  printSignals('Postponed lessons', summary.postponedLessons);
  printSignals('Skipped lessons', summary.skippedLessons);
  printSignals('Resumable work', summary.resumableWork);
  printSignals('Last completed lessons', summary.lastCompletedLessons);
  printSignals('Unfinished assessments', summary.unfinishedAssessments);
  printSignals('Accumulated delays', summary.accumulatedDelays);
  printSignals('Carry-over work', summary.carryOverWork);
}

function countLearningContinuitySummaryTraces(summary: LearningContinuitySummary) {
  return [
    ...summary.currentLessonPosition,
    ...summary.completedWork,
    ...summary.partiallyCompletedWork,
    ...summary.interruptedWork,
    ...summary.postponedLessons,
    ...summary.skippedLessons,
    ...summary.resumableWork,
    ...summary.lastCompletedLessons,
    ...summary.unfinishedAssessments,
    ...summary.accumulatedDelays,
    ...summary.carryOverWork,
  ].reduce((count, signal) => count + signal.trace.length, 0);
}

function printDecisionContext(context: DecisionContext) {
  printSection('5. Decision Context');
  printKeyValue('Status', context.contextStatus);
  printKeyValue('Source summaries', context.evidenceProfile.sourceSummaryCount);
  printKeyValue('Available summaries', context.evidenceProfile.availableSummaryCount);
  printKeyValue('Limited summaries', context.evidenceProfile.limitedSummaryCount);
  printKeyValue('Blocked summaries', context.evidenceProfile.blockedSummaryCount);
  printKeyValue('Evidence traces', context.evidenceTraces.length);
  printList(
    'Subsystem statuses',
    context.sourceSummaries.map((summary) => `${summary.subsystem}: ${summary.status}`),
  );
  printList('Unknowns', context.unknowns.map((unknown) => `${unknown.subsystem}: ${unknown.question}`));
  printList(
    'Confirmation requirements',
    context.confirmationRequirements.map(
      (confirmation) => `${confirmation.subsystem}: ${confirmation.prompt}`,
    ),
  );
}

function printParentDecision(decision: ParentDecisionV2) {
  printSection('6. Parent Decision Output');
  printKeyValue('Contract version', decision.contractVersion);
  printKeyValue('Readiness', decision.readiness.status);
  printKeyValue('Readiness rationale', decision.readiness.rationale);
  printKeyValue('Confidence', decision.confidence.level);
  printKeyValue('Confidence rationale', decision.confidence.rationale);
  printKeyValue('Evidence traces', decision.evidenceTraces.length);
  printList(
    'Attention required',
    decision.attentionRequired.map(
      (item) => `${item.sourceType}: ${item.subsystem}: ${item.label}`,
    ),
  );
  printList(
    'Confirmations required',
    decision.confirmationsRequired.map(
      (confirmation) => `${confirmation.subsystem}: ${confirmation.prompt}`,
    ),
  );
  printList(
    'Blockers',
    decision.blockers.map((blocker) => `${blocker.subsystem}: ${blocker.label}`),
  );
  printList(
    'Unresolved uncertainty',
    decision.unresolvedUncertainty.map(
      (uncertainty) => `${uncertainty.subsystem}: ${uncertainty.question}`,
    ),
  );
  printList(
    'Deferred items',
    decision.deferredItems.map((item) => `${item.subsystem}: ${item.reason}`),
  );
}

function printSignals(
  label: string,
  signals: Array<{ status: string; statement: string; trace: unknown[] }>,
) {
  printList(
    label,
    signals.map((signal) => `${signal.status}: ${signal.statement} (${signal.trace.length} trace(s))`),
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

function printKeyValue(label: string, value: string | number | boolean) {
  console.log(`${label}: ${value}`);
}

function printList(label: string, values: string[]) {
  console.log(`${label}:`);

  if (values.length === 0) {
    console.log('  - None');
    return;
  }

  values.forEach((value) => {
    console.log(`  - ${value}`);
  });
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Verification failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Verification failed: ${message} Expected ${String(expected)}, received ${String(actual)}.`,
    );
  }
}

function assertArrayEqual(actual: string[], expected: string[], message: string) {
  assertEqual(actual.length, expected.length, message);

  expected.forEach((value, index) => {
    assertEqual(actual[index], value, `${message} Mismatch at index ${index}.`);
  });
}

function assertSetEqual(actual: Set<string>, expected: Set<string>, message: string) {
  assertEqual(actual.size, expected.size, message);

  expected.forEach((value) => {
    assert(actual.has(value), `${message} Missing value: ${value}.`);
  });
}

main();
