import { useEffect, useState } from 'react';
import { RecenterDayPanel, type RecenterOption } from '../components/RecenterDayPanel';
import { CurriculumImportFlow } from '../features/curriculum-import/CurriculumImportFlow';
import type { ApprovedLesson } from '../features/curriculum-import/types';
import '../styles/parent-home.css';
import '../styles/parent-workflow.css';
import { CurriculumLibraryPage } from './CurriculumLibraryPage';

type AppView = 'today' | 'task' | 'prep' | 'approval' | 'learners' | 'tools';
type LearningTaskId = 'jack-handwriting' | 'remi-grammar';
type PrepTaskId = 'print-spelling-quiz';
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
  steps: string[];
  completionLabel: string;
};

type PrepTask = {
  id: PrepTaskId;
  title: string;
  duration: string;
  reason: string;
  steps: string[];
};

type DayState = {
  completedLearningTaskIds: LearningTaskId[];
  completedPrepTaskIds: PrepTaskId[];
  approvalStatus: ApprovalStatus;
  recenterChoice: string | null;
};

const STORAGE_KEY = 'iternest-homeschool-workflow-v4';

const learningTasks: LearningTask[] = [
  {
    id: 'jack-handwriting',
    owner: 'Jack',
    title: 'Independent handwriting',
    duration: '15 minutes',
    mode: 'Independent',
    reason: "Jack can work independently while you prepare Remi's grammar lesson.",
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
      'Teach the short grammar lesson, complete the oral practice together, and mark the lesson complete.',
    materials: ['Grammar teacher guide', 'Remiâ€™s workbook', 'Pencil'],
    steps: [
      'Read the lesson explanation together.',
      'Complete the oral examples.',
      'Have Remi finish the short written practice.',
    ],
    completionLabel: 'Grammar lesson complete',
  },
];

const prepTasks: PrepTask[] = [
  {
    id: 'print-spelling-quiz',
    title: 'Print spelling quiz',
    duration: '2 minutes',
    reason: 'Doing this after lessons means tomorrow begins ready instead of with another setup task.',
    steps: [
      'Open the saved spelling quiz.',
      'Print one copy.',
      'Place it with tomorrowâ€™s materials.',
    ],
  },
];

const recenterOptions: RecenterOption[] = [
  {
    label: 'We started late',
    description: 'Keep the teacher-led lesson and shorten the learning block around it.',
    result: 'Todayâ€™s learning stays focused. Tomorrow preparation remains outside the school-day sequence.',
  },
  {
    label: 'We have less time today',
    description: 'Protect the essential lesson and move flexible learning work aside.',
    result: 'Remiâ€™s grammar lesson stays visible. Flexible work can move without mixing in preparation tasks.',
  },
  {
    label: 'Someone needs a smaller start',
    description: 'Make the first learning action easier without losing the goal.',
    result: 'Jack begins with five minutes of handwriting, then decides whether to continue.',
  },
  {
    label: 'Move flexible work',
    description: 'Keep required learning today and move optional work forward.',
    result: 'Only flexible learning moves. Tomorrow preparation stays in its own wrap-up window.',
  },
];

const initialDayState: DayState = {
  completedLearningTaskIds: [],
  completedPrepTaskIds: [],
  approvalStatus: 'pending',
  recenterChoice: null,
};

function isLearningTaskId(value: unknown): value is LearningTaskId {
  return learningTasks.some((task) => task.id === value);
}

function isPrepTaskId(value: unknown): value is PrepTaskId {
  return prepTasks.some((task) => task.id === value);
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
      completedLearningTaskIds: Array.isArray(parsed.completedLearningTaskIds)
        ? parsed.completedLearningTaskIds.filter(isLearningTaskId)
        : [],
      completedPrepTaskIds: Array.isArray(parsed.completedPrepTaskIds)
        ? parsed.completedPrepTaskIds.filter(isPrepTaskId)
        : [],
      approvalStatus,
      recenterChoice:
        typeof parsed.recenterChoice === 'string' ? parsed.recenterChoice : null,
    };
  } catch {
    return initialDayState;
  }
}

