import { useEffect, useState } from 'react';
import type { PersistedCurriculumRecord } from '../daily-cycle/dailyCyclePersistence';
import type {
  ParentDecisionV2,
  ParentDecisionV2AttentionItem,
  ParentDecisionV2Blocker,
  ParentDecisionV2ConfirmationItem,
  ParentDecisionV2DeferredItem,
  ParentDecisionV2UncertaintyItem,
} from '../parent-decision/contracts';
import {
  analyzeCurriculumForParentDecision,
  type CurriculumImportDecisionResult,
} from './curriculumDecisionPipeline';
import type { CurriculumImportFile } from './types';

type ImportStep = 'start' | 'upload' | 'analyzing-source' | 'parent-review' | 'approved';

type CurriculumImportFlowProps = {
  onCancel: () => void;
  onApprove: (curriculum: PersistedCurriculumRecord) => void;
};

const parentReviewProgressSteps = [
  'Opening the curriculum file...',
  'Reading the lesson text...',
  'Finding teachable work...',
  'Preparing the parent review...',
  'Building the daily-cycle preview...',
];

const analysisStepDurationMs = 500;
const minimumAnalysisDurationMs = parentReviewProgressSteps.length * analysisStepDurationMs;

export function CurriculumImportFlow({ onApprove, onCancel }: CurriculumImportFlowProps) {
  const [step, setStep] = useState<ImportStep>('start');
  const [selectedFile, setSelectedFile] = useState<CurriculumImportFile | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CurriculumImportDecisionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentAnalysisStepIndex, setCurrentAnalysisStepIndex] = useState(0);

  useEffect(() => {
    if (step !== 'analyzing-source') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentAnalysisStepIndex((currentIndex) => {
        if (currentIndex >= parentReviewProgressSteps.length - 1) {
          return currentIndex;
        }

        return currentIndex + 1;
      });
    }, analysisStepDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [currentAnalysisStepIndex, step]);

  function handleFileChange(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      setUploadedFile(null);
      setAnalysisResult(null);
      setAnalysisError(null);
      return;
    }

    setUploadedFile(file);
    setAnalysisResult(null);
    setAnalysisError(null);
    setSelectedFile({
      name: file.name,
      type: file.type || 'Unknown file type',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    });
  }

  async function handleAnalyzeCurriculum() {
    if (!uploadedFile) {
      return;
    }

    const debug = createImportFlowDebugTimer('CurriculumImportFlow.handleAnalyzeCurriculum');
    debug.checkpoint('Import started', {
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size,
      fileType: uploadedFile.type,
    });

    debug.before('setCurrentAnalysisStepIndex(0), clear state, setStep(analyzing-source)');
    setCurrentAnalysisStepIndex(0);
    setAnalysisResult(null);
    setAnalysisError(null);
    setStep('analyzing-source');
    debug.after('setCurrentAnalysisStepIndex(0), clear state, setStep(analyzing-source)');

    try {
      debug.before('create analysisPromise');
      const analysisPromise = analyzeCurriculumForParentDecision(uploadedFile).then((result) => {
        debug.after('analysisPromise resolved', {
          curriculumRecordId: result.curriculumRecord.id,
          learningTaskCount: result.curriculumRecord.dailyCycle.learningTasks.length,
          prepTaskCount: result.curriculumRecord.dailyCycle.prepTasks.length,
          readiness: result.decision.readiness.status,
        });
        return result;
      });
      debug.after('create analysisPromise');

      debug.before('create minimumDurationPromise');
      const minimumDurationPromise = wait(minimumAnalysisDurationMs).then(() => {
        debug.after('minimumDurationPromise resolved');
      });
      debug.after('create minimumDurationPromise');

      debug.before('await Promise.all([analysisPromise, minimumDurationPromise])');
      const [result] = await Promise.all([analysisPromise, minimumDurationPromise]);
      debug.after('await Promise.all([analysisPromise, minimumDurationPromise])');

      debug.before('setAnalysisResult(result)');
      setAnalysisResult(result);
      debug.after('setAnalysisResult(result)');

      debug.before("setStep('parent-review')");
      setStep('parent-review');
      debug.after("setStep('parent-review')");
    } catch (error) {
      logImportDebugError('CurriculumImportFlow.handleAnalyzeCurriculum | caught error', error);
      setAnalysisError(
        'IterNest could not safely inspect this file. If this is a scanned curriculum PDF or photo, OCR will be required before IterNest can build a reliable parent review.',
      );
      setStep('parent-review');
    }
  }

  function handleApproveParentReview() {
    const debug = createImportFlowDebugTimer('CurriculumImportFlow.handleApproveParentReview');
    debug.checkpoint('approval handler invoked', { hasAnalysisResult: Boolean(analysisResult) });

    if (!analysisResult) {
      debug.checkpoint('approval handler returned early: no analysisResult');
      return;
    }

    debug.before('onApprove(analysisResult.curriculumRecord)');
    onApprove(analysisResult.curriculumRecord);
    debug.after('onApprove(analysisResult.curriculumRecord)');

    debug.before("setStep('approved')");
    setStep('approved');
    debug.after("setStep('approved')");
  }

  return (
    <main className="import-shell">
      <header className="import-header">
        <button className="text-button" onClick={onCancel} type="button">
          Back to daily cycle
        </button>
        <p className="section-label">Curriculum Import</p>
        <h1>Review this curriculum before it becomes part of your day.</h1>
        <p>
          IterNest reads the source, shows what it can use, and asks for your approval
          before adding anything to the daily cycle.
        </p>
      </header>

      {step === 'start' ? (
        <section className="import-card">
          <h2>Start with a curriculum PDF</h2>
          <p>
            Uploading a curriculum creates a parent-reviewable preview of the first usable
            daily cycle: what to start with, what materials are needed, what can be printed,
            and what should be prepared for tomorrow.
          </p>
          <button className="primary-action primary-action--inline" onClick={() => setStep('upload')} type="button">
            Import Curriculum
          </button>
        </section>
      ) : null}

      {step === 'upload' ? (
        <section className="import-card">
          <h2>Upload and preview</h2>
          <label className="file-drop">
            <span>Choose photo or PDF</span>
            <small>Accepted for this MVP: curriculum PDFs and photos. Scans will be marked as needing OCR.</small>
            <input
              accept="image/*,.pdf,application/pdf"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>

          {selectedFile ? <ImportPreview file={selectedFile} /> : null}

          <button
            className="primary-action primary-action--inline"
            disabled={!selectedFile}
            onClick={handleAnalyzeCurriculum}
            type="button"
          >
            Analyze Curriculum
          </button>
        </section>
      ) : null}

      {step === 'analyzing-source' ? (
        <AnalysisStep
          currentStepIndex={currentAnalysisStepIndex}
          steps={parentReviewProgressSteps}
          title="Preparing your curriculum review"
        />
      ) : null}

      {step === 'parent-review' ? (
        <CurriculumParentReview
          analysisError={analysisError}
          result={analysisResult}
          onApprove={handleApproveParentReview}
        />
      ) : null}

      {step === 'approved' ? (
        <section className="import-card">
          <p className="section-label">Curriculum Saved</p>
          <h2>This curriculum is now the active daily-cycle source.</h2>
          <p>
            Your Start Here card, learning sequence, materials list, printable student sheets,
            and tomorrow-prep list will now come from this curriculum.
          </p>
          <button className="primary-action primary-action--inline" onClick={onCancel} type="button">
            Return to daily cycle
          </button>
        </section>
      ) : null}
    </main>
  );
}

