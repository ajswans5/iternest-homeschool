import type { LessonModel, LessonWorkItem } from '../../domain/contracts';
import type { ParentDecisionV2 } from '../parent-decision/contracts';
import type { SourceFinding, UploadedCurriculumAnalysis } from '../curriculum-import/types';

export type PersistedLearningTask = {
  id: string;
  owner: string;
  title: string;
  duration: string;
  mode: string;
  reason: string;
  description: string;
  materials: string[];
  studentSteps: string[];
  completionLabel: string;
  audience?: 'student' | 'parent' | 'shared' | 'unknown';
};

export type PersistedPrepTask = {
  id: string;
  title: string;
  duration: string;
  reason: string;
  steps: string[];
  morningReminder: string;
};

export type PersistedDailyCyclePlan = {
  learningTasks: PersistedLearningTask[];
  prepTasks: PersistedPrepTask[];
};

export type PersistedCurriculumRecord = {
  id: string;
  importedAt: string;
  source: {
    fileName: string;
    fileType: string;
    fileSizeLabel: string;
    readableTextLength: number;
    pageCount: number | null;
    limitations: string[];
  };
  curriculum: {
    subjectsFound: SourceFinding[];
    lessonHeadingsFound: SourceFinding[];
    detectedSections: SourceFinding[];
  };
  family: {
    status: 'unknown' | 'explicitly-supplied';
    evidence: string[];
  };
  learner: {
    status: 'unknown' | 'explicitly-supplied';
    evidence: string[];
  };
  continuity: {
    status: 'not-started' | 'in-progress';
    completedLearningTaskIds: string[];
    completedPrepTaskIds: string[];
  };
  decision: ParentDecisionV2;
  dailyCycle: PersistedDailyCyclePlan;
};

export type PersistedHomeschoolData = {
  activeCurriculumId: string | null;
  curricula: PersistedCurriculumRecord[];
};

export const DAILY_CYCLE_DATA_STORAGE_KEY = 'iternest-homeschool-live-daily-cycle-v1';

export function loadPersistedHomeschoolData(): PersistedHomeschoolData {
  if (typeof window === 'undefined') {
    return emptyPersistedHomeschoolData();
  }

  try {
    const saved = window.localStorage.getItem(DAILY_CYCLE_DATA_STORAGE_KEY);

    if (!saved) {
      return emptyPersistedHomeschoolData();
    }

    const parsed = JSON.parse(saved) as Partial<PersistedHomeschoolData>;
    const curricula = Array.isArray(parsed.curricula)
      ? parsed.curricula.filter(isPersistedCurriculumRecord)
      : [];
    const activeCurriculumId =
      typeof parsed.activeCurriculumId === 'string' &&
      curricula.some((record) => record.id === parsed.activeCurriculumId)
        ? parsed.activeCurriculumId
        : curricula[0]?.id ?? null;

    return { activeCurriculumId, curricula };
  } catch {
    return emptyPersistedHomeschoolData();
  }
}

export function savePersistedHomeschoolData(data: PersistedHomeschoolData) {
  window.localStorage.setItem(DAILY_CYCLE_DATA_STORAGE_KEY, JSON.stringify(data));
}

export function emptyPersistedHomeschoolData(): PersistedHomeschoolData {
  return {
    activeCurriculumId: null,
    curricula: [],
  };
}

export function getActiveCurriculumRecord(data: PersistedHomeschoolData) {
  return (
    data.curricula.find((record) => record.id === data.activeCurriculumId) ??
    data.curricula[0] ??
    null
  );
}

export function upsertCurriculumRecord(
  data: PersistedHomeschoolData,
  record: PersistedCurriculumRecord,
): PersistedHomeschoolData {
  const existingIndex = data.curricula.findIndex(
    (curriculum) => curriculum.id === record.id,
  );
  const curricula =
    existingIndex === -1
      ? [record, ...data.curricula]
      : data.curricula.map((curriculum) =>
          curriculum.id === record.id ? record : curriculum,
        );

  return {
    activeCurriculumId: record.id,
    curricula,
  };
}

