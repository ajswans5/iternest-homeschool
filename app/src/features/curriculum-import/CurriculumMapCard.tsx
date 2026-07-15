import type { CurriculumSection } from './types';

type CurriculumMapCardProps = {
  section: CurriculumSection;
  isSelected: boolean;
  onSelectionChange: (id: string, isSelected: boolean) => void;
};

const confidenceLabels: Record<CurriculumSection['confidence'], string> = {
  high: 'High confidence',
  review: 'Review suggested',
};

const kindLabels: Record<CurriculumSection['kind'], string> = {
  appendix: 'Appendix',
  'answer-key': 'Answer Key',
  assessment: 'Assessment',
  'lesson-plans': 'Lesson Plans',
  resources: 'Resources',
  'table-of-contents': 'Table of Contents',
  'weekly-schedule': 'Weekly Schedule',
};

export function CurriculumMapCard({
  section,
  isSelected,
  onSelectionChange,
}: CurriculumMapCardProps) {
  return (
    <article className="curriculum-map-card">
      <div className="curriculum-map-card__header">
        <div>
          <p className="curriculum-map-card__subject">{section.subject}</p>
          <h3>{section.title}</h3>
        </div>
        <span className="curriculum-map-card__order">#{section.sourceOrder}</span>
      </div>

      <dl className="curriculum-map-card__facts">
        <div>
          <dt>Section</dt>
          <dd>{kindLabels[section.kind]}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{section.sourceLocation}</dd>
        </div>
        <div>
          <dt>Items found</dt>
          <dd>{section.itemCount}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{confidenceLabels[section.confidence]}</dd>
        </div>
      </dl>

      <p className="curriculum-map-card__note">{section.note}</p>

      <label className="include-toggle">
        <input
          checked={isSelected}
          onChange={(event) => onSelectionChange(section.id, event.target.checked)}
          type="checkbox"
        />
        Use this section
      </label>
    </article>
  );
}
