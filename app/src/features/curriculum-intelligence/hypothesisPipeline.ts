import type {
  CurriculumConfidence,
  CurriculumEvidence,
  CurriculumHypothesisType,
  CurriculumUnderstandingCategory,
  CurriculumUnderstandingHypothesis,
  CurriculumValidatedFinding,
} from './contracts';

export type HypothesisStatusTransition =
  | 'propose'
  | 'request-more-evidence'
  | 'retire'
  | 'require-human-confirmation';

export type HypothesisDraft = {
  category: CurriculumUnderstandingCategory;
  hypothesisType: CurriculumHypothesisType;
  claim: string;
  originatingObservedFactIds: string[];
  supportingEvidence: CurriculumEvidence[];
  limitingEvidence?: CurriculumEvidence[];
  competingHypothesisIds?: string[];
  testsNeeded: string[];
  humanConfirmationNeeded: boolean;
  confidence: CurriculumConfidence;
  confidenceHistory?: CurriculumUnderstandingHypothesis['confidenceHistory'];
};

export type ValidatedFindingDraft = {
  finding: string;
  validationStatus: CurriculumValidatedFinding['validationStatus'];
  supportingEvidence: CurriculumEvidence[];
  contradictingEvidence?: CurriculumEvidence[];
  remainingUnknownIds?: string[];
  confidence: CurriculumConfidence;
  confidenceHistory?: CurriculumValidatedFinding['confidenceHistory'];
  validationSummary: string;
};

export function createHypothesisId({
  category,
  hypothesisType,
  claim,
}: Pick<HypothesisDraft, 'category' | 'hypothesisType' | 'claim'>) {
  return `hypothesis-${category}-${hypothesisType}-${slugify(claim).slice(0, 60)}`;
}

export function createProposedHypothesis(draft: HypothesisDraft): CurriculumUnderstandingHypothesis {
  return {
    id: createHypothesisId(draft),
    category: draft.category,
    hypothesisType: draft.hypothesisType,
    claim: draft.claim,
    status: 'proposed',
    originatingObservedFactIds: draft.originatingObservedFactIds,
    supportingEvidence: draft.supportingEvidence,
    limitingEvidence: draft.limitingEvidence ?? [],
    competingHypothesisIds: draft.competingHypothesisIds ?? [],
    testsNeeded: draft.testsNeeded,
    humanConfirmationNeeded: draft.humanConfirmationNeeded,
    confidence: draft.confidence,
    confidenceHistory: draft.confidenceHistory ?? [
      {
        id: `${createHypothesisId(draft)}-confidence-initial`,
        changedAt: new Date().toISOString(),
        confidence: draft.confidence,
        rationale: 'Initial hypothesis confidence.',
      },
    ],
  };
}

export function transitionHypothesisStatus(
  hypothesis: CurriculumUnderstandingHypothesis,
  transition: HypothesisStatusTransition,
): CurriculumUnderstandingHypothesis {
  if (transition === 'request-more-evidence') {
    return {
      ...hypothesis,
      status: 'needs-more-evidence',
    };
  }

  if (transition === 'retire') {
    return {
      ...hypothesis,
      status: 'retired',
    };
  }

  if (transition === 'require-human-confirmation') {
    return {
      ...hypothesis,
      status: 'requires-human-confirmation',
      humanConfirmationNeeded: true,
    };
  }

  return {
    ...hypothesis,
    status: 'proposed',
  };
}

export function updateHypothesisConfidence(
  hypothesis: CurriculumUnderstandingHypothesis,
  confidence: CurriculumConfidence,
  rationale = 'Hypothesis confidence updated from evidence.',
): CurriculumUnderstandingHypothesis {
  return {
    ...hypothesis,
    confidence,
    confidenceHistory: [
      ...hypothesis.confidenceHistory,
      {
        id: `${hypothesis.id}-confidence-${hypothesis.confidenceHistory.length + 1}`,
        changedAt: new Date().toISOString(),
        confidence,
        rationale,
      },
    ],
  };
}

export function addHypothesisEvidence(
  hypothesis: CurriculumUnderstandingHypothesis,
  evidence: {
    supporting?: CurriculumEvidence[];
    limiting?: CurriculumEvidence[];
  },
): CurriculumUnderstandingHypothesis {
  return {
    ...hypothesis,
    supportingEvidence: [...hypothesis.supportingEvidence, ...(evidence.supporting ?? [])],
    limitingEvidence: [...hypothesis.limitingEvidence, ...(evidence.limiting ?? [])],
  };
}

export function addCompetingHypothesis(
  hypothesis: CurriculumUnderstandingHypothesis,
  competingHypothesisId: string,
): CurriculumUnderstandingHypothesis {
  if (hypothesis.competingHypothesisIds.includes(competingHypothesisId)) {
    return hypothesis;
  }

  return {
    ...hypothesis,
    competingHypothesisIds: [...hypothesis.competingHypothesisIds, competingHypothesisId],
  };
}

export function addHypothesisTest(
  hypothesis: CurriculumUnderstandingHypothesis,
  testNeeded: string,
): CurriculumUnderstandingHypothesis {
  if (hypothesis.testsNeeded.includes(testNeeded)) {
    return hypothesis;
  }

  return {
    ...hypothesis,
    testsNeeded: [...hypothesis.testsNeeded, testNeeded],
  };
}

export function markHumanConfirmationNeeded(
  hypothesis: CurriculumUnderstandingHypothesis,
  humanConfirmationNeeded: boolean,
): CurriculumUnderstandingHypothesis {
  return {
    ...hypothesis,
    humanConfirmationNeeded,
  };
}

export function createValidatedFindingFromHypothesis(
  hypothesis: CurriculumUnderstandingHypothesis,
  draft: ValidatedFindingDraft,
): CurriculumValidatedFinding {
  return {
    id: `validated-finding-${hypothesis.id}`,
    category: hypothesis.category,
    finding: draft.finding,
    validationStatus: draft.validationStatus,
    sourceHypothesisIds: [hypothesis.id],
    sourceObservedFactIds: hypothesis.originatingObservedFactIds,
    supportingEvidence: draft.supportingEvidence,
    contradictingEvidence: draft.contradictingEvidence ?? [],
    remainingUnknownIds: draft.remainingUnknownIds ?? [],
    confidence: draft.confidence,
    confidenceHistory: draft.confidenceHistory ?? [
      ...hypothesis.confidenceHistory,
      {
        id: `validated-finding-${hypothesis.id}-confidence-final`,
        changedAt: new Date().toISOString(),
        confidence: draft.confidence,
        rationale: 'Validated finding confidence at promotion.',
      },
    ],
    validationSummary: draft.validationSummary,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
