import type {
  CurriculumConfidence,
  CurriculumEvidence,
  CurriculumObservedFact,
  CurriculumSourceArtifact,
  CurriculumUnderstandingHypothesis,
  CurriculumValidatedFinding,
} from './contracts';
import {
  addHypothesisEvidence,
  createValidatedFindingFromHypothesis,
  transitionHypothesisStatus,
  updateHypothesisConfidence,
} from './hypothesisPipeline';

export type PatternTestingInput = {
  sourceArtifact: CurriculumSourceArtifact;
  observedFacts: CurriculumObservedFact[];
  hypotheses: CurriculumUnderstandingHypothesis[];
};

export type PatternTestingResult = {
  updatedHypotheses: CurriculumUnderstandingHypothesis[];
  validatedFindings: CurriculumValidatedFinding[];
};

export function testCurriculumHypotheses({
  observedFacts,
  hypotheses,
}: PatternTestingInput): PatternTestingResult {
  const evaluatedHypotheses = hypotheses.map((hypothesis) =>
    evaluateHypothesis(hypothesis, observedFacts, hypotheses),
  );

  return {
    updatedHypotheses: evaluatedHypotheses,
    validatedFindings: evaluatedHypotheses.flatMap((hypothesis) =>
      hypothesis.status === 'proposed' && qualifiesForValidatedFinding(hypothesis)
        ? [promoteHypothesisToValidatedFinding(hypothesis)]
        : [],
    ),
  };
}

function evaluateHypothesis(
  hypothesis: CurriculumUnderstandingHypothesis,
  observedFacts: CurriculumObservedFact[],
  allHypotheses: CurriculumUnderstandingHypothesis[],
): CurriculumUnderstandingHypothesis {
  if (hypothesis.status === 'retired') {
    return hypothesis;
  }

  const originatingFacts = observedFacts.filter((fact) =>
    hypothesis.originatingObservedFactIds.includes(fact.id),
  );
  const corroboratingFacts = findCorroboratingFacts(hypothesis, observedFacts);
  const competingEvidence = findCompetingEvidence(hypothesis, allHypotheses);
  const confidence = calculateValidationConfidence({
    hypothesis,
    originatingFacts,
    corroboratingFacts,
    competingEvidence,
  });
  const withEvidence = addHypothesisEvidence(hypothesis, {
    supporting: uniqueEvidence(corroboratingFacts.flatMap((fact) => fact.evidence)),
    limiting: competingEvidence,
  });
  const withConfidence = updateHypothesisConfidence(
    withEvidence,
    confidence,
    'Pattern testing updated confidence from observed facts and competing evidence.',
  );

  return applyValidationOutcome(withConfidence, {
    originatingFacts,
    corroboratingFacts,
    competingEvidence,
  });
}

function applyValidationOutcome(
  hypothesis: CurriculumUnderstandingHypothesis,
  evidence: {
    originatingFacts: CurriculumObservedFact[];
    corroboratingFacts: CurriculumObservedFact[];
    competingEvidence: CurriculumEvidence[];
  },
): CurriculumUnderstandingHypothesis {
  const supportCount = uniqueObservedFacts([
    ...evidence.originatingFacts,
    ...evidence.corroboratingFacts,
  ]).length;
  const independentLocationCount = independentEvidenceLocationCount(hypothesis.supportingEvidence);
  const hasCompetingEvidence = evidence.competingEvidence.length > 0;

  if (supportCount === 0) {
    return transitionHypothesisStatus(hypothesis, 'retire');
  }

  if (hasCompetingEvidence) {
    return transitionHypothesisStatus(hypothesis, 'require-human-confirmation');
  }

  if (supportCount >= 2 && independentLocationCount >= 2 && hypothesis.confidence.level === 'medium') {
    return {
      ...transitionHypothesisStatus(hypothesis, 'propose'),
      humanConfirmationNeeded: false,
    };
  }

  return transitionHypothesisStatus(hypothesis, 'request-more-evidence');
}

function qualifiesForValidatedFinding(hypothesis: CurriculumUnderstandingHypothesis) {
  return (
    hypothesis.confidence.level === 'medium' &&
    !hypothesis.humanConfirmationNeeded &&
    hypothesis.limitingEvidence.length === 0 &&
    independentEvidenceLocationCount(hypothesis.supportingEvidence) >= 2
  );
}

