import { useState } from 'react';
import { RecenterDayPanel, type RecenterOption } from '../components/RecenterDayPanel';
import { CurriculumImportFlow } from '../features/curriculum-import/CurriculumImportFlow';
import type { ApprovedLesson } from '../features/curriculum-import/types';
import '../styles/parent-home.css';
import { CurriculumLibraryPage } from './CurriculumLibraryPage';

type HomeView = 'briefing' | 'jack' | 'approval';

const recenterOptions: RecenterOption[] = [
  {
    label: 'We started late',
    description: 'Protect the most important work and reset the order of the day.',
  },
  {
    label: 'We have less time today',
    description: 'Keep essentials visible and move flexible work aside.',
  },
  {
    label: 'Someone needs a smaller start',
    description: 'Reduce the first step without losing the purpose of the lesson.',
  },
  {
    label: 'Move flexible work',
    description: 'Save optional tasks for another day.',
  },
];

const startHere = {
  student: 'Jack',
  task: 'Independent handwriting',
  duration: '15 minutes',
  reason: "Starting Jack now gives you time to prepare Remi's grammar lesson.",
};

const nextActivity = {
  student: 'Remi',
  task: 'Grammar lesson',
  duration: '20 minutes',
};

const beforeLunch = {
  task: 'Print spelling quiz',
  detail: 'Have it ready before the morning lessons wrap up.',
};

const attentionItem = {
  task: 'Catch-up recommendation',
  detail: 'Review and approve the proposed adjustment before anything changes.',
};

