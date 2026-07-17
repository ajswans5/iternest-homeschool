import { useEffect, useMemo, useState } from 'react';
import { RecenterDayPanel, type RecenterOption } from '../components/RecenterDayPanel';
import { CurriculumImportFlow } from '../features/curriculum-import/CurriculumImportFlow';
import {
  getActiveCurriculumRecord,
  loadPersistedHomeschoolData,
  savePersistedHomeschoolData,
  setActiveCurriculumRecord,
  upsertCurriculumRecord,
  type PersistedCurriculumRecord,
  type PersistedLearningTask,
  type PersistedPrepTask,
} from '../features/daily-cycle/dailyCyclePersistence';
import type { ParentDecisionV2 } from '../features/parent-decision/contracts';
import '../styles/parent-home.css';
import '../styles/daily-cycle.css';
import '../styles/daily-cycle-debug.css';
import { CurriculumLibraryPage } from './CurriculumLibraryPage';

type AppView = 'today' | 'task' | 'prep' | 'decision' | 'learners' | 'print' | 'tools';
type DecisionReviewStatus = 'pending' | 'reviewed';

type CurriculumDayState = {
  dateKey: string;
  completedLearningTaskIds: string[];
  completedPrepTaskIds: string[];
  decisionReviewStatus: DecisionReviewStatus;
  recenterChoice: string | null;
  preparedLastNight: string[];
  morningReminderSeen: boolean;
};

type StoredDayStates = Record<string, CurriculumDayState>;

const DAY_STATE_STORAGE_KEY = 'iternest-homeschool-daily-cycle-v6';