export function ParentWorkflowPage() {
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

  function resetDay() {
    setDayState(initialDayState);
    setSelectedTaskId('jack-handwriting');
    setActiveView('today');
  }

  if (isImportFlowOpen) {
    return (
      <CurriculumImportFlow
        onApprove={() => setApprovedImportedLessons([])}
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
          completedLearningTaskIds={completedLearningTaskIds}
          currentLearningIndex={currentLearningIndex}
          currentLearningTask={currentLearningTask}
          learningComplete={learningComplete}
          onOpenApproval={() => setActiveView('approval')}
          onOpenLearningTask={openLearningTask}
          onOpenPrep={() => setActiveView('prep')}
          onOpenTools={() => setActiveView('tools')}
          prepComplete={prepComplete}
          prepCompletedCount={dayState.completedPrepTaskIds.length}
          recenterChoice={dayState.recenterChoice}
          recenterResult={recenterResult}
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
        />
      ) : null}

      {activeView === 'tools' ? (
        <ToolsView
          approvalStatus={dayState.approvalStatus}
          importedLessonCount={approvedImportedLessons.length}
          onImport={() => setIsImportFlowOpen(true)}
          onOpenApproval={() => setActiveView('approval')}
          onOpenLibrary={() => setIsCurriculumLibraryOpen(true)}
          onOpenPrep={() => setActiveView('prep')}
          onRecenter={() => setIsRecenterPanelOpen(true)}
          onReset={resetDay}
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

type TodayViewProps = {
  approvalStatus: ApprovalStatus;
  completedLearningTaskIds: Set<LearningTaskId>;
  currentLearningIndex: number;
  currentLearningTask: LearningTask | null;
  learningComplete: boolean;
  onOpenApproval: () => void;
  onOpenLearningTask: (taskId: LearningTaskId) => void;
  onOpenPrep: () => void;
  onOpenTools: () => void;
  prepComplete: boolean;
  prepCompletedCount: number;
  recenterChoice: string | null;
  recenterResult?: string;
};

function TodayView({
  approvalStatus,
  completedLearningTaskIds,
  currentLearningIndex,
  currentLearningTask,
  learningComplete,
  onOpenApproval,
  onOpenLearningTask,
  onOpenPrep,
  onOpenTools,
  prepComplete,
  prepCompletedCount,
  recenterChoice,
  recenterResult,
}: TodayViewProps) {
  return (
    <div className="view-shell view-shell--today">
      <section className="today-intro" aria-labelledby="today-title">
        <p className="eyebrow">Good morning</p>
        <h1 id="today-title">
          {learningComplete ? 'Todayâ€™s learning is complete.' : 'Your first move is ready.'}
        </h1>
        <p>
          {learningComplete
            ? 'The school-day work is finished. Tomorrow preparation has its own wrap-up space.'
            : 'Follow the learning sequence now. Preparation for tomorrow stays separate.'}
        </p>
      </section>

      {recenterChoice ? (
        <button className="recenter-summary" onClick={onOpenTools} type="button">
          <span>Plan recentered</span>
          <strong>{recenterChoice}</strong>
          <small>{recenterResult}</small>
        </button>
      ) : null}

      <section className="phase-section phase-section--learning" aria-labelledby="learning-phase-title">
        <header className="phase-section__header">
          <div>
            <p className="eyebrow">Active school day</p>
            <h2 id="learning-phase-title">Todayâ€™s learning</h2>
          </div>
          <span className="phase-badge">Now</span>
        </header>

        <section className="morning-progress" aria-label="Todayâ€™s learning progress">
          <div>
            <span>Learning block</span>
            <strong>{completedLearningTaskIds.size} of {learningTasks.length} complete</strong>
          </div>
          <div
            className="morning-progress__track"
            aria-hidden="true"
            style={{ gridTemplateColumns: `repeat(${learningTasks.length}, minmax(0, 1fr))` }}
          >
            {learningTasks.map((task) => (
              <span
                className={completedLearningTaskIds.has(task.id) ? 'is-complete' : ''}
                key={task.id}
              />
            ))}
          </div>
        </section>

        {currentLearningTask ? (
          <section className="start-card" aria-labelledby="start-card-title">
            <div className="start-card__topline">
              <span className="start-card__number">{currentLearningIndex + 1}</span>
              <span>{currentLearningTask.mode}</span>
            </div>
            <p className="start-card__label">Start here</p>
            <p className="start-card__owner">{currentLearningTask.owner}</p>
            <h2 id="start-card-title">{currentLearningTask.title}</h2>
            <p className="start-card__duration">{currentLearningTask.duration}</p>
            <div className="start-card__reason">
              <span>Why this first</span>
              <p>{currentLearningTask.reason}</p>
            </div>
            <button onClick={() => onOpenLearningTask(currentLearningTask.id)} type="button">
              Open {currentLearningTask.owner}
              <span aria-hidden="true">â†’</span>
            </button>
          </section>
        ) : (
          <section className="complete-card" aria-live="polite">
            <span className="complete-card__check" aria-hidden="true">âœ“</span>
            <div>
              <p className="eyebrow">Learning finished</p>
              <h2>The active school-day sequence is complete.</h2>
              <p>Nothing in tomorrowâ€™s preparation is counted as student learning.</p>
            </div>
            <button onClick={onOpenPrep} type="button">Wrap up and prepare tomorrow</button>
          </section>
        )}

        <section className="day-sequence" aria-labelledby="sequence-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Learning order</p>
              <h2 id="sequence-title">Then what?</h2>
            </div>
            <span>{learningTasks.length} steps</span>
          </div>

          <ol className="sequence-list">
            {learningTasks.map((task, index) => {
              const isTaskComplete = completedLearningTaskIds.has(task.id);
              const isCurrent = currentLearningTask?.id === task.id;

              return (
                <li
                  className={`${isTaskComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`}
                  key={task.id}
                >
                  <button onClick={() => onOpenLearningTask(task.id)} type="button">
                    <span className="sequence-list__marker" aria-hidden="true">
                      {isTaskComplete ? 'âœ“' : index + 1}
                    </span>
                    <span className="sequence-list__copy">
                      <small>{task.owner}</small>
                      <strong>{task.title}</strong>
                      <span>{task.duration} Â· {task.mode}</span>
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
      </section>

      <button className="prep-preview" onClick={onOpenPrep} type="button">
        <span className="prep-preview__icon" aria-hidden="true">â†—</span>
        <span className="prep-preview__copy">
          <small>Post-day wrap-up</small>
          <strong>Get ready for tomorrow</strong>
          <span>
            {prepComplete
              ? 'Tomorrow is ready.'
              : `${prepCompletedCount} of ${prepTasks.length} preparation tasks complete`}
          </span>
        </span>
        <span className="prep-preview__timing">After lessons</span>
      </button>

      <button
        className={`attention-strip attention-strip--${approvalStatus}`}
        onClick={onOpenApproval}
        type="button"
      >
        <span className="attention-strip__icon" aria-hidden="true">
          {approvalStatus === 'pending' ? '!' : 'âœ“'}
        </span>
        <span>
          <small>Needs your attention</small>
          <strong>
            {approvalStatus === 'pending'
              ? 'Approve catch-up recommendation'
              : approvalStatus === 'approved'
                ? 'Catch-up recommendation approved'
                : 'Todayâ€™s original plan kept'}
          </strong>
          <span>
            {approvalStatus === 'pending'
              ? 'Nothing changes until you decide.'
              : 'Open to review or change the decision.'}
          </span>
        </span>
        <span aria-hidden="true">â†’</span>
      </button>
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
    <div className="view-shell detail-view">
      <button className="back-button" onClick={onBack} type="button">â† Back to today</button>

      <section className="task-heading">
        <div className="task-heading__meta">
          <span>Learning step {taskIndex + 1} of {learningTasks.length}</span>
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
          <span aria-hidden="true">âœ“</span>
          <div>
            <p className="eyebrow">Learning complete</p>
            <h2>{task.completionLabel}</h2>
            <p>
              {nextTask
                ? `Next learning action: ${nextTask.owner} â€” ${nextTask.title}.`
                : 'That finishes todayâ€™s active learning sequence.'}
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
    <div className="view-shell detail-view prep-view">
      <button className="back-button" onClick={onBack} type="button">â† Back to today</button>

      <section className="page-heading">
        <p className="eyebrow">Post-day preparation</p>
        <h1>Get ready for tomorrow.</h1>
        <p>
          This work supports school, but it is not part of todayâ€™s learning sequence.
        </p>
      </section>

      {!learningComplete ? (
        <section className="prep-boundary-note">
          <span aria-hidden="true">â—‹</span>
          <div>
            <strong>Save this for after lessons.</strong>
            <p>You can look ahead now, but IterNest will not mix it into the active school day.</p>
          </div>
        </section>
      ) : null}

      <div className="prep-task-list">
        {prepTasks.map((task) => {
          const isComplete = completedPrepTaskIds.has(task.id);

          return (
            <section className={isComplete ? 'prep-task is-complete' : 'prep-task'} key={task.id}>
              <div className="prep-task__heading">
                <span aria-hidden="true">{isComplete ? 'âœ“' : '1'}</span>
                <div>
                  <p className="eyebrow">Tomorrow prep Â· {task.duration}</p>
                  <h2>{task.title}</h2>
                </div>
              </div>

              <p>{task.reason}</p>

              <ol className="instruction-list">
                {task.steps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>

              <button
                className={isComplete ? 'secondary-button' : 'primary-button'}
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
        <section className="tomorrow-ready" aria-live="polite">
          <span aria-hidden="true">âœ“</span>
          <div>
            <p className="eyebrow">Wrap-up complete</p>
            <h2>Tomorrow is ready.</h2>
            <p>The next school day can begin with learning instead of setup.</p>
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
      <button className="back-button" onClick={onBack} type="button">â† Back to today</button>

      <section className="approval-heading">
        <p className="eyebrow">Needs your attention</p>
        <h1>Catch-up recommendation</h1>
        <p>Nothing changes until you approve it.</p>
      </section>

      {hasDecision ? (
        <section className={`decision-result decision-result--${status}`} aria-live="polite">
          <span aria-hidden="true">âœ“</span>
          <div>
            <p className="eyebrow">Decision saved</p>
            <h2>
              {status === 'approved'
                ? 'Spelling practice will move to tomorrow.'
                : 'Todayâ€™s original learning plan will stay in place.'}
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
              <p className="eyebrow">Current learning plan</p>
              <h2>Finish spelling practice today.</h2>
              <p>This adds another independent learning task after grammar.</p>
            </div>
            <span className="decision-comparison__arrow" aria-hidden="true">â†’</span>
            <div className="decision-comparison__suggested">
              <p className="eyebrow">Suggested change</p>
              <h2 id="suggested-change-title">Move spelling practice to tomorrow.</h2>
              <p>Keep todayâ€™s teacher-led grammar lesson and protect the shorter learning block.</p>
            </div>
          </section>

          <section className="evidence-card">
            <p className="eyebrow">Why IterNest surfaced this</p>
            <ul>
              <li>Grammar requires your instruction today.</li>
              <li>Spelling practice is flexible and has no blocking dependency.</li>
              <li>Moving learning work is separate from preparing tomorrowâ€™s materials.</li>
            </ul>
          </section>

          <div className="decision-actions">
            <button className="primary-button" onClick={onApprove} type="button">
              Approve adjustment
            </button>
            <button className="secondary-button" onClick={onKeepPlan} type="button">
              Keep todayâ€™s plan
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
  completedLearningTaskIds: Set<LearningTaskId>;
  onOpenLearningTask: (taskId: LearningTaskId) => void;
};

function LearnersView({
  completedLearningTaskIds,
  onOpenLearningTask,
}: LearnersViewProps) {
  return (
    <div className="view-shell">
      <section className="page-heading">
        <p className="eyebrow">Learners</p>
        <h1>Today, child by child.</h1>
        <p>Only learning appears here. Parent preparation stays in the wrap-up flow.</p>
      </section>

      <div className="learner-list">
        {learningTasks.map((task) => {
          const isComplete = completedLearningTaskIds.has(task.id);

          return (
            <section className="learner-card" key={task.id}>
              <div className="learner-card__top">
                <div>
                  <p className="eyebrow">{task.mode}</p>
                  <h2>{task.owner}</h2>
                </div>
                <span className={isComplete ? 'is-complete' : ''}>
                  {isComplete ? 'Done' : 'Today'}
                </span>
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

type ToolsViewProps = {
  approvalStatus: ApprovalStatus;
  importedLessonCount: number;
  onImport: () => void;
  onOpenApproval: () => void;
  onOpenLibrary: () => void;
  onOpenPrep: () => void;
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
  onRecenter,
  onReset,
  prepComplete,
  recenterChoice,
}: ToolsViewProps) {
  return (
    <div className="view-shell">
      <section className="page-heading">
        <p className="eyebrow">Parent tools</p>
        <h1>Adjust the plan without rebuilding it.</h1>
        <p>Decisions, curriculum, and preparation stay outside the active learning sequence.</p>
      </section>

      <div className="tool-list">
        <button onClick={onRecenter} type="button">
          <span className="tool-list__icon" aria-hidden="true">â†º</span>
          <span>
            <strong>Recenter today</strong>
            <small>{recenterChoice ?? 'Late start, less time, or an overwhelmed learner'}</small>
          </span>
          <span aria-hidden="true">â†’</span>
        </button>

        <button onClick={onOpenApproval} type="button">
          <span className="tool-list__icon" aria-hidden="true">âœ“</span>
          <span>
            <strong>Parent decisions</strong>
            <small>
              {approvalStatus === 'pending'
                ? '1 recommendation waiting'
                : 'Latest recommendation decided'}
            </small>
          </span>
          <span aria-hidden="true">â†’</span>
        </button>

        <button onClick={onOpenPrep} type="button">
          <span className="tool-list__icon" aria-hidden="true">â†—</span>
          <span>
            <strong>Get ready for tomorrow</strong>
            <small>{prepComplete ? 'Tomorrow is ready' : 'Post-day preparation waiting'}</small>
          </span>
          <span aria-hidden="true">â†’</span>
        </button>

        <button onClick={onImport} type="button">
          <span className="tool-list__icon" aria-hidden="true">ï¼‹</span>
          <span>
            <strong>Import curriculum</strong>
            <small>
              {importedLessonCount > 0
                ? `${importedLessonCount} imported lessons ready`
                : 'Add a curriculum PDF or photo'}
            </small>
          </span>
          <span aria-hidden="true">â†’</span>
        </button>

        <button onClick={onOpenLibrary} type="button">
          <span className="tool-list__icon" aria-hidden="true">â–¤</span>
          <span>
            <strong>Curriculum library</strong>
            <small>Open your family bookshelf and source details</small>
          </span>
          <span aria-hidden="true">â†’</span>
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
  const currentTab =
    activeView === 'task' || activeView === 'prep' || activeView === 'approval'
      ? 'today'
      : activeView;

  return (
    <nav className="bottom-navigation" aria-label="Primary navigation">
      <button
        aria-current={currentTab === 'today' ? 'page' : undefined}
        onClick={() => onChange('today')}
        type="button"
      >
        <span aria-hidden="true">âŒ‚</span>
        Today
      </button>
      <button
        aria-current={currentTab === 'learners' ? 'page' : undefined}
        onClick={() => onChange('learners')}
        type="button"
      >
        <span aria-hidden="true">â—‰</span>
        Learners
      </button>
      <button
        aria-current={currentTab === 'tools' ? 'page' : undefined}
        onClick={() => onChange('tools')}
        type="button"
      >
        <span aria-hidden="true">ï¼‹</span>
        Tools
      </button>
    </nav>
  );
}

