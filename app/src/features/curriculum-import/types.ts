export type CurriculumImportFile = {
  name: string;
  type: string;
  previewUrl: string | null;
};

export type ExtractedInstructionClassification =
  | 'parent-teaching'
  | 'student-independent'
  | 'parent-prep'
  | 'review'
  | 'flexible'
  | 'optional';

export type CurriculumSectionKind =
  | 'table-of-contents'
  | 'weekly-schedule'
  | 'lesson-plans'
  | 'answer-key'
  | 'assessment'
  | 'appendix'
  | 'resources';

export type CurriculumSection = {
  id: string;
  subject: string;
  title: string;
  kind: CurriculumSectionKind;
  sourceLocation: string;
  itemCount: number;
  confidence: 'high' | 'review';
  defaultIncluded: boolean;
  note: string;
  sourceOrder: number;
};

export type ExtractedLessonItem = {
  id: string;
  sectionId: string;
  instruction: string;
  subject: string;
  classification: ExtractedInstructionClassification;
  sourceText: string;
  sourceLocation: string;
  sourceOrder: number;
  confidence: 'high' | 'review';
};

export type ApprovedLesson = {
  id: string;
  title: string;
  subject: string;
  status: 'ready';
  statusLabel: string;
};

export type SourceFinding = {
  id: string;
  label: string;
  value: string;
  sourceLocation: string;
  evidence: string;
};

export type SourceInference = {
  id: string;
  guess: string;
  why: string;
  confidence: 'high' | 'review';
  sourceLocation: string;
};

export type SourceQuestion = {
  id: string;
  question: string;
  reason: string;
};

export type SourceLine = {
  id: string;
  text: string;
  sourceLocation: string;
  sourceOrder: number;
};

export type DraftBlueprintPreview = {
  status: 'not-ready' | 'draftable';
  summary: string;
  includedSubjects: string[];
  nextStep: string;
};

export type UploadedCurriculumAnalysis = {
  fileName: string;
  fileType: string;
  fileSizeLabel: string;
  readableTextLength: number;
  pageCount: number | null;
  limitations: string[];
  sourceLines: SourceLine[];
  detectedSections: SourceFinding[];
  subjectsFound: SourceFinding[];
  lessonHeadingsFound: SourceFinding[];
  structuralFindings: SourceFinding[];
  directFindings: SourceFinding[];
  inferences: SourceInference[];
  questions: SourceQuestion[];
  draftBlueprint: DraftBlueprintPreview;
};

export type LessonEvidence = {
  id: string;
  sourceText: string;
  sourceLocation: string;
};

export type LessonUnderstandingField = {
  status: 'supported' | 'not-enough-evidence';
  value: string;
  evidence: LessonEvidence[];
};

export type LessonUnderstandingListField = {
  status: 'supported' | 'not-enough-evidence';
  items: Array<{
    id: string;
    text: string;
    evidence: LessonEvidence;
  }>;
};

export type LessonUnderstandingAnalysis = {
  id: string;
  title: LessonUnderstandingField;
  subject: LessonUnderstandingField;
  objective: LessonUnderstandingField;
  teacherLedTasks: LessonUnderstandingListField;
  independentStudentTasks: LessonUnderstandingListField;
  materialsRequired: LessonUnderstandingListField;
  assessmentsOrReviews: LessonUnderstandingListField;
  dependencies: LessonUnderstandingListField;
  estimatedTime: LessonUnderstandingField;
  flexibility: LessonUnderstandingField;
  needsParentReview: LessonUnderstandingListField;
  confidenceLevel: 'high' | 'needs-parent-review';
  confidenceReason: string;
  sourceOrder: number;
  sourceEvidence: LessonEvidence[];
};
