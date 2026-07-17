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

  console.info(`[IterNest import diagnostic] ${completeEvent.label}`, consolePayload);
}

export function describeImportError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
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

function elapsedSince(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

class ImportStepTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} exceeded ${timeoutMs}ms and was stopped so the UI would not wait forever.`);
    this.name = 'ImportStepTimeoutError';
  }
}
