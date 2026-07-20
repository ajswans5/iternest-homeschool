import type {
  DraftBlueprintPreview,
  SourceFinding,
  SourceInference,
  SourceLine,
  SourceQuestion,
  UploadedCurriculumAnalysis,
} from './types';
import {
  inspectImportError,
  reportImportProgress,
  traceImportStep,
  type ImportProgressReporter,
} from './importDiagnostics';

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

type PdfPageLike = {
  getTextContent: () => Promise<{ items: unknown[] }>;
  cleanup?: () => void;
};

type PdfDocumentLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
  cleanup?: () => void;
  destroy?: () => Promise<void>;
};

type PdfLoadingTaskLike = {
  promise: Promise<PdfDocumentLike>;
  destroy?: () => Promise<void>;
};

type PdfJsLike = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (options: Record<string, unknown>) => PdfLoadingTaskLike;
  version?: string;
};

const knownSubjects = [
  'Arithmetic',
  'Math',
  'Mathematics',
  'Reading',
  'Literature',
  'Latin',
  'Grammar',
  'Writing',
  'Composition',
  'Science',
  'Natural Science',
  'History',
  'Geography',
  'Spelling',
  'Bible',
  'Christian Studies',
  'Classical Studies',
  'Poetry',
  'Copybook',
  'Cursive',
  'Art',
  'Music',
];

const sectionPatterns = [
  { label: 'Table of Contents', kind: 'table of contents', pattern: /table of contents|contents/i },
  { label: 'Weekly Schedule', kind: 'weekly schedule', pattern: /weekly schedule|week\s+\d+|daily schedule/i },
  { label: 'Lesson Plans', kind: 'lesson plans', pattern: /lesson plans?|lesson\s+\d+/i },
  { label: 'Answer Key', kind: 'answer key', pattern: /answer key|teacher key|answers/i },
  { label: 'Assessments', kind: 'assessments', pattern: /assessment|test|quiz|exam/i },
  { label: 'Appendix', kind: 'appendix', pattern: /appendix/i },
  { label: 'Resources', kind: 'resources', pattern: /resources|materials|supplies/i },
];

export async function analyzeUploadedCurriculumFile(
  file: File,
  options: { onProgress?: ImportProgressReporter } = {},
): Promise<UploadedCurriculumAnalysis> {
  const extraction = await extractReadableText(file, options.onProgress);

  reportImportProgress(options.onProgress, {
    stepId: 'curriculum-analysis',
    label: 'Analyzing curriculum structure',
    status: 'started',
    detail: {
      readableTextLength: extraction.text.length,
      lineCount: extraction.lines.length,
      pageCount: extraction.pageCount,
    },
  });
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
  reportImportProgress(options.onProgress, {
    stepId: 'curriculum-analysis',
    label: 'Analyzing curriculum structure',
    status: 'completed',
    detail: {
      sectionCount: detectedSections.length,
      subjectCount: subjectsFound.length,
      lessonHeadingCount: lessonHeadingsFound.length,
      questionCount: questions.length,
    },
  });

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

async function extractReadableText(
  file: File,
  onProgress?: ImportProgressReporter,
): Promise<TextExtractionResult> {
  if (file.type.startsWith('image/')) {
    return buildExtractionResult('', null, [
      'This is an image file. OCR is required before IterNest can read curriculum text from it.',
      'The upload can be stored, but IterNest will not pretend to understand photo text without OCR.',
    ]);
  }

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file, onProgress);
  }

  if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
    const text = await traceImportStep(
      {
        stepId: 'text-file-read',
        label: 'Reading text file',
        reporter: onProgress,
        timeoutMs: 15000,
        detail: { fileName: file.name, fileSize: file.size },
      },
      () => file.text(),
    );
    return buildExtractionResult(cleanText(text), null, [
      'Text files are accepted for developer testing, but parents should be able to upload normal curriculum PDFs.',
    ]);
  }

  return buildExtractionResult('', null, [
    'This file type is not readable yet. IterNest currently supports curriculum PDFs with selectable text and reports when OCR is required.',
  ]);
}

