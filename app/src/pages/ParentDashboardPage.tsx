import { useState } from 'react';
import { RecenterDayPanel, type RecenterOption } from '../components/RecenterDayPanel';
import { CurriculumImportFlow } from '../features/curriculum-import/CurriculumImportFlow';
import type { ApprovedLesson } from '../features/curriculum-import/types';
import '../styles/parent-home.css';
import { CurriculumLibraryPage } from './CurriculumLibraryPage';

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
  const [isRecenterPanelOpen, setIsRecenterPanelOpen] = useState(false);
  const [isImportFlowOpen, setIsImportFlowOpen] = useState(false);
  const [isCurriculumLibraryOpen, setIsCurriculumLibraryOpen] = useState(false);
  const [approvedImportedLessons, setApprovedImportedLessons] = useState<ApprovedLesson[]>([]);

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
        <button className="home-briefing__primary-button" type="button">
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
          <h2 id="attention-title">Approve: {attentionItem.task}</h2>
          <p>{attentionItem.detail}</p>
          <button className="home-briefing__attention-button" type="button">
            Review recommendation
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
