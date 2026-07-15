import type { Curriculum } from './types';

type CurriculumDetailPanelProps = {
  curriculum: Curriculum;
};

const companionStatusLabels: Record<
  Curriculum['companionResources'][number]['status'],
  string
> = {
  available: 'Available',
  missing: 'Missing',
  'not-needed': 'Not needed',
  unknown: 'Ask parent',
};

const blueprintStatusLabels: Record<Curriculum['blueprintStatus'], string> = {
  approved: 'Approved',
  'draft-ready': 'Draft ready',
  mapping: 'Mapping in progress',
  'not-started': 'Not started',
};

export function CurriculumDetailPanel({ curriculum }: CurriculumDetailPanelProps) {
  return (
    <article className="curriculum-detail">
      <header className="curriculum-detail__header">
        <div>
          <p className="section-label">Curriculum Home</p>
          <h2>{curriculum.title}</h2>
          <p>{curriculum.description}</p>
        </div>
        <span className="blueprint-pill">{blueprintStatusLabels[curriculum.blueprintStatus]}</span>
      </header>

      <section className="library-section" aria-labelledby="overview-title">
        <h3 id="overview-title">Overview</h3>
        <div className="overview-grid">
          <LibraryFact label="Publisher" value={curriculum.publisher} />
          <LibraryFact label="Level" value={curriculum.level} />
          <LibraryFact label="School Year" value={curriculum.schoolYear} />
          <LibraryFact label="Subjects" value={curriculum.subjects.join(', ')} />
        </div>
      </section>

      <section className="library-section" aria-labelledby="resources-title">
        <h3 id="resources-title">Uploaded Resources</h3>
        <div className="library-list">
          {curriculum.uploadedResources.map((resource) => (
            <div className="library-row" key={resource.id}>
              <div>
                <strong>{resource.title}</strong>
                <span>{resource.kind}</span>
              </div>
              <span>{resource.sourceLocation}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="library-section" aria-labelledby="companions-title">
        <h3 id="companions-title">Companion Resource Status</h3>
        <div className="library-list">
          {curriculum.companionResources.map((resource) => (
            <div className="library-row" key={resource.id}>
              <div>
                <strong>{resource.title}</strong>
                <span>{resource.relationship}</span>
              </div>
              <span>{companionStatusLabels[resource.status]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="library-section" aria-labelledby="sections-title">
        <h3 id="sections-title">Curriculum Sections</h3>
        <div className="library-list">
          {curriculum.sections.map((section) => (
            <div className="library-row" key={section.id}>
              <div>
                <strong>{section.title}</strong>
                <span>{section.subject}</span>
              </div>
              <span>{section.itemCount} items · {section.sourceLocation}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="library-section" aria-labelledby="lessons-title">
        <h3 id="lessons-title">Lessons</h3>
        <div className="library-list">
          {curriculum.lessons.map((lesson) => (
            <div className="library-row" key={lesson.id}>
              <div>
                <strong>{lesson.title}</strong>
                <span>{lesson.subject}</span>
              </div>
              <span>{lesson.instructionCount} instructions · {lesson.sourceLocation}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="library-section" aria-labelledby="assessments-title">
        <h3 id="assessments-title">Assessments</h3>
        <div className="library-list">
          {curriculum.assessments.length > 0 ? (
            curriculum.assessments.map((assessment) => (
              <div className="library-row" key={assessment.id}>
                <div>
                  <strong>{assessment.title}</strong>
                  <span>{assessment.subject}</span>
                </div>
                <span>{assessment.status} · {assessment.sourceLocation}</span>
              </div>
            ))
          ) : (
            <p className="library-empty">No assessments mapped yet.</p>
          )}
        </div>
      </section>

      <section className="library-section" aria-labelledby="notes-title">
        <h3 id="notes-title">Parent Notes</h3>
        <div className="library-list">
          {curriculum.parentNotes.map((note) => (
            <div className="library-note" key={note.id}>
              <strong>{note.scope}</strong>
              <p>{note.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="library-section" aria-labelledby="blueprint-title">
        <h3 id="blueprint-title">Blueprint Status</h3>
        <p className="library-empty">
          {blueprintStatusLabels[curriculum.blueprintStatus]} — this will become the approved
          year-level curriculum model before scheduling begins.
        </p>
      </section>
    </article>
  );
}

type LibraryFactProps = {
  label: string;
  value: string;
};

function LibraryFact({ label, value }: LibraryFactProps) {
  return (
    <div className="library-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
