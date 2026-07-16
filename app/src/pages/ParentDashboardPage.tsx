import { useEffect, useState } from 'react';
import { RecenterDayPanel, type RecenterOption } from '../components/RecenterDayPanel';
import { CurriculumImportFlow } from '../features/curriculum-import/CurriculumImportFlow';
import type { ApprovedLesson } from '../features/curriculum-import/types';
import '../styles/parent-home.css';
import { CurriculumLibraryPage } from './CurriculumLibraryPage';

type AppView = 'today' | 'task' | 'approval' | 'learners' | 'tools';
type TaskId = 'jack-handwriting' | 'remi-grammar' | 'spelling-quiz';
type ApprovalStatus = 'pending' | 'approved' | 'kept';

type PlanTask = {
  id: TaskId;
  owner: string;
  title: string;
  duration: string;
  mode: string;
  reason: string;
  description: string;
  materials: string[];
  steps: string[];
  completionLabel: string;
};

type DayState = {
  completedTaskIds: TaskId[];
  approvalStatus: ApprovalStatus;
  recenterChoice: string | null;
};

const STORAGE_KEY = 'iternest-homeschool-morning-plan-v2';

const planTasks: PlanTask[] = [
  {
    id: 'jack-handwriting',
    owner: 'Jack',
    title: 'Independent handwriting',
    duration: '15 minutes',
    mode: 'Independent',
    reason: "Jack can work on his own while you prepare Remi's grammar lesson.",
    description:
      'Set out the assigned page and a pencil. Jack completes the copywork and leaves it ready for a quick parent review.',
    materials: ['Handwriting book', 'Sharpened pencil'],
    steps: [
      'Open the assigned handwriting page.',
      'Complete the copywork carefully.',
      'Leave the finished page in the review spot.',
    ],
    completionLabel: 'Handwriting complete',
  },
  {
    id: 'remi-grammar',
    owner: 'Remi',
    title: 'Grammar lesson',
    duration: '20 minutes',
    mode: 'With you',
    reason: "Jack's independent work creates a clear teaching window for Remi.",
    description:
      'Teach the short grammar lesson, complete the oral practice together, and mark the lesson ready for review.',
    materials: ['Grammar teacher guide', 'Remi’s workbook', 'Pencil'],
    steps: [
      'Read the lesson explanation together.',
      'Complete the oral examples.',
      'Have Remi finish the short written practice.',
    ],
    completionLabel: 'Grammar lesson complete',
  },
  {
    id: 'spelling-quiz',
    owner: 'Parent prep',
    title: 'Print spelling quiz',
    duration: '2 minutes',
    mode: 'Before lunch',
    reason: 'Printing it now keeps the afternoon from starting with another setup task.',
    description:
      'Open the saved spelling quiz, print one copy, and place it with the afternoon materials.',
    materials: ['Printer', 'One sheet of paper'],
    steps: [
      'Open the saved spelling quiz.',
      'Print one copy.',
      'Place it with the afternoon materials.',
    ],
    completionLabel: 'Quiz printed',
  },
];

const recenterOptions: RecenterOption[] = [
  {
    label: 'We started late',
    description: 'Keep the teacher-led lesson and shorten the setup around it.',
    result: 'The core sequence stays in place. Flexible work can move after lunch.',
  },
  {
    label: 'We have less time today',
    description: 'Protect the essential lesson and move the flexible item aside.',
    result: 'Remi’s grammar lesson stays visible. The spelling quiz can move to tomorrow.',
  },
  {
    label: 'Someone needs a smaller start',
    description: 'Make the first action easier without losing the lesson goal.',
    result: 'Jack begins with five minutes of handwriting, then decides whether to continue.',
  },
  {
    label: 'Move flexible work',
    description: 'Keep required work today and move optional work forward.',
    result: 'Only flexible work moves. Nothing teacher-led changes without approval.',
  },
];

const initialDayState: DayState = {
  completedTaskIds: [],
  approvalStatus: 'pending',
  recenterChoice: null,
};

