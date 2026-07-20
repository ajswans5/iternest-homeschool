export type ImportDiagnosticStatus = 'started' | 'completed' | 'failed' | 'timed-out' | 'info';

export type ImportDiagnosticEvent = {
  stepId: string;
  label: string;
  status: ImportDiagnosticStatus;
  elapsedMs?: number;
  detail?: Record<string, unknown>;
  error?: string;
  timestamp: string;
};

export type ImportProgressReporter = (event: ImportDiagnosticEvent) => void;

type TraceOptions = {
  stepId: string;
  label: string;
  reporter?: ImportProgressReporter;
  timeoutMs?: number;
  detail?: Record<string, unknown>;
};

export async function traceImportStep<T>(
  options: TraceOptions,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  reportImportProgress(options.reporter, {
    stepId: options.stepId,
    label: options.label,
    status: 'started',
    detail: options.detail,
  });

  let timeoutId: number | undefined;

  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        if (!options.timeoutMs) {
          return;
        }

        timeoutId = window.setTimeout(() => {
          reject(new ImportStepTimeoutError(options.label, options.timeoutMs ?? 0));
        }, options.timeoutMs);
      }),
    ]);

    reportImportProgress(options.reporter, {
      stepId: options.stepId,
      label: options.label,
      status: 'completed',
      elapsedMs: elapsedSince(startedAt),
    });

    return result;
  } catch (error) {
    const status = error instanceof ImportStepTimeoutError ? 'timed-out' : 'failed';
    reportImportProgress(options.reporter, {
      stepId: options.stepId,
      label: options.label,
      status,
      elapsedMs: elapsedSince(startedAt),
      error: describeImportError(error),
      detail: {
        ...(options.detail ?? {}),
        thrownError: inspectImportError(error),
      },
    });
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function reportImportProgress(
  reporter: ImportProgressReporter | undefined,
  event: Omit<ImportDiagnosticEvent, 'timestamp'>,
) {
  const completeEvent: ImportDiagnosticEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  reporter?.(completeEvent);

  const consolePayload = {
    stepId: completeEvent.stepId,
    status: completeEvent.status,
    elapsedMs: completeEvent.elapsedMs,
    ...(completeEvent.detail ? { detail: completeEvent.detail } : {}),
    ...(completeEvent.error ? { error: completeEvent.error } : {}),
  };

  if (completeEvent.status === 'failed' || completeEvent.status === 'timed-out') {
    console.error(`[IterNest import diagnostic] ${completeEvent.label}`, consolePayload);
    return;
  }

  if (isImportDiagnosticConsoleEnabled()) {
    console.info(`[IterNest import diagnostic] ${completeEvent.label}`, consolePayload);
  }
}

export function describeImportError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown import error';
  }
}

export function inspectImportError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      type: typeof error,
      message: describeImportError(error),
      stack: null,
      parsedStackFrames: [],
    };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack ?? null,
    parsedStackFrames: parseStackFrames(error.stack),
  };
}

function parseStackFrames(stack: string | undefined) {
  if (!stack) {
    return [];
  }

  return stack
    .split('\n')
    .slice(1, 12)
    .map((rawFrame) => parseStackFrame(rawFrame.trim()));
}

function parseStackFrame(rawFrame: string) {
  const chromeMatch = rawFrame.match(/^at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/);

  if (chromeMatch) {
    return {
      rawFrame,
      functionName: chromeMatch[1] || null,
      sourceFile: chromeMatch[2],
      lineNumber: Number(chromeMatch[3]),
      columnNumber: Number(chromeMatch[4]),
    };
  }

  const safariMatch = rawFrame.match(/^(?:(.*?)@)?(.+?):(\d+):(\d+)$/);

  if (safariMatch) {
    return {
      rawFrame,
      functionName: safariMatch[1] || null,
      sourceFile: safariMatch[2],
      lineNumber: Number(safariMatch[3]),
      columnNumber: Number(safariMatch[4]),
    };
  }

  return {
    rawFrame,
    functionName: null,
    sourceFile: null,
    lineNumber: null,
    columnNumber: null,
  };
}

function elapsedSince(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

class ImportStepTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} exceeded ${timeoutMs}ms and was stopped so the UI would not wait forever.`);
    this.name = 'ImportStepTimeoutError';
  }
}

function isImportDiagnosticConsoleEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.localStorage.getItem('iternest-debug-import') === 'true' ||
    new URLSearchParams(window.location.search).get('debugImport') === 'true'
  );
}
