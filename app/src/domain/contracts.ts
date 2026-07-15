export type EvidenceConfidence = 'high' | 'needs-parent-review' | 'not-enough-evidence';

export type SourceEvidence = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceLocation: string;
  quotedText: string;
};

export type EvidenceBackedValue<T> = {
  value: T | null;
  confidence: EvidenceConfidence;
  evidence: SourceEvidence[];
  unknownReason?: string;
};

export type LessonWorkType =
  | 'teacher-led'
  | 'student-independent'
  | 'parent-prep'
  | 'review'
  | 'assessment'
  | 'optional'
  | 'flexible'
  | 'unknown';

export type LessonWorkItem = {
  id: string;
  type: LessonWorkType;
  text: string;
  required: EvidenceBackedValue<boolean>;
  flexibility: EvidenceBackedValue<'protect' | 'move' | 'combine' | 'delay' | 'simplify' | 'optional'>;
  dependencies: EvidenceBackedValue<string[]>;
  evidence: SourceEvidence[];
  confidence: EvidenceConfidence;
};

export type LessonModel = {
  id: string;
  curriculumSourceId: string;
  subject: EvidenceBackedValue<string>;
  title: EvidenceBackedValue<string>;
  lessonNumber: EvidenceBackedValue<string>;
  instructionalIntent: EvidenceBackedValue<string>;
  teacherResponsibilities: LessonWorkItem[];
  studentResponsibilities: LessonWorkItem[];
  materialsRequired: LessonWorkItem[];
  reviewsAndAssessments: LessonWorkItem[];
  estimatedDurationMinutes: EvidenceBackedValue<number>;
  prerequisiteLessonIds: EvidenceBackedValue<string[]>;
  sourceOrder: number;
  sourceEvidence: SourceEvidence[];
  unknowns: Array<{
    id: string;
    question: string;
    reason: string;
    relatedEvidence: SourceEvidence[];
  }>;
  confidence: EvidenceConfidence;
  parserNotes: string[];
};

export type LearnerContext = {
  learnerId: string;
  displayName: string;
  currentDate: string;
  currentIndependenceLevel: 'needs-guidance' | 'shared-work' | 'mostly-independent' | 'independent';
  currentCapacity: 'low' | 'typical' | 'high';
  availableInstructionMinutes: number | null;
  parentCapacity: 'low' | 'typical' | 'high';
  recentSignals: Array<{
    id: string;
    subject?: string;
    signal: string;
    observedAt: string;
  }>;
  supportNeeds: string[];
  growthOpportunities: string[];
  parentNotes: string[];
};

export type ParentDecisionType =
  | 'confirm-lesson-model'
  | 'prepare-teaching'
  | 'approve-plan-change'
  | 'answer-uncertainty'
  | 'defer-for-later';

export type ParentDecisionItem = {
  id: string;
  type: ParentDecisionType;
  prompt: string;
  whyNow: string;
  requiredForToday: boolean;
  confidence: EvidenceConfidence;
  evidence: SourceEvidence[];
};

export type ParentTeachingAction = {
  id: string;
  label: string;
  actionType: 'teach' | 'prepare' | 'assign-independent-work' | 'review' | 'assess' | 'ask-parent';
  lessonModelId: string;
  learnerId: string;
  reason: string;
  evidence: SourceEvidence[];
  confidence: EvidenceConfidence;
};

export type ParentDecision = {
  id: string;
  generatedAt: string;
  learnerId: string;
  stage:
    | 'lesson-confirmation'
    | 'daily-teaching'
    | 'plan-repair'
    | 'blocked-needs-parent-review';
  headline: string;
  summary: string;
  lessonModelIds: string[];
  decisionsRequiredNow: ParentDecisionItem[];
  teachingActionsToSurface: ParentTeachingAction[];
  stagedForLater: Array<{
    id: string;
    reason: string;
    lessonModelId?: string;
  }>;
  approvalRequired: boolean;
  approvalMeaning: string;
  confidence: EvidenceConfidence;
};