async function extractPdfText(
  file: File,
  onProgress?: ImportProgressReporter,
): Promise<TextExtractionResult> {
  ensureReadableStreamAsyncIterationSupport(onProgress);

  const fileBuffer = await traceImportStep(
    {
      stepId: 'pdf-file-read',
      label: 'Reading PDF file bytes',
      reporter: onProgress,
      timeoutMs: 30000,
      detail: { fileName: file.name, fileSize: file.size, fileType: file.type },
    },
    () => file.arrayBuffer(),
  );
  const originalBytes = new Uint8Array(fileBuffer);
  const attempts = [
    { label: 'Safari-compatible PDF reader', load: loadLegacyPdfJs },
    { label: 'standard PDF reader', load: loadStandardPdfJs },
  ];
  let lastError: unknown = null;
  let bestResult: TextExtractionResult | null = null;

  for (const attempt of attempts) {
    try {
      const pdfjs = await traceImportStep(
        {
          stepId: `pdf-reader-load-${slugify(attempt.label)}`,
          label: `Loading ${attempt.label}`,
          reporter: onProgress,
          timeoutMs: 30000,
        },
        () => attempt.load(),
      );
      reportImportProgress(onProgress, {
        stepId: `pdf-reader-version-${slugify(attempt.label)}`,
        label: `${attempt.label} version detected`,
        status: 'info',
        detail: {
          readerLabel: attempt.label,
          pdfjsVersion: pdfjs.version ?? 'not reported',
        },
      });
      const result = await extractPdfTextWithReader(pdfjs, originalBytes, attempt.label, onProgress);

      if (!bestResult || result.text.length > bestResult.text.length) {
        bestResult = result;
      }

      if (result.text.length >= 200) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (bestResult) {
    return bestResult;
  }

  return buildExtractionResult('', null, [
    describePdfFailure(lastError),
    'The file was not treated as an OCR failure automatically because this error may come from browser PDF support, encryption, or a damaged download.',
  ]);
}

function ensureReadableStreamAsyncIterationSupport(onProgress?: ImportProgressReporter) {
  if (typeof ReadableStream === 'undefined') {
    reportImportProgress(onProgress, {
      stepId: 'readable-stream-polyfill',
      label: 'Checking ReadableStream async iteration support',
      status: 'info',
      detail: {
        readableStreamType: 'undefined',
        applied: false,
        reason: 'ReadableStream is not available in this browser.',
      },
    });
    return;
  }

  const prototype = ReadableStream.prototype as ReadableStream<unknown> & {
    values?: () => AsyncIterableIterator<unknown>;
    [Symbol.asyncIterator]?: () => AsyncIterableIterator<unknown>;
  };
  const hadValues = typeof prototype.values === 'function';
  const hadAsyncIterator = typeof prototype[Symbol.asyncIterator] === 'function';

  if (hadValues && hadAsyncIterator) {
    reportImportProgress(onProgress, {
      stepId: 'readable-stream-polyfill',
      label: 'Checking ReadableStream async iteration support',
      status: 'info',
      detail: {
        readableStreamType: typeof ReadableStream,
        valuesType: typeof prototype.values,
        asyncIteratorType: typeof prototype[Symbol.asyncIterator],
        applied: false,
        reason: 'Browser already supports ReadableStream async iteration.',
      },
    });
    return;
  }

  const values = readableStreamValues;

  if (!hadValues) {
    Object.defineProperty(prototype, 'values', {
      configurable: true,
      writable: true,
      value: values,
    });
  }

  if (!hadAsyncIterator) {
    Object.defineProperty(prototype, Symbol.asyncIterator, {
      configurable: true,
      writable: true,
      value: values,
    });
  }

  reportImportProgress(onProgress, {
    stepId: 'readable-stream-polyfill',
    label: 'Checking ReadableStream async iteration support',
    status: 'info',
    detail: {
      readableStreamType: typeof ReadableStream,
      previousValuesType: hadValues ? 'function' : 'undefined',
      previousAsyncIteratorType: hadAsyncIterator ? 'function' : 'undefined',
      valuesType: typeof prototype.values,
      asyncIteratorType: typeof prototype[Symbol.asyncIterator],
      applied: true,
      reason: 'PDF.js getTextContent iterates a ReadableStream with for-await, but this browser did not expose values/asyncIterator.',
    },
  });
}

async function* readableStreamValues<T>(this: ReadableStream<T>): AsyncIterableIterator<T> {
  const reader = this.getReader();

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        return;
      }

      yield result.value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function loadLegacyPdfJs(): Promise<PdfJsLike> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as PdfJsLike;
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

async function loadStandardPdfJs(): Promise<PdfJsLike> {
  const pdfjs = await import('pdfjs-dist') as unknown as PdfJsLike;
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

async function extractPdfTextWithReader(
  pdfjs: PdfJsLike,
  originalBytes: Uint8Array,
  readerLabel: string,
  onProgress?: ImportProgressReporter,
): Promise<TextExtractionResult> {
  const loadingTask = pdfjs.getDocument({
    data: originalBytes.slice(),
    isEvalSupported: false,
    stopAtErrors: false,
    useWasm: false,
    useWorkerFetch: false,
  });
  let document: PdfDocumentLike | null = null;

  try {
    document = await traceImportStep(
      {
        stepId: `pdf-document-load-${slugify(readerLabel)}`,
        label: `Opening PDF document with ${readerLabel}`,
        reporter: onProgress,
        timeoutMs: 45000,
      },
      () => loadingTask.promise,
    );
    const parsedLines: ParsedLine[] = [];
    const limitations: string[] = [];
    const pageErrors: string[] = [];
    const pagesToRead = document.numPages;
    reportImportProgress(onProgress, {
      stepId: `pdf-page-count-${slugify(readerLabel)}`,
      label: `PDF page count detected with ${readerLabel}`,
      status: 'info',
      detail: { pageCount: document.numPages, pagesToRead },
    });

    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      let page: PdfPageLike | null = null;

      try {
        page = await traceImportStep(
          {
            stepId: `pdf-page-load-${slugify(readerLabel)}-${pageNumber}`,
            label: `Loading PDF page ${pageNumber}`,
            reporter: onProgress,
            timeoutMs: 10000,
            detail: { pageNumber, readerLabel },
          },
          () => document?.getPage(pageNumber) ?? Promise.reject(new Error('PDF document was not available.')),
        );
        reportImportProgress(onProgress, {
          stepId: `pdf-page-text-preflight-${slugify(readerLabel)}-${pageNumber}`,
          label: `Inspecting PDF page ${pageNumber} before text extraction`,
          status: 'info',
          detail: buildPdfTextExtractionPreflight({
            page,
            pageNumber,
            readerLabel,
            statement: 'page.getTextContent()',
          }),
        });
        const textContent = await tracePdfTextContentCall({
          onProgress,
          page,
          pageNumber,
          readerLabel,
        });
        reportImportProgress(onProgress, {
          stepId: `pdf-page-text-result-${slugify(readerLabel)}-${pageNumber}`,
          label: `Inspecting text result from PDF page ${pageNumber}`,
          status: 'info',
          detail: buildPdfTextContentResultDiagnostics(textContent, pageNumber, readerLabel),
        });
        parsedLines.push(
          ...getPdfPageLines(textContent.items as PdfTextItem[], pageNumber),
        );
      } catch (error) {
        reportImportProgress(onProgress, {
          stepId: `pdf-page-text-catch-${slugify(readerLabel)}-${pageNumber}`,
          label: `PDF page ${pageNumber} text extraction exception captured`,
          status: 'failed',
          error: describeDetailedError(error),
          detail: {
            pageNumber,
            readerLabel,
            origin: 'page text extraction try/catch',
            suspectedStatement: 'page.getTextContent() or PDF.js internals triggered by that call',
            thrownError: inspectImportError(error),
          },
        });
        pageErrors.push(`Page ${pageNumber}: ${errorMessage(error)}`);
      } finally {
        page?.cleanup?.();
      }

      if (pageNumber % 4 === 0) {
        await yieldToBrowser();
      }
    }

    const readableText = cleanText(parsedLines.map((line) => line.text).join('\n'));

    if (readableText.length >= 200) {
      limitations.push(
        `Selectable text was detected using the ${readerLabel}; OCR was not needed for this import.`,
      );
    } else {
      limitations.push(
        'This PDF exposed little or no readable text. OCR may be required before IterNest can understand the curriculum content.',
      );
    }

    if (pageErrors.length > 0) {
      limitations.push(
        `${pageErrors.length} page${pageErrors.length === 1 ? '' : 's'} could not be read during this pass: ${pageErrors.slice(0, 3).join(' | ')}`,
      );
    }

    return {
      text: readableText,
      lines: parsedLines,
      pageCount: document.numPages,
      limitations,
    };
  } finally {
    safelyCleanup(document);
    await safelyDestroy(document);
    await safelyDestroy(loadingTask);
  }
}

async function tracePdfTextContentCall({
  onProgress,
  page,
  pageNumber,
  readerLabel,
}: {
  onProgress?: ImportProgressReporter;
  page: PdfPageLike | null;
  pageNumber: number;
  readerLabel: string;
}) {
  return traceImportStep(
    {
      stepId: `pdf-page-text-${slugify(readerLabel)}-${pageNumber}`,
      label: `Reading text from PDF page ${pageNumber}`,
      reporter: onProgress,
      timeoutMs: 10000,
      detail: {
        pageNumber,
        readerLabel,
        exactStatement: 'page.getTextContent()',
        sourceFile: 'app/src/features/curriculum-import/realFileAnalysis.ts',
        functionName: 'tracePdfTextContentCall',
        objectOrigin: 'PDF.js PDFPageProxy returned by document.getPage(pageNumber)',
        preflight: buildPdfTextExtractionPreflight({
          page,
          pageNumber,
          readerLabel,
          statement: 'page.getTextContent()',
        }),
      },
    },
    async () => {
      reportImportProgress(onProgress, {
        stepId: `pdf-page-text-before-call-${slugify(readerLabel)}-${pageNumber}`,
        label: `About to call page.getTextContent() for PDF page ${pageNumber}`,
        status: 'info',
        detail: {
          exactStatement: 'return page.getTextContent();',
          sourceFile: 'app/src/features/curriculum-import/realFileAnalysis.ts',
          functionName: 'tracePdfTextContentCall',
          pageNumber,
          readerLabel,
          preflight: buildPdfTextExtractionPreflight({
            page,
            pageNumber,
            readerLabel,
            statement: 'page.getTextContent()',
          }),
        },
      });

      if (!page) {
        throw new Error('PDF page was not available before page.getTextContent().');
      }

      return page.getTextContent();
    },
  );
}

function buildPdfTextExtractionPreflight({
  page,
  pageNumber,
  readerLabel,
  statement,
}: {
  page: PdfPageLike | null;
  pageNumber: number;
  readerLabel: string;
  statement: string;
}) {
  return {
    statement,
    pageNumber,
    readerLabel,
    page: describeObjectShape(page),
    pageGetTextContentType: typeof page?.getTextContent,
    pageStreamTextContentType: typeof (page as unknown as { streamTextContent?: unknown } | null)?.streamTextContent,
    pageCleanupType: typeof page?.cleanup,
    promiseWithResolversType: typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers,
    readableStreamType: typeof ReadableStream,
    readableStreamValuesType: typeof (ReadableStream.prototype as unknown as { values?: unknown }).values,
    readableStreamAsyncIteratorType: typeof (ReadableStream.prototype as unknown as Record<symbol, unknown>)[Symbol.asyncIterator],
    transformStreamType: typeof TransformStream,
    structuredCloneType: typeof structuredClone,
    arrayFromAsyncType: typeof (Array as unknown as { fromAsync?: unknown }).fromAsync,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    objectOrigin: 'PDF.js PDFPageProxy returned by document.getPage(pageNumber)',
  };
}

function buildPdfTextContentResultDiagnostics(
  textContent: { items: unknown[] },
  pageNumber: number,
  readerLabel: string,
) {
  const firstItem = textContent.items[0] ?? null;

  return {
    pageNumber,
    readerLabel,
    textContent: describeObjectShape(textContent),
    itemsIsArray: Array.isArray(textContent.items),
    itemCount: textContent.items.length,
    firstItem: describeObjectShape(firstItem),
    firstItemStrType: typeof (firstItem as PdfTextItem | null)?.str,
    firstItemTransformType: typeof (firstItem as PdfTextItem | null)?.transform,
    firstItemTransformIsArray: Array.isArray((firstItem as PdfTextItem | null)?.transform),
  };
}

function describeObjectShape(value: unknown) {
  if (value === null) {
    return { type: 'null' };
  }

  if (value === undefined) {
    return { type: 'undefined' };
  }

  const valueAsRecord = value as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(value);

  return {
    type: typeof value,
    constructorName: value?.constructor?.name ?? null,
    ownKeys: safeKeys(valueAsRecord),
    prototypeConstructorName: prototype?.constructor?.name ?? null,
    prototypeKeys: safeKeys(prototype),
  };
}

function safeKeys(value: unknown) {
  try {
    return Object.keys(value as Record<string, unknown>).slice(0, 40);
  } catch (error) {
    return [`Unable to read keys: ${errorMessage(error)}`];
  }
}

function describeDetailedError(error: unknown) {
  const stack = error instanceof Error ? error.stack : null;
  return [
    errorName(error),
    errorMessage(error),
    stack ? `Stack:\n${stack}` : 'Stack: not provided by browser',
  ].join('\n');
}

function getPdfPageLines(items: PdfTextItem[], pageNumber: number): ParsedLine[] {
  const lineMap = new Map<number, Array<{ x: number; text: string }>>();

  items.forEach((item) => {
    const text = item.str?.replace(/\s+/g, ' ').trim();

    if (!text) {
      return;
    }

    const xPosition = item.transform?.[4] ?? 0;
    const yPosition = item.transform?.[5] ?? 0;
    const lineKey = Math.round(yPosition);
    const existingLine = lineMap.get(lineKey) ?? [];
    existingLine.push({ x: xPosition, text });
    lineMap.set(lineKey, existingLine);
  });

  return Array.from(lineMap.entries())
    .sort((first, second) => second[0] - first[0])
    .map(([, parts], index) => ({
      lineNumber: index + 1,
      pageNumber,
      text: parts
        .sort((first, second) => first.x - second.x)
        .map((part) => part.text)
        .join(' '),
    }))
    .filter((line) => line.text.length > 0);
}

function describePdfFailure(error: unknown) {
  const name = errorName(error);
  const message = errorMessage(error);

  if (/password/i.test(name) || /password/i.test(message)) {
    return 'This PDF is password-protected. Open or export an unlocked copy before importing it into IterNest.';
  }

  if (/invalidpdf|formaterror|invalid pdf|corrupt/i.test(`${name} ${message}`)) {
    return 'The browser could not parse this PDF. The download may be incomplete or the file may use a PDF format this reader cannot process.';
  }

  if (/worker|module|import|wasm/i.test(`${name} ${message}`)) {
    return `The browser PDF reader could not start correctly (${message}). This is a reader compatibility problem, not proof that the curriculum needs OCR.`;
  }

  return `IterNest could not open this PDF in the browser (${message}). The file may still contain selectable text.`;
}

function errorName(error: unknown) {
  return error instanceof Error && error.name ? error.name : 'PDF error';
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Unknown PDF reader error';
}

function safelyCleanup(value: { cleanup?: () => void } | null) {
  try {
    value?.cleanup?.();
  } catch {
    // Cleanup failures must not replace the actual import result.
  }
}

async function safelyDestroy(value: { destroy?: () => Promise<void> } | null) {
  try {
    await value?.destroy?.();
  } catch {
    // Cleanup failures must not replace the actual import result.
  }
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
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

    return [{
      id: `subject-${subject.toLowerCase().replace(/\s+/g, '-')}`,
      label: 'Subject found',
      value: subject,
      sourceLocation: formatSourceLocation(match),
      evidence: match.text,
    }];
  });
}