function isTaskId(value: unknown): value is TaskId {
  return planTasks.some((task) => task.id === value);
}

function loadDayState(): DayState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return initialDayState;
    }

    const parsed = JSON.parse(saved) as Partial<DayState>;
    const approvalStatus: ApprovalStatus =
      parsed.approvalStatus === 'approved' || parsed.approvalStatus === 'kept'
        ? parsed.approvalStatus
        : 'pending';

    return {
      completedTaskIds: Array.isArray(parsed.completedTaskIds)
        ? parsed.completedTaskIds.filter(isTaskId)
        : [],
      approvalStatus,
      recenterChoice:
        typeof parsed.recenterChoice === 'string' ? parsed.recenterChoice : null,
    };
  } catch {
    return initialDayState;
  }
}

export function ParentDashboardPage() {
  const [activeView, setActiveView] = useState<AppView>('today');
  const [selectedTaskId, setSelectedTaskId] = useState<TaskId>('jack-handwriting');
  const [dayState, setDayState] = useState<DayState>(loadDayState);
  const [isRecenterPanelOpen, setIsRecenterPanelOpen] = useState(false);
  const [isImportFlowOpen, setIsImportFlowOpen] = useState(false);
  const [isCurriculumLibraryOpen, setIsCurriculumLibraryOpen] = useState(false);
  const [approvedImportedLessons, setApprovedImportedLessons] = useState<ApprovedLesson[]>([]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dayState));
  }, [dayState]);

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const completedTaskIds = new Set(dayState.completedTaskIds);
  const completedCount = dayState.completedTaskIds.length;
  const currentTask = planTasks.find((task) => !completedTaskIds.has(task.id)) ?? null;
  const currentTaskIndex = currentTask
    ? planTasks.findIndex((task) => task.id === currentTask.id)
    : planTasks.length;
  const selectedTask =
    planTasks.find((task) => task.id === selectedTaskId) ?? planTasks[0];
  const selectedTaskIndex = planTasks.findIndex((task) => task.id === selectedTask.id);
  const nextTask = planTasks[selectedTaskIndex + 1] ?? null;
  const selectedTaskComplete = completedTaskIds.has(selectedTask.id);
  const recenterResult = recenterOptions.find(
    (option) => option.label === dayState.recenterChoice,
  )?.result;

  function openTask(taskId: TaskId) {
    setSelectedTaskId(taskId);
    setActiveView('task');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function completeTask(taskId: TaskId) {
    setDayState((current) => ({
      ...current,
      completedTaskIds: current.completedTaskIds.includes(taskId)
        ? current.completedTaskIds
        : [...current.completedTaskIds, taskId],
    }));
  }

  function reopenTask(taskId: TaskId) {
    setDayState((current) => ({
      ...current,
      completedTaskIds: current.completedTaskIds.filter((id) => id !== taskId),
    }));
  }

  function handleRecenter(option: RecenterOption) {
    setDayState((current) => ({ ...current, recenterChoice: option.label }));
    setIsRecenterPanelOpen(false);
  }

  function resetDay() {
    setDayState(initialDayState);
    setSelectedTaskId('jack-handwriting');
    setActiveView('today');
  }

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
    <main className="iternest-app">
      <header className="app-topbar">
        <button
          aria-label="Open today"
          className="app-brand"
          onClick={() => setActiveView('today')}
          type="button"
        >
          <span className="app-brand__mark" aria-hidden="true">I</span>
          <span>IterNest</span>
        </button>
        <p>{today}</p>
      </header>

      {activeView === 'today' ? (
        <TodayView
          approvalStatus={dayState.approvalStatus}
          completedCount={completedCount}
          completedTaskIds={completedTaskIds}
          currentTask={currentTask}
          currentTaskIndex={currentTaskIndex}
          onOpenApproval={() => setActiveView('approval')}
          onOpenTask={openTask}
          onOpenTools={() => setActiveView('tools')}
          recenterChoice={dayState.recenterChoice}
          recenterResult={recenterResult}
        />
      ) : null}

      {activeView === 'task' ? (
        <TaskView
          isComplete={selectedTaskComplete}
          nextTask={nextTask}
          onBack={() => setActiveView('today')}
          onComplete={() => completeTask(selectedTask.id)}
          onContinue={() => {
            if (nextTask) {
              openTask(nextTask.id);
            } else {
              setActiveView('today');
            }
          }}
          onReopen={() => reopenTask(selectedTask.id)}
          task={selectedTask}
          taskIndex={selectedTaskIndex}
        />
      ) : null}

      {activeView === 'approval' ? (
        <ApprovalView
          onApprove={() =>
            setDayState((current) => ({ ...current, approvalStatus: 'approved' }))
          }
          onBack={() => setActiveView('today')}
          onKeepPlan={() =>
            setDayState((current) => ({ ...current, approvalStatus: 'kept' }))
          }
          onReopen={() =>
            setDayState((current) => ({ ...current, approvalStatus: 'pending' }))
          }
          status={dayState.approvalStatus}
        />
      ) : null}

      {activeView === 'learners' ? (
        <LearnersView
          completedTaskIds={completedTaskIds}
          onOpenTask={openTask}
        />
      ) : null}

      {activeView === 'tools' ? (
        <ToolsView
          approvalStatus={dayState.approvalStatus}
          importedLessonCount={approvedImportedLessons.length}
          onImport={() => setIsImportFlowOpen(true)}
          onOpenApproval={() => setActiveView('approval')}
          onOpenLibrary={() => setIsCurriculumLibraryOpen(true)}
          onRecenter={() => setIsRecenterPanelOpen(true)}
          onReset={resetDay}
          recenterChoice={dayState.recenterChoice}
        />
      ) : null}

      <BottomNavigation activeView={activeView} onChange={setActiveView} />

      {isRecenterPanelOpen ? (
        <RecenterDayPanel
          onClose={() => setIsRecenterPanelOpen(false)}
          onSelect={handleRecenter}
          options={recenterOptions}
          selectedLabel={dayState.recenterChoice}
        />
      ) : null}
    </main>
  );
}

