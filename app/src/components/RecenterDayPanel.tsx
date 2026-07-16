export type RecenterOption = {
  label: string;
  description: string;
  result?: string;
};

export type RecenterDayPanelProps = {
  options: RecenterOption[];
  onClose: () => void;
  onSelect?: (option: RecenterOption) => void;
  selectedLabel?: string | null;
};

export function RecenterDayPanel({
  options,
  onClose,
  onSelect,
  selectedLabel,
}: RecenterDayPanelProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="recenter-title"
        aria-modal="true"
        className="recenter-panel"
        role="dialog"
      >
        <div className="recenter-panel__header">
          <div>
            <p className="section-label">Recenter</p>
            <h2 id="recenter-title">What changed today?</h2>
          </div>
          <button
            aria-label="Close Recenter Today panel"
            className="recenter-panel__close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <p className="recenter-panel__intro">
          Choose the closest fit. IterNest will keep the important work visible and show
          you what moved.
        </p>

        <div className="recenter-options">
          {options.map((option) => {
            const isSelected = selectedLabel === option.label;

            return (
              <button
                aria-pressed={isSelected}
                className={isSelected ? 'recenter-option is-selected' : 'recenter-option'}
                key={option.label}
                onClick={() => onSelect?.(option)}
                type="button"
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
                {option.result ? <em>{option.result}</em> : null}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
