export type LessonStatus = 'ready' | 'in-progress' | 'needs-review';

export type LessonStatusItemProps = {
  subject: string;
  title?: string;
  status: LessonStatus;
  statusLabel: string;
};

const statusClassNames: Record<LessonStatus, string> = {
  ready: 'lesson-status__dot--ready',
  'in-progress': 'lesson-status__dot--in-progress',
  'needs-review': 'lesson-status__dot--needs-review',
};

export function LessonStatusItem({
  subject,
  title,
  status,
  statusLabel,
}: LessonStatusItemProps) {
  return (
    <li className="lesson-status">
      <div>
        <p className="lesson-status__subject">{title ?? subject}</p>
        <p className="lesson-status__label">
          {title ? `${subject} - ${statusLabel}` : statusLabel}
        </p>
      </div>
      <span className={`lesson-status__dot ${statusClassNames[status]}`} aria-hidden="true" />
    </li>
  );
}