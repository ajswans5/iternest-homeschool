import type {
  CurriculumObservableStructuralPattern,
  CurriculumSourceArtifact,
  CurriculumSourcePage,
} from './contracts';

type ParsedLine = {
  lineNumber: number;
  pageNumber: number | null;
  text: string;
};

type SourceExtractionResult = {
  text: string;
  lines: ParsedLine[];
  pageCount: number | null;
  limitations: string[];
  extractionStatus: CurriculumSourceArtifact['extractionStatus'];
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

type PdfDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{
      items: PdfTextItem[];
    }>;
  }>;
};

type PdfJsModule = {
  GlobalWorkerOptions?: {
    workerSrc: string;
  };
  getDocument(source: { data: Uint8Array }): {
    promise: Promise<PdfDocument>;
  };
};

export async function buildCurriculumSourceArtifact(
  file: File,
): Promise<CurriculumSourceArtifact> {
  try {
    const extraction = await extractObservableSourceContent(file);
    const pages = buildPages(extraction.lines, extraction.pageCount);
    const observedLines = extraction.lines.map((line) => toObservedLine(file, line));

    return {
      id: buildArtifactId(file),
      fileName: file.name,
      fileType: file.type || 'Unknown file type',
      fileSizeBytes: file.size,
      pageCount: extraction.pageCount,
      readableTextLength: extraction.text.length,
      extractionStatus: extraction.extractionStatus,
      limitations: extraction.limitations,
      physicalStructure: {
        pageCount: extraction.pageCount,
        lineCount: extraction.lines.length,
        hasSelectableText: extraction.text.length > 0,
        pageSummaries: pages.map((page) => ({
          pageNumber: page.pageNumber,
          lineCount: page.lineCount,
          characterCount: page.characterCount,
        })),
      },
      pages,
      observedLines,
      observableStructuralPatterns: findObservableStructuralPatterns(extraction.lines),
    };
  } catch (error) {
    return buildFailedArtifact(file, error);
  }
}

async function extractObservableSourceContent(file: File): Promise<SourceExtractionResult> {
  if (file.type.startsWith('image/')) {
    return {
      text: '',
      lines: [],
      pageCount: null,
      extractionStatus: 'ocr-required',
      limitations: [
        'This is an image file. OCR is required before IterNest can observe text content.',
      ],
    };
  }

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfObservableContent(file);
  }

  if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
    const text = cleanText(await file.text());

    return {
      text,
      lines: textToLines(text, null),
      pageCount: null,
      extractionStatus: text.length > 0 ? 'readable-text' : 'ocr-required',
      limitations: [
        'This non-PDF text file is readable, but it is not the primary parent upload target.',
      ],
    };
  }

  return {
    text: '',
    lines: [],
    pageCount: null,
    extractionStatus: 'unsupported-file-type',
    limitations: [
      'This file type is not supported by the Curriculum Source Artifact builder yet.',
    ],
  };
}

async function extractPdfObservableContent(file: File): Promise<SourceExtractionResult> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const parsedLines: ParsedLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    parsedLines.push(...getPdfPageLines(content.items as PdfTextItem[], pageNumber));
  }

  const text = cleanText(parsedLines.map((line) => line.text).join('\n'));
  const hasSelectableText = text.length >= 200;

  return {
    text,
    lines: parsedLines,
    pageCount: document.numPages,
    extractionStatus: hasSelectableText ? 'readable-text' : 'ocr-required',
    limitations: hasSelectableText
      ? ['Selectable PDF text was observed. OCR was not required for text extraction.']
      : [
          'Little or no selectable PDF text was observed.',
          'OCR is required before IterNest can observe text content from this artifact.',
        ],
  };
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (isNodeRuntime()) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    return pdfjs as unknown as PdfJsModule;
  }

  const pdfjs = await import('pdfjs-dist');

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  return pdfjs as unknown as PdfJsModule;
}

function isNodeRuntime() {
  const maybeProcess = (globalThis as { process?: { versions?: { node?: string } } }).process;

  return Boolean(maybeProcess?.versions?.node);
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

function buildPages(lines: ParsedLine[], pageCount: number | null): CurriculumSourcePage[] {
  if (!pageCount) {
    return [
      {
        id: 'source-page-text-1',
        pageNumber: 1,
        lineCount: lines.length,
        characterCount: lines.reduce((count, line) => count + line.text.length, 0),
        rawContentRef: 'text:page:1',
      },
    ];
  }

  return Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const pageLines = lines.filter((line) => line.pageNumber === pageNumber);

    return {
      id: `source-page-${pageNumber}`,
      pageNumber,
      lineCount: pageLines.length,
      characterCount: pageLines.reduce((count, line) => count + line.text.length, 0),
      rawContentRef: `pdf:page:${pageNumber}`,
    };
  });
}

function toObservedLine(file: File, line: ParsedLine): CurriculumSourceArtifact['observedLines'][number] {
  const pageKey = line.pageNumber ?? 'text';

  return {
    id: `${buildArtifactId(file)}-line-${pageKey}-${line.lineNumber}`,
    text: line.text,
    sourceLocation: formatSourceLocation(line),
    sourceOrder: line.pageNumber ? line.pageNumber * 1000 + line.lineNumber : line.lineNumber,
    rawContentRef: `${line.pageNumber ? 'pdf' : 'text'}:page:${line.pageNumber ?? 1}:line:${line.lineNumber}`,
  };
}

