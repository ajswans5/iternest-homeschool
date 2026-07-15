import type {
  EvidenceBackedValue,
  EvidenceConfidence,
  LessonModel,
  LessonWorkItem,
  LessonWorkType,
  SourceEvidence,
} from '../../domain/contracts';
import type { SourceLine, UploadedCurriculumAnalysis } from './types';

const UNKNOWN = "I don't have enough evidence to determine this.";

const knownSubjects = [
  'Arithmetic',
  'Math',
  'Reading',
  'Literature',
  'Latin',
  'Grammar',
  'Writing',
  'Composition',
  'Science',
  'History',
  'Geography',
  'Spelling',
  'Bible',
];

const lessonHeadingPattern = /\b(lesson|week|day)\s+\d+[a-z]?\b/i;

export function buildSingleLessonModel(
  analysis: UploadedCurriculumAnalysis | null,
): LessonModel | null {
  if (!analysis || analysis.sourceLines.length === 0) {
    return null;
  }

  const lessonLines = selectFirstCompleteLessonBlock(analysis.sourceLines);

  if (lessonLines.length === 0) {
    return null;
  }

  return buildLessonModel(lessonLines, analysis);
}

function selectFirstCompleteLessonBlock(lines: SourceLine[]) {
  const startIndex = lines.findIndex((line) => lessonHeadingPattern.test(line.text));

  if (startIndex === -1) {
    return [];
  }

  const nextLessonIndex = lines.findIndex(
    (line, index) => index > startIndex && lessonHeadingPattern.test(line.text),
  );
  const endIndex = nextLessonIndex === -1 ? Math.min(startIndex + 24, lines.length) : nextLessonIndex;

  return lines.slice(startIndex, endIndex).filter((line) => line.text.length > 2);
}

function buildLessonModel(
  lessonLines: SourceLine[],
  analysis: UploadedCurriculumAnalysis,
): LessonModel {
  const titleLine = lessonLines[0];
  const bodyLines = lessonLines.slice(1);
  const subjectLine = findSubjectLine(lessonLines) ?? findNearestPreviousSubjectLine(titleLine, analysis.sourceLines);
  const teacherLines = bodyLines.filter(isTeacherResponsibility);
  const studentLines = bodyLines.filter(isStudentResponsibility);
  const materialLines = bodyLines.filter(isMaterialLine);
  const reviewLines = bodyLines.filter(isAssessmentLine);
  const dependencyLines = bodyLines.filter(isDependencyLine);
  const estimatedTimeLine = bodyLines.find(isEstimatedTimeLine);
  const estimatedMinutes = estimatedTimeLine ? extractMinutes(estimatedTimeLine.text) : null;
  const flexibilityLine = bodyLines.find(isFlexibilityLine);
  const lessonNumber = extractLessonNumber(titleLine.text);
  const classifiedIds = new Set(
    [
      ...teacherLines,
      ...studentLines,
      ...materialLines,
      ...reviewLines,
      ...dependencyLines,
      estimatedTimeLine,
      flexibilityLine,
    ]
      .filter((line): line is SourceLine => Boolean(line))
      .map((line) => line.id),
  );
  const unknownLines = bodyLines.filter(
    (line) => !classifiedIds.has(line.id) && !isMostlyFormatting(line.text),
  );
  const sourceEvidence = lessonLines.map((line) => toEvidence(line, analysis));
  const confidence: EvidenceConfidence =
    unknownLines.length > 0 || !subjectLine ? 'needs-parent-review' : 'high';

  return {
    id: `lesson-model-${titleLine.id}`,
    curriculumSourceId: analysis.fileName,
    subject: subjectLine
      ? supportedValue(subjectLine.text, subjectLine, analysis)
      : unknownValue('The source around this lesson did not clearly identify a subject.'),
    title: supportedValue(titleLine.text, titleLine, analysis),
    lessonNumber: lessonNumber
      ? supportedValue(lessonNumber, titleLine, analysis)
      : unknownValue('The lesson heading did not include a clear lesson number.'),
    instructionalIntent: unknownValue(
      'The source did not explicitly state a lesson objective or instructional intent.',
    ),
    teacherResponsibilities: teacherLines.map((line) =>
      toWorkItem(line, 'teacher-led', analysis, 'protect'),
    ),
    studentResponsibilities: studentLines.map((line) =>
      toWorkItem(line, 'student-independent', analysis, 'move'),
    ),
    materialsRequired: materialLines.map((line) =>
      toWorkItem(line, 'parent-prep', analysis, 'protect'),
    ),
    reviewsAndAssessments: reviewLines.map((line) =>
      toWorkItem(line, isAssessmentOnly(line) ? 'assessment' : 'review', analysis, 'protect'),
    ),
    estimatedDurationMinutes:
      estimatedTimeLine && estimatedMinutes !== null
        ? supportedValue(estimatedMinutes, estimatedTimeLine, analysis)
        : unknownValue('The curriculum did not explicitly state an estimated duration.'),
    prerequisiteLessonIds:
      dependencyLines.length > 0
        ? supportedValue(dependencyLines.map((line) => line.text), dependencyLines[0], analysis)
        : unknownValue('The curriculum did not explicitly state prerequisite lessons.'),
    sourceOrder: titleLine.sourceOrder,
    sourceEvidence,
    unknowns: unknownLines.map((line) => ({
      id: `unknown-${line.id}`,
      question: `How should IterNest classify this source line: "${line.text}"?`,
      reason: 'This line belongs to the selected lesson block but was not classified confidently.',
      relatedEvidence: [toEvidence(line, analysis)],
    })),
    confidence,
    parserNotes: [
      'This LessonModel is a deterministic first pass from one selected lesson block.',
      'Parser output is not parent-facing until the Decision Engine decides what to surface.',
    ],
  };
}

