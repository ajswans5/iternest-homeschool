import { useState } from 'react';
import { ApprovalQueueItem } from '../components/ApprovalQueueItem';
import { DashboardStatusBar } from '../components/DashboardStatusBar';
import { LessonStatusItem, type LessonStatus } from '../components/LessonStatusItem';
import { RecenterDayPanel, type RecenterOption } from '../components/RecenterDayPanel';
import { StudentOverviewCard, type StudentTodayStatus } from '../components/StudentOverviewCard';
import { SummaryCard } from '../components/SummaryCard';
import { CurriculumImportFlow } from '../features/curriculum-import/CurriculumImportFlow';
import type { ApprovedLesson } from '../features/curriculum-import/types';
import { CurriculumLibraryPage } from './CurriculumLibraryPage';

type SummaryMetric = {
  label: string;
  value: number;
  helperText: string;
};

type Lesson = {
  id: string;
  subject: string;
  status: LessonStatus;
  statusLabel: string;
};

type StudentOverview = {
  name: string;
  todayStatus: StudentTodayStatus;
  todayStatusLabel: string;
  lessonsToday: number;
  nextAction: string;
  progressPercent: number;
};

type ApprovalItem = {
  studentName: string;
  subject: string;
  approvalNeeded: string;
  suggestedAction: string;
};

const students: StudentOverview[] = [
  {
    name: 'Avery',
    todayStatus: 'on-track',
    todayStatusLabel: 'On track',
    lessonsToday: 3,
    nextAction: 'Review reading reflection',
    progressPercent: 72,
  },
  {
    name: 'Milo',
    todayStatus: 'needs-parent',
    todayStatusLabel: 'Needs parent',
    lessonsToday: 2,
    nextAction: 'Approve science activity',
    progressPercent: 45,
  },
  {
    name: 'Nora',
    todayStatus: 'behind',
    todayStatusLabel: 'Behind',
    lessonsToday: 2,
    nextAction: 'Restart math practice',
    progressPercent: 28,
  },
];

const approvalQueue: ApprovalItem[] = [
  {
    studentName: 'Avery',
    subject: 'Reading',
    approvalNeeded: 'Reading reflection is ready',
    suggestedAction: 'Approve the reflection or leave a note before tomorrow.',
  },
  {
    studentName: 'Milo',
    subject: 'Science',
    approvalNeeded: 'Experiment photo needs review',
    suggestedAction: 'Check the uploaded work before marking complete.',
  },
  {
    studentName: 'Nora',
    subject: 'Math',
    approvalNeeded: 'Practice retry request',
    suggestedAction: 'Review the missed problems and approve another attempt.',
  },
];

const todaysLessons: Lesson[] = [
  {
    id: 'today-math',
    subject: 'Math',
    status: 'in-progress',
    statusLabel: 'In progress',
  },
  {
    id: 'today-reading',
    subject: 'Reading',
    status: 'ready',
    statusLabel: 'Ready to start',
  },
  {
    id: 'today-science',
    subject: 'Science',
    status: 'needs-review',
    statusLabel: 'Needs review',
  },
];

const recenterOptions: RecenterOption[] = [
  {
    label: 'We started late',
    description: 'Keep the day gentle and focus on what still matters.',
  },
  {
    label: 'We have less time today',
    description: 'Protect essentials and move flexible work aside.',
  },
  {
    label: 'Someone is overwhelmed',
    description: 'Reduce pressure and make the next step smaller.',
  },
  {
    label: 'Move flexible work',
    description: 'Save optional tasks for another day.',
  },
];

function getDashboardStatus(lessons: Lesson[]) {
  const waitingForParent = students.find(
    (student) => student.todayStatus === 'needs-parent',
  );
  const readyLesson = lessons.find((lesson) => lesson.status === 'ready');

  if (approvalQueue.length > 0) {
    const itemLabel = approvalQueue.length === 1 ? 'lesson needs' : 'lessons need';

    return {
      message: `${approvalQueue.length} ${itemLabel} approval.`,
      detail: 'Start with the review queue when you have a minute.',
    };
  }

  if (waitingForParent) {
    return {
      message: `${waitingForParent.name} is waiting for help.`,
      detail: waitingForParent.nextAction,
    };
  }

  if (readyLesson) {
    return {
      message: `${readyLesson.subject} is ready to teach.`,
      detail: 'You have a clear next step when learning time begins.',
    };
  }

  return {
    message: "You're on track today.",
    detail: 'No urgent parent actions are waiting right now.',
  };
}

