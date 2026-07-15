import type {
  DraftBlueprintPreview,
  SourceFinding,
  SourceInference,
  SourceLine,
  SourceQuestion,
  UploadedCurriculumAnalysis,
} from './types';

type ParsedLine = {
  lineNumber: number;
  pageNumber: number | null;
  text: string;
};

type TextExtractionResult = {
  text: string;
  lines: ParsedLine[];
  pageCount: number | null;
  limitations: string[];
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

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

const sectionPatterns = [
  { label: 'Table of Contents', kind: 'table of contents', pattern: /table of contents|contents/i },
  { label: 'Weekly Schedule', kind: 'weekly schedule', pattern: /weekly schedule|week\s+\d+|daily schedule/i },
  { label: 'Lesson Plans', kind: 'lesson plans', pattern: /lesson plans?|lesson\s+\d+/i },
  { label: 'Answer Key', kind: 'answer key', pattern: /answer key|answers/i },
  { label: 'Assessments', kind: 'assessments', pattern: /assessment|test|quiz|exam/i },
  { label: 'Appendix', kind: 'appendix', pattern: /appendix/i },
  { label: 'Resources', kind: 'resources', pattern: /resources|materials|supplies/i },
];

export async function analyzeUploadedCurriculumFile(
  file: File,
): Promise<UploadedCurriculumAnalysis> {
  const extraction = await extractReadableText(file);

  const detectedSections = findSections(extraction.lines);
  const subjectsFound = findSubjects(extraction.lines);
  const lessonHeadingsFound = findLessonHeadings(extraction.lines);
  const structuralFindings = findStructuralFindings(extraction, file);
  const directFindings = [
    ...detectedSections,
    ...subjectsFound,
    ...lessonHeadingsFound,
    ...structuralFindings,
  ];
  const inferences = buildInferences(detectedSections, subjectsFound, lessonHeadingsFound);
  const questions = buildQuestions(file, extraction, detectedSections);
  const draftBlueprint = buildDraftBlueprint(subjectsFound, lessonHeadingsFound, questions);

  return {
    fileName: file.name,
    fileType: file.type || 'Unknown file type',
    fileSizeLabel: formatFileSize(file.size),
    readableTextLength: extraction.text.length,
    pageCount: extraction.pageCount,
    limitations: extraction.limitations,
    sourceLines: extraction.lines.map(toSourceLine),
    detectedSections,
    subjectsFound,
    lessonHeadingsFound,
    structuralFindings,
    directFindings,
    inferences,
    questions,
    draftBlueprint,
  };
}

function toSourceLine(line: ParsedLine): SourceLine {
  return {
    id: `source-line-${line.pageNumber ?? 'text'}-${line.lineNumber}`,
    text: line.text,
    sourceLocation: formatSourceLocation(line),
    sourceOrder: line.pageNumber ? line.pageNumber * 1000 + line.lineNumber : line.lineNumber,
  };
}

async function extractReadableText(file: File): Promise<TextExtractionResult> {
  if (file.type.startsWith('image/')) {
    return buildExtractionResult('', null, [
      'This is an image file. OCR is required before IterNest can read curriculum text from it.',
      'The upload can be stored, but this MVP will not pretend to understand photo text without OCR.',
    ]);
  }

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file);
  }

  if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
    return buildExtractionResult(cleanText(await file.text()), null, [
      'Text files are accepted for developer testing, but parents should be able to upload normal curriculum PDFs.',
    ]);
  }

  return buildExtractionResult('', null, [
    'This file type is not readable in the MVP import test yet. IterNest currently supports curriculum PDFs with selectable text and reports when OCR is required.',
  ]);
}

