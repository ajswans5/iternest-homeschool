import type { Curriculum } from './types';

type CurriculumShelfCardProps = {
  curriculum: Curriculum;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

const blueprintLabels: Record<Curriculum['blueprintStatus'], string> = {
  approved: 'Blueprint approved',
  'draft-ready': 'Draft ready',
  mapping: 'Mapping in progress',
  'not-started': 'Not started',
};

export function CurriculumShelfCard({
  curriculum,
  isSelected,
  onSelect,
}: CurriculumShelfCardProps) {
  return (
    <button
      className={`shelf-card${isSelected ? ' shelf-card--selected' : ''}`}
      onClick={() => onSelect(curriculum.id)}
      type="button"
    >
      <span className="shelf-card__eyebrow">{curriculum.publisher}</span>
      <strong>{curriculum.title}</strong>
      <span>{curriculum.level}</span>
      <span className="shelf-card__status">{blueprintLabels[curriculum.blueprintStatus]}</span>
    </button>
  );
}
