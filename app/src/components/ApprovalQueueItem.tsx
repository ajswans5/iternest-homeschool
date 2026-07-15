export type ApprovalQueueItemProps = {
  studentName: string;
  subject: string;
  approvalNeeded: string;
  suggestedAction: string;
};

export function ApprovalQueueItem({
  studentName,
  subject,
  approvalNeeded,
  suggestedAction,
}: ApprovalQueueItemProps) {
  return (
    <article className="approval-item" aria-label={`${studentName} ${subject} approval`}>
      <div className="approval-item__content">
        <div>
          <p className="approval-item__meta">{studentName} - {subject}</p>
          <h3>{approvalNeeded}</h3>
        </div>
        <p className="approval-item__action">{suggestedAction}</p>
      </div>

      <div className="approval-item__buttons" aria-label="Approval actions">
        <button className="approval-button approval-button--primary" type="button">
          Approve
        </button>
        <button className="approval-button approval-button--secondary" type="button">
          Review
        </button>
      </div>
    </article>
  );
}