async function extractPdfText(file: File): Promise<TextExtractionResult> {
  const pdfjs = await import('pdfjs-dist');
  const pdfWorker = await import('pdfjs-dist/build/pdf.worker.mjs?url');

  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;

  const limitations: string[] = [];
  const buffer = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const parsedLines: ParsedLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    parsedLines.push(...getPdfPageLines(content.items as PdfTextItem[], pageNumber));
  }

  const readableText = cleanText(parsedLines.map((line) => line.text).join('\n'));

  if (readableText.length >= 200) {
    limitations.push(
      'This PDF has selectable text. IterNest read the PDF text layer directly; OCR was not needed for this upload.',
    );
  } else {
    limitations.push(
      'This PDF appears to have little or no selectable text. OCR is required before IterNest can understand the curriculum content.',
    );
    limitations.push(
      'IterNest will not ask parents to reformat this curriculum; a later OCR step should handle scanned manuals and photo-based PDFs.',
    );
  }

  return {
    text: readableText,
    lines: parsedLines,
    pageCount: document.numPages,
    limitations,
  };
}

function getPdfPageLines(items: PdfTextItem[], pageNumber: number): ParsedLine[] {
  const lineMap = new Map<number, string[]>();

  items.forEach((item) => {
    const text = item.str?.replace(/\s+/g, ' ').trim();

    if (!text) {
      return;
    }

    const yPosition = item.transform?.[5] ?? 0;
    const lineKey = Math.round(yPosition);
    const existingLine = lineMap.get(lineKey) ?? [];
    existingLine.push(text);
    lineMap.set(lineKey, existingLine);
  });

  return Array.from(lineMap.entries())
    .sort((first, second) => second[0] - first[0])
    .map(([, parts], index) => ({
      lineNumber: index + 1,
      pageNumber,
      text: parts.join(' '),
    }))
    .filter((line) => line.text.length > 0);
}

function buildExtractionResult(
  text: string,
  pageCount: number | null,
  limitations: string[],
): TextExtractionResult {
  return {
    text,
    lines: textToLines(text, null),
    pageCount,
    limitations,
  };
}

function textToLines(text: string, pageNumber: number | null): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line, index) => ({
      lineNumber: index + 1,
      pageNumber,
      text: line,
    }));
}

function findSections(lines: ParsedLine[]): SourceFinding[] {
  const findings: SourceFinding[] = [];

  sectionPatterns.forEach((section) => {
    const match = findFirstLine(lines, section.pattern);

    if (match) {
      findings.push({
        id: `section-${section.kind.replace(/\s+/g, '-')}`,
        label: 'Section detected',
        value: section.label,
        sourceLocation: formatSourceLocation(match),
        evidence: match.text,
      });
    }
  });

  return findings;
}

function findSubjects(lines: ParsedLine[]): SourceFinding[] {
  return knownSubjects.flatMap((subject) => {
    const match = findFirstLine(lines, new RegExp(`\\b${escapeRegExp(subject)}\\b`, 'i'));

    if (!match) {
      return [];
    }

    return [
      {
        id: `subject-${subject.toLowerCase()}`,
        label: 'Subject found',
        value: subject,
        sourceLocation: formatSourceLocation(match),
        evidence: match.text,
      },
    ];
  });
}

function findLessonHeadings(lines: ParsedLine[]): SourceFinding[] {
  return lines
    .filter(({ text }) => /\b(lesson|week|day)\s+\d+[a-z]?\b/i.test(text))
    .slice(0, 20)
    .map((line, index) => ({
      id: `lesson-heading-${index + 1}`,
      label: 'Lesson heading found',
      value: line.text.length > 90 ? `${line.text.slice(0, 87)}...` : line.text,
      sourceLocation: formatSourceLocation(line),
      evidence: line.text,
    }));
}

function findStructuralFindings(
  extraction: TextExtractionResult,
  file: File,
): SourceFinding[] {
  const findings: SourceFinding[] = [];

  if (extraction.pageCount) {
    findings.push({
      id: 'document-page-count',
      label: 'Document/page signal',
      value: `${extraction.pageCount} PDF pages detected`,
      sourceLocation: 'PDF metadata',
      evidence: 'PDF.js reported this page count from the uploaded file.',
    });
  }

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    findings.push({
      id: 'pdf-selectable-text',
      label: 'PDF text signal',
      value:
        extraction.text.length >= 200
          ? 'Selectable text detected'
          : 'Selectable text not detected clearly',
      sourceLocation: 'PDF text layer',
      evidence:
        extraction.text.length >= 200
          ? 'PDF.js extracted readable text from the document.'
          : 'PDF.js could not extract enough readable text from the document.',
    });
  }

  const checkboxMatch = findFirstLine(extraction.lines, /☐|□|\[[ x]\]|\bchecklist\b/i);

  if (checkboxMatch) {
    findings.push({
      id: 'checkboxes',
      label: 'Checklist signal',
      value: 'Possible checkbox/checklist content',
      sourceLocation: formatSourceLocation(checkboxMatch),
      evidence: checkboxMatch.text,
    });
  }

  return findings;
}

