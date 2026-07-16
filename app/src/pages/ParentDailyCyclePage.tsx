import { useEffect, useMemo, useState } from 'react';
import { RecenterDayPanel, type RecenterOption } from '../components/RecenterDayPanel';
import { CurriculumImportFlow } from '../features/curriculum-import/CurriculumImportFlow';
import type { ApprovedLesson } from '../features/curriculum-import/types';
import '../styles/parent-home.css';
import '../styles/daily-cycle.css';
import { CurriculumLibraryPage } from './CurriculumLibraryPage';

type AppView = 'today' | 'task' | 'prep' | 'approval' | 'learners' | 'print' | 'tools';
type LearningTaskId = 'jack-handwriting' | 'remi-grammar';
type PrepTaskId = 'stage-handwriting' | 'stage-grammar' | 'print-spelling';
type ApprovalStatus = 'pending' | 'approved' | 'kept';

type LearningTask = {
  id: LearningTaskId;
  owner: string;
  title: string;
  duration: string;
  mode: string;
  reason: string;
  description: string;
  materials: string[];
  studentSteps: string[];
  completionLabel: string;
};

type PrepTask = {
  id: PrepTaskId;
  title: string;
  duration: string;
  reason: string;
  steps: string[];
  morningReminder: string;
};

type DayState = {
  dateKey: string;
  completedLearningTaskIds: LearningTaskId[];
  completedPrepTaskIds: PrepTaskId[];
  approvalStatus: ApprovalStatus;
  recenterChoice: string | null;
  preparedLastNight: string[];
  morningReminderSeen: boolean;
};

const STORAGE_KEY = 'iternest-homeschool-daily-cycle-v5';