type TodayViewProps = {
  approvalStatus: ApprovalStatus;
  completedCount: number;
  completedTaskIds: Set<TaskId>;
  currentTask: PlanTask | null;
  currentTaskIndex: number;
  onOpenApproval: () => void;
  onOpenTask: (taskId: TaskId) => void;
  onOpenTools: () => void;
  recenterChoice: string | null;
  recenterResult?: string;
};

function TodayView({
  approvalStatus,
  completedCount,
  completedTaskIds,
  currentTask,
  currentTaskIndex,
  onOpenApproval,
  onOpenTask,
  onOpenTools,
  recenterChoice,
  recenterResult,
}: TodayViewProps) {
  const isComplete = currentTask === null;

  return (
    <div className="view-shell view-shell--today">
      <section className="today-intro" aria-labelledby="today-title">
        <p className="eyebrow">Good morning</p>
        <h1 id="today-title">
          {isComplete ? 'The morning plan is complete.' : 'Your first move is ready.'}
        </h1>
        <p>
          {isComplete
            ? 'The teaching sequence is finished. Anything still waiting is clearly marked below.'
            : 'One clear starting point, followed by the next thing that needs you.'}
        </p>
      </section>

      <section className="morning-progress" aria-label="Morning plan progress">
        <div>
          <span>Morning plan</span>
          <strong>{completedCount} of {planTasks.length} complete</strong>
        </div>
        <div className="morning-progress__track" aria-hidden="true">
          {planTasks.map((task) => (
            <span
              className={completedTaskIds.has(task.id) ? 'is-complete' : ''}
              key={task.id}
            />
          ))}
        </div>
      </section>

      {recenterChoice ? (
        <button className="recenter-summary" onClick={onOpenTools} type="button">
          <span>Plan recentered</span>
          <strong>{recenterChoice}</strong>
          <small>{recenterResult}</small>
        </button>
      ) : null}

      {currentTask ? (
        <section className="start-card" aria-labelledby="start-card-title">
          <div className="start-card__topline">
            <span className="start-card__number">{currentTaskIndex + 1}</span>
            <span>{currentTask.mode}</span>
          </div>
          <p className="start-card__label">Start here</p>
          <p className="start-card__owner">{currentTask.owner}</p>
          <h2 id="start-card-title">{currentTask.title}</h2>
          <p className="start-card__duration">{currentTask.duration}</p>
          <div className="start-card__reason">
            <span>Why this first</span>
            <p>{currentTask.reason}</p>
          </div>
          <button onClick={() => onOpenTask(currentTask.id)} type="button">
            Open {currentTask.owner === 'Parent prep' ? 'task' : currentTask.owner}
            <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : (
        <section className="complete-card" aria-live="polite">
          <span className="complete-card__check" aria-hidden="true">✓</span>
          <div>
            <p className="eyebrow">Morning block finished</p>
            <h2>Everyone knows what comes next.</h2>
            <p>
              {approvalStatus === 'pending'
                ? 'One suggested adjustment still needs your decision.'
                : 'The plan and parent decision are both settled.'}
            </p>
          </div>
          {approvalStatus === 'pending' ? (
            <button onClick={onOpenApproval} type="button">Review the adjustment</button>
          ) : null}
        </section>
      )}

      <section className="day-sequence" aria-labelledby="sequence-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Today’s order</p>
            <h2 id="sequence-title">Then what?</h2>
          </div>
          <span>{planTasks.length} steps</span>
        </div>

        <ol className="sequence-list">
          {planTasks.map((task, index) => {
            const isTaskComplete = completedTaskIds.has(task.id);
            const isCurrent = currentTask?.id === task.id;

            return (
              <li
                className={`${isTaskComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`}
                key={task.id}
              >
                <button onClick={() => onOpenTask(task.id)} type="button">
                  <span className="sequence-list__marker" aria-hidden="true">
                    {isTaskComplete ? '✓' : index + 1}
                  </span>
                  <span className="sequence-list__copy">
                    <small>{task.owner}</small>
                    <strong>{task.title}</strong>
                    <span>{task.duration} · {task.mode}</span>
                  </span>
                  <span className="sequence-list__status">
                    {isTaskComplete ? 'Done' : isCurrent ? 'Now' : 'Later'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <button
        className={`attention-strip attention-strip--${approvalStatus}`}
        onClick={onOpenApproval}
        type="button"
      >
        <span className="attention-strip__icon" aria-hidden="true">
          {approvalStatus === 'pending' ? '!' : '✓'}
        </span>
        <span>
          <small>Needs your attention</small>
          <strong>
            {approvalStatus === 'pending'
              ? 'Approve catch-up recommendation'
              : approvalStatus === 'approved'
                ? 'Catch-up recommendation approved'
                : 'Today’s original plan kept'}
          </strong>
          <span>
            {approvalStatus === 'pending'
              ? 'Nothing changes until you decide.'
              : 'Open to review or change the decision.'}
          </span>
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

type TaskViewProps = {
  isComplete: boolean;
  nextTask: PlanTask | null;
  onBack: () => void;
  onComplete: () => void;
  onContinue: () => void;
  onReopen: () => void;
  task: PlanTask;
  taskIndex: number;
};

function TaskView({
  isComplete,
  nextTask,
  onBack,
  onComplete,
  onContinue,
  onReopen,
  task,
  taskIndex,
}: TaskViewProps) {
  return (
    <div className="view-shell detail-view">
      <button className="back-button" onClick={onBack} type="button">← Back to today</button>

      <section className="task-heading">
        <div className="task-heading__meta">
          <span>Step {taskIndex + 1} of {planTasks.length}</span>
          <span>{task.mode}</span>
        </div>
        <p className="eyebrow">{task.owner}</p>
        <h1>{task.title}</h1>
        <p>{task.duration}</p>
      </section>

      <section className="why-now">
        <span>Why now</span>
        <p>{task.reason}</p>
      </section>

      <section className="task-content">
        <h2>Get ready</h2>
        <p>{task.description}</p>
        <ul className="materials-list" aria-label="Materials">
          {task.materials.map((material) => <li key={material}>{material}</li>)}
        </ul>

        <h2>Do this</h2>
        <ol className="instruction-list">
          {task.steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {isComplete ? (
        <section className="task-complete-panel" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="eyebrow">Complete</p>
            <h2>{task.completionLabel}</h2>
            <p>
              {nextTask
                ? `Next: ${nextTask.owner} — ${nextTask.title}.`
                : 'That finishes the morning sequence.'}
            </p>
          </div>
          <button className="primary-button" onClick={onContinue} type="button">
            {nextTask ? `Continue to ${nextTask.owner}` : 'Return to today'}
          </button>
          <button className="text-action" onClick={onReopen} type="button">
            Mark as not complete
          </button>
        </section>
      ) : (
        <div className="sticky-action">
          <button className="primary-button" onClick={onComplete} type="button">
            {task.completionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

type ApprovalViewProps = {
  onApprove: () => void;
  onBack: () => void;
  onKeepPlan: () => void;
  onReopen: () => void;
  status: ApprovalStatus;
};

function ApprovalView({
  onApprove,
  onBack,
  onKeepPlan,
  onReopen,
  status,
}: ApprovalViewProps) {
  const hasDecision = status !== 'pending';

  return (
    <div className="view-shell detail-view">
      <button className="back-button" onClick={onBack} type="button">← Back to today</button>

      <section className="approval-heading">
        <p className="eyebrow">Needs your attention</p>
        <h1>Catch-up recommendation</h1>
        <p>Nothing changes until you approve it.</p>
      </section>

      {hasDecision ? (
        <section className={`decision-result decision-result--${status}`} aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="eyebrow">Decision saved</p>
            <h2>
              {status === 'approved'
                ? 'Spelling practice will move to tomorrow.'
                : 'Today’s original plan will stay in place.'}
            </h2>
            <p>You can reopen this decision while the plan is still editable.</p>
          </div>
          <button className="text-action" onClick={onReopen} type="button">
            Reopen decision
          </button>
        </section>
      ) : (
        <>
          <section className="decision-comparison" aria-labelledby="suggested-change-title">
            <div>
              <p className="eyebrow">Current plan</p>
              <h2>Finish spelling practice today.</h2>
              <p>This adds another independent task after grammar.</p>
            </div>
            <span className="decision-comparison__arrow" aria-hidden="true">→</span>
            <div className="decision-comparison__suggested">
              <p className="eyebrow">Suggested change</p>
              <h2 id="suggested-change-title">Move spelling practice to tomorrow.</h2>
              <p>Keep today’s teacher-led grammar lesson and protect the shorter morning.</p>
            </div>
          </section>

          <section className="evidence-card">
            <p className="eyebrow">Why IterNest surfaced this</p>
            <ul>
              <li>Grammar requires your instruction today.</li>
              <li>Spelling practice is flexible and has no blocking dependency.</li>
              <li>Moving it does not change the weekly learning goal.</li>
            </ul>
          </section>

          <div className="decision-actions">
            <button className="primary-button" onClick={onApprove} type="button">
              Approve adjustment
            </button>
            <button className="secondary-button" onClick={onKeepPlan} type="button">
              Keep today’s plan
            </button>
            <button className="text-action" onClick={onBack} type="button">
              Decide later
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type LearnersViewProps = {
  completedTaskIds: Set<TaskId>;
  onOpenTask: (taskId: TaskId) => void;
};

function LearnersView({ completedTaskIds, onOpenTask }: LearnersViewProps) {
  const learnerCards = [
    {
      name: 'Jack',
      note: 'Independent work first',
      task: planTasks[0],
    },
    {
      name: 'Remi',
      note: 'Needs you for one short lesson',
      task: planTasks[1],
    },
  ];

  return (
    <div className="view-shell">
      <section className="page-heading">
        <p className="eyebrow">Learners</p>
        <h1>Today, child by child.</h1>
        <p>No percentages. Just the next useful thing for each learner.</p>
      </section>

      <div className="learner-list">
        {learnerCards.map(({ name, note, task }) => {
          const isComplete = completedTaskIds.has(task.id);

          return (
            <section className="learner-card" key={name}>
              <div className="learner-card__top">
                <div>
                  <p className="eyebrow">{note}</p>
                  <h2>{name}</h2>
                </div>
                <span className={isComplete ? 'is-complete' : ''}>
                  {isComplete ? 'Done' : 'Today'}
                </span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.duration} · {task.mode}</p>
              <button onClick={() => onOpenTask(task.id)} type="button">
                {isComplete ? 'Review completed task' : `Open ${name}`}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type ToolsViewProps = {
  approvalStatus: ApprovalStatus;
  importedLessonCount: number;
  onImport: () => void;
  onOpenApproval: () => void;
  onOpenLibrary: () => void;
  onRecenter: () => void;
  onReset: () => void;
  recenterChoice: string | null;
};

function ToolsView({
  approvalStatus,
  importedLessonCount,
  onImport,
  onOpenApproval,
  onOpenLibrary,
  onRecenter,
  onReset,
  recenterChoice,
}: ToolsViewProps) {
  return (
    <div className="view-shell">
      <section className="page-heading">
        <p className="eyebrow">Parent tools</p>
        <h1>Adjust the plan without rebuilding it.</h1>
        <p>These tools stay out of the way until you need them.</p>
      </section>

      <div className="tool-list">
        <button onClick={onRecenter} type="button">
          <span className="tool-list__icon" aria-hidden="true">↺</span>
          <span>
            <strong>Recenter today</strong>
            <small>{recenterChoice ?? 'Late start, less time, or an overwhelmed learner'}</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <button onClick={onOpenApproval} type="button">
          <span className="tool-list__icon" aria-hidden="true">✓</span>
          <span>
            <strong>Parent decisions</strong>
            <small>
              {approvalStatus === 'pending'
                ? '1 recommendation waiting'
                : 'Latest recommendation decided'}
            </small>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <button onClick={onImport} type="button">
          <span className="tool-list__icon" aria-hidden="true">＋</span>
          <span>
            <strong>Import curriculum</strong>
            <small>
              {importedLessonCount > 0
                ? `${importedLessonCount} imported lessons ready`
                : 'Add a curriculum PDF or photo'}
            </small>
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <button onClick={onOpenLibrary} type="button">
          <span className="tool-list__icon" aria-hidden="true">▤</span>
          <span>
            <strong>Curriculum library</strong>
            <small>Open your family bookshelf and source details</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <button className="reset-button" onClick={onReset} type="button">
        Reset prototype day
      </button>
    </div>
  );
}

type BottomNavigationProps = {
  activeView: AppView;
  onChange: (view: AppView) => void;
};

function BottomNavigation({ activeView, onChange }: BottomNavigationProps) {
  const currentTab = activeView === 'task' || activeView === 'approval' ? 'today' : activeView;

  return (
    <nav className="bottom-navigation" aria-label="Primary navigation">
      <button
        aria-current={currentTab === 'today' ? 'page' : undefined}
        onClick={() => onChange('today')}
        type="button"
      >
        <span aria-hidden="true">⌂</span>
        Today
      </button>
      <button
        aria-current={currentTab === 'learners' ? 'page' : undefined}
        onClick={() => onChange('learners')}
        type="button"
      >
        <span aria-hidden="true">◉</span>
        Learners
      </button>
      <button
        aria-current={currentTab === 'tools' ? 'page' : undefined}
        onClick={() => onChange('tools')}
        type="button"
      >
        <span aria-hidden="true">＋</span>
        Tools
      </button>
    </nav>
  );
}
