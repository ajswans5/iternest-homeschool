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

type ImportStep = 'start' | 'upload' | 'analyzing-source' | 'parent-decision' | 'approved';

type CurriculumImportFlowProps = {
  onCancel: () => void;
  onApprove: (curriculum: PersistedCurriculumRecord) => void;
};

const parentDecisionProgressSteps = [
  'Reading source evidence...',
  'Building curriculum intelligence summary...',
  'Assembling decision context...',
  'Running ParentDecisionV2...',
  'Preparing the daily-cycle record...',
];

const analysisStepDurationMs = 500;
const minimumAnalysisDurationMs = parentDecisionProgressSteps.length * analysisStepDurationMs;

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
        if (currentIndex >= parentDecisionProgressSteps.length - 1) {
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

    setCurrentAnalysisStepIndex(0);
    setAnalysisResult(null);
    setAnalysisError(null);
    setStep('analyzing-source');

    try {
      const [result] = await Promise.all([
        analyzeCurriculumForParentDecision(uploadedFile),
        wait(minimumAnalysisDurationMs),
      ]);

      setAnalysisResult(result);
      setStep('parent-decision');
    } catch {
      setAnalysisError(
        'IterNest could not safely inspect this file in the browser. If this is a scanned curriculum PDF or photo, OCR is required before IterNest can build a reliable Decision Context.',
      );
      setStep('parent-decision');
    }
  }

  function handleApproveParentDecision() {
    if (!analysisResult) {
      return;
    }

    onApprove(analysisResult.curriculumRecord);
    setStep('approved');
  }

  return (
    <main className="import-shell">
      <header className="import-header">
        <button className="text-button" onClick={onCancel} type="button">
          Back to daily cycle
        </button>
        <p className="section-label">Curriculum Import</p>
        <h1>Import curriculum into the daily cycle.</h1>
        <p>
          IterNest reads the source, preserves uncertainty, builds a ParentDecisionV2 result,
          and stores the approved curriculum as the active daily-cycle source.
        </p>
      </header>

      {step === 'start' ? (
        <section className="import-card">
          <h2>Start with a curriculum PDF</h2>
          <p>
            Uploading a different curriculum creates a different Start Here task, sequence,
            materials reminder, printable student sheet, and tomorrow-prep list.
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
          steps={parentDecisionProgressSteps}
          title="Building the parent decision"
        />
      ) : null}

      {step === 'parent-decision' ? (
        <ParentDecisionView
          analysisError={analysisError}
          decision={analysisResult?.decision ?? null}
          onApprove={handleApproveParentDecision}
        />
      ) : null}

      {step === 'approved' ? (
        <section className="import-card">
          <p className="section-label">Curriculum Saved</p>
          <h2>This curriculum is now the active daily-cycle source.</h2>
          <p>
            The daily-cycle UI will read from the persisted curriculum record, its continuity state,
            and the ParentDecisionV2 data generated during import.
          </p>
          <button className="primary-action primary-action--inline" onClick={onCancel} type="button">
            Return to daily cycle
          </button>
        </section>
      ) : null}
    </main>
  );
}

type ParentDecisionViewProps = {
  analysisError: string | null;
  decision: ParentDecisionV2 | null;
  onApprove: () => void;
};

function ParentDecisionView({ analysisError, decision, onApprove }: ParentDecisionViewProps) {
  if (analysisError) {
    return (
      <section className="decision-engine-card">
        <p className="section-label">ParentDecisionV2</p>
        <h2>I don't have enough evidence to determine this.</h2>
        <p>{analysisError}</p>
      </section>
    );
  }

  if (!decision) {
    return (
      <section className="decision-engine-card">
        <p className="section-label">ParentDecisionV2</p>
        <h2>I don't have enough evidence to determine this.</h2>
        <p>The curriculum analysis did not produce a parent decision yet.</p>
      </section>
    );
  }

  return (
    <section className="import-review">
      <section className="decision-engine-card">
        <p className="section-label">ParentDecisionV2</p>
        <h2>{readinessTitle(decision)}</h2>
        <p>{decision.readiness.rationale}</p>

        <div className="import-summary" aria-label="Decision summary">
          <span>{decision.readiness.status}</span>
          <span>{decision.confidence.level}</span>
          <span>{decision.evidenceTraces.length} evidence traces</span>
        </div>

        <SourceSummaryStatuses decision={decision} />
        <AttentionList items={decision.attentionRequired} />
        <ConfirmationList items={decision.confirmationsRequired} />
        <BlockerList items={decision.blockers} />
        <UncertaintyList items={decision.unresolvedUncertainty} />
        <DeferredList items={decision.deferredItems} />
      </section>

      <section className="how-this-helps" aria-labelledby="decision-engine-helps-title">
        <h2 id="decision-engine-helps-title">What will be saved</h2>
        <p>
          Confirming stores the imported curriculum, explicit unknowns, continuity state,
          and ParentDecisionV2 output. It does not invent family or learner realities.
        </p>
      </section>

      <button className="primary-action primary-action--inline" onClick={onApprove} type="button">
        Save Curriculum to Daily Cycle
      </button>
    </section>
  );
}

function readinessTitle(decision: ParentDecisionV2) {
  if (decision.readiness.status === 'ready') {
    return 'The parent decision is ready for review.';
  }

  if (decision.readiness.status === 'limited') {
    return 'The parent decision is available with uncertainty.';
  }

  if (decision.readiness.status === 'blocked') {
    return 'The parent decision is blocked, but the source limitation can be saved.';
  }

  return 'No parent decision is available yet.';
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
        <p>Source evidence is becoming DecisionContext, ParentDecisionV2, and persisted daily-cycle data.</p>
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

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