function findObservableStructuralPatterns(
  lines: ParsedLine[],
): CurriculumObservableStructuralPattern[] {
  return [
    ...findPageBoundaries(lines),
    ...findNumberedLines(lines),
    ...findCheckboxMarkers(lines),
    ...findRepeatedLines(lines),
    ...findShortUppercaseLines(lines),
  ];
}

function findPageBoundaries(lines: ParsedLine[]): CurriculumObservableStructuralPattern[] {
  const pageNumbers = Array.from(
    new Set(lines.map((line) => line.pageNumber).filter((page): page is number => page !== null)),
  );

  return pageNumbers.map((pageNumber) => ({
    id: `pattern-page-boundary-${pageNumber}`,
    patternType: 'page-boundary',
    description: `Page ${pageNumber} was observed as a distinct source boundary.`,
    sourceLocations: [`Page ${pageNumber}`],
    evidenceText: [],
  }));
}

function findNumberedLines(lines: ParsedLine[]): CurriculumObservableStructuralPattern[] {
  return lines
    .filter((line) => /^\s*(\d+[\).:-]|\d+\s)/.test(line.text))
    .slice(0, 50)
    .map((line) => ({
      id: `pattern-numbered-line-${line.pageNumber ?? 'text'}-${line.lineNumber}`,
      patternType: 'numbered-line',
      description: 'A line begins with a number marker.',
      sourceLocations: [formatSourceLocation(line)],
      evidenceText: [line.text],
    }));
}

function findCheckboxMarkers(lines: ParsedLine[]): CurriculumObservableStructuralPattern[] {
  return lines
    .filter((line) => /☐|□|\[[ xX]\]/.test(line.text))
    .slice(0, 50)
    .map((line) => ({
      id: `pattern-checkbox-${line.pageNumber ?? 'text'}-${line.lineNumber}`,
      patternType: 'checkbox-marker',
      description: 'A checkbox-like marker was observed in the source text.',
      sourceLocations: [formatSourceLocation(line)],
      evidenceText: [line.text],
    }));
}

function findRepeatedLines(lines: ParsedLine[]): CurriculumObservableStructuralPattern[] {
  const lineGroups = new Map<string, ParsedLine[]>();

  lines.forEach((line) => {
    const normalized = line.text.toLowerCase();
    const existing = lineGroups.get(normalized) ?? [];
    existing.push(line);
    lineGroups.set(normalized, existing);
  });

  return Array.from(lineGroups.entries())
    .filter(([, repeatedLines]) => repeatedLines.length > 1)
    .slice(0, 25)
    .map(([text, repeatedLines], index) => ({
      id: `pattern-repeated-line-${index + 1}`,
      patternType: 'repeated-line',
      description: 'The same line text appears more than once.',
      sourceLocations: repeatedLines.map(formatSourceLocation),
      evidenceText: [text],
    }));
}

function findShortUppercaseLines(lines: ParsedLine[]): CurriculumObservableStructuralPattern[] {
  return lines
    .filter((line) => line.text.length >= 3 && line.text.length <= 60)
    .filter((line) => /[A-Z]/.test(line.text) && line.text === line.text.toUpperCase())
    .slice(0, 50)
    .map((line) => ({
      id: `pattern-uppercase-${line.pageNumber ?? 'text'}-${line.lineNumber}`,
      patternType: 'short-uppercase-line',
      description: 'A short all-uppercase line was observed.',
      sourceLocations: [formatSourceLocation(line)],
      evidenceText: [line.text],
    }));
}

function buildFailedArtifact(file: File, error: unknown): CurriculumSourceArtifact {
  return {
    id: buildArtifactId(file),
    fileName: file.name,
    fileType: file.type || 'Unknown file type',
    fileSizeBytes: file.size,
    pageCount: null,
    readableTextLength: 0,
    extractionStatus: 'failed',
    limitations: [
      'The source artifact could not be read.',
      `Extraction failure: ${formatUnknownError(error)}`,
      ...classifyExtractionFailure(error),
    ],
    physicalStructure: {
      pageCount: null,
      lineCount: 0,
      hasSelectableText: false,
      pageSummaries: [],
    },
    pages: [],
    observedLines: [],
    observableStructuralPatterns: [],
  };
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function classifyExtractionFailure(error: unknown) {
  const errorText = formatUnknownError(error);

  if (/password|encrypted/i.test(errorText)) {
    return [
      'The PDF appears to be encrypted or password-protected. IterNest cannot observe its text without access to an unlocked copy.',
    ];
  }

  if (/DOMMatrix|ImageData|Path2D|canvas/i.test(errorText)) {
    return [
      'PDF parsing failed because the Node PDF extraction environment is missing a browser graphics API. This is a Node/pdfjs integration issue, not evidence that the curriculum lacks selectable text.',
    ];
  }

  if (/worker|fake worker|module/i.test(errorText)) {
    return [
      'PDF parsing failed while loading the PDF worker/module. This is a Node/pdfjs integration issue.',
    ];
  }

  return ['The extraction failure type is unknown.'];
}

function buildArtifactId(file: File) {
  return `source-artifact-${slugify(file.name)}-${file.size}`;
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
