import type { ExtractedInstructionClassification, ExtractedLessonItem } from './types';

type ExtractedLessonReviewCardProps = {
  item: ExtractedLessonItem;
  isSelected: boolean;
  onItemChange: (id: string, updates: Partial<ExtractedLessonItem>) => void;
  onSelectionChange: (id: string, isSelected: boolean) => void;
};

const classificationLabels: Record<ExtractedInstructionClassification, string> = {
  'parent-teaching': 'Parent Teaching',
  'student-independent': 'Student Independent',
  'parent-prep': 'Parent Prep',
  review: 'Review',
  flexible: 'Flexible',
  optional: 'Optional',
};

export function ExtractedLessonReviewCard({
  item,
  isSelected,
  onItemChange,
  onSelectionChange,
}: ExtractedLessonReviewCardProps) {
  return (
    <article className="extracted-card">
      <div className="extracted-card__header">
        <div>
          <p className="extracted-card__meta">{item.subject}</p>
          <label className="field-group">
            <span>Extracted instruction</span>
            <input
              onChange={(event) => onItemChange(item.id, { instruction: event.target.value })}
              type="text"
              value={item.instruction}
            />
          </label>
        </div>
        <span className="extracted-card__confidence">
          {item.confidence === 'high' ? 'High confidence' : 'Review suggested'}
        </span>
      </div>

      <div className="source-evidence">
        <p>From uploaded curriculum</p>
        <blockquote>{item.sourceText}</blockquote>
        <small>{item.sourceLocation}</small>
      </div>

      <div className="extracted-card__controls">
        <label className="field-group">
          <span>Subject</span>
          <input
            onChange={(event) => onItemChange(item.id, { subject: event.target.value })}
            type="text"
            value={item.subject}
          />
        </label>

        <label className="field-group">
          <span>Classification</span>
          <select
            onChange={(event) =>
              onItemChange(item.id, {
                classification: event.target.value as ExtractedInstructionClassification,
              })
            }
            value={item.classification}
          >
            <option value="parent-teaching">Parent Teaching</option>
            <option value="student-independent">Student Independent</option>
            <option value="parent-prep">Parent Prep</option>
            <option value="review">Review</option>
            <option value="flexible">Flexible</option>
            <option value="optional">Optional</option>
          </select>
        </label>
      </div>

      <div className="extracted-card__badges" aria-label="Instruction classifications">
        <span>{classificationLabels[item.classification]}</span>
      </div>

      <label className="include-toggle">
        <input
          checked={isSelected}
          onChange={(event) => onSelectionChange(item.id, event.target.checked)}
          type="checkbox"
        />
        Include when I approve
      </label>
    </article>
  );
}