function toWorkItem(
  line: SourceLine,
  type: LessonWorkType,
  analysis: UploadedCurriculumAnalysis,
  defaultFlexibility: 'protect' | 'move',
): LessonWorkItem {
  const evidence = [toEvidence(line, analysis)];

  return {
    id: `work-${line.id}`,
    type,
    text: line.text,
    required: {
      value: type !== 'optional',
      confidence: 'high',
      evidence,
    },
    flexibility: {
      value: isFlexibilityLine(line) ? 'optional' : defaultFlexibility,
      confidence: isFlexibilityLine(line) ? 'high' : 'needs-parent-review',
      evidence,
      unknownReason: isFlexibilityLine(line)
        ? undefined
        : 'Flexibility was not explicitly stated; this default should be parent-reviewed.',
    },
    dependencies: unknownValue<string[]>('No dependency was explicitly attached to this work item.'),
    evidence,
    confidence: 'high',
  };
}

function supportedValue<T>(
  value: T,
  line: SourceLine,
  analysis: UploadedCurriculumAnalysis,
): EvidenceBackedValue<T> {
  return {
    value,
    confidence: 'high',
    evidence: [toEvidence(line, analysis)],
  };
}

function unknownValue<T>(unknownReason: string): EvidenceBackedValue<T> {
  return {
    value: null,
    confidence: 'not-enough-evidence',
    evidence: [],
    unknownReason: `${UNKNOWN} ${unknownReason}`,
  };
}

function toEvidence(line: SourceLine, analysis: UploadedCurriculumAnalysis): SourceEvidence {
  return {
    id: line.id,
    sourceId: analysis.fileName,
    sourceTitle: analysis.fileName,
    sourceLocation: line.sourceLocation,
    quotedText: line.text,
  };
}

function findSubjectLine(lines: SourceLine[]) {
  return lines.find((line) =>
    knownSubjects.some((subject) => new RegExp(`\\b${escapeRegExp(subject)}\\b`, 'i').test(line.text)),
  );
}

function findNearestPreviousSubjectLine(titleLine: SourceLine, allLines: SourceLine[]) {
  const titleIndex = allLines.findIndex((line) => line.id === titleLine.id);

  if (titleIndex === -1) {
    return null;
  }

  return [...allLines.slice(Math.max(0, titleIndex - 12), titleIndex)]
    .reverse()
    .find((line) =>
      knownSubjects.some((subject) => new RegExp(`\\b${escapeRegExp(subject)}\\b`, 'i').test(line.text)),
    ) ?? null;
}

function isTeacherResponsibility(line: SourceLine) {
  return /\b(teach|discuss|explain|demonstrate|ask|read aloud|recite|work together|together|oral review)\b/i.test(
    line.text,
  );
}

function isStudentResponsibility(line: SourceLine) {
  return /\b(complete|read|copy|write|answer|practice|drill|seatwork|independent|record|solve)\b/i.test(
    line.text,
  );
}

function isMaterialLine(line: SourceLine) {
  return /\b(materials?|supplies|required|need|gather)\b/i.test(line.text);
}

function isAssessmentLine(line: SourceLine) {
  return /\b(test|quiz|assessment|oral review|review|check)\b/i.test(line.text);
}

function isAssessmentOnly(line: SourceLine) {
  return /\b(test|quiz|assessment)\b/i.test(line.text);
}

function isDependencyLine(line: SourceLine) {
  return /\b(after|before|requires?|prerequisite|previous|complete lesson)\b/i.test(line.text);
}

function isEstimatedTimeLine(line: SourceLine) {
  return /\b\d+\s*(minutes?|mins?\.?|hours?|hrs?\.?)\b/i.test(line.text);
}

function isFlexibilityLine(line: SourceLine) {
  return /\b(optional|flexible|if time|may be moved|can be moved)\b/i.test(line.text);
}

function isMostlyFormatting(text: string) {
  return text.length < 4 || /^[\d\s:;.,|/-]+$/.test(text);
}

function extractLessonNumber(text: string) {
  return text.match(/\b(?:lesson|week|day)\s+(\d+[a-z]?)\b/i)?.[1] ?? null;
}

function extractMinutes(text: string) {
  const minutes = text.match(/\b(\d+)\s*(?:minutes?|mins?\.?)\b/i)?.[1];

  if (minutes) {
    return Number(minutes);
  }

  const hours = text.match(/\b(\d+)\s*(?:hours?|hrs?\.?)\b/i)?.[1];

  return hours ? Number(hours) * 60 : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