const learningTasks: LearningTask[] = [
  {
    id: 'jack-handwriting',
    owner: 'Jack',
    title: 'Independent handwriting',
    duration: '15 minutes',
    mode: 'Independent',
    reason: "Jack can work independently while you get ready to teach Remi's grammar lesson.",
    description:
      'Jack completes the assigned handwriting page independently and leaves it in the review spot.',
    materials: ['Handwriting book', 'Sharpened pencil'],
    studentSteps: [
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
    mode: 'With parent',
    reason: "Jack's independent work creates a clear teaching window for Remi.",
    description:
      'Teach the short grammar lesson, complete the oral practice together, and finish the written practice.',
    materials: ['Grammar teacher guide', 'Remi’s workbook', 'Pencil'],
    studentSteps: [
      'Listen to the lesson explanation.',
      'Complete the oral examples together.',
      'Finish the short written practice.',
    ],
    completionLabel: 'Grammar lesson complete',
  },
];

const prepTasks: PrepTask[] = [
  {
    id: 'stage-handwriting',
    title: 'Set out Jack’s handwriting materials',
    duration: '1 minute',
    reason: 'Jack can begin independently without waiting for materials.',
    steps: [
      'Place the handwriting book on the table.',
      'Set a sharpened pencil beside it.',
    ],
    morningReminder: 'Jack’s handwriting book and pencil are on the table.',
  },
  {
    id: 'stage-grammar',
    title: 'Stage Remi’s grammar lesson',
    duration: '2 minutes',
    reason: 'The teacher-led lesson can begin as soon as Jack starts handwriting.',
    steps: [
      'Open the teacher guide to the assigned lesson.',
      'Place Remi’s workbook and pencil with it.',
    ],
    morningReminder: 'Remi’s grammar guide and workbook are together.',
  },
  {
    id: 'print-spelling',
    title: 'Print the spelling quiz',
    duration: '2 minutes',
    reason: 'Tomorrow begins ready instead of with another setup task.',
    steps: [
      'Open the saved spelling quiz.',
      'Print one copy.',
      'Place it with tomorrow’s materials.',
    ],
    morningReminder: 'The spelling quiz is printed with tomorrow’s materials.',
  },
];

const recenterOptions: RecenterOption[] = [
  {
    label: 'We started late',
    description: 'Keep the teacher-led lesson and shorten the learning block around it.',
    result: 'Today’s learning stays focused. Tomorrow preparation remains outside the school day.',
  },
  {
    label: 'We have less time today',
    description: 'Protect the essential lesson and move flexible learning work aside.',
    result: 'Remi’s grammar lesson stays visible. Flexible work can move without mixing in preparation.',
  },
  {
    label: 'Someone needs a smaller start',
    description: 'Make the first learning action easier without losing the goal.',
    result: 'Jack begins with five minutes of handwriting, then decides whether to continue.',
  },
  {
    label: 'Move flexible work',
    description: 'Keep required learning today and move optional work forward.',
    result: 'Only flexible learning moves. Tomorrow preparation stays in the wrap-up window.',
  },
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialDayState(): DayState {
  return {
    dateKey: localDateKey(),
    completedLearningTaskIds: [],
    completedPrepTaskIds: [],
    approvalStatus: 'pending',
    recenterChoice: null,
    preparedLastNight: prepTasks.map((task) => task.morningReminder),
    morningReminderSeen: false,
  };
}

function isLearningTaskId(value: unknown): value is LearningTaskId {
  return learningTasks.some((task) => task.id === value);
}

function isPrepTaskId(value: unknown): value is PrepTaskId {
  return prepTasks.some((task) => task.id === value);
}

function remindersFromPrepIds(ids: PrepTaskId[]) {
  return ids
    .map((id) => prepTasks.find((task) => task.id === id)?.morningReminder)
    .filter((reminder): reminder is string => Boolean(reminder));
}

function loadDayState(): DayState {
  const initial = createInitialDayState();

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return initial;
    }

    const parsed = JSON.parse(saved) as Partial<DayState>;
    const completedPrepTaskIds = Array.isArray(parsed.completedPrepTaskIds)
      ? parsed.completedPrepTaskIds.filter(isPrepTaskId)
      : [];

    if (parsed.dateKey && parsed.dateKey !== localDateKey()) {
      return {
        ...initial,
        preparedLastNight: remindersFromPrepIds(completedPrepTaskIds),
      };
    }

    const approvalStatus: ApprovalStatus =
      parsed.approvalStatus === 'approved' || parsed.approvalStatus === 'kept'
        ? parsed.approvalStatus
        : 'pending';

    return {
      dateKey: localDateKey(),
      completedLearningTaskIds: Array.isArray(parsed.completedLearningTaskIds)
        ? parsed.completedLearningTaskIds.filter(isLearningTaskId)
        : [],
      completedPrepTaskIds,
      approvalStatus,
      recenterChoice:
        typeof parsed.recenterChoice === 'string' ? parsed.recenterChoice : null,
      preparedLastNight: Array.isArray(parsed.preparedLastNight)
        ? parsed.preparedLastNight.filter((item): item is string => typeof item === 'string')
        : initial.preparedLastNight,
      morningReminderSeen: parsed.morningReminderSeen === true,
    };
  } catch {
    return initial;
  }
}

