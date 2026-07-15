export type SummaryCardProps = {
  label: string;
  value: number;
  helperText: string;
};

export function SummaryCard({ label, value, helperText }: SummaryCardProps) {
  return (
    <article className="summary-card" aria-label={`${label}: ${value}`}>
      <p className="summary-card__label">{label}</p>
      <strong className="summary-card__value">{value}</strong>
      <p className="summary-card__helper">{helperText}</p>
    </article>
  );
}