function buildInferences(
  sections: SourceFinding[],
  subjects: SourceFinding[],
  lessonHeadings: SourceFinding[],
): SourceInference[] {
  const inferences: SourceInference[] = [];

  if (sections.some((section) => section.value === 'Weekly Schedule')) {
    inferences.push({
      id: 'weekly-schedule-reference',
      guess: 'This may contain planning/reference structure rather than full lesson instructions.',
      why: 'A weekly schedule section was directly detected.',
      confidence: 'review',
      sourceLocation: sections.find((section) => section.value === 'Weekly Schedule')?.sourceLocation ?? 'Unknown',
    });
  }

  if (subjects.length > 1) {
    inferences.push({
      id: 'multi-subject-curriculum',
      guess: 'This appears to include multiple subjects.',
      why: `${subjects.length} subject names were directly found in the uploaded text.`,
      confidence: 'review',
      sourceLocation: 'Subject findings',
    });
  }

  if (lessonHeadings.length > 0) {
    inferences.push({
      id: 'sequential-lessons',
      guess: 'This likely has sequential lesson content.',
      why: 'Lesson/week/day headings were directly found in source order.',
      confidence: 'review',
      sourceLocation: lessonHeadings[0].sourceLocation,
    });
  }

  return inferences;
}

function buildQuestions(
  file: File,
  extraction: TextExtractionResult,
  sections: SourceFinding[],
): SourceQuestion[] {
  const questions: SourceQuestion[] = [];
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if ((file.type.startsWith('image/') || isPdf) && extraction.text.length < 200) {
    questions.push({
      id: 'ocr-needed',
      question: 'Is this curriculum scan/photo-based rather than selectable text?',
      reason: 'I could not read enough text from the upload. OCR is required before I can map it faithfully.',
    });
  }

  if (!sections.some((section) => section.value === 'Lesson Plans')) {
    questions.push({
      id: 'lesson-plans',
      question: 'Does this upload include the actual lesson-plan pages?',
      reason: 'I did not clearly find a lesson-plan section.',
    });
  }

  if (!sections.some((section) => section.value === 'Answer Key')) {
    questions.push({
      id: 'answer-key',
      question: 'Is there a separate answer key or teacher reference file?',
      reason: 'I did not clearly find an answer key in this upload.',
    });
  }

  return questions;
}

function buildDraftBlueprint(
  subjects: SourceFinding[],
  lessonHeadings: SourceFinding[],
  questions: SourceQuestion[],
): DraftBlueprintPreview {
  if (subjects.length === 0 || lessonHeadings.length === 0) {
    return {
      status: 'not-ready',
      summary:
        'Not enough source text was understood to draft a curriculum blueprint safely.',
      includedSubjects: subjects.map((subject) => subject.value),
      nextStep: 'Use the readable curriculum source or OCR pipeline before drafting the blueprint.',
    };
  }

  return {
    status: questions.length > 0 ? 'not-ready' : 'draftable',
    summary:
      'A draft blueprint could be prepared from the directly detected subjects and lesson headings after parent review.',
    includedSubjects: subjects.map((subject) => subject.value),
    nextStep:
      'Review the direct findings and questions before allowing IterNest to build a blueprint.',
  };
}

function findFirstLine(lines: ParsedLine[], pattern: RegExp) {
  return lines.find((line) => pattern.test(line.text)) ?? null;
}

function formatSourceLocation(line: ParsedLine) {
  if (line.pageNumber) {
    return `Page ${line.pageNumber}, line ${line.lineNumber}`;
  }

  return `Line ${line.lineNumber}`;
}

function cleanText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} bytes`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
