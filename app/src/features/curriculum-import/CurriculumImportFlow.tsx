import { useEffect, useMemo, useState } from 'react';
import type {
  LearnerContext,
  ParentDecision,
  ParentDecisionItem,
  ParentTeachingAction,
} from '../../domain/contracts';
import { analyzeCurriculumForParentDecision } from './curriculumDecisionPipeline';
import type { ApprovedLesson, CurriculumImportFile } from './types';

type ImportStep =
  | 'start'
  | 'upload'
  | 'analyzing-source'
  | 'parent-decision'
  | 'approved';

type CurriculumImportFlowProps = {
  onCancel: () => void;
  onApprove: (lessons: ApprovedLesson[]) => void;
};

const parentDecisionProgressSteps = [
  'Reading source evidence...',
  'Building one Lesson Model...',
  'Checking confidence and unknowns...',
  'Asking the Decision Engine what to surface...',
  'Preparing the parent decision...',
];

const analysisStepDurationMs = 500;
const minimumAnalysisDurationMs = parentDecisionProgressSteps.length * analysisStepDurationMs;

export function CurriculumImportFlow({ onCancel }: CurriculumImportFlowProps) {
  const [step, setStep] = useState<ImportStep>('start');
  const [selectedFile, setSelectedFile] = useState<CurriculumImportFile | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parentDecision, setParentDecision] = useState<ParentDecision | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentAnalysisStepIndex, setCurrentAnalysisStepIndex] = useState(0);

  const learnerContext = useMemo(() => buildPrototypeLearnerContext(), []);

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
      setParentDecision(null);
      setAnalysisError(null);
      return;
    }

    setUploadedFile(file);
    setParentDecision(null);
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
    setParentDecision(null);
    setAnalysisError(null);
    setStep('analyzing-source');

    try {
      const [decision] = await Promise.all([
        analyzeCurriculumForParentDecision(uploadedFile, learnerContext),
        wait(minimumAnalysisDurationMs),
      ]);

      setParentDecision(decision);
      setStep('parent-decision');
    } catch {
      setAnalysisError(
        'IterNest could not safely inspect this file in the browser. If this is a scanned curriculum PDF or photo, OCR is required before IterNest can build a reliable Lesson Model.',
      );
      setStep('parent-decision');
    }
  }

  function handleApproveParentDecision() {
    setStep('approved');
  }

  return (
    <main className="import-shell">
      <header className="import-header">
        <button className="text-button" onClick={onCancel} type="button">
          Back to dashboard
        </button>
        <p className="section-label">Curriculum Import</p>
        <h1>Let the Decision Engine decide what the parent sees.</h1>
        <p>
          The parser produces a Lesson Model. The Decision Engine combines that model
          with learner context and surfaces only the parent decision needed right now.
        </p>
      </header>

      {step === 'start' ? (
        <section className="import-card">
          <h2>Start with a curriculum PDF</h2>
          <p>
            IterNest will read the source, build one Lesson Model, and ask the Decision
            Engine what needs parent attention before anything is scheduled.
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
          decision={parentDecision}
          onApprove={handleApproveParentDecision}
        />
      ) : null}

      {step === 'approved' ? (
        <section className="import-card">
          <p className="section-label">Decision Confirmed</p>
          <h2>This parent decision has been confirmed.</h2>
          <p>
            No schedule or dashboard items were created. This confirms the current
            parent-facing decision only.
          </p>
          <button className="primary-action primary-action--inline" onClick={onCancel} type="button">
            Return to dashboard
          </button>
        </section>
      ) : null}
    </main>
  );
}

type ParentDecisionViewProps = {
  analysisError: string | null;
  decision: ParentDecision | null;
  onApprove: () => void;
};

function ParentDecisionView({ analysisError, decision, onApprove }: ParentDecisionViewProps) {
  if (analysisError) {
    return (
      <section className="decision-engine-card">
        <p className="section-label">Decision Engine</p>
        <h2>I don't have enough evidence to determine this.</h2>
        <p>{analysisError}</p>
      </section>
    );
  }

  if (!decision) {
    return (
      <section className="decision-engine-card">
        <p className="section-label">Decision Engine</p>
        <h2>I don't have enough evidence to determine this.</h2>
        <p>The curriculum analysis did not produce a parent decision yet.</p>
      </section>
    );
  }

  return (
    <section className="import-review">
      <section className="decision-engine-card">
        <p className="section-label">ParentDecision</p>
        <h2>{decision.headline}</h2>
        <p>{decision.summary}</p>

        <div className="import-summary" aria-label="Decision summary">
          <span>{decision.stage}</span>
          <span>{decision.confidence}</span>
          <span>{decision.approvalRequired ? 'Approval required' : 'No approval available'}</span>
        </div>

        <DecisionList decisions={decision.decisionsRequiredNow} />
        <TeachingActionList actions={decision.teachingActionsToSurface} />
        <StagedForLaterList stagedForLater={decision.stagedForLater} />
      </section>

      <section className="how-this-helps" aria-labelledby="decision-engine-helps-title">
        <h2 id="decision-engine-helps-title">How This Helps</h2>
        <p>{decision.approvalMeaning}</p>
      </section>

      <button
        className="primary-action primary-action--inline"
        disabled={!decision.approvalRequired || decision.stage === 'blocked-needs-parent-review'}
        onClick={onApprove}
        type="button"
      >
        Confirm Parent Decision
      </button>
    </section>
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
        <p>Parser output is becoming a Lesson Model, then a ParentDecision.</p>
      </div>

      <div className="analysis-progress" aria-label={`${progressPercent}% complete`}>
        <div className="analysis-progress__track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <span>{progressPercent}%</span>
      </div>

      <ol className="analysis-steps">
        {steps.map((analysisStep, index) => {
          const state =
            index < currentStepIndex
              ? 'complete'
              : index === currentStepIndex
                ? 'current'
                : 'upcoming';

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

function DecisionList({ decisions }: { decisions: ParentDecisionItem[] }) {
  if (decisions.length === 0) {
    return null;
  }

  return (
    <div className="decision-engine-list">
      <strong>Current parent decisions</strong>
      <ul>
        {decisions.map((decision) => (
          <li key={decision.id}>
            <span>{decision.prompt}</span>
            <small>{decision.whyNow}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeachingActionList({ actions }: { actions: ParentTeachingAction[] }) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="decision-engine-list">
      <strong>Teaching actions surfaced now</strong>
      <ul>
        {actions.map((action) => (
          <li key={action.id}>
            <span>{action.label}</span>
            <small>
              {action.actionType} - {action.confidence}
              {action.evidence[0] ? ` - ${action.evidence[0].sourceLocation}` : ''}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StagedForLaterList({
  stagedForLater,
}: {
  stagedForLater: ParentDecision['stagedForLater'];
}) {
  if (stagedForLater.length === 0) {
    return null;
  }

  return (
    <div className="decision-engine-list">
      <strong>Staged for later</strong>
      <ul>
        {stagedForLater.map((item) => (
          <li key={item.id}>
            <span>{item.lessonModelId ?? item.id}</span>
            <small>{item.reason}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function buildPrototypeLearnerContext(): LearnerContext {
  return {
    learnerId: 'prototype-learner',
    displayName: 'Prototype Learner',
    currentDate: new Date().toISOString().slice(0, 10),
    currentIndependenceLevel: 'shared-work',
    currentCapacity: 'typical',
    availableInstructionMinutes: null,
    parentCapacity: 'typical',
    recentSignals: [],
    supportNeeds: [],
    growthOpportunities: [],
    parentNotes: ['Prototype context until learner profiles are implemented.'],
  };
}
