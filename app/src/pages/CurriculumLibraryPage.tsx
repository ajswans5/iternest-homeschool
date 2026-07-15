import { useState } from 'react';
import { CurriculumDetailPanel } from '../features/curriculum-library/CurriculumDetailPanel';
import { CurriculumShelfCard } from '../features/curriculum-library/CurriculumShelfCard';
import { curriculumLibrary } from '../features/curriculum-library/mockLibrary';

type CurriculumLibraryPageProps = {
  onBackToDashboard: () => void;
};

export function CurriculumLibraryPage({ onBackToDashboard }: CurriculumLibraryPageProps) {
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(curriculumLibrary[0].id);
  const selectedCurriculum =
    curriculumLibrary.find((curriculum) => curriculum.id === selectedCurriculumId) ??
    curriculumLibrary[0];

  return (
    <main className="library-shell">
      <header className="library-header">
        <button className="text-button" onClick={onBackToDashboard} type="button">
          Back to dashboard
        </button>
        <p className="section-label">Curriculum Library</p>
        <h1>Your family bookshelf.</h1>
        <p>
          A permanent home for uploaded curriculum, companion resources, parent notes,
          and blueprint progress before scheduling begins.
        </p>
      </header>

      <section className="library-layout">
        <aside className="library-shelf" aria-label="Curriculum shelf">
          {curriculumLibrary.map((curriculum) => (
            <CurriculumShelfCard
              curriculum={curriculum}
              isSelected={curriculum.id === selectedCurriculum.id}
              key={curriculum.id}
              onSelect={setSelectedCurriculumId}
            />
          ))}
        </aside>

        <CurriculumDetailPanel curriculum={selectedCurriculum} />
      </section>
    </main>
  );
}