function findLessonHeadings(lines: ParsedLine[]): SourceFinding[] {
  return lines
    .filter(({ text }) =>
      /\b(lesson|week|day)\s+\d+[a-z]?\b/i.test(text) ||
      /\b(first|second|third|fourth)\s+week\b/i.test(text),
    )
    .slice(0, 30)
    .map((line, index) => ({
      id: `lesson-heading-${index + 1}`,
      label: 'Lesson heading found',
      value: line.text.length > 120 ? `${line.text.slice(0, 117)}...` : line.text,
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
          ? 'The browser PDF reader extracted readable text from the document.'
          : 'The browser PDF reader could not extract enough readable text from the document.',
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
      guess: 'This may contain planning or orchestration structure rather than one standalone lesson.',
      why: 'A weekly schedule section was directly detected.',
      confidence: 'review',
      sourceLocation:
        sections.find((section) => section.value === 'Weekly Schedule')?.sourceLocation ?? 'Unknown',
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
      guess: 'This likely contains sequential lesson or week content.',
      why: 'Lesson, week, or day headings were directly found in source order.',
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
  const readerFailure = extraction.limitations.some((limitation) =>
    /reader|parse|password|open this PDF|compatibility/i.test(limitation),
  );

  if ((file.type.startsWith('image/') || isPdf) && extraction.text.length < 200 && !readerFailure) {
    questions.push({
      id: 'ocr-needed',
      question: 'Is this curriculum scan or photo-based rather than selectable text?',
      reason: 'I could not read enough text from the upload. OCR may be required before I can map it faithfully.',
    });
  }

  if (!sections.some((section) => section.value === 'Lesson Plans')) {
    questions.push({
      id: 'lesson-plans',
      question: 'Does this upload include the actual lesson-plan pages?',
      reason: 'I did not clearly find a lesson-plan section in the pages read during this import pass.',
    });
  }

  if (!sections.some((section) => section.value === 'Answer Key')) {
    questions.push({
      id: 'answer-key',
      question: 'Is there a separate answer key or teacher reference file?',
      reason: 'I did not clearly find an answer key in the pages read during this import pass.',
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
      summary: 'Not enough source text was understood to draft a curriculum blueprint safely.',
      includedSubjects: subjects.map((subject) => subject.value),
      nextStep: 'Review the file limitation or use the OCR pipeline before drafting the blueprint.',
    };
  }

  return {
    status: questions.length > 0 ? 'not-ready' : 'draftable',
    summary: 'A draft blueprint can be prepared from directly detected subjects and lesson headings after parent review.',
    includedSubjects: subjects.map((subject) => subject.value),
    nextStep: 'Review the direct findings and questions before IterNest builds the curriculum blueprint.',
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

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'unknown'
  );
}
