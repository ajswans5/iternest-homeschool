export type StudentTodayStatus = 'on-track' | 'needs-parent' | 'behind';

export type StudentOverviewCardProps = {
  name: string;
  todayStatus: StudentTodayStatus;
  todayStatusLabel: string;
  lessonsToday: number;
  nextAction: string;
  progressPercent: number;
};

const statusClassNames: Record<StudentTodayStatus, string> = {
  'on-track': 'student-card__status--on-track',
  'needs-parent': 'student-card__status--needs-parent',
  behind: 'student-card__status--behind',
};

export function StudentOverviewCard({
  name,
  todayStatus,
  todayStatusLabel,
  lessonsToday,
  nextAction,
  progressPercent,
}: StudentOverviewCardProps) {
  return (
    <article className="student-card" aria-labelledby={`${name}-overview-title`}>
      <div className="student-card__header">
        <div>
          <h3 id={`${name}-overview-title`}>{name}</h3>
          <span className={`student-card__status ${statusClassNames[todayStatus]}`}>
            {todayStatusLabel}
          </span>
        </div>
        <p className="student-card__lessons">
          <strong>{lessonsToday}</strong>
          <span>lessons today</span>
        </p>
      </div>

      <div className="student-card__action">
        <p className="student-card__label">Next action</p>
        <p>{nextAction}</p>
      </div>

      <div className="student-card__progress" aria-label={`${progressPercent}% complete`}>
        <div className="student-card__progress-track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <span>{progressPercent}%</span>
      </div>
    </article>
  );
}