const recenterOptions: RecenterOption[] = [
  {
    label: 'We started late',
    description: 'Protect the required learning and shorten the setup around it.',
    result: 'The essential learning stays visible. Flexible work can move later.',
  },
  {
    label: 'We have less time today',
    description: 'Keep required work and move flexible work out of the active block.',
    result: 'Required learning remains in the sequence. Flexible work is the first thing to move.',
  },
  {
    label: 'Someone needs a smaller start',
    description: 'Begin with the smallest safe version of the first learning task.',
    result: 'The first task becomes a shorter starting point without changing the learning goal.',
  },
  {
    label: 'Move flexible work',
    description: 'Keep protected work today and move only work marked as flexible.',
    result: 'Preparation remains in the wrap-up window and does not enter the learning sequence.',
  },
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyDayState(): CurriculumDayState {
  return {
    dateKey: localDateKey(),
    completedLearningTaskIds: [],
    completedPrepTaskIds: [],
    decisionReviewStatus: 'pending',
    recenterChoice: null,
    preparedLastNight: [],
    morningReminderSeen: false,
  };
}

function loadStoredDayStates(): StoredDayStates {
  try {
    const saved = window.localStorage.getItem(DAY_STATE_STORAGE_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    return parsed as StoredDayStates;
  } catch {
    return {};
  }
}

function remindersFromCompletedPrep(
  completedPrepTaskIds: string[],
  prepTasks: PersistedPrepTask[],
) {
  return completedPrepTaskIds
    .map((id) => prepTasks.find((task) => task.id === id)?.morningReminder)
    .filter((reminder): reminder is string => Boolean(reminder));
}

function normalizeDayState(
  stored: CurriculumDayState | undefined,
  learningTasks: PersistedLearningTask[],
  prepTasks: PersistedPrepTask[],
): CurriculumDayState {
  if (!stored) return emptyDayState();

  const learningIds = new Set(learningTasks.map((task) => task.id));
  const prepIds = new Set(prepTasks.map((task) => task.id));

  if (stored.dateKey !== localDateKey()) {
    return {
      ...emptyDayState(),
      preparedLastNight: remindersFromCompletedPrep(
        stored.completedPrepTaskIds.filter((id) => prepIds.has(id)),
        prepTasks,
      ),
    };
  }

  return {
    ...emptyDayState(),
    ...stored,
    completedLearningTaskIds: Array.isArray(stored.completedLearningTaskIds)
      ? stored.completedLearningTaskIds.filter((id) => learningIds.has(id))
      : [],
    completedPrepTaskIds: Array.isArray(stored.completedPrepTaskIds)
      ? stored.completedPrepTaskIds.filter((id) => prepIds.has(id))
      : [],
    decisionReviewStatus: stored.decisionReviewStatus === 'reviewed' ? 'reviewed' : 'pending',
    recenterChoice: typeof stored.recenterChoice === 'string' ? stored.recenterChoice : null,
    preparedLastNight: Array.isArray(stored.preparedLastNight)
      ? stored.preparedLastNight.filter((item): item is string => typeof item === 'string')
      : [],
    morningReminderSeen: stored.morningReminderSeen === true,
  };
}

function decisionItemCount(decision: ParentDecisionV2) {
  return (
    decision.attentionRequired.length +
    decision.confirmationsRequired.length +
    decision.blockers.length +
    decision.unresolvedUncertainty.length
  );
}

function firstDecisionLabel(decision: ParentDecisionV2) {
  return (
    decision.attentionRequired[0]?.label ??
    decision.confirmationsRequired[0]?.prompt ??
    decision.blockers[0]?.label ??
    decision.unresolvedUncertainty[0]?.question ??
    'Review the reasoning summary'
  );
}

function isStudentPrintableTask(task: PersistedLearningTask) {
  const mode = task.mode.toLowerCase();
  const owner = task.owner.toLowerCase();
  return !mode.includes('needs parent review') && owner !== 'parent' && !owner.includes('parent review');
}

export function ParentDailyCyclePageDebugged() {
  const [activeView, setActiveView] = useState<AppView>('today');
  const [homeschoolData, setHomeschoolData] = useState(loadPersistedHomeschoolData);
  const [dayStates, setDayStates] = useState<StoredDayStates>(loadStoredDayStates);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isRecenterPanelOpen, setIsRecenterPanelOpen] = useState(false);
  const [isImportFlowOpen, setIsImportFlowOpen] = useState(false);
  const [isCurriculumLibraryOpen, setIsCurriculumLibraryOpen] = useState(false);

  const activeCurriculum = getActiveCurriculumRecord(homeschoolData);
  const learningTasks = activeCurriculum?.dailyCycle.learningTasks ?? [];
  const prepTasks = activeCurriculum?.dailyCycle.prepTasks ?? [];
  const activeCurriculumId = activeCurriculum?.id ?? null;
  const dayState = activeCurriculumId
    ? normalizeDayState(dayStates[activeCurriculumId], learningTasks, prepTasks)
    : emptyDayState();

  useEffect(() => {
    savePersistedHomeschoolData(homeschoolData);
  }, [homeschoolData]);

  useEffect(() => {
    window.localStorage.setItem(DAY_STATE_STORAGE_KEY, JSON.stringify(dayStates));
  }, [dayStates]);

  useEffect(() => {
    if (!activeCurriculumId) return;

    const normalized = normalizeDayState(dayStates[activeCurriculumId], learningTasks, prepTasks);
    const stored = dayStates[activeCurriculumId];

    if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
      setDayStates((current) => ({ ...current, [activeCurriculumId]: normalized }));
    }
  }, [activeCurriculumId, learningTasks, prepTasks]);

  useEffect(() => {
    if (!learningTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(learningTasks[0]?.id ?? '');
    }
  }, [activeCurriculumId, learningTasks, selectedTaskId]);

  const completedLearningTaskIds = new Set(dayState.completedLearningTaskIds);
  const completedPrepTaskIds = new Set(dayState.completedPrepTaskIds);
  const currentLearningTask =
    learningTasks.find((task) => !completedLearningTaskIds.has(task.id)) ?? null;
  const currentLearningIndex = currentLearningTask
    ? learningTasks.findIndex((task) => task.id === currentLearningTask.id)
    : learningTasks.length;
  const selectedTask =
    learningTasks.find((task) => task.id === selectedTaskId) ?? currentLearningTask ?? null;
  const selectedTaskIndex = selectedTask
    ? learningTasks.findIndex((task) => task.id === selectedTask.id)
    : -1;
  const nextLearningTask = selectedTaskIndex >= 0
    ? learningTasks[selectedTaskIndex + 1] ?? null
    : null;
  const learningComplete = learningTasks.length > 0 && currentLearningTask === null;
  const prepComplete = prepTasks.length > 0 && prepTasks.every((task) => completedPrepTaskIds.has(task.id));
  const printableTasks = learningTasks.filter(isStudentPrintableTask);
  const recenterResult = recenterOptions.find(
    (option) => option.label === dayState.recenterChoice,
  )?.result;

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  function updateDayState(
    updater: (current: CurriculumDayState) => CurriculumDayState,
  ) {
    if (!activeCurriculumId) return;

    setDayStates((current) => {
      const normalized = normalizeDayState(current[activeCurriculumId], learningTasks, prepTasks);
      return { ...current, [activeCurriculumId]: updater(normalized) };
    });
  }

  function openLearningTask(taskId: string) {
    updateDayState((current) => ({ ...current, morningReminderSeen: true }));
    setSelectedTaskId(taskId);
    setActiveView('task');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function completeLearningTask(taskId: string) {
    updateDayState((current) => ({
      ...current,
      completedLearningTaskIds: current.completedLearningTaskIds.includes(taskId)
        ? current.completedLearningTaskIds
        : [...current.completedLearningTaskIds, taskId],
    }));
  }

  function reopenLearningTask(taskId: string) {
    updateDayState((current) => ({
      ...current,
      completedLearningTaskIds: current.completedLearningTaskIds.filter((id) => id !== taskId),
    }));
  }

  function togglePrepTask(taskId: string) {
    updateDayState((current) => ({
      ...current,
      completedPrepTaskIds: current.completedPrepTaskIds.includes(taskId)
        ? current.completedPrepTaskIds.filter((id) => id !== taskId)
        : [...current.completedPrepTaskIds, taskId],
    }));
  }

  function handleRecenter(option: RecenterOption) {
    updateDayState((current) => ({ ...current, recenterChoice: option.label }));
    setIsRecenterPanelOpen(false);
  }

  function handleImportApproved(curriculum: PersistedCurriculumRecord) {
    setHomeschoolData((current) => upsertCurriculumRecord(current, curriculum));
    setDayStates((current) => ({ ...current, [curriculum.id]: emptyDayState() }));
    setSelectedTaskId(curriculum.dailyCycle.learningTasks[0]?.id ?? '');
  }

  function handleSelectCurriculum(curriculumId: string) {
    setHomeschoolData((current) => setActiveCurriculumRecord(current, curriculumId));
    setActiveView('today');
  }

  function startFreshDay() {
    if (!activeCurriculumId) return;

    const preparedLastNight = remindersFromCompletedPrep(
      dayState.completedPrepTaskIds,
      prepTasks,
    );

    setDayStates((current) => ({
      ...current,
      [activeCurriculumId]: {
        ...emptyDayState(),
        preparedLastNight,
      },
    }));
    setSelectedTaskId(learningTasks[0]?.id ?? '');
    setActiveView('today');
  }

  if (isImportFlowOpen) {
    return (
      <CurriculumImportFlow
        onApprove={handleImportApproved}
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

      {activeView === 'today' && !activeCurriculum ? (
        <NoCurriculumView onImport={() => setIsImportFlowOpen(true)} />
      ) : null}

      {activeView === 'today' && activeCurriculum && learningTasks.length === 0 ? (
        <CurriculumNeedsReviewView
          curriculum={activeCurriculum}
          onImport={() => setIsImportFlowOpen(true)}
          onOpenDecision={() => setActiveView('decision')}
        />
      ) : null}

      {activeView === 'today' && activeCurriculum && currentLearningTask ? (
        <MorningLearningView
          completedLearningTaskIds={completedLearningTaskIds}
          currentLearningIndex={currentLearningIndex}
          currentLearningTask={currentLearningTask}
          decision={activeCurriculum.decision}
          decisionReviewStatus={dayState.decisionReviewStatus}
          learningTasks={learningTasks}
          morningReminderSeen={dayState.morningReminderSeen}
          onOpenDecision={() => setActiveView('decision')}
          onOpenLearningTask={openLearningTask}
          onOpenPrint={() => setActiveView('print')}
          onOpenTools={() => setActiveView('tools')}
          preparedLastNight={dayState.preparedLastNight}
          recenterChoice={dayState.recenterChoice}
          recenterResult={recenterResult}
        />
      ) : null}

      {activeView === 'today' && activeCurriculum && learningComplete ? (
        <SchoolDayCompleteView
          completedPrepTaskIds={completedPrepTaskIds}
          decision={activeCurriculum.decision}
          decisionReviewStatus={dayState.decisionReviewStatus}
          onOpenDecision={() => setActiveView('decision')}
          onOpenPrep={() => setActiveView('prep')}
          onTogglePrepTask={togglePrepTask}
          prepComplete={prepComplete}
          prepTasks={prepTasks}
        />
      ) : null}

      {activeView === 'task' && selectedTask ? (
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
          taskCount={learningTasks.length}
          taskIndex={selectedTaskIndex}
        />
      ) : null}

      {activeView === 'prep' && activeCurriculum ? (
        <TomorrowPrepView
          completedPrepTaskIds={completedPrepTaskIds}
          learningComplete={learningComplete}
          onBack={() => setActiveView('today')}
          onTogglePrepTask={togglePrepTask}
          prepComplete={prepComplete}
          prepTasks={prepTasks}
        />
      ) : null}

      {activeView === 'decision' && activeCurriculum ? (
        <DecisionView
          decision={activeCurriculum.decision}
          fileName={activeCurriculum.source.fileName}
          onBack={() => setActiveView('today')}
          onMarkReviewed={() =>
            updateDayState((current) => ({ ...current, decisionReviewStatus: 'reviewed' }))
          }
          onReopen={() =>
            updateDayState((current) => ({ ...current, decisionReviewStatus: 'pending' }))
          }
          reviewStatus={dayState.decisionReviewStatus}
        />
      ) : null}

      {activeView === 'learners' ? (
        <LearnersView
          completedLearningTaskIds={completedLearningTaskIds}
          learningTasks={learningTasks}
          onOpenLearningTask={openLearningTask}
          onOpenPrint={() => setActiveView('print')}
        />
      ) : null}

      {activeView === 'print' ? (
        <StudentPrintCenter
          learningTasks={printableTasks}
          onBack={() => setActiveView('tools')}
          today={today}
        />
      ) : null}

      {activeView === 'tools' ? (
        <ToolsView
          activeCurriculumId={activeCurriculumId}
          curricula={homeschoolData.curricula}
          decision={activeCurriculum?.decision ?? null}
          learningComplete={learningComplete}
          onImport={() => setIsImportFlowOpen(true)}
          onOpenDecision={() => setActiveView('decision')}
          onOpenLibrary={() => setIsCurriculumLibraryOpen(true)}
          onOpenPrep={() => setActiveView('prep')}
          onOpenPrint={() => setActiveView('print')}
          onRecenter={() => setIsRecenterPanelOpen(true)}
          onSelectCurriculum={handleSelectCurriculum}
          onStartFreshDay={startFreshDay}
          prepComplete={prepComplete}
          printableTaskCount={printableTasks.length}
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

function NoCurriculumView({ onImport }: { onImport: () => void }) {
  return (
    <div className="cycle-shell">
      <section className="cycle-intro" aria-labelledby="no-curriculum-title">
        <p className="cycle-eyebrow">Welcome to IterNest</p>
        <h1 id="no-curriculum-title">Let’s build your learning plan.</h1>
        <p>
          Import a curriculum first. IterNest will use its source evidence to build the daily cycle instead of showing placeholder lessons.
        </p>
      </section>
      <section className="cycle-start-card">
        <p className="cycle-eyebrow">Start here</p>
        <h2>Import curriculum</h2>
        <p className="cycle-start-card__duration">Required before a real daily sequence can be generated</p>
        <div className="cycle-start-card__reason">
          <strong>Why this first</strong>
          <p>The app needs an approved curriculum source before it can recommend a real first learning action.</p>
        </div>
        <button onClick={onImport} type="button">
          Import curriculum <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}

function CurriculumNeedsReviewView({
  curriculum,
  onImport,
  onOpenDecision,
}: {
  curriculum: PersistedCurriculumRecord;
  onImport: () => void;
  onOpenDecision: () => void;
}) {
  return (
    <div className="cycle-shell">
      <section className="cycle-intro">
        <p className="cycle-eyebrow">Curriculum imported</p>
        <h1>No safe daily tasks were generated yet.</h1>
        <p>
          {curriculum.source.fileName} was saved, but the source did not provide enough reliable lesson-task evidence for the daily cycle.
        </p>
      </section>
      <section className="cycle-boundary-note">
        <span aria-hidden="true">!</span>
        <div>
          <strong>Review the reasoning before teaching from this import.</strong>
          <p>The app will not invent a learning sequence when the source is incomplete or unreadable.</p>
        </div>
      </section>
      <div className="cycle-decision-actions">
        <button className="cycle-primary-button" onClick={onOpenDecision} type="button">Review reasoning</button>
        <button className="cycle-secondary-button" onClick={onImport} type="button">Import another curriculum</button>
      </div>
    </div>
  );
}

type MorningLearningViewProps = {
  completedLearningTaskIds: Set<string>;
  currentLearningIndex: number;
  currentLearningTask: PersistedLearningTask;
  decision: ParentDecisionV2;
  decisionReviewStatus: DecisionReviewStatus;
  learningTasks: PersistedLearningTask[];
  morningReminderSeen: boolean;
  onOpenDecision: () => void;
  onOpenLearningTask: (taskId: string) => void;
  onOpenPrint: () => void;
  onOpenTools: () => void;
  preparedLastNight: string[];
  recenterChoice: string | null;
  recenterResult?: string;
};

function MorningLearningView({
  completedLearningTaskIds,
  currentLearningIndex,
  currentLearningTask,
  decision,
  decisionReviewStatus,
  learningTasks,
  morningReminderSeen,
  onOpenDecision,
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
        <p>Only what matters now: a quiet reminder, then today’s curriculum-derived learning sequence.</p>
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
          <ul>{preparedLastNight.map((item) => <li key={item}>{item}</li>)}</ul>
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
          Open task <span aria-hidden="true">→</span>
        </button>
      </section>

      <div className="cycle-secondary-action-row">
        <button onClick={onOpenPrint} type="button">Print student task sheets</button>
      </div>

      <LearningSequence
        completedLearningTaskIds={completedLearningTaskIds}
        currentLearningTaskId={currentLearningTask.id}
        learningTasks={learningTasks}
        onOpenLearningTask={onOpenLearningTask}
      />

      <DecisionAttentionStrip
        decision={decision}
        onOpen={onOpenDecision}
        reviewStatus={decisionReviewStatus}
      />
    </div>
  );
}

function LearningSequence({
  completedLearningTaskIds,
  currentLearningTaskId,
  learningTasks,
  onOpenLearningTask,
}: {
  completedLearningTaskIds: Set<string>;
  currentLearningTaskId: string | null;
  learningTasks: PersistedLearningTask[];
  onOpenLearningTask: (taskId: string) => void;
}) {
  return (
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
          const isCurrent = task.id === currentLearningTaskId;
          return (
            <li className={`${isComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`} key={task.id}>
              <button onClick={() => onOpenLearningTask(task.id)} type="button">
                <span className="cycle-sequence__marker">{isComplete ? '✓' : index + 1}</span>
                <span className="cycle-sequence__copy">
                  <small>{task.owner}</small>
                  <strong>{task.title}</strong>
                  <span>{task.duration} · {task.mode}</span>
                </span>
                <span className="cycle-sequence__status">{isComplete ? 'Done' : isCurrent ? 'Now' : 'Later'}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SchoolDayCompleteView({
  completedPrepTaskIds,
  decision,
  decisionReviewStatus,
  onOpenDecision,
  onOpenPrep,
  onTogglePrepTask,
  prepComplete,
  prepTasks,
}: {
  completedPrepTaskIds: Set<string>;
  decision: ParentDecisionV2;
  decisionReviewStatus: DecisionReviewStatus;
  onOpenDecision: () => void;
  onOpenPrep: () => void;
  onTogglePrepTask: (taskId: string) => void;
  prepComplete: boolean;
  prepTasks: PersistedPrepTask[];
}) {
  return (
    <div className="cycle-shell cycle-shell--complete">
      <section className="school-complete-hero" aria-live="polite">
        <span aria-hidden="true">✓</span>
        <p className="cycle-eyebrow">School day complete</p>
        <h1>Today’s learning is finished.</h1>
        <p>The learning phase is closed. The screen now shows only tomorrow’s short wrap-up.</p>
      </section>

      <section className="wrap-up-section" aria-labelledby="wrap-up-title">
        <div className="cycle-section-heading">
          <div>
            <p className="cycle-eyebrow">Post-day preparation</p>
            <h2 id="wrap-up-title">Get ready for tomorrow</h2>
          </div>
          <span>{completedPrepTaskIds.size} of {prepTasks.length}</span>
        </div>

        {prepTasks.length > 0 ? (
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
        ) : (
          <p className="cycle-empty-copy">No preparation tasks were supported by the imported source.</p>
        )}

        {prepTasks.length > 0 ? (
          <button className="cycle-text-button" onClick={onOpenPrep} type="button">Open preparation details</button>
        ) : null}
      </section>

      {prepComplete ? (
        <section className="tomorrow-ready-card" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="cycle-eyebrow">Wrap-up complete</p>
            <h2>Tomorrow is ready.</h2>
            <p>These completed items will return as a quiet reminder at the start of the next school day.</p>
          </div>
        </section>
      ) : null}

      <DecisionAttentionStrip
        decision={decision}
        onOpen={onOpenDecision}
        reviewStatus={decisionReviewStatus}
      />
    </div>
  );
}

function LearningTaskView({
  isComplete,
  nextTask,
  onBack,
  onComplete,
  onContinue,
  onReopen,
  task,
  taskCount,
  taskIndex,
}: {
  isComplete: boolean;
  nextTask: PersistedLearningTask | null;
  onBack: () => void;
  onComplete: () => void;
  onContinue: () => void;
  onReopen: () => void;
  task: PersistedLearningTask;
  taskCount: number;
  taskIndex: number;
}) {
  return (
    <div className="cycle-shell cycle-detail-view">
      <button className="cycle-back-button" onClick={onBack} type="button">← Back to today</button>
      <section className="cycle-page-heading">
        <div className="cycle-task-meta">
          <span>Learning step {taskIndex + 1} of {taskCount}</span>
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
        <ul className="cycle-materials">{task.materials.map((material) => <li key={material}>{material}</li>)}</ul>
        <h2>Do this</h2>
        <ol className="cycle-instructions">
          {task.studentSteps.map((step, index) => (
            <li key={`${step}-${index}`}><span>{index + 1}</span><p>{step}</p></li>
          ))}
        </ol>
      </section>

      {isComplete ? (
        <section className="cycle-complete-panel" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="cycle-eyebrow">Learning complete</p>
            <h2>{task.completionLabel}</h2>
            <p>{nextTask ? `Next learning action: ${nextTask.title}.` : 'That finishes today’s active learning sequence.'}</p>
          </div>
          <button className="cycle-primary-button" onClick={onContinue} type="button">
            {nextTask ? 'Continue to next task' : 'Finish the school day'}
          </button>
          <button className="cycle-text-button" onClick={onReopen} type="button">Mark as not complete</button>
        </section>
      ) : (
        <div className="cycle-sticky-action">
          <button className="cycle-primary-button" onClick={onComplete} type="button">{task.completionLabel}</button>
        </div>
      )}
    </div>
  );
}

function TomorrowPrepView({
  completedPrepTaskIds,
  learningComplete,
  onBack,
  onTogglePrepTask,
  prepComplete,
  prepTasks,
}: {
  completedPrepTaskIds: Set<string>;
  learningComplete: boolean;
  onBack: () => void;
  onTogglePrepTask: (taskId: string) => void;
  prepComplete: boolean;
  prepTasks: PersistedPrepTask[];
}) {
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
            <p>You can look ahead, but IterNest will not mix preparation into the active school day.</p>
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
                  <li key={`${step}-${index}`}><span>{index + 1}</span><p>{step}</p></li>
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

function DecisionView({
  decision,
  fileName,
  onBack,
  onMarkReviewed,
  onReopen,
  reviewStatus,
}: {
  decision: ParentDecisionV2;
  fileName: string;
  onBack: () => void;
  onMarkReviewed: () => void;
  onReopen: () => void;
  reviewStatus: DecisionReviewStatus;
}) {
  const count = decisionItemCount(decision);

  return (
    <div className="cycle-shell cycle-detail-view">
      <button className="cycle-back-button" onClick={onBack} type="button">← Back to today</button>
      <section className="cycle-page-heading">
        <p className="cycle-eyebrow">Parent decisions</p>
        <h1>{count > 0 ? 'Review what the reasoning found.' : 'No parent decision is waiting.'}</h1>
        <p>{fileName} · {decision.readiness.rationale}</p>
      </section>

      <section className="cycle-decision-overview">
        <div><small>Readiness</small><strong>{decision.readiness.status}</strong></div>
        <div><small>Confidence</small><strong>{decision.confidence.level}</strong></div>
        <div><small>Evidence</small><strong>{decision.evidenceTraces.length} traces</strong></div>
      </section>

      <DecisionSection
        emptyCopy="No immediate attention items."
        items={decision.attentionRequired.map((item) => ({ id: item.id, label: item.label, detail: item.reason }))}
        title="Needs attention"
      />
      <DecisionSection
        emptyCopy="No confirmations are currently required."
        items={decision.confirmationsRequired.map((item) => ({ id: item.id, label: item.prompt, detail: item.reason }))}
        title="Confirmations"
      />
      <DecisionSection
        emptyCopy="No blockers were reported."
        items={decision.blockers.map((item) => ({ id: item.id, label: item.label, detail: item.reason }))}
        title="Blockers"
      />
      <DecisionSection
        emptyCopy="No unresolved uncertainty was reported."
        items={decision.unresolvedUncertainty.map((item) => ({ id: item.id, label: item.question, detail: item.reason }))}
        title="Unresolved uncertainty"
      />
      <DecisionSection
        emptyCopy="Nothing was deferred."
        items={decision.deferredItems.map((item) => ({ id: item.id, label: item.subsystem, detail: item.reason }))}
        title="Deferred for later"
      />

      {reviewStatus === 'reviewed' ? (
        <section className="cycle-decision-result" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <p className="cycle-eyebrow">Review saved</p>
            <h2>The current reasoning summary has been reviewed.</h2>
            <p>This does not answer unresolved questions or invent missing family and learner information.</p>
          </div>
          <button className="cycle-text-button" onClick={onReopen} type="button">Mark as needing review</button>
        </section>
      ) : (
        <button className="cycle-primary-button" onClick={onMarkReviewed} type="button">Mark reasoning as reviewed</button>
      )}
    </div>
  );
}

function DecisionSection({
  emptyCopy,
  items,
  title,
}: {
  emptyCopy: string;
  items: Array<{ id: string; label: string; detail: string }>;
  title: string;
}) {
  return (
    <section className="cycle-decision-section">
      <p className="cycle-eyebrow">{title}</p>
      {items.length > 0 ? (
        <div className="cycle-prep-task-list">
          {items.map((item) => (
            <article className="cycle-prep-task" key={item.id}>
              <h2>{item.label}</h2>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="cycle-empty-copy">{emptyCopy}</p>
      )}
    </section>
  );
}

function DecisionAttentionStrip({
  decision,
  onOpen,
  reviewStatus,
}: {
  decision: ParentDecisionV2;
  onOpen: () => void;
  reviewStatus: DecisionReviewStatus;
}) {
  const count = decisionItemCount(decision);
  const isSettled = count === 0 || reviewStatus === 'reviewed';

  return (
    <button
      className={`cycle-attention cycle-attention--${isSettled ? 'approved' : 'pending'}`}
      onClick={onOpen}
      type="button"
    >
      <span aria-hidden="true">{isSettled ? '✓' : '!'}</span>
      <span>
        <small>Parent decisions</small>
        <strong>{count > 0 ? firstDecisionLabel(decision) : 'No decision is waiting'}</strong>
        <span>
          {count > 0
            ? `${count} reasoning item${count === 1 ? '' : 's'} available for review.`
            : 'Open the reasoning summary and evidence status.'}
        </span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

function LearnersView({
  completedLearningTaskIds,
  learningTasks,
  onOpenLearningTask,
  onOpenPrint,
}: {
  completedLearningTaskIds: Set<string>;
  learningTasks: PersistedLearningTask[];
  onOpenLearningTask: (taskId: string) => void;
  onOpenPrint: () => void;
}) {
  return (
    <div className="cycle-shell">
      <section className="cycle-page-heading">
        <p className="cycle-eyebrow">Learners and tasks</p>
        <h1>Today, task by task.</h1>
        <p>Names remain unassigned until the family supplies learner information. The app will not invent them.</p>
      </section>

      <button className="cycle-print-shortcut" onClick={onOpenPrint} type="button">
        <span aria-hidden="true">▤</span>
        <span><strong>Print student task sheets</strong><small>Choose from the student-safe tasks generated from the active curriculum</small></span>
        <span aria-hidden="true">→</span>
      </button>

      <div className="cycle-learner-list">
        {learningTasks.map((task) => {
          const isComplete = completedLearningTaskIds.has(task.id);
          return (
            <section className="cycle-learner-card" key={task.id}>
              <div>
                <div><p className="cycle-eyebrow">{task.mode}</p><h2>{task.owner}</h2></div>
                <span className={isComplete ? 'is-complete' : ''}>{isComplete ? 'Done' : 'Today'}</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.duration}</p>
              <button onClick={() => onOpenLearningTask(task.id)} type="button">{isComplete ? 'Review completed task' : 'Open task'}</button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function StudentPrintCenter({
  learningTasks,
  onBack,
  today,
}: {
  learningTasks: PersistedLearningTask[];
  onBack: () => void;
  today: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(learningTasks.map((task) => task.id));
  const selectedTasks = useMemo(
    () => learningTasks.filter((task) => selectedIds.includes(task.id)),
    [learningTasks, selectedIds],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const valid = current.filter((id) => learningTasks.some((task) => task.id === id));
      return valid.length > 0 ? valid : learningTasks.map((task) => task.id);
    });
  }, [learningTasks]);

  function toggleSelection(taskId: string) {
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
          <p>Parent-review-only items are excluded from the student print center.</p>
        </section>

        {learningTasks.length > 0 ? (
          <section className="print-selection" aria-labelledby="print-selection-title">
            <div className="cycle-section-heading">
              <div><p className="cycle-eyebrow">Choose task sheets</p><h2 id="print-selection-title">What needs a paper copy?</h2></div>
            </div>
            {learningTasks.map((task) => (
              <label key={task.id}>
                <input checked={selectedIds.includes(task.id)} onChange={() => toggleSelection(task.id)} type="checkbox" />
                <span><strong>{task.owner}: {task.title}</strong><small>{task.duration} · {task.mode}</small></span>
              </label>
            ))}
            <button className="cycle-primary-button" disabled={selectedTasks.length === 0} onClick={() => window.print()} type="button">
              Print selected task sheets
            </button>
          </section>
        ) : (
          <section className="cycle-boundary-note">
            <span aria-hidden="true">!</span>
            <div><strong>No student-safe task sheets are available.</strong><p>Review the imported curriculum and learner assignments before printing.</p></div>
          </section>
        )}
      </div>

      <div className="print-pages" aria-label="Printable student task sheets">
        {selectedTasks.map((task) => (
          <article className="student-print-sheet" key={task.id}>
            <header><div><span>IterNest</span><small>Student Task Sheet</small></div><p>{today}</p></header>
            <p className="student-print-sheet__eyebrow">Today’s work</p>
            <h1>{task.owner}</h1>
            <section>
              <span className="student-print-checkbox" aria-hidden="true" />
              <div><h2>{task.title}</h2><p>{task.duration} · {task.mode}</p></div>
            </section>
            <div className="student-print-grid">
              <div><h3>Materials</h3><ul>{task.materials.map((material) => <li key={material}>{material}</li>)}</ul></div>
              <div><h3>Steps</h3><ol>{task.studentSteps.map((step, index) => <li key={`${step}-${index}`}><span className="student-print-checkbox" aria-hidden="true" />{step}</li>)}</ol></div>
            </div>
            <footer>Leave completed work in the family review spot.</footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function ToolsView({
  activeCurriculumId,
  curricula,
  decision,
  learningComplete,
  onImport,
  onOpenDecision,
  onOpenLibrary,
  onOpenPrep,
  onOpenPrint,
  onRecenter,
  onSelectCurriculum,
  onStartFreshDay,
  prepComplete,
  printableTaskCount,
  recenterChoice,
}: {
  activeCurriculumId: string | null;
  curricula: PersistedCurriculumRecord[];
  decision: ParentDecisionV2 | null;
  learningComplete: boolean;
  onImport: () => void;
  onOpenDecision: () => void;
  onOpenLibrary: () => void;
  onOpenPrep: () => void;
  onOpenPrint: () => void;
  onRecenter: () => void;
  onSelectCurriculum: (curriculumId: string) => void;
  onStartFreshDay: () => void;
  prepComplete: boolean;
  printableTaskCount: number;
  recenterChoice: string | null;
}) {
  return (
    <div className="cycle-shell">
      <section className="cycle-page-heading">
        <p className="cycle-eyebrow">Parent tools</p>
        <h1>Everything else, when you need it.</h1>
        <p>Printing, preparation, decisions, and curriculum tools stay outside the active learning sequence.</p>
      </section>

      {curricula.length > 0 ? (
        <section className="cycle-boundary-note" aria-label="Active curriculum">
          <span aria-hidden="true">▣</span>
          <div>
            <strong>Active curriculum source</strong>
            <p>Selecting a saved curriculum changes Start Here, the sequence, print sheets, and tomorrow prep.</p>
            <div className="cycle-curriculum-selector">
              {curricula.map((curriculum) => (
                <button
                  className={curriculum.id === activeCurriculumId ? 'cycle-primary-button' : 'cycle-secondary-button'}
                  key={curriculum.id}
                  onClick={() => onSelectCurriculum(curriculum.id)}
                  type="button"
                >
                  {curriculum.source.fileName}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="cycle-tool-list">
        <ToolButton disabled={printableTaskCount === 0} icon="▤" label="Print student task sheets" detail={printableTaskCount > 0 ? `${printableTaskCount} student-safe task sheet${printableTaskCount === 1 ? '' : 's'}` : 'No student-safe tasks yet'} onClick={onOpenPrint} />
        <ToolButton disabled={!learningComplete} icon="↗" label="Get ready for tomorrow" detail={learningComplete ? (prepComplete ? 'Tomorrow is ready' : 'Post-day preparation waiting') : 'Available after today’s learning'} onClick={onOpenPrep} />
        <ToolButton disabled={!activeCurriculumId} icon="↺" label="Recenter today" detail={recenterChoice ?? 'Late start, less time, or a smaller start'} onClick={onRecenter} />
        <ToolButton disabled={!decision} icon="!" label="Parent decisions" detail={decision ? `${decisionItemCount(decision)} reasoning item${decisionItemCount(decision) === 1 ? '' : 's'}` : 'Import curriculum first'} onClick={onOpenDecision} />
        <ToolButton icon="＋" label="Import curriculum" detail={curricula.length > 0 ? `${curricula.length} saved curriculum source${curricula.length === 1 ? '' : 's'}` : 'Add a curriculum PDF or photo'} onClick={onImport} />
        <ToolButton icon="▥" label="Curriculum library" detail="Open source details and curriculum records" onClick={onOpenLibrary} />
      </div>

      {activeCurriculumId ? (
        <button className="cycle-reset-button" onClick={onStartFreshDay} type="button">Start a fresh prototype day</button>
      ) : null}
    </div>
  );
}

function ToolButton({
  detail,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  detail: string;
  disabled?: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button disabled={disabled} onClick={onClick} type="button">
      <span aria-hidden="true">{icon}</span>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

function BottomNavigation({
  activeView,
  onChange,
}: {
  activeView: AppView;
  onChange: (view: AppView) => void;
}) {
  const currentTab =
    activeView === 'task' || activeView === 'prep' || activeView === 'decision'
      ? 'today'
      : activeView === 'print'
        ? 'tools'
        : activeView;

  return (
    <nav className="cycle-bottom-nav no-print" aria-label="Primary navigation">
      <button aria-current={currentTab === 'today' ? 'page' : undefined} onClick={() => onChange('today')} type="button">
        <span aria-hidden="true">⌂</span>Today
      </button>
      <button aria-current={currentTab === 'learners' ? 'page' : undefined} onClick={() => onChange('learners')} type="button">
        <span aria-hidden="true">◎</span>Learners
      </button>
      <button aria-current={currentTab === 'tools' ? 'page' : undefined} onClick={() => onChange('tools')} type="button">
        <span aria-hidden="true">＋</span>Tools
      </button>
    </nav>
  );
}