export function ParentDailyCyclePage() {
  const [activeView, setActiveView] = useState<AppView>('today');
  const [selectedTaskId, setSelectedTaskId] = useState<LearningTaskId>('jack-handwriting');
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

  const completedLearningTaskIds = new Set(dayState.completedLearningTaskIds);
  const completedPrepTaskIds = new Set(dayState.completedPrepTaskIds);
  const currentLearningTask =
    learningTasks.find((task) => !completedLearningTaskIds.has(task.id)) ?? null;
  const currentLearningIndex = currentLearningTask
    ? learningTasks.findIndex((task) => task.id === currentLearningTask.id)
    : learningTasks.length;
  const selectedTask =
    learningTasks.find((task) => task.id === selectedTaskId) ?? learningTasks[0];
  const selectedTaskIndex = learningTasks.findIndex((task) => task.id === selectedTask.id);
  const nextLearningTask = learningTasks[selectedTaskIndex + 1] ?? null;
  const learningComplete = currentLearningTask === null;
  const prepComplete = prepTasks.every((task) => completedPrepTaskIds.has(task.id));
  const recenterResult = recenterOptions.find(
    (option) => option.label === dayState.recenterChoice,
  )?.result;

  function openLearningTask(taskId: LearningTaskId) {
    setDayState((current) => ({ ...current, morningReminderSeen: true }));
    setSelectedTaskId(taskId);
    setActiveView('task');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function completeLearningTask(taskId: LearningTaskId) {
    setDayState((current) => ({
      ...current,
      completedLearningTaskIds: current.completedLearningTaskIds.includes(taskId)
        ? current.completedLearningTaskIds
        : [...current.completedLearningTaskIds, taskId],
    }));
  }

  function reopenLearningTask(taskId: LearningTaskId) {
    setDayState((current) => ({
      ...current,
      completedLearningTaskIds: current.completedLearningTaskIds.filter(
        (id) => id !== taskId,
      ),
    }));
  }

  function togglePrepTask(taskId: PrepTaskId) {
    setDayState((current) => ({
      ...current,
      completedPrepTaskIds: current.completedPrepTaskIds.includes(taskId)
        ? current.completedPrepTaskIds.filter((id) => id !== taskId)
        : [...current.completedPrepTaskIds, taskId],
    }));
  }

  function handleRecenter(option: RecenterOption) {
    setDayState((current) => ({ ...current, recenterChoice: option.label }));
    setIsRecenterPanelOpen(false);
  }

  function resetPrototypeDay() {
    setDayState({
      ...createInitialDayState(),
      preparedLastNight: remindersFromPrepIds(dayState.completedPrepTaskIds),
    });
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
    <main className="daily-cycle-app">
      <header className="cycle-topbar no-print">
        <button
          aria-label="Open today"
          className="cycle-brand"
          onClick={() => setActiveView('today')}
          type="button"
        >
          <span aria-hidden="true">I</span>
          <strong>IterNest</strong>
        </button>
        <p>{today}</p>
      </header>

      {activeView === 'today' && !learningComplete ? (
        <MorningLearningView
          approvalStatus={dayState.approvalStatus}
          completedLearningTaskIds={completedLearningTaskIds}
          currentLearningIndex={currentLearningIndex}
          currentLearningTask={currentLearningTask}
          morningReminderSeen={dayState.morningReminderSeen}
          onOpenApproval={() => setActiveView('approval')}
          onOpenLearningTask={openLearningTask}
          onOpenPrint={() => setActiveView('print')}
          onOpenTools={() => setActiveView('tools')}
          preparedLastNight={dayState.preparedLastNight}
          recenterChoice={dayState.recenterChoice}
          recenterResult={recenterResult}
        />
      ) : null}

      {activeView === 'today' && learningComplete ? (
        <SchoolDayCompleteView
          approvalStatus={dayState.approvalStatus}
          completedPrepTaskIds={completedPrepTaskIds}
          onOpenApproval={() => setActiveView('approval')}
          onOpenPrep={() => setActiveView('prep')}
          onTogglePrepTask={togglePrepTask}
          prepComplete={prepComplete}
        />
      ) : null}

      {activeView === 'task' ? (
        <LearningTaskView
          isComplete={completedLearningTaskIds.has(selectedTask.id)}
          nextTask={nextLearningTask}
          onBack={() => setActiveView('today')}
          onComplete={() => completeLearningTask(selectedTask.id)}
          onContinue={() => {
            if (nextLearningTask) {
              openLearningTask(nextLearningTask.id);
            } else {
              setActiveView('today');
            }
          }}
          onReopen={() => reopenLearningTask(selectedTask.id)}
          task={selectedTask}
          taskIndex={selectedTaskIndex}
        />
      ) : null}

      {activeView === 'prep' ? (
        <TomorrowPrepView
          completedPrepTaskIds={completedPrepTaskIds}
          learningComplete={learningComplete}
          onBack={() => setActiveView('today')}
          onTogglePrepTask={togglePrepTask}
          prepComplete={prepComplete}
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
          completedLearningTaskIds={completedLearningTaskIds}
          onOpenLearningTask={openLearningTask}
          onOpenPrint={() => setActiveView('print')}
        />
      ) : null}

      {activeView === 'print' ? (
        <StudentPrintCenter onBack={() => setActiveView('tools')} today={today} />
      ) : null}

      {activeView === 'tools' ? (
        <ToolsView
          approvalStatus={dayState.approvalStatus}
          importedLessonCount={approvedImportedLessons.length}
          onImport={() => setIsImportFlowOpen(true)}
          onOpenApproval={() => setActiveView('approval')}
          onOpenLibrary={() => setIsCurriculumLibraryOpen(true)}
          onOpenPrep={() => setActiveView('prep')}
          onOpenPrint={() => setActiveView('print')}
          onRecenter={() => setIsRecenterPanelOpen(true)}
          onReset={resetPrototypeDay}
          prepComplete={prepComplete}
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

type MorningLearningViewProps = {
  approvalStatus: ApprovalStatus;
  completedLearningTaskIds: Set<LearningTaskId>;
  currentLearningIndex: number;
  currentLearningTask: LearningTask;
  morningReminderSeen: boolean;
  onOpenApproval: () => void;
  onOpenLearningTask: (taskId: LearningTaskId) => void;
  onOpenPrint: () => void;
  onOpenTools: () => void;
  preparedLastNight: string[];
  recenterChoice: string | null;
  recenterResult?: string;
};

function MorningLearningView({
  approvalStatus,
  completedLearningTaskIds,
  currentLearningIndex,
  currentLearningTask,
  morningReminderSeen,
  onOpenApproval,
  onOpenLearningTask,
  onOpenPrint,
  onOpenTools,
  preparedLastNight,
  recenterChoice,
  recenterResult,
}: MorningLearningViewProps) {
  return (
    <div className="cycle-shell">
      <section className="cycle-intro" aria-labelledby="today-title">
        <p className="cycle-eyebrow">Good morning</p>
        <h1 id="today-title">Your first move is ready.</h1>
        <p>Only what matters now: a quick reminder, then today’s learning sequence.</p>
      </section>

      {!morningReminderSeen && preparedLastNight.length > 0 ? (
        <aside className="prepared-reminder" aria-label="Prepared last night">
          <div className="prepared-reminder__heading">
            <span aria-hidden="true">✓</span>
            <div>
              <p className="cycle-eyebrow">Prepared last night</p>
              <h2>Yesterday-you already handled this.</h2>
            </div>
          </div>
          <ul>
            {preparedLastNight.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </aside>
      ) : null}

      {recenterChoice ? (
        <button className="cycle-recenter-summary" onClick={onOpenTools} type="button">
          <span>Plan recentered</span>
          <strong>{recenterChoice}</strong>
          <small>{recenterResult}</small>
        </button>
      ) : null}

      <section className="cycle-start-card" aria-labelledby="start-card-title">
        <div className="cycle-start-card__topline">
          <span>{currentLearningIndex + 1}</span>
          <strong>{currentLearningTask.mode}</strong>
        </div>
        <p className="cycle-eyebrow">Start here</p>
        <p className="cycle-start-card__owner">{currentLearningTask.owner}</p>
        <h2 id="start-card-title">{currentLearningTask.title}</h2>
        <p className="cycle-start-card__duration">{currentLearningTask.duration}</p>
        <div className="cycle-start-card__reason">
          <strong>Why this first</strong>
          <p>{currentLearningTask.reason}</p>
        </div>
        <button onClick={() => onOpenLearningTask(currentLearningTask.id)} type="button">
          Open {currentLearningTask.owner}
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <div className="cycle-secondary-action-row">
        <button onClick={onOpenPrint} type="button">Print student task sheets</button>
      </div>

      <section className="cycle-sequence" aria-labelledby="learning-order-title">
        <div className="cycle-section-heading">
          <div>
            <p className="cycle-eyebrow">Today’s learning</p>
            <h2 id="learning-order-title">Then what?</h2>
          </div>
          <span>{completedLearningTaskIds.size} of {learningTasks.length}</span>
        </div>
        <ol>
          {learningTasks.map((task, index) => {
            const isComplete = completedLearningTaskIds.has(task.id);
            const isCurrent = task.id === currentLearningTask.id;

            return (
              <li className={`${isComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`} key={task.id}>
                <button onClick={() => onOpenLearningTask(task.id)} type="button">
                  <span className="cycle-sequence__marker">{isComplete ? '✓' : index + 1}</span>
                  <span className="cycle-sequence__copy">
                    <small>{task.owner}</small>
                    <strong>{task.title}</strong>
                    <span>{task.duration} · {task.mode}</span>
                  </span>
                  <span className="cycle-sequence__status">
                    {isComplete ? 'Done' : isCurrent ? 'Now' : 'Later'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <AttentionStrip approvalStatus={approvalStatus} onOpen={onOpenApproval} />
    </div>
  );
}

type SchoolDayCompleteViewProps = {
  approvalStatus: ApprovalStatus;
  completedPrepTaskIds: Set<PrepTaskId>;
  onOpenApproval: () => void;
  onOpenPrep: () => void;
  onTogglePrepTask: (taskId: PrepTaskId) => void;
  prepComplete: boolean;
};

function SchoolDayCompleteView({
  approvalStatus,
  completedPrepTaskIds,
  onOpenApproval,
  onOpenPrep,
  onTogglePrepTask,
  prepComplete,
}: SchoolDayCompleteViewProps) {
  return (
    <div className="cycle-shell cycle-shell--complete">
      <section className="school-complete-hero" aria-live="polite">
        <span aria-hidden="true">✓</span>
        <p className="cycle-eyebrow">School day complete</p>
        <h1>Today’s learning is finished.</h1>
        <p>The learning phase is closed. Now the screen has changed to tomorrow’s short wrap-up.</p>
      </section>

      <section className="wrap-up-section" aria-labelledby="wrap-up-title">
        <div className="cycle-section-heading">
          <div>
            <p className="cycle-eyebrow">Post-day preparation</p>
            <h2 id="wrap-up-title">Get ready for tomorrow</h2>
          </div>
          <span>{completedPrepTaskIds.size} of {prepTasks.length}</span>
        </div>

        <div className="wrap-up-list">
          {prepTasks.map((task) => {
            const isComplete = completedPrepTaskIds.has(task.id);

            return (
              <button
                className={isComplete ? 'is-complete' : ''}
                key={task.id}
                onClick={() => onTogglePrepTask(task.id)}
                type="button"
              >
                <span className="wrap-up-list__check" aria-hidden="true">{isComplete ? '✓' : ''}</span>
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.duration} · {task.reason}</small>
                </span>
              </button>
            );
          })}
        </div>

        <button className="cycle-text-button" onClick={onOpenPrep} type="button">
          Open preparation details
        </button>
      </section>

      {prepComplete ? (
        <section className="tomorrow-ready-card" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="cycle-eyebrow">Wrap-up complete</p>
            <h2>Tomorrow is ready.</h2>
            <p>These completed items will appear as a quiet reminder at the start of the next school day.</p>
          </div>
        </section>
      ) : null}

      <AttentionStrip approvalStatus={approvalStatus} onOpen={onOpenApproval} />
    </div>
  );
}

type LearningTaskViewProps = {
  isComplete: boolean;
  nextTask: LearningTask | null;
  onBack: () => void;
  onComplete: () => void;
  onContinue: () => void;
  onReopen: () => void;
  task: LearningTask;
  taskIndex: number;
};

function LearningTaskView({
  isComplete,
  nextTask,
  onBack,
  onComplete,
  onContinue,
  onReopen,
  task,
  taskIndex,
}: LearningTaskViewProps) {
  return (
    <div className="cycle-shell cycle-detail-view">
      <button className="cycle-back-button" onClick={onBack} type="button">← Back to today</button>

      <section className="cycle-page-heading">
        <div className="cycle-task-meta">
          <span>Learning step {taskIndex + 1} of {learningTasks.length}</span>
          <span>{task.mode}</span>
        </div>
        <p className="cycle-eyebrow">{task.owner}</p>
        <h1>{task.title}</h1>
        <p>{task.duration}</p>
      </section>

      <section className="cycle-why-now">
        <strong>Why now</strong>
        <p>{task.reason}</p>
      </section>

      <section className="cycle-task-content">
        <h2>Materials</h2>
        <ul className="cycle-materials">
          {task.materials.map((material) => <li key={material}>{material}</li>)}
        </ul>

        <h2>Do this</h2>
        <ol className="cycle-instructions">
          {task.studentSteps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {isComplete ? (
        <section className="cycle-complete-panel" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="cycle-eyebrow">Learning complete</p>
            <h2>{task.completionLabel}</h2>
            <p>
              {nextTask
                ? `Next learning action: ${nextTask.owner} — ${nextTask.title}.`
                : 'That finishes today’s active learning sequence.'}
            </p>
          </div>
          <button className="cycle-primary-button" onClick={onContinue} type="button">
            {nextTask ? `Continue to ${nextTask.owner}` : 'Finish the school day'}
          </button>
          <button className="cycle-text-button" onClick={onReopen} type="button">Mark as not complete</button>
        </section>
      ) : (
        <div className="cycle-sticky-action">
          <button className="cycle-primary-button" onClick={onComplete} type="button">
            {task.completionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

type TomorrowPrepViewProps = {
  completedPrepTaskIds: Set<PrepTaskId>;
  learningComplete: boolean;
  onBack: () => void;
  onTogglePrepTask: (taskId: PrepTaskId) => void;
  prepComplete: boolean;
};

function TomorrowPrepView({
  completedPrepTaskIds,
  learningComplete,
  onBack,
  onTogglePrepTask,
  prepComplete,
}: TomorrowPrepViewProps) {
  return (
    <div className="cycle-shell cycle-detail-view">
      <button className="cycle-back-button" onClick={onBack} type="button">← Back to today</button>
      <section className="cycle-page-heading">
        <p className="cycle-eyebrow">Post-day preparation</p>
        <h1>Get ready for tomorrow.</h1>
        <p>This supports school, but it is not part of today’s student learning.</p>
      </section>

      {!learningComplete ? (
        <section className="cycle-boundary-note">
          <span aria-hidden="true">○</span>
          <div>
            <strong>Save this for after lessons.</strong>
            <p>You can look ahead now, but IterNest will not mix this into the active school day.</p>
          </div>
        </section>
      ) : null}

      <div className="cycle-prep-task-list">
        {prepTasks.map((task, taskIndex) => {
          const isComplete = completedPrepTaskIds.has(task.id);

          return (
            <section className={isComplete ? 'cycle-prep-task is-complete' : 'cycle-prep-task'} key={task.id}>
              <div className="cycle-prep-task__heading">
                <span aria-hidden="true">{isComplete ? '✓' : taskIndex + 1}</span>
                <div>
                  <p className="cycle-eyebrow">Tomorrow prep · {task.duration}</p>
                  <h2>{task.title}</h2>
                </div>
              </div>
              <p>{task.reason}</p>
              <ol className="cycle-instructions">
                {task.steps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
              <button
                className={isComplete ? 'cycle-secondary-button' : 'cycle-primary-button'}
                onClick={() => onTogglePrepTask(task.id)}
                type="button"
              >
                {isComplete ? 'Mark as not ready' : 'Mark ready for tomorrow'}
              </button>
            </section>
          );
        })}
      </div>

      {prepComplete ? (
        <section className="tomorrow-ready-card" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="cycle-eyebrow">Wrap-up complete</p>
            <h2>Tomorrow is ready.</h2>
            <p>The list will return tomorrow morning as a reminder, not a confirmation step.</p>
          </div>
        </section>
      ) : null}
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

function ApprovalView({ onApprove, onBack, onKeepPlan, onReopen, status }: ApprovalViewProps) {
  const hasDecision = status !== 'pending';

  return (
    <div className="cycle-shell cycle-detail-view">
      <button className="cycle-back-button" onClick={onBack} type="button">← Back to today</button>
      <section className="cycle-page-heading">
        <p className="cycle-eyebrow">Needs your attention</p>
        <h1>Catch-up recommendation</h1>
        <p>Nothing changes until you approve it.</p>
      </section>

      {hasDecision ? (
        <section className="cycle-decision-result" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="cycle-eyebrow">Decision saved</p>
            <h2>
              {status === 'approved'
                ? 'Spelling practice will move to tomorrow.'
                : 'Today’s original learning plan will stay in place.'}
            </h2>
            <p>You can reopen this decision while the plan is still editable.</p>
          </div>
          <button className="cycle-text-button" onClick={onReopen} type="button">Reopen decision</button>
        </section>
      ) : (
        <>
          <section className="cycle-decision-comparison">
            <div>
              <p className="cycle-eyebrow">Current learning plan</p>
              <h2>Finish spelling practice today.</h2>
              <p>This adds another independent learning task after grammar.</p>
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <p className="cycle-eyebrow">Suggested change</p>
              <h2>Move spelling practice to tomorrow.</h2>
              <p>Keep today’s teacher-led grammar lesson and protect the shorter learning block.</p>
            </div>
          </section>
          <div className="cycle-decision-actions">
            <button className="cycle-primary-button" onClick={onApprove} type="button">Approve adjustment</button>
            <button className="cycle-secondary-button" onClick={onKeepPlan} type="button">Keep today’s plan</button>
            <button className="cycle-text-button" onClick={onBack} type="button">Decide later</button>
          </div>
        </>
      )}
    </div>
  );
}

type LearnersViewProps = {
  completedLearningTaskIds: Set<LearningTaskId>;
  onOpenLearningTask: (taskId: LearningTaskId) => void;
  onOpenPrint: () => void;
};

function LearnersView({
  completedLearningTaskIds,
  onOpenLearningTask,
  onOpenPrint,
}: LearnersViewProps) {
  return (
    <div className="cycle-shell">
      <section className="cycle-page-heading">
        <p className="cycle-eyebrow">Learners</p>
        <h1>Today, child by child.</h1>
        <p>Open a learner’s task or print the student-facing version for paper use.</p>
      </section>

      <button className="cycle-print-shortcut" onClick={onOpenPrint} type="button">
        <span aria-hidden="true">▤</span>
        <span>
          <strong>Print student task sheets</strong>
          <small>Choose Jack, Remi, or both</small>
        </span>
        <span aria-hidden="true">→</span>
      </button>

      <div className="cycle-learner-list">
        {learningTasks.map((task) => {
          const isComplete = completedLearningTaskIds.has(task.id);

          return (
            <section className="cycle-learner-card" key={task.id}>
              <div>
                <div>
                  <p className="cycle-eyebrow">{task.mode}</p>
                  <h2>{task.owner}</h2>
                </div>
                <span className={isComplete ? 'is-complete' : ''}>{isComplete ? 'Done' : 'Today'}</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.duration}</p>
              <button onClick={() => onOpenLearningTask(task.id)} type="button">
                {isComplete ? 'Review completed task' : `Open ${task.owner}`}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type StudentPrintCenterProps = {
  onBack: () => void;
  today: string;
};

function StudentPrintCenter({ onBack, today }: StudentPrintCenterProps) {
  const [selectedIds, setSelectedIds] = useState<LearningTaskId[]>(
    learningTasks.map((task) => task.id),
  );

  const selectedTasks = useMemo(
    () => learningTasks.filter((task) => selectedIds.includes(task.id)),
    [selectedIds],
  );

  function toggleSelection(taskId: LearningTaskId) {
    setSelectedIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  }

  return (
    <div className="cycle-shell print-center">
      <div className="no-print">
        <button className="cycle-back-button" onClick={onBack} type="button">← Back to tools</button>
        <section className="cycle-page-heading">
          <p className="cycle-eyebrow">Parent print center</p>
          <h1>Print today’s student tasks.</h1>
          <p>The printed page contains only what the student needs: the task, materials, time, and steps.</p>
        </section>

        <section className="print-selection" aria-labelledby="print-selection-title">
          <div className="cycle-section-heading">
            <div>
              <p className="cycle-eyebrow">Choose students</p>
              <h2 id="print-selection-title">Who needs a paper copy?</h2>
            </div>
          </div>
          {learningTasks.map((task) => (
            <label key={task.id}>
              <input
                checked={selectedIds.includes(task.id)}
                onChange={() => toggleSelection(task.id)}
                type="checkbox"
              />
              <span>
                <strong>{task.owner}</strong>
                <small>{task.title} · {task.duration}</small>
              </span>
            </label>
          ))}
          <button
            className="cycle-primary-button"
            disabled={selectedTasks.length === 0}
            onClick={() => window.print()}
            type="button"
          >
            Print selected task sheets
          </button>
        </section>
      </div>

      <div className="print-pages" aria-label="Printable student task sheets">
        {selectedTasks.map((task) => (
          <article className="student-print-sheet" key={task.id}>
            <header>
              <div>
                <span>IterNest</span>
                <small>Student Task Sheet</small>
              </div>
              <p>{today}</p>
            </header>
            <p className="student-print-sheet__eyebrow">Today’s work</p>
            <h1>{task.owner}</h1>
            <section>
              <span className="student-print-checkbox" aria-hidden="true" />
              <div>
                <h2>{task.title}</h2>
                <p>{task.duration} · {task.mode}</p>
              </div>
            </section>
            <div className="student-print-grid">
              <div>
                <h3>Materials</h3>
                <ul>{task.materials.map((material) => <li key={material}>{material}</li>)}</ul>
              </div>
              <div>
                <h3>Steps</h3>
                <ol>
                  {task.studentSteps.map((step) => (
                    <li key={step}><span className="student-print-checkbox" aria-hidden="true" />{step}</li>
                  ))}
                </ol>
              </div>
            </div>
            <footer>Leave completed work in the family review spot.</footer>
          </article>
        ))}
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
  onOpenPrep: () => void;
  onOpenPrint: () => void;
  onRecenter: () => void;
  onReset: () => void;
  prepComplete: boolean;
  recenterChoice: string | null;
};

function ToolsView({
  approvalStatus,
  importedLessonCount,
  onImport,
  onOpenApproval,
  onOpenLibrary,
  onOpenPrep,
  onOpenPrint,
  onRecenter,
  onReset,
  prepComplete,
  recenterChoice,
}: ToolsViewProps) {
  return (
    <div className="cycle-shell">
      <section className="cycle-page-heading">
        <p className="cycle-eyebrow">Parent tools</p>
        <h1>Everything else, when you need it.</h1>
        <p>Printing, preparation, decisions, and curriculum tools stay outside the active learning sequence.</p>
      </section>

      <div className="cycle-tool-list">
        <ToolButton icon="▤" label="Print student task sheets" detail="Choose Jack, Remi, or both" onClick={onOpenPrint} />
        <ToolButton icon="↗" label="Get ready for tomorrow" detail={prepComplete ? 'Tomorrow is ready' : 'Post-day preparation waiting'} onClick={onOpenPrep} />
        <ToolButton icon="↺" label="Recenter today" detail={recenterChoice ?? 'Late start, less time, or an overwhelmed learner'} onClick={onRecenter} />
        <ToolButton icon="✓" label="Parent decisions" detail={approvalStatus === 'pending' ? '1 recommendation waiting' : 'Latest recommendation decided'} onClick={onOpenApproval} />
        <ToolButton icon="＋" label="Import curriculum" detail={importedLessonCount > 0 ? `${importedLessonCount} imported lessons ready` : 'Add a curriculum PDF or photo'} onClick={onImport} />
        <ToolButton icon="▥" label="Curriculum library" detail="Open your family bookshelf and source details" onClick={onOpenLibrary} />
      </div>

      <button className="cycle-reset-button" onClick={onReset} type="button">
        Start the next prototype day
      </button>
    </div>
  );
}

type ToolButtonProps = {
  detail: string;
  icon: string;
  label: string;
  onClick: () => void;
};

function ToolButton({ detail, icon, label, onClick }: ToolButtonProps) {
  return (
    <button onClick={onClick} type="button">
      <span aria-hidden="true">{icon}</span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

type AttentionStripProps = {
  approvalStatus: ApprovalStatus;
  onOpen: () => void;
};

function AttentionStrip({ approvalStatus, onOpen }: AttentionStripProps) {
  return (
    <button className={`cycle-attention cycle-attention--${approvalStatus}`} onClick={onOpen} type="button">
      <span aria-hidden="true">{approvalStatus === 'pending' ? '!' : '✓'}</span>
      <span>
        <small>Needs your attention</small>
        <strong>
          {approvalStatus === 'pending'
            ? 'Approve catch-up recommendation'
            : approvalStatus === 'approved'
              ? 'Catch-up recommendation approved'
              : 'Today’s original plan kept'}
        </strong>
        <span>{approvalStatus === 'pending' ? 'Nothing changes until you decide.' : 'Open to review or change the decision.'}</span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

type BottomNavigationProps = {
  activeView: AppView;
  onChange: (view: AppView) => void;
};

function BottomNavigation({ activeView, onChange }: BottomNavigationProps) {
  const currentTab =
    activeView === 'task' || activeView === 'prep' || activeView === 'approval'
      ? 'today'
      : activeView === 'print'
        ? 'tools'
        : activeView;

  return (
    <nav className="cycle-bottom-nav no-print" aria-label="Primary navigation">
      <button aria-current={currentTab === 'today' ? 'page' : undefined} onClick={() => onChange('today')} type="button">
        <span aria-hidden="true">⌂</span>
        Today
      </button>
      <button aria-current={currentTab === 'learners' ? 'page' : undefined} onClick={() => onChange('learners')} type="button">
        <span aria-hidden="true">◉</span>
        Learners
      </button>
      <button aria-current={currentTab === 'tools' ? 'page' : undefined} onClick={() => onChange('tools')} type="button">
        <span aria-hidden="true">＋</span>
        Tools
      </button>
    </nav>
  );
}