function promoteHypothesisToValidatedFinding(
  hypothesis: CurriculumUnderstandingHypothesis,
): CurriculumValidatedFinding {
  return createValidatedFindingFromHypothesis(hypothesis, {
    finding: hypothesis.claim.replace(/^This artifact may be/i, 'This artifact is supported as'),
    validationStatus: 'supported',
    supportingEvidence: hypothesis.supportingEvidence,
    contradictingEvidence: hypothesis.limitingEvidence,
    remainingUnknownIds: hypothesis.humanConfirmationNeeded
      ? [`human-confirmation-${hypothesis.id}`]
      : [],
    confidence: hypothesis.confidence,
    confidenceHistory: hypothesis.confidenceHistory,
    validationSummary:
      'The existing hypothesis met the validation threshold: multiple independent supporting observations, sufficient confidence, and no limiting evidence.',
  });
}

function findCorroboratingFacts(
  hypothesis: CurriculumUnderstandingHypothesis,
  observedFacts: CurriculumObservedFact[],
) {
  const hypothesisTerms = significantTerms(hypothesis.claim);

  return observedFacts.filter((fact) => {
    if (hypothesis.originatingObservedFactIds.includes(fact.id)) {
      return false;
    }

    const factText = `${fact.fact} ${fact.evidence.map((evidence) => evidence.quotedText).join(' ')}`;

    return hypothesisTerms.some((term) => factText.toLowerCase().includes(term));
  });
}

function findCompetingEvidence(
  hypothesis: CurriculumUnderstandingHypothesis,
  allHypotheses: CurriculumUnderstandingHypothesis[],
) {
  return uniqueEvidence(
    allHypotheses
      .filter((candidate) => hypothesis.competingHypothesisIds.includes(candidate.id))
      .filter((candidate) => candidate.supportingEvidence.length > 0)
      .flatMap((candidate) => candidate.supportingEvidence),
  );
}

function calculateValidationConfidence({
  hypothesis,
  originatingFacts,
  corroboratingFacts,
  competingEvidence,
}: {
  hypothesis: CurriculumUnderstandingHypothesis;
  originatingFacts: CurriculumObservedFact[];
  corroboratingFacts: CurriculumObservedFact[];
  competingEvidence: CurriculumEvidence[];
}): CurriculumConfidence {
  const supportingEvidence = uniqueEvidence([
    ...hypothesis.supportingEvidence,
    ...originatingFacts.flatMap((fact) => fact.evidence),
    ...corroboratingFacts.flatMap((fact) => fact.evidence),
  ]);
  const supportCount = uniqueObservedFacts([...originatingFacts, ...corroboratingFacts]).length;
  const independentLocationCount = independentEvidenceLocationCount(supportingEvidence);

  if (competingEvidence.length > 0) {
    return {
      level: 'requires-human-confirmation',
      rationale:
        'Competing hypotheses have supporting evidence, so validation requires human confirmation.',
      evidence: supportingEvidence,
    };
  }

  if (supportCount >= 2 && independentLocationCount >= 2) {
    return {
      level: 'medium',
      rationale:
        'Multiple independent observed facts support this hypothesis, and no limiting evidence was found.',
      evidence: supportingEvidence,
    };
  }

  if (supportCount > 0) {
    return {
      level: 'low',
      rationale:
        'The hypothesis has some supporting evidence but has not met the validation threshold.',
      evidence: supportingEvidence,
    };
  }

  return {
    level: 'unknown',
    rationale: 'No supporting observed facts remain for this hypothesis.',
    evidence: [],
  };
}

function significantTerms(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4)
    .filter((term) => !['this', 'artifact', 'supported'].includes(term));
}

function independentEvidenceLocationCount(evidenceItems: CurriculumEvidence[]) {
  return new Set(evidenceItems.map((evidence) => evidence.sourceLocation)).size;
}

function uniqueObservedFacts(facts: CurriculumObservedFact[]) {
  return Array.from(new Map(facts.map((fact) => [fact.id, fact])).values());
}

function uniqueEvidence(evidenceItems: CurriculumEvidence[]) {
  return Array.from(
    new Map(evidenceItems.map((evidence) => [evidence.id, evidence])).values(),
  );
}