export function setActiveCurriculumRecord(
  data: PersistedHomeschoolData,
  curriculumId: string,
): PersistedHomeschoolData {
  if (!data.curricula.some((record) => record.id === curriculumId)) {
    return data;
  }

  return {
    ...data,
    activeCurriculumId: curriculumId,
  };
}

export function buildPersistedCurriculumRecord({
  sourceAnalysis,
  lessonModel,
  decision,
}: {
  sourceAnalysis: UploadedCurriculumAnalysis;
  lessonModel: LessonModel | null;
  decision: ParentDecisionV2;
}): PersistedCurriculumRecord {
  const id = `curriculum-${stableSlug(sourceAnalysis.fileName)}-${sourceAnalysis.readableTextLength}-${sourceAnalysis.lessonHeadingsFound.length}`;
  const dailyCycle = buildDailyCyclePlan(sourceAnalysis, lessonModel, id);

  return {
    id,
    importedAt: new Date().toISOString(),
    source: {
      fileName: sourceAnalysis.fileName,
      fileType: sourceAnalysis.fileType,
      fileSizeLabel: sourceAnalysis.fileSizeLabel,
      readableTextLength: sourceAnalysis.readableTextLength,
      pageCount: sourceAnalysis.pageCount,
      limitations: sourceAnalysis.limitations,
    },
    curriculum: {
      subjectsFound: sourceAnalysis.subjectsFound,
      lessonHeadingsFound: sourceAnalysis.lessonHeadingsFound,
      detectedSections: sourceAnalysis.detectedSections,
    },
    family: {
      status: 'unknown',
      evidence: [],
    },
    learner: {
      status: 'unknown',
      evidence: [],
    },
    continuity: {
      status: 'not-started',
      completedLearningTaskIds: [],
      completedPrepTaskIds: [],
    },
    decision,
    dailyCycle,
  };
}

function buildDailyCyclePlan(
  sourceAnalysis: UploadedCurriculumAnalysis,
  lessonModel: LessonModel | null,
  curriculumId: string,
): PersistedDailyCyclePlan {
  if (!lessonModel || sourceAnalysis.readableTextLength === 0) {
    return { learningTasks: [], prepTasks: [] };
  }

  const lessonTitle =
    lessonModel.title.value ??
    sourceAnalysis.lessonHeadingsFound[0]?.value ??
    sourceAnalysis.fileName;
  const subject =
    lessonModel.subject.value ?? sourceAnalysis.subjectsFound[0]?.value ?? 'Curriculum';
  const duration = lessonModel.estimatedDurationMinutes.value
    ? `${lessonModel.estimatedDurationMinutes.value} minutes`
    : 'Time not stated';
  const materials = unique(
    lessonModel.materialsRequired
      .map((item) => normalizeMaterialLabel(item.text))
      .filter(Boolean),
  );
  const learningWork = orderLearningWork(lessonModel, [
    ...lessonModel.teacherResponsibilities,
    ...lessonModel.studentResponsibilities,
    ...lessonModel.reviewsAndAssessments,
  ]);
  const learningTasks = learningWork.map((item, index) =>
    toLearningTask(
      item,
      index,
      curriculumId,
      subject,
      lessonTitle,
      duration,
      materials,
    ),
  );

  if (learningTasks.length === 0) {
    return { learningTasks: [], prepTasks: [] };
  }

  const hasPrintableTasks = learningTasks.some(
    (task) => task.audience === 'student' || task.audience === 'shared',
  );

  return {
    learningTasks,
    prepTasks: buildPrepTasks(
      sourceAnalysis,
      lessonTitle,
      subject,
      materials,
      curriculumId,
      hasPrintableTasks,
    ),
  };
}

function orderLearningWork(lessonModel: LessonModel, workItems: LessonWorkItem[]) {
  const sourceOrder = new Map(
    lessonModel.sourceEvidence.map((evidence, index) => [evidence.id, index]),
  );

  return [...workItems].sort((first, second) => {
    const firstOrder = sourceOrder.get(first.evidence[0]?.id ?? '') ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = sourceOrder.get(second.evidence[0]?.id ?? '') ?? Number.MAX_SAFE_INTEGER;
    return firstOrder - secondOrder;
  });
}