export function ParentDashboardPage() {
  const [isRecenterPanelOpen, setIsRecenterPanelOpen] = useState(false);
  const [isImportFlowOpen, setIsImportFlowOpen] = useState(false);
  const [isCurriculumLibraryOpen, setIsCurriculumLibraryOpen] = useState(false);
  const [approvedImportedLessons, setApprovedImportedLessons] = useState<ApprovedLesson[]>([]);
  const allTodaysLessons = [...todaysLessons, ...approvedImportedLessons];
  const summaryMetrics: SummaryMetric[] = [
    {
      label: 'Students',
      value: students.length,
      helperText: 'Active learners',
    },
    {
      label: 'Lessons Today',
      value: allTodaysLessons.length,
      helperText: 'Planned for today',
    },
    {
      label: 'Items Waiting for Approval',
      value: approvalQueue.length,
      helperText: 'Ready for parent review',
    },
  ];
  const dashboardStatus = getDashboardStatus(allTodaysLessons);

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
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <a className="brand" href="/" aria-label="IterNest home">
          <span className="brand__mark" aria-hidden="true">I</span>
          <span className="brand__name">IterNest</span>
        </a>

        <section className="hero-copy" aria-labelledby="dashboard-title">
          <p className="dashboard-kicker">Good morning!</p>
          <h1 id="dashboard-title">Let's keep learning moving.</h1>
        </section>

        <DashboardStatusBar {...dashboardStatus} />

        <div className="dashboard-actions" aria-label="Dashboard quick actions">
          <button
            className="recenter-trigger"
            onClick={() => setIsRecenterPanelOpen(true)}
            type="button"
          >
            Recenter My Day
          </button>
          <button
            className="secondary-action"
            onClick={() => setIsImportFlowOpen(true)}
            type="button"
          >
            Import Curriculum
          </button>
          <button
            className="secondary-action"
            onClick={() => setIsCurriculumLibraryOpen(true)}
            type="button"
          >
            Curriculum Library
          </button>
        </div>
      </header>

      <section className="summary-grid" aria-label="Dashboard summary">
        {summaryMetrics.map((metric) => (
          <SummaryCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="dashboard-section" aria-labelledby="students-title">
        <div className="section-heading">
          <p className="section-label">Learners</p>
          <h2 id="students-title">Student Overview</h2>
        </div>

        <div className="student-grid">
          {students.map((student) => (
            <StudentOverviewCard key={student.name} {...student} />
          ))}
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="approval-title">
        <div className="section-heading">
          <p className="section-label">Parent Review</p>
          <h2 id="approval-title">Approval Queue</h2>
        </div>

        <div className="approval-list">
          {approvalQueue.map((item) => (
            <ApprovalQueueItem
              key={`${item.studentName}-${item.subject}`}
              {...item}
            />
          ))}
        </div>
      </section>

      <section className="learning-card" aria-labelledby="learning-title">
        <div className="learning-card__header">
          <div>
            <p className="section-label">Today</p>
            <h2 id="learning-title">Today's Learning</h2>
          </div>
          <span className="learning-card__count">{allTodaysLessons.length} lessons</span>
        </div>

        <ul className="lesson-list" aria-label="Today's lessons">
          {allTodaysLessons.map((lesson) => (
            <LessonStatusItem key={lesson.id} {...lesson} />
          ))}
        </ul>
      </section>

      <button className="primary-action" type="button">
        Open Parent Dashboard
      </button>

      {isRecenterPanelOpen ? (
        <RecenterDayPanel
          onClose={() => setIsRecenterPanelOpen(false)}
          options={recenterOptions}
        />
      ) : null}
    </main>
  );
}
