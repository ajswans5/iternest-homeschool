import type {
  CurriculumConfidence,
  CurriculumEvidence,
  CurriculumObservedFact,
  CurriculumSourceArtifact,
  CurriculumUnderstandingHypothesis,
  CurriculumUnderstandingClaim,
  CurriculumUnderstandingProfile,
  CurriculumUnknown,
} from './contracts';
import { addCompetingHypothesis, createProposedHypothesis } from './hypothesisPipeline';
import { testCurriculumHypotheses } from './patternTesting';

const identityFilenamePatterns = [
  { pattern: /\bteacher(?:'s)?\s+(?:manual|guide|book)\b/i, label: 'teacher guide or manual' },
  { pattern: /\bstudent\s+(?:book|workbook|text|manual)\b/i, label: 'student book or workbook' },
  { pattern: /\banswer\s+key\b/i, label: 'answer key' },
  { pattern: /\btest(?:s|ing)?\b|\bassessment(?:s)?\b/i, label: 'assessment or test document' },
  { pattern: /\bcurriculum\b|\bprogram\b/i, label: 'curriculum document' },
];

const observableRolePatterns = [
  { role: 'teacher', pattern: /\bteacher(?:'s)?\b/i },
  { role: 'student', pattern: /\bstudent(?:'s|s)?\b/i },
  { role: 'parent', pattern: /\bparent(?:'s|s)?\b/i },
  { role: 'instructor', pattern: /\binstructor(?:'s|s)?\b/i },
  { role: 'discussion leader', pattern: /\bdiscussion\s+leader\b/i },
  { role: 'grader', pattern: /\bgrader(?:'s|s)?\b/i },
  { role: 'reader', pattern: /\breader(?:'s|s)?\b/i },
  { role: 'narrator', pattern: /\bnarrator(?:'s|s)?\b/i },
];

const observableActivityPatterns = [
  { activity: 'read', pattern: /\bread(?:s|ing)?\b/i },
  { activity: 'write', pattern: /\bwrite(?:s|ing)?\b|\bwritten\b/i },
  { activity: 'discuss', pattern: /\bdiscuss(?:es|ing|ion)?\b/i },
  { activity: 'review', pattern: /\breview(?:s|ing)?\b/i },
  { activity: 'practice', pattern: /\bpractice(?:s|ing)?\b/i },
  { activity: 'memorize', pattern: /\bmemorize(?:s|d|ing)?\b|\bmemory\b/i },
  { activity: 'recite', pattern: /\brecite(?:s|d|ing)?\b|\brecitation\b/i },
  { activity: 'copy', pattern: /\bcopy(?:ies|ing)?\b/i },
  { activity: 'complete', pattern: /\bcomplete(?:s|d|ing)?\b/i },
  { activity: 'answer', pattern: /\banswer(?:s|ed|ing)?\b/i },
  { activity: 'observe', pattern: /\bobserve(?:s|d|ing)?\b|\bobservation\b/i },
  { activity: 'experiment', pattern: /\bexperiment(?:s|ing)?\b/i },
  { activity: 'quiz', pattern: /\bquiz(?:zes)?\b/i },
  { activity: 'test', pattern: /\btest(?:s|ing)?\b/i },
  { activity: 'present', pattern: /\bpresent(?:s|ed|ing|ation)?\b/i },
];

export function buildCurriculumUnderstandingProfile(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingProfile {
  const identityClaims = buildIdentityClaims(sourceArtifact);
  const structureClaims = buildStructureClaims(sourceArtifact);
  const roleClaims = buildRoleClaims(sourceArtifact);
  const activityClaims = buildActivityClaims(sourceArtifact);
  const observedFacts = buildObservedFacts([
    ...identityClaims,
    ...structureClaims,
    ...roleClaims,
    ...activityClaims,
  ]);
  const hypotheses = buildArtifactTypeHypotheses(observedFacts);
  const patternTesting = testCurriculumHypotheses({
    sourceArtifact,
    observedFacts,
    hypotheses,
  });
  const unknowns = [
    ...buildIdentityUnknowns(sourceArtifact, identityClaims),
    ...buildRoleUnknowns(sourceArtifact, roleClaims),
    ...buildActivityUnknowns(sourceArtifact, activityClaims),
  ];

  return {
    id: `understanding-profile-${sourceArtifact.id}`,
    sourceArtifactIds: [sourceArtifact.id],
    generatedAt: new Date().toISOString(),
    lifecycleStage: 'pattern-testing',
    identity: identityClaims,
    philosophy: [],
    structure: structureClaims,
    roles: roleClaims,
    activities: activityClaims,
    dependencies: [],
    expectations: [],
    constraints: [],
    risks: [],
    observedFacts,
    hypotheses: patternTesting.updatedHypotheses,
    validatedFindings: patternTesting.validatedFindings,
    unknowns,
    profileReadiness: {
      readyForKnowledgeModel: false,
      confidence: {
        level: 'requires-human-confirmation',
        rationale:
          'Artifact orientation, surface structure mapping, role detection, and activity taxonomy discovery have run. Later understanding stages are intentionally incomplete.',
        evidence: [...identityClaims, ...structureClaims, ...roleClaims, ...activityClaims].flatMap(
          (claim) => claim.confidence.evidence,
        ),
      },
      blockingUnknownIds: unknowns
        .filter((unknown) => unknown.blocksProfileReadiness)
        .map((unknown) => unknown.id),
    },
  };
}

function buildRoleClaims(sourceArtifact: CurriculumSourceArtifact): CurriculumUnderstandingClaim[] {
  return [
    ...buildExplicitRoleLabelClaims(sourceArtifact),
    ...buildDirectedImperativeRoleClaims(sourceArtifact),
    ...buildRepeatedRolePatternClaims(sourceArtifact),
  ];
}

function buildActivityClaims(sourceArtifact: CurriculumSourceArtifact): CurriculumUnderstandingClaim[] {
  return [
    ...buildExplicitActivityLanguageClaims(sourceArtifact),
    ...buildRepeatedActivityPatternClaims(sourceArtifact),
  ];
}

function buildObservedFacts(claims: CurriculumUnderstandingClaim[]): CurriculumObservedFact[] {
  return claims
    .filter((claim) => claim.interpretationType === 'observed-fact')
    .map((claim) => ({
      id: `observed-fact-${claim.id}`,
      category: claim.category,
      fact: claim.claim,
      sourceArtifactIds: Array.from(
        new Set(claim.confidence.evidence.map((evidence) => evidence.sourceArtifactId)),
      ),
      evidence: claim.confidence.evidence,
      confidence: claim.confidence,
    }));
}

function buildArtifactTypeHypotheses(
  observedFacts: CurriculumObservedFact[],
): CurriculumUnderstandingHypothesis[] {
  const candidates = [
    artifactTypeCandidate({
      typeLabel: 'teacher guide',
      matchers: [/\bteacher(?:'s)?\b/i, /\bteacher guide\b/i, /\bteacher manual\b/i],
      testsNeeded: [
        'Check whether the artifact repeatedly labels itself as teacher-facing.',
        'Check whether later evidence distinguishes this from a mixed-use manual.',
      ],
    }),
    artifactTypeCandidate({
      typeLabel: 'student workbook',
      matchers: [/\bstudent(?:'s|s)?\b/i, /\bworkbook\b/i, /\bstudent book\b/i],
      testsNeeded: [
        'Check whether the artifact repeatedly labels itself as student-facing.',
        'Check whether later evidence distinguishes this from a teacher guide containing student pages.',
      ],
    }),
    artifactTypeCandidate({
      typeLabel: 'lesson-plan manual',
      matchers: [/\blesson plan(?:s)?\b/i, /\bdaily plan(?:s)?\b/i, /\bweekly plan(?:s)?\b/i],
      testsNeeded: [
        'Check whether plan-like structural labels recur across the artifact.',
        'Check whether later evidence distinguishes this from a table of contents or isolated planning excerpt.',
      ],
    }),
    artifactTypeCandidate({
      typeLabel: 'assessment book',
      matchers: [/\bassessment(?:s)?\b/i, /\btest(?:s|ing)?\b/i, /\bquiz(?:zes)?\b/i],
      testsNeeded: [
        'Check whether assessment-like labels recur across the artifact.',
        'Check whether later evidence distinguishes this from occasional assessment references.',
      ],
    }),
    artifactTypeCandidate({
      typeLabel: 'orchestration manual',
      matchers: [/\bsyllabus\b/i, /\bmanual\b/i, /\bguide\b/i, /\boverview\b/i],
      testsNeeded: [
        'Check whether the artifact contains repeated organizing or sequencing markers.',
        'Check whether later evidence distinguishes this from a single isolated organizer page.',
      ],
    }),
    artifactTypeCandidate({
      typeLabel: 'curriculum bundle component',
      matchers: [/\bcomponent\b/i, /\bpart\b/i, /\bvolume\b/i, /\bbook\b/i, /\bguide\b/i],
      testsNeeded: [
        'Check whether the artifact identifies itself as one part of a larger curriculum set.',
        'Check whether companion artifacts are referenced by name.',
      ],
    }),
  ];

  const hypotheses = candidates.flatMap((candidate) => {
    const supportingFacts = observedFacts.filter((fact) =>
      candidate.matchers.some((matcher) => factMatches(fact, matcher)),
    );

    if (supportingFacts.length === 0) {
      return [];
    }

    const confidence = buildArtifactTypeConfidence(candidate.typeLabel, supportingFacts);

    return [
      createProposedHypothesis({
        category: 'identity',
        hypothesisType: 'artifact-type',
        claim: `This artifact may be a ${candidate.typeLabel}.`,
        originatingObservedFactIds: supportingFacts.map((fact) => fact.id),
        supportingEvidence: uniqueEvidence(supportingFacts.flatMap((fact) => fact.evidence)),
        limitingEvidence: [],
        competingHypothesisIds: [],
        testsNeeded: candidate.testsNeeded,
        humanConfirmationNeeded: confidence.level !== 'medium',
        confidence,
      }),
    ];
  });

  return linkCompetingArtifactTypeHypotheses(hypotheses);
}

function artifactTypeCandidate({
  typeLabel,
  matchers,
  testsNeeded,
}: {
  typeLabel: string;
  matchers: RegExp[];
  testsNeeded: string[];
}) {
  return { typeLabel, matchers, testsNeeded };
}

function linkCompetingArtifactTypeHypotheses(
  hypotheses: CurriculumUnderstandingHypothesis[],
) {
  return hypotheses.map((hypothesis) =>
    hypotheses
      .filter((candidate) => candidate.id !== hypothesis.id)
      .reduce(
        (currentHypothesis, competingHypothesis) =>
          addCompetingHypothesis(currentHypothesis, competingHypothesis.id),
        hypothesis,
      ),
  );
}

function buildArtifactTypeConfidence(
  typeLabel: string,
  supportingFacts: CurriculumObservedFact[],
): CurriculumConfidence {
  const uniqueEvidenceItems = uniqueEvidence(supportingFacts.flatMap((fact) => fact.evidence));
  const hasMultipleFacts = supportingFacts.length > 1;
  const hasMultipleEvidenceLocations =
    new Set(uniqueEvidenceItems.map((evidence) => evidence.sourceLocation)).size > 1;

  return {
    level: hasMultipleFacts && hasMultipleEvidenceLocations ? 'medium' : 'low',
    rationale: hasMultipleFacts && hasMultipleEvidenceLocations
      ? `Multiple observed facts support the provisional ${typeLabel} artifact-type hypothesis.`
      : `Only limited observed evidence supports the provisional ${typeLabel} artifact-type hypothesis.`,
    evidence: uniqueEvidenceItems,
  };
}

function factMatches(fact: CurriculumObservedFact, matcher: RegExp) {
  return (
    matcher.test(fact.fact) ||
    fact.evidence.some((evidence) => matcher.test(evidence.quotedText))
  );
}

function uniqueEvidence(evidenceItems: CurriculumEvidence[]) {
  return Array.from(
    new Map(evidenceItems.map((evidence) => [evidence.id, evidence])).values(),
  );
}

function buildStructureClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return [
    ...buildPhysicalBoundaryClaims(sourceArtifact),
    ...buildObservedPatternClaims(sourceArtifact),
    ...buildRepeatedPageLayoutClaims(sourceArtifact),
    ...buildTextMarkerStructureClaims(sourceArtifact),
  ];
}

function buildPhysicalBoundaryClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return sourceArtifact.pages.map((page) =>
    observedStructureClaim({
      id: `structure-page-boundary-${page.pageNumber}`,
      claim: `Page ${page.pageNumber} is an observed physical boundary with ${page.lineCount} line(s) and ${page.characterCount} character(s).`,
      evidence: [
        metadataEvidence({
          sourceArtifact,
          id: `evidence-page-boundary-${page.pageNumber}`,
          sourceLocation: `Page ${page.pageNumber}`,
          quotedText: page.rawContentRef,
        }),
      ],
    }),
  );
}

function buildObservedPatternClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return sourceArtifact.observableStructuralPatterns.map((pattern) =>
    observedStructureClaim({
      id: `structure-${pattern.id}`,
      claim: `${pattern.description} Pattern type: ${pattern.patternType}.`,
      evidence: patternEvidence(sourceArtifact, pattern),
    }),
  );
}

function buildRepeatedPageLayoutClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  const layoutGroups = new Map<number, number[]>();

  sourceArtifact.physicalStructure.pageSummaries.forEach((summary) => {
    const bucket = Math.round(summary.lineCount / 5) * 5;
    const existing = layoutGroups.get(bucket) ?? [];
    existing.push(summary.pageNumber);
    layoutGroups.set(bucket, existing);
  });

  return Array.from(layoutGroups.entries())
    .filter(([, pageNumbers]) => pageNumbers.length > 1)
    .map(([lineCountBucket, pageNumbers]) =>
      interpretedStructureClaim({
        id: `structure-repeated-page-layout-${lineCountBucket}`,
        claim: `Multiple pages have a similar observed line-count range near ${lineCountBucket} lines: pages ${pageNumbers.join(', ')}.`,
        confidenceLevel: 'low',
        rationale:
          'This is a structural interpretation based only on similar page line counts. It does not identify the meaning of the repeated layout.',
        evidence: pageNumbers.map((pageNumber) =>
          metadataEvidence({
            sourceArtifact,
            id: `evidence-repeated-layout-page-${pageNumber}`,
            sourceLocation: `Page ${pageNumber}`,
            quotedText: `Observed line count near ${lineCountBucket}`,
          }),
        ),
      }),
    );
}

function buildTextMarkerStructureClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  const claims: CurriculumUnderstandingClaim[] = [];

  const tableOfContentsLine = findObservedLine(sourceArtifact, /\b(table of contents|contents)\b/i);
  const appendixLine = findObservedLine(sourceArtifact, /\bappendix|appendices\b/i);
  const tableLikeLine = findObservedLine(sourceArtifact, /\|.*\||\b[A-Za-z]+\s{2,}[A-Za-z]+\b/);

  if (tableOfContentsLine) {
    claims.push(
      interpretedStructureClaim({
        id: 'structure-table-of-contents-marker',
        claim: 'A table-of-contents marker appears in the observed text.',
        confidenceLevel: 'medium',
        rationale:
          'The claim is based on directly observed marker text. It identifies a structural marker, not the meaning of the curriculum content.',
        evidence: [lineEvidence(sourceArtifact, tableOfContentsLine)],
      }),
    );
  }

  if (appendixLine) {
    claims.push(
      interpretedStructureClaim({
        id: 'structure-appendix-marker',
        claim: 'An appendix marker appears in the observed text.',
        confidenceLevel: 'medium',
        rationale:
          'The claim is based on directly observed marker text. It identifies a structural marker only.',
        evidence: [lineEvidence(sourceArtifact, appendixLine)],
      }),
    );
  }

  if (tableLikeLine) {
    claims.push(
      interpretedStructureClaim({
        id: 'structure-table-like-layout',
        claim: 'A table-like text layout appears in the observed text.',
        confidenceLevel: 'low',
        rationale:
          'The claim is based on visible separator or spacing patterns. It does not interpret the table contents.',
        evidence: [lineEvidence(sourceArtifact, tableLikeLine)],
      }),
    );
  }

  return claims;
}

function buildIdentityClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  const metadataEvidence = buildMetadataEvidence(sourceArtifact);
  const claims: CurriculumUnderstandingClaim[] = [
    observedIdentityClaim({
      id: 'identity-file-name',
      claim: `Artifact file name is "${sourceArtifact.fileName}".`,
      evidence: [metadataEvidence.fileName],
    }),
    observedIdentityClaim({
      id: 'identity-file-type',
      claim: `Artifact file type is "${sourceArtifact.fileType}".`,
      evidence: [metadataEvidence.fileType],
    }),
    observedIdentityClaim({
      id: 'identity-file-size',
      claim: `Artifact file size is ${sourceArtifact.fileSizeBytes} bytes.`,
      evidence: [metadataEvidence.fileSize],
    }),
    observedIdentityClaim({
      id: 'identity-text-availability',
      claim: buildTextAvailabilityClaim(sourceArtifact),
      evidence: [metadataEvidence.textAvailability],
    }),
    observedIdentityClaim({
      id: 'identity-physical-format',
      claim: buildPhysicalFormatClaim(sourceArtifact),
      evidence: [metadataEvidence.fileType],
    }),
  ];

  if (sourceArtifact.pageCount !== null) {
    claims.push(
      observedIdentityClaim({
        id: 'identity-page-count',
        claim: `Artifact contains ${sourceArtifact.pageCount} page(s).`,
        evidence: [metadataEvidence.pageCount],
      }),
    );
  }

  const visibleTitleCandidate = findVisibleIdentityText(sourceArtifact);

  if (visibleTitleCandidate) {
    claims.push(
      interpretedIdentityClaim({
        id: 'identity-visible-title-candidate',
        claim: `The first visible identity text candidate is "${visibleTitleCandidate.text}".`,
        confidenceLevel: 'low',
        rationale:
          'This line appears near the beginning of the artifact and may be identifying text, but artifact orientation cannot confirm its meaning.',
        evidence: [lineEvidence(sourceArtifact, visibleTitleCandidate)],
      }),
    );
  }

  const filenameObjectType = detectObjectTypeFromFileName(sourceArtifact);

  if (filenameObjectType) {
    claims.push(
      interpretedIdentityClaim({
        id: 'identity-curriculum-object-type',
        claim: `The file name suggests this may be a ${filenameObjectType.label}.`,
        confidenceLevel: 'low',
        rationale:
          'The object type is based only on observable file-name text. It requires later validation before becoming durable curriculum understanding.',
        evidence: [metadataEvidence.fileName],
      }),
    );
  }

  return claims;
}

function buildIdentityUnknowns(
  sourceArtifact: CurriculumSourceArtifact,
  identityClaims: CurriculumUnderstandingClaim[],
): CurriculumUnknown[] {
  const unknowns: CurriculumUnknown[] = [];

  if (!identityClaims.some((claim) => claim.id === 'identity-curriculum-object-type')) {
    unknowns.push({
      id: 'unknown-curriculum-object-type',
      question: 'What type of curriculum object is this artifact?',
      reason:
        'Artifact orientation did not observe enough identity evidence to classify the curriculum object type without guessing.',
      relatedEvidence: [buildMetadataEvidence(sourceArtifact).fileName],
      blocksProfileReadiness: true,
    });
  }

  if (sourceArtifact.extractionStatus === 'ocr-required') {
    unknowns.push({
      id: 'unknown-readable-text',
      question: 'Does this artifact require OCR before curriculum understanding can continue?',
      reason:
        'The Source Artifact did not observe enough selectable text to continue trustworthy understanding from text content.',
      relatedEvidence: [buildMetadataEvidence(sourceArtifact).textAvailability],
      blocksProfileReadiness: true,
    });
  }

  return unknowns;
}

function buildRoleUnknowns(
  sourceArtifact: CurriculumSourceArtifact,
  roleClaims: CurriculumUnderstandingClaim[],
): CurriculumUnknown[] {
  if (roleClaims.length > 0 || sourceArtifact.extractionStatus !== 'readable-text') {
    return [];
  }

  return [
    {
      id: 'unknown-observable-roles',
      question: 'Which participant roles are explicitly present in this artifact?',
      reason:
        'Role detection did not observe explicit role labels or directed participant language in the readable source text.',
      relatedEvidence: [buildMetadataEvidence(sourceArtifact).textAvailability],
      blocksProfileReadiness: false,
    },
  ];
}

function buildActivityUnknowns(
  sourceArtifact: CurriculumSourceArtifact,
  activityClaims: CurriculumUnderstandingClaim[],
): CurriculumUnknown[] {
  if (activityClaims.length > 0 || sourceArtifact.extractionStatus !== 'readable-text') {
    return [];
  }

  return [
    {
      id: 'unknown-observable-activities',
      question: 'Which educational actions are explicitly present in this artifact?',
      reason:
        'Activity taxonomy discovery did not observe explicit educational action language in the readable source text.',
      relatedEvidence: [buildMetadataEvidence(sourceArtifact).textAvailability],
      blocksProfileReadiness: false,
    },
  ];
}

function observedIdentityClaim({
  id,
  claim,
  evidence,
}: {
  id: string;
  claim: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'identity',
    claim,
    interpretationType: 'observed-fact',
    confidence: {
      level: 'high',
      rationale: 'This identity claim comes directly from the Curriculum Source Artifact.',
      evidence,
    },
  };
}

function observedStructureClaim({
  id,
  claim,
  evidence,
}: {
  id: string;
  claim: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'structure',
    claim,
    interpretationType: 'observed-fact',
    confidence: {
      level: 'high',
      rationale: 'This structure claim comes directly from observable Source Artifact structure.',
      evidence,
    },
  };
}

function observedRoleClaim({
  id,
  claim,
  evidence,
}: {
  id: string;
  claim: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'roles',
    claim,
    interpretationType: 'observed-fact',
    confidence: {
      level: 'high',
      rationale: 'This role claim is based on explicit participant wording observed in the source artifact.',
      evidence,
    },
  };
}

function interpretedIdentityClaim({
  id,
  claim,
  confidenceLevel,
  rationale,
  evidence,
}: {
  id: string;
  claim: string;
  confidenceLevel: CurriculumConfidence['level'];
  rationale: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'identity',
    claim,
    interpretationType: 'evidence-backed-interpretation',
    confidence: {
      level: confidenceLevel,
      rationale,
      evidence,
    },
  };
}

function interpretedStructureClaim({
  id,
  claim,
  confidenceLevel,
  rationale,
  evidence,
}: {
  id: string;
  claim: string;
  confidenceLevel: CurriculumConfidence['level'];
  rationale: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'structure',
    claim,
    interpretationType: 'evidence-backed-interpretation',
    confidence: {
      level: confidenceLevel,
      rationale,
      evidence,
    },
  };
}

function interpretedRoleClaim({
  id,
  claim,
  confidenceLevel,
  rationale,
  evidence,
}: {
  id: string;
  claim: string;
  confidenceLevel: CurriculumConfidence['level'];
  rationale: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'roles',
    claim,
    interpretationType: 'evidence-backed-interpretation',
    confidence: {
      level: confidenceLevel,
      rationale,
      evidence,
    },
  };
}

function observedActivityClaim({
  id,
  claim,
  evidence,
}: {
  id: string;
  claim: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'activities',
    claim,
    interpretationType: 'observed-fact',
    confidence: {
      level: 'high',
      rationale: 'This activity claim is based on explicit action wording observed in the source artifact.',
      evidence,
    },
  };
}

function interpretedActivityClaim({
  id,
  claim,
  confidenceLevel,
  rationale,
  evidence,
}: {
  id: string;
  claim: string;
  confidenceLevel: CurriculumConfidence['level'];
  rationale: string;
  evidence: CurriculumEvidence[];
}): CurriculumUnderstandingClaim {
  return {
    id,
    category: 'activities',
    claim,
    interpretationType: 'evidence-backed-interpretation',
    confidence: {
      level: confidenceLevel,
      rationale,
      evidence,
    },
  };
}

function buildMetadataEvidence(sourceArtifact: CurriculumSourceArtifact) {
  return {
    fileName: metadataEvidence({
      sourceArtifact,
      id: 'evidence-file-name',
      sourceLocation: 'File metadata: name',
      quotedText: sourceArtifact.fileName,
    }),
    fileType: metadataEvidence({
      sourceArtifact,
      id: 'evidence-file-type',
      sourceLocation: 'File metadata: MIME type',
      quotedText: sourceArtifact.fileType,
    }),
    fileSize: metadataEvidence({
      sourceArtifact,
      id: 'evidence-file-size',
      sourceLocation: 'File metadata: size',
      quotedText: `${sourceArtifact.fileSizeBytes} bytes`,
    }),
    pageCount: metadataEvidence({
      sourceArtifact,
      id: 'evidence-page-count',
      sourceLocation: 'Observed physical structure: page count',
      quotedText:
        sourceArtifact.pageCount === null ? 'No page count observed' : `${sourceArtifact.pageCount} page(s)`,
    }),
    textAvailability: metadataEvidence({
      sourceArtifact,
      id: 'evidence-text-availability',
      sourceLocation: 'Observed extraction status',
      quotedText: sourceArtifact.extractionStatus,
    }),
  };
}

function metadataEvidence({
  sourceArtifact,
  id,
  sourceLocation,
  quotedText,
}: {
  sourceArtifact: CurriculumSourceArtifact;
  id: string;
  sourceLocation: string;
  quotedText: string;
}): CurriculumEvidence {
  return {
    id: `${sourceArtifact.id}-${id}`,
    sourceArtifactId: sourceArtifact.id,
    sourceTitle: sourceArtifact.fileName,
    sourceLocation,
    quotedText,
    evidenceType: 'direct-source',
  };
}

function lineEvidence(
  sourceArtifact: CurriculumSourceArtifact,
  line: CurriculumSourceArtifact['observedLines'][number],
): CurriculumEvidence {
  return {
    id: `${line.id}-identity-evidence`,
    sourceArtifactId: sourceArtifact.id,
    sourceTitle: sourceArtifact.fileName,
    sourceLocation: line.sourceLocation,
    quotedText: line.text,
    evidenceType: 'direct-source',
  };
}

function patternEvidence(
  sourceArtifact: CurriculumSourceArtifact,
  pattern: CurriculumSourceArtifact['observableStructuralPatterns'][number],
): CurriculumEvidence[] {
  if (pattern.evidenceText.length === 0) {
    return [
      metadataEvidence({
        sourceArtifact,
        id: `evidence-${pattern.id}`,
        sourceLocation: pattern.sourceLocations.join('; '),
        quotedText: pattern.description,
      }),
    ];
  }

  return pattern.evidenceText.map((text, index) =>
    metadataEvidence({
      sourceArtifact,
      id: `evidence-${pattern.id}-${index + 1}`,
      sourceLocation: pattern.sourceLocations[index] ?? pattern.sourceLocations.join('; '),
      quotedText: text,
    }),
  );
}

function buildTextAvailabilityClaim(sourceArtifact: CurriculumSourceArtifact) {
  if (sourceArtifact.extractionStatus === 'readable-text') {
    return `Selectable text is available. ${sourceArtifact.readableTextLength} readable character(s) were observed.`;
  }

  if (sourceArtifact.extractionStatus === 'ocr-required') {
    return 'Selectable text was not sufficiently observed; OCR is required before text-based understanding can continue.';
  }

  if (sourceArtifact.extractionStatus === 'unsupported-file-type') {
    return 'The artifact file type is not supported for source text extraction.';
  }

  return 'The artifact could not be read.';
}

function buildExplicitRoleLabelClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return observableRolePatterns.flatMap(({ role, pattern }) => {
    const matchingLines = sourceArtifact.observedLines
      .filter((line) => pattern.test(line.text))
      .slice(0, 5);

    if (matchingLines.length === 0) {
      return [];
    }

    return [
      observedRoleClaim({
        id: `role-explicit-${slugId(role)}`,
        claim: `The artifact explicitly contains the role label "${role}".`,
        evidence: matchingLines.map((line) => lineEvidence(sourceArtifact, line)),
      }),
    ];
  });
}

function buildDirectedImperativeRoleClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return observableRolePatterns.flatMap(({ role, pattern }) => {
    const matchingLines = sourceArtifact.observedLines
      .filter((line) => pattern.test(line.text))
      .filter((line) => hasDirectedLanguage(line.text))
      .slice(0, 5);

    if (matchingLines.length === 0) {
      return [];
    }

    return [
      interpretedRoleClaim({
        id: `role-directed-language-${slugId(role)}`,
        claim: `Some observed lines appear to direct language toward the "${role}" role.`,
        confidenceLevel: 'medium',
        rationale:
          'The role label and directive wording are both present in the same observed source line. The engine records the participant signal only.',
        evidence: matchingLines.map((line) => lineEvidence(sourceArtifact, line)),
      }),
    ];
  });
}

function buildRepeatedRolePatternClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return observableRolePatterns.flatMap(({ role, pattern }) => {
    const matchingLines = sourceArtifact.observedLines.filter((line) => pattern.test(line.text));

    if (matchingLines.length < 3) {
      return [];
    }

    return [
      interpretedRoleClaim({
        id: `role-repeated-pattern-${slugId(role)}`,
        claim: `The role label "${role}" appears repeatedly across ${matchingLines.length} observed line(s).`,
        confidenceLevel: 'medium',
        rationale:
          'Repeated role wording suggests a recurring participant label. This stage records the participant signal only.',
        evidence: matchingLines.slice(0, 8).map((line) => lineEvidence(sourceArtifact, line)),
      }),
    ];
  });
}

function buildExplicitActivityLanguageClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return observableActivityPatterns.flatMap(({ activity, pattern }) => {
    const matchingLines = sourceArtifact.observedLines
      .filter((line) => pattern.test(line.text))
      .slice(0, 8);

    if (matchingLines.length === 0) {
      return [];
    }

    return [
      observedActivityClaim({
        id: `activity-explicit-${slugId(activity)}`,
        claim: `The artifact explicitly contains the educational action "${activity}".`,
        evidence: matchingLines.map((line) => lineEvidence(sourceArtifact, line)),
      }),
    ];
  });
}

function buildRepeatedActivityPatternClaims(
  sourceArtifact: CurriculumSourceArtifact,
): CurriculumUnderstandingClaim[] {
  return observableActivityPatterns.flatMap(({ activity, pattern }) => {
    const matchingLines = sourceArtifact.observedLines.filter((line) => pattern.test(line.text));

    if (matchingLines.length < 3) {
      return [];
    }

    return [
      interpretedActivityClaim({
        id: `activity-repeated-pattern-${slugId(activity)}`,
        claim: `The educational action "${activity}" appears repeatedly across ${matchingLines.length} observed line(s).`,
        confidenceLevel: 'medium',
        rationale:
          'Repeated action wording suggests a recurring observable action. This stage records the action signal only.',
        evidence: matchingLines.slice(0, 8).map((line) => lineEvidence(sourceArtifact, line)),
      }),
    ];
  });
}

function hasDirectedLanguage(text: string) {
  return /\b(should|must|will|have|ask|tell|read|write|complete|check|mark|grade|record|discuss)\b/i.test(
    text,
  );
}

function buildPhysicalFormatClaim(sourceArtifact: CurriculumSourceArtifact) {
  const normalizedFileType = sourceArtifact.fileType.toLowerCase();
  const normalizedFileName = sourceArtifact.fileName.toLowerCase();

  if (normalizedFileType === 'application/pdf' || normalizedFileName.endsWith('.pdf')) {
    return 'Artifact physical format is PDF.';
  }

  if (normalizedFileType.startsWith('image/')) {
    return 'Artifact physical format is image.';
  }

  if (normalizedFileType.startsWith('text/') || /\.(txt|md|csv)$/i.test(normalizedFileName)) {
    return 'Artifact physical format is text.';
  }

  return 'Artifact physical format is unknown.';
}

function findVisibleIdentityText(sourceArtifact: CurriculumSourceArtifact) {
  return sourceArtifact.observedLines
    .slice(0, 25)
    .find((line) => {
      const text = line.text.trim();

      return text.length >= 3 && text.length <= 120 && /[A-Za-z]/.test(text);
    }) ?? null;
}

function findObservedLine(sourceArtifact: CurriculumSourceArtifact, pattern: RegExp) {
  return sourceArtifact.observedLines.find((line) => pattern.test(line.text)) ?? null;
}

function detectObjectTypeFromFileName(sourceArtifact: CurriculumSourceArtifact) {
  return (
    identityFilenamePatterns.find(({ pattern }) => pattern.test(sourceArtifact.fileName)) ?? null
  );
}

function slugId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