function toLearningTask(
  item: LessonWorkItem,
  index: number,
  curriculumId: string,
  subject: string,
  lessonTitle: string,
  duration: string,
  materials: string[],
): PersistedLearningTask {
  const sourceLocation = item.evidence[0]?.sourceLocation;

  return {
    id: `${curriculumId}-learning-${index + 1}-${stableSlug(item.id)}`,
    owner: ownerForWorkType(item.type, subject),
    title: item.text,
    duration,
    mode: modeForWorkType(item.type),
    reason: `This task is part of ${lessonTitle} and is supported by source evidence${sourceLocation ? ` from ${sourceLocation}` : ''}.`,
    description: item.text,
    materials,
    studentSteps: [item.text],
    completionLabel: 'Mark task complete',
    audience: audienceForWorkType(item.type),
  };
}

function buildPrepTasks(
  sourceAnalysis: UploadedCurriculumAnalysis,
  lessonTitle: string,
  subject: string,
  materials: string[],
  curriculumId: string,
  hasPrintableTasks: boolean,
): PersistedPrepTask[] {
  const materialTasks = materials.slice(0, 4).map((material, index) => ({
    id: `${curriculumId}-prep-material-${index + 1}`,
    title: `Gather ${material}`,
    duration: 'Time not stated',
    reason: `The source lists this material for ${lessonTitle}.`,
    steps: [`Place ${material} with the ${subject} materials for the next session.`],
    morningReminder: `${material} is ready for ${subject}.`,
  }));
  const nextHeading = sourceAnalysis.lessonHeadingsFound[1];
  const printTasks = hasPrintableTasks
    ? [
        {
          id: `${curriculumId}-prep-print-student-sheets`,
          title: `Print student task sheet for ${lessonTitle}`,
          duration: '1 minute',
          reason: 'The student-facing sheet is generated from the imported curriculum task list.',
          steps: ['Open Print student task sheets.', 'Print the student-safe task sheet.'],
          morningReminder: `The student task sheet for ${lessonTitle} is printed.`,
        },
      ]
    : [];
  const nextLessonTasks = nextHeading
    ? [
        {
          id: `${curriculumId}-prep-next-${stableSlug(nextHeading.id)}`,
          title: `Preview ${nextHeading.value}`,
          duration: 'Time not stated',
          reason: `This next lesson heading was found directly in ${nextHeading.sourceLocation}.`,
          steps: [
            `Open the curriculum to ${nextHeading.value}.`,
            'Check whether any parent preparation is required.',
          ],
          morningReminder: `${nextHeading.value} has been previewed.`,
        },
      ]
    : [];

  return [...materialTasks, ...printTasks, ...nextLessonTasks];
}

function ownerForWorkType(type: LessonWorkItem['type'], subject: string) {
  if (type === 'teacher-led') return 'Parent-led';
  if (type === 'student-independent') return 'Learner';
  if (type === 'review') return 'Parent review';
  if (type === 'assessment') return 'Learner + parent';
  return subject;
}

function audienceForWorkType(
  type: LessonWorkItem['type'],
): PersistedLearningTask['audience'] {
  if (type === 'teacher-led' || type === 'review') return 'parent';
  if (type === 'student-independent') return 'student';
  if (type === 'assessment') return 'shared';
  return 'unknown';
}

function modeForWorkType(type: LessonWorkItem['type']) {
  if (type === 'teacher-led') return 'With parent';
  if (type === 'student-independent') return 'Independent';
  if (type === 'review') return 'Parent review';
  if (type === 'assessment') return 'Assessment';
  return 'Needs parent review';
}

function normalizeMaterialLabel(value: string) {
  return value
    .replace(/^\s*(materials?|supplies|required|need|gather)\s*[:\-]?\s*/i, '')
    .trim();
}

function isPersistedCurriculumRecord(value: unknown): value is PersistedCurriculumRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<PersistedCurriculumRecord>;

  return (
    typeof record.id === 'string' &&
    Boolean(record.source?.fileName) &&
    Array.isArray(record.dailyCycle?.learningTasks) &&
    Array.isArray(record.dailyCycle?.prepTasks)
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function stableSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'unknown'
  );
}
