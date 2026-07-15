export type CompanionResourceStatus = 'available' | 'missing' | 'not-needed' | 'unknown';

export type BlueprintStatus = 'not-started' | 'mapping' | 'draft-ready' | 'approved';

export type CurriculumResource = {
  id: string;
  title: string;
  kind: string;
  sourceLocation: string;
  status: 'uploaded' | 'needed' | 'reference';
};

export type CompanionResource = {
  id: string;
  title: string;
  relationship: string;
  status: CompanionResourceStatus;
};

export type CurriculumSectionSummary = {
  id: string;
  title: string;
  subject: string;
  sourceLocation: string;
  itemCount: number;
};

export type CurriculumLessonSummary = {
  id: string;
  title: string;
  subject: string;
  sourceLocation: string;
  instructionCount: number;
};

export type CurriculumAssessment = {
  id: string;
  title: string;
  subject: string;
  sourceLocation: string;
  status: 'detected' | 'needs-review';
};

export type ParentNote = {
  id: string;
  note: string;
  scope: string;
};

export type Curriculum = {
  id: string;
  title: string;
  publisher: string;
  level: string;
  schoolYear: string;
  description: string;
  subjects: string[];
  blueprintStatus: BlueprintStatus;
  uploadedResources: CurriculumResource[];
  companionResources: CompanionResource[];
  sections: CurriculumSectionSummary[];
  lessons: CurriculumLessonSummary[];
  assessments: CurriculumAssessment[];
  parentNotes: ParentNote[];
};
