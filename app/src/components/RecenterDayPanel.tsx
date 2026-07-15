export type RecenterOption = {
  label: string;
  description: string;
};

export type RecenterDayPanelProps = {
  options: RecenterOption[];
  onClose: () => void;
};

export function RecenterDayPanel({ options, onClose }: RecenterDayPanelProps) {
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
            aria-label="Close Recenter My Day panel"
            className="recenter-panel__close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <p className="recenter-panel__intro">
          Choose the closest fit for today. Scheduling changes will come later.
        </p>

        <div className="recenter-options">
          {options.map((option) => (
            <button className="recenter-option" key={option.label} type="button">
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