type CurriculumParentReviewProps = {
  analysisError: string | null;
  result: CurriculumImportDecisionResult | null;
  onApprove: () => void;
};

function CurriculumParentReview({ analysisError, result, onApprove }: CurriculumParentReviewProps) {
  if (analysisError) {
    return (
      <section className="decision-engine-card">
        <p className="section-label">Curriculum Review</p>
        <h2>This file needs more help before IterNest can use it.</h2>
        <p>{analysisError}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="decision-engine-card">
        <p className="section-label">Curriculum Review</p>
        <h2>No review is ready yet.</h2>
        <p>Choose a curriculum file and run analysis first.</p>
      </section>
    );
  }

  const curriculum = result.curriculumRecord;
  const firstTask = curriculum.dailyCycle.learningTasks[0] ?? null;
  const materials = uniqueStrings(curriculum.dailyCycle.learningTasks.flatMap((task) => task.materials));
  const printableTasks = curriculum.dailyCycle.learningTasks.filter(
    (task) => task.audience === 'student' || task.audience === 'shared',
  );
  const hasReadableText = curriculum.source.readableTextLength > 0;

  return (
    <section className="import-review">
      <section className="decision-engine-card">
        <p className="section-label">Curriculum Review</p>
        <h2>{hasReadableText ? 'Here is the daily-cycle preview I can build.' : 'This source is not ready for daily-cycle use yet.'}</h2>
        <p>
          {hasReadableText
            ? 'Review the first usable teaching sequence below. Nothing is added to your day until you save it.'
            : 'I could save the file reference, but I cannot create teaching tasks from this source without readable text.'}
        </p>

        <div className="import-summary" aria-label="Curriculum review summary">
          <span>{curriculum.source.fileName}</span>
          <span>{curriculum.dailyCycle.learningTasks.length} learning tasks</span>
          <span>{curriculum.dailyCycle.prepTasks.length} prep items</span>
        </div>

        <ParentReviewSection title="What I found in the source">
          <ul>
            <li>Readable text: {hasReadableText ? 'yes' : 'not available'}</li>
            <li>Subjects found: {summaryList(curriculum.curriculum.subjectsFound.map((item) => item.value))}</li>
            <li>Lesson headings found: {summaryList(curriculum.curriculum.lessonHeadingsFound.map((item) => item.value))}</li>
            <li>Sections found: {summaryList(curriculum.curriculum.detectedSections.map((item) => item.label))}</li>
          </ul>
        </ParentReviewSection>

        {curriculum.source.limitations.length > 0 ? (
          <ParentReviewSection title="What still needs parent review">
            <ul>
              {curriculum.source.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </ParentReviewSection>
        ) : null}

        {firstTask ? (
          <ParentReviewSection title="Start Here preview">
            <strong>{firstTask.owner}</strong>
            <p>{firstTask.title}</p>
            <small>{firstTask.duration} - {firstTask.mode}</small>
            <p>{firstTask.reason}</p>
          </ParentReviewSection>
        ) : null}

        {curriculum.dailyCycle.learningTasks.length > 0 ? (
          <ParentReviewSection title="Learning sequence preview">
            <ol>
              {curriculum.dailyCycle.learningTasks.map((task) => (
                <li key={task.id}>
                  <span>{task.title}</span>
                  <small>{task.mode} - {task.duration}</small>
                </li>
              ))}
            </ol>
          </ParentReviewSection>
        ) : null}

        {materials.length > 0 ? (
          <ParentReviewSection title="Materials reminder">
            <ul>
              {materials.map((material) => <li key={material}>{material}</li>)}
            </ul>
          </ParentReviewSection>
        ) : null}

        {printableTasks.length > 0 ? (
          <ParentReviewSection title="Printable student sheets">
            <ul>
              {printableTasks.map((task) => <li key={task.id}>{task.title}</li>)}
            </ul>
          </ParentReviewSection>
        ) : null}

        {curriculum.dailyCycle.prepTasks.length > 0 ? (
          <ParentReviewSection title="Tomorrow prep preview">
            <ul>
              {curriculum.dailyCycle.prepTasks.map((task) => (
                <li key={task.id}>{task.title}</li>
              ))}
            </ul>
          </ParentReviewSection>
        ) : null}
      </section>

      {isImportDebugEnabled() ? <DebugDecisionView decision={result.decision} /> : null}

      <button
        className="primary-action primary-action--inline"
        disabled={curriculum.dailyCycle.learningTasks.length === 0}
        onClick={onApprove}
        type="button"
      >
        Save Curriculum to Daily Cycle
      </button>
    </section>
  );
}

function ParentReviewSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="decision-engine-list">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

function DebugDecisionView({ decision }: { decision: ParentDecisionV2 }) {
  return (
    <section className="how-this-helps" aria-labelledby="debug-decision-title">
      <h2 id="debug-decision-title">Developer Debug</h2>
      <p>This section is hidden unless import debug mode is enabled.</p>
      <div className="import-summary" aria-label="Debug decision summary">
        <span>{decision.readiness.status}</span>
        <span>{decision.confidence.level}</span>
        <span>{decision.evidenceTraces.length} traces</span>
      </div>
      <SourceSummaryStatuses decision={decision} />
      <AttentionList items={decision.attentionRequired} />
      <ConfirmationList items={decision.confirmationsRequired} />
      <BlockerList items={decision.blockers} />
      <UncertaintyList items={decision.unresolvedUncertainty} />
      <DeferredList items={decision.deferredItems} />
    </section>
  );
}

function SourceSummaryStatuses({ decision }: { decision: ParentDecisionV2 }) {
  return (
    <div className="decision-engine-list">
      <strong>Source summaries</strong>
      <ul>
        {decision.readiness.sourceSummaryStatuses.map((summary) => (
          <li key={summary.subsystem}>
            <span>{formatSubsystem(summary.subsystem)}</span>
            <small>{summary.status}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttentionList({ items }: { items: ParentDecisionV2AttentionItem[] }) {
  if (items.length === 0) return null;

  return <DecisionList title="Needs attention" items={items.map((item) => ({ id: item.id, label: item.label, detail: item.reason }))} />;
}

function ConfirmationList({ items }: { items: ParentDecisionV2ConfirmationItem[] }) {
  if (items.length === 0) return null;

  return <DecisionList title="Confirmations required" items={items.map((item) => ({ id: item.id, label: item.prompt, detail: item.reason }))} />;
}

function BlockerList({ items }: { items: ParentDecisionV2Blocker[] }) {
  if (items.length === 0) return null;

  return <DecisionList title="Blockers" items={items.map((item) => ({ id: item.id, label: item.label, detail: item.reason }))} />;
}

function UncertaintyList({ items }: { items: ParentDecisionV2UncertaintyItem[] }) {
  if (items.length === 0) return null;

  return <DecisionList title="Unresolved uncertainty" items={items.map((item) => ({ id: item.id, label: item.question, detail: item.reason }))} />;
}

function DeferredList({ items }: { items: ParentDecisionV2DeferredItem[] }) {
  if (items.length === 0) return null;

  return <DecisionList title="Deferred by ParentDecisionV2" items={items.map((item) => ({ id: item.id, label: formatSubsystem(item.subsystem), detail: item.reason }))} />;
}

function DecisionList({
  items,
  title,
}: {
  items: Array<{ id: string; label: string; detail: string }>;
  title: string;
}) {
  return (
    <div className="decision-engine-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.label}</span>
            <small>{item.detail}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

type AnalysisStepProps = {
  currentStepIndex: number;
  steps: string[];
  title: string;
};

function AnalysisStep({ currentStepIndex, steps, title }: AnalysisStepProps) {
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <section className="import-card import-card--centered analysis-card" aria-live="polite">
      <div className="loading-dot" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>IterNest is reading the curriculum and preparing a parent review.</p>
      </div>

      <div className="analysis-progress" aria-label={`${progressPercent}% complete`}>
        <div className="analysis-progress__track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <span>{progressPercent}%</span>
      </div>

      <ol className="analysis-steps">
        {steps.map((analysisStep, index) => {
          const state = index < currentStepIndex ? 'complete' : index === currentStepIndex ? 'current' : 'upcoming';

          return (
            <li className={`analysis-step analysis-step--${state}`} key={analysisStep}>
              <span aria-hidden="true" />
              {analysisStep}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type ImportPreviewProps = {
  file: CurriculumImportFile;
};

function ImportPreview({ file }: ImportPreviewProps) {
  return (
    <div className="import-preview">
      {file.previewUrl ? (
        <img alt={`Preview of ${file.name}`} src={file.previewUrl} />
      ) : (
        <div className="import-preview__pdf" aria-label="PDF selected">
          PDF
        </div>
      )}
      <div>
        <p className="import-preview__name">{file.name}</p>
        <p className="import-preview__type">{file.type}</p>
      </div>
    </div>
  );
}

function formatSubsystem(subsystem: ParentDecisionV2['readiness']['sourceSummaryStatuses'][number]['subsystem']) {
  return subsystem
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function summaryList(items: string[]) {
  const uniqueItems = uniqueStrings(items).slice(0, 5);

  if (uniqueItems.length === 0) {
    return 'none clearly identified yet';
  }

  return uniqueItems.join(', ');
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

type ImportFlowDebugDetails = Record<string, unknown>;

function createImportFlowDebugTimer(scope: string) {
  const startedAt = performance.now();
  let lastAt = startedAt;

  function log(label: string, details?: ImportFlowDebugDetails) {
    if (!isImportDebugEnabled()) {
      return;
    }

    const now = performance.now();
    const elapsedMs = Math.round(now - startedAt);
    const deltaMs = Math.round(now - lastAt);
    lastAt = now;
    console.info(`[IterNest import] ${scope} | ${label}`, {
      elapsedMs,
      deltaMs,
      ...(details ?? {}),
    });
  }

  return {
    before(statement: string, details?: ImportFlowDebugDetails) {
      log(`BEFORE ${statement}`, details);
    },
    after(statement: string, details?: ImportFlowDebugDetails) {
      log(`AFTER ${statement}`, details);
    },
    checkpoint(label: string, details?: ImportFlowDebugDetails) {
      log(label, details);
    },
  };
}

function logImportDebugError(message: string, error: unknown) {
  if (isImportDebugEnabled()) {
    console.error(`[IterNest import] ${message}`, error);
  }
}

function isImportDebugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.localStorage.getItem('iternest-debug-import') === 'true' ||
    new URLSearchParams(window.location.search).get('debugImport') === 'true'
  );
}
