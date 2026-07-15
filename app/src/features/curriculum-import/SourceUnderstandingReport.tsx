import type { ReactNode } from 'react';
import type {
  SourceFinding,
  SourceInference,
  SourceQuestion,
  UploadedCurriculumAnalysis,
} from './types';

type SourceUnderstandingReportProps = {
  analysis: UploadedCurriculumAnalysis | null;
  error: string | null;
  onContinue: () => void;
  primaryActionDisabled?: boolean;
  primaryActionLabel?: string;
};

export function SourceUnderstandingReport({
  analysis,
  error,
  onContinue,
  primaryActionDisabled = false,
  primaryActionLabel = 'Run Lesson Understanding Engine',
}: SourceUnderstandingReportProps) {
  if (error) {
    return (
      <section className="import-card">
        <p className="section-label">Source Understanding</p>
        <h2>I could not read this upload safely.</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="import-card import-card--centered" aria-live="polite">
        <div className="loading-dot" aria-hidden="true" />
        <h2>Preparing the source report...</h2>
      </section>
    );
  }

  return (
    <section className="source-report">
      <div className="import-card">
        <p className="section-label">Source Evidence Report</p>
        <h2>Debug view: here is the text evidence I read.</h2>
        <p>
          This is not the Lesson Understanding Engine. It is the evidence/debug stage
          that shows what the PDF reader found before the engine analyzes one lesson.
        </p>

        <div className="source-file-summary" aria-label="Uploaded file summary">
          <span>{analysis.fileName}</span>
          <span>{analysis.fileType}</span>
          <span>{analysis.fileSizeLabel}</span>
          <span>
            {analysis.pageCount
              ? `${analysis.pageCount} pages detected`
              : 'Page count unknown'}
          </span>
          <span>{analysis.readableTextLength.toLocaleString()} readable characters</span>
        </div>

        {analysis.limitations.length > 0 ? (
          <ul className="source-limitations" aria-label="Reading limitations">
            {analysis.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="source-report-grid">
        <ReportPanel title="Documents, Pages, and Sections">
          <FindingList emptyMessage="No document sections were clearly detected." findings={analysis.detectedSections} />
          <FindingList emptyMessage="No page or checklist signals were clearly detected." findings={analysis.structuralFindings} />
        </ReportPanel>

        <ReportPanel title="Subjects Found">
          <FindingList emptyMessage="No subject names were clearly found in readable text." findings={analysis.subjectsFound} />
        </ReportPanel>

        <ReportPanel title="Lesson Headings Found">
          <FindingList emptyMessage="No lesson, week, or day headings were clearly found." findings={analysis.lessonHeadingsFound} />
        </ReportPanel>

        <ReportPanel title="What I Found Directly">
          <FindingList emptyMessage="No source facts were found clearly enough to use yet." findings={analysis.directFindings} />
        </ReportPanel>

        <ReportPanel title="What I Inferred">
          <InferenceList inferences={analysis.inferences} />
        </ReportPanel>

        <ReportPanel title="What I'm Unsure About">
          <QuestionList questions={analysis.questions} />
        </ReportPanel>
      </div>

      <section className="blueprint-preview" aria-labelledby="draft-blueprint-title">
        <p className="section-label">Engine Readiness</p>
        <h2 id="draft-blueprint-title">
          {analysis.draftBlueprint.status === 'draftable'
            ? 'Ready to run the one-lesson engine.'
            : 'The one-lesson engine may not have enough evidence yet.'}
        </h2>
        <p>{analysis.draftBlueprint.summary}</p>

        <div className="source-file-summary" aria-label="Draft blueprint summary">
          <span>
            {analysis.draftBlueprint.includedSubjects.length > 0
              ? `${analysis.draftBlueprint.includedSubjects.length} subjects`
              : 'Subjects unknown'}
          </span>
          <span>{analysis.draftBlueprint.nextStep}</span>
        </div>
      </section>

      <section className="how-this-helps" aria-labelledby="source-report-helps-title">
        <h2 id="source-report-helps-title">How This Helps</h2>
        <p>
          Direct findings are source facts. Inferences are guesses with a reason. Questions
          are places where IterNest should ask you instead of pretending it knows. The
          next screen is the actual Lesson Understanding Engine.
        </p>
      </section>

      <button
        className="primary-action primary-action--inline"
        disabled={primaryActionDisabled}
        onClick={onContinue}
        type="button"
      >
        {primaryActionLabel}
      </button>
    </section>
  );
}

type ReportPanelProps = {
  children: ReactNode;
  title: string;
};

function ReportPanel({ children, title }: ReportPanelProps) {
  return (
    <section className="source-report-panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

type FindingListProps = {
  emptyMessage: string;
  findings: SourceFinding[];
};

function FindingList({ emptyMessage, findings }: FindingListProps) {
  if (findings.length === 0) {
    return <p className="source-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="source-finding-list">
      {findings.map((finding) => (
        <li className="source-finding" key={finding.id}>
          <div>
            <span>{finding.label}</span>
            <strong>{finding.value}</strong>
          </div>
          <p>{finding.evidence}</p>
          <small>{finding.sourceLocation}</small>
        </li>
      ))}
    </ul>
  );
}

function InferenceList({ inferences }: { inferences: SourceInference[] }) {
  if (inferences.length === 0) {
    return <p className="source-empty">No pattern-based guesses were made.</p>;
  }

  return (
    <ul className="source-finding-list">
      {inferences.map((inference) => (
        <li className="source-finding source-finding--inference" key={inference.id}>
          <div>
            <span>{inference.confidence === 'high' ? 'High confidence guess' : 'Review needed'}</span>
            <strong>{inference.guess}</strong>
          </div>
          <p>{inference.why}</p>
          <small>{inference.sourceLocation}</small>
        </li>
      ))}
    </ul>
  );
}

function QuestionList({ questions }: { questions: SourceQuestion[] }) {
  if (questions.length === 0) {
    return <p className="source-empty">No open questions yet.</p>;
  }

  return (
    <ul className="source-finding-list">
      {questions.map((question) => (
        <li className="source-finding source-finding--question" key={question.id}>
          <div>
            <span>Parent question</span>
            <strong>{question.question}</strong>
          </div>
          <p>{question.reason}</p>
        </li>
      ))}
    </ul>
  );
}