export function ParentDashboardPage() {
  const [activeView, setActiveView] = useState<HomeView>('briefing');
  const [isRecenterPanelOpen, setIsRecenterPanelOpen] = useState(false);
  const [isImportFlowOpen, setIsImportFlowOpen] = useState(false);
  const [isCurriculumLibraryOpen, setIsCurriculumLibraryOpen] = useState(false);
  const [approvedImportedLessons, setApprovedImportedLessons] = useState<ApprovedLesson[]>([]);
  const [isCatchUpApproved, setIsCatchUpApproved] = useState(false);
  const [isHandwritingComplete, setIsHandwritingComplete] = useState(false);

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  if (isImportFlowOpen) {
    return (
      <CurriculumImportFlow
        onApprove={(lessons) => setApprovedImportedLessons(lessons)}
        onCancel={() => setIsImportFlowOpen(false)}
      />
    );
  }

  if (isCurriculumLibraryOpen) {
    return (
      <CurriculumLibraryPage
        onBackToDashboard={() => setIsCurriculumLibraryOpen(false)}
      />
    );
  }

  if (activeView === 'jack') {
    return (
      <main className="focus-view">
        <button
          className="focus-view__back"
          onClick={() => setActiveView('briefing')}
          type="button"
        >
          ← Back to today
        </button>

        <header className="focus-view__header">
          <p className="focus-view__eyebrow">Jack · Start here</p>
          <h1>{startHere.task}</h1>
          <p>{startHere.duration} · Independent</p>
        </header>

        <section className="focus-view__lesson" aria-labelledby="jack-instructions-title">
          <p className="home-briefing__section-label">Ready for Jack</p>
          <h2 id="jack-instructions-title">Complete today&apos;s handwriting page.</h2>
          <p>
            Jack can begin this without parent instruction. Keep the page and pencil ready,
            then use the time to prepare Remi&apos;s grammar lesson.
          </p>

          <div className="focus-view__steps" aria-label="Handwriting steps">
            <span>1</span>
            <p>Open the assigned handwriting page.</p>
            <span>2</span>
            <p>Complete the copywork carefully.</p>
            <span>3</span>
            <p>Leave the page for parent review.</p>
          </div>

          <button
            className="home-briefing__primary-button"
            onClick={() => setIsHandwritingComplete(true)}
            type="button"
          >
            {isHandwritingComplete ? 'Handwriting marked complete' : 'Mark handwriting complete'}
          </button>
        </section>

        {isHandwritingComplete ? (
          <section className="focus-view__next" aria-live="polite">
            <p className="home-briefing__section-label">You&apos;re ready for the next step</p>
            <h2>Teach Remi&apos;s grammar lesson.</h2>
            <p>Estimated time: {nextActivity.duration}</p>
            <button
              className="home-briefing__attention-button"
              onClick={() => setActiveView('briefing')}
              type="button"
            >
              Return to today
            </button>
          </section>
        ) : null}
      </main>
    );
  }

  if (activeView === 'approval') {
    return (
      <main className="focus-view">
        <button
          className="focus-view__back"
          onClick={() => setActiveView('briefing')}
          type="button"
        >
          ← Back to today
        </button>

        <header className="focus-view__header">
          <p className="focus-view__eyebrow">Needs your attention</p>
          <h1>Catch-up recommendation</h1>
          <p>Nothing changes until you approve it.</p>
        </header>

        <section className="focus-view__lesson focus-view__lesson--approval">
          <p className="home-briefing__section-label">Suggested adjustment</p>
          <h2>Move unfinished spelling practice to tomorrow.</h2>
          <p>
            This keeps today&apos;s teacher-led grammar lesson in place while preserving the
            unfinished spelling work for the next school day.
          </p>

          <div className="focus-view__decision-note">
            <strong>Why this surfaced</strong>
            <p>Spelling is flexible. Remi&apos;s grammar lesson needs your attention today.</p>
          </div>

          <div className="focus-view__actions">
            <button
              className="home-briefing__primary-button"
              onClick={() => setIsCatchUpApproved(true)}
              type="button"
            >
              {isCatchUpApproved ? 'Recommendation approved' : 'Approve adjustment'}
            </button>
            <button
              className="home-briefing__utility-button home-briefing__utility-button--quiet"
              onClick={() => setActiveView('briefing')}
              type="button"
            >
              Keep today&apos;s plan
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="home-briefing">
      <header className="home-briefing__topbar">
        <a className="home-briefing__brand" href="/" aria-label="IterNest home">
          <span className="home-briefing__brand-mark" aria-hidden="true">I</span>
          <span className="home-briefing__brand-name">IterNest</span>
        </a>
        <p className="home-briefing__date">{today}</p>
      </header>

      <section className="home-briefing__intro" aria-labelledby="home-briefing-title">
        <p className="home-briefing__eyebrow">Good morning</p>
        <h1 className="home-briefing__title" id="home-briefing-title">
          Here&apos;s where to begin.
        </h1>
        <p className="home-briefing__subtitle">
          The first part of your homeschool day, in the order that makes it easier to teach.
        </p>
      </section>

      <section className="home-briefing__hero" aria-labelledby="start-here-title">
        <p className="home-briefing__section-label">Start here</p>
        <p className="home-briefing__person">{startHere.student}</p>
        <h2 className="home-briefing__task" id="start-here-title">{startHere.task}</h2>
        <span className="home-briefing__duration">{startHere.duration}</span>
        <p className="home-briefing__reason">
          <strong>Why this first:</strong> {startHere.reason}
        </p>
        <button
          className="home-briefing__primary-button"
          onClick={() => setActiveView('jack')}
          type="button"
        >
          Open {startHere.student}
        </button>
      </section>

      <div className="home-briefing__grid">
        <section className="home-briefing__card" aria-labelledby="next-title">
          <p className="home-briefing__section-label">Next</p>
          <div className="home-briefing__card-row">
            <div>
              <h2 id="next-title">{nextActivity.student}</h2>
              <p>{nextActivity.task}</p>
            </div>
            <span className="home-briefing__meta">{nextActivity.duration}</span>
          </div>
        </section>

        <section className="home-briefing__card" aria-labelledby="before-lunch-title">
          <p className="home-briefing__section-label">Before lunch</p>
          <h2 id="before-lunch-title">{beforeLunch.task}</h2>
          <p>{beforeLunch.detail}</p>
        </section>

        <section
          className="home-briefing__card home-briefing__card--attention"
          aria-labelledby="attention-title"
        >
          <p className="home-briefing__section-label">Needs your attention</p>
          <h2 id="attention-title">
            {isCatchUpApproved ? 'Approved: ' : 'Approve: '}{attentionItem.task}
          </h2>
          <p>
            {isCatchUpApproved
              ? 'The adjustment is approved and ready for the next planning update.'
              : attentionItem.detail}
          </p>
          <button
            className="home-briefing__attention-button"
            onClick={() => setActiveView('approval')}
            type="button"
          >
            {isCatchUpApproved ? 'View approved recommendation' : 'Review recommendation'}
          </button>
        </section>
      </div>

      {approvedImportedLessons.length > 0 ? (
        <p className="home-briefing__import-note">
          {approvedImportedLessons.length} imported lesson
          {approvedImportedLessons.length === 1 ? '' : 's'} approved and ready.
        </p>
      ) : null}

      <nav className="home-briefing__utilities" aria-label="Parent tools">
        <button
          className="home-briefing__utility-button"
          onClick={() => setIsRecenterPanelOpen(true)}
          type="button"
        >
          Recenter today
        </button>
        <button
          className="home-briefing__utility-button home-briefing__utility-button--quiet"
          onClick={() => setIsImportFlowOpen(true)}
          type="button"
        >
          Import curriculum
        </button>
        <button
          className="home-briefing__utility-button home-briefing__utility-button--quiet"
          onClick={() => setIsCurriculumLibraryOpen(true)}
          type="button"
        >
          Curriculum library
        </button>
      </nav>

      {isRecenterPanelOpen ? (
        <RecenterDayPanel
          onClose={() => setIsRecenterPanelOpen(false)}
          options={recenterOptions}
        />
      ) : null}
    </main>
  );
}
