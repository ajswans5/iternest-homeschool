import type { Curriculum } from './types';

export const curriculumLibrary: Curriculum[] = [
  {
    id: 'memoria-fourth-grade',
    title: 'Memoria Press Fourth Grade Core',
    publisher: 'Memoria Press',
    level: 'Grade 4',
    schoolYear: '2026-2027',
    description:
      'A developing curriculum home for weekly schedules, lesson plans, recitation, drills, readings, assessments, and parent notes.',
    subjects: ['Math', 'Latin', 'Reading', 'Science'],
    blueprintStatus: 'mapping',
    uploadedResources: [
      {
        id: 'mp-weekly-schedule',
        title: 'Weekly Schedule Manual',
        kind: 'Planning / Reference',
        sourceLocation: 'Uploaded PDF',
        status: 'uploaded',
      },
      {
        id: 'mp-math-lessons',
        title: 'Arithmetic 4 Lesson Plans',
        kind: 'Teacher Manual',
        sourceLocation: 'Pages 12-18',
        status: 'uploaded',
      },
      {
        id: 'mp-science-activity',
        title: 'Science Activity Pages',
        kind: 'Activity Guide',
        sourceLocation: 'Pages 30-32',
        status: 'uploaded',
      },
    ],
    companionResources: [
      {
        id: 'student-workbook',
        title: 'Student Workbook',
        relationship: 'Referenced by lesson-plan instructions',
        status: 'unknown',
      },
      {
        id: 'answer-key',
        title: 'Answer Key',
        relationship: 'Useful for parent review and correction',
        status: 'missing',
      },
      {
        id: 'drill-book',
        title: 'Memoria Math Challenge Drill Book',
        relationship: 'Referenced by Drill 7.1',
        status: 'available',
      },
    ],
    sections: [
      {
        id: 'schedule',
        title: 'Weekly Schedule Grid',
        subject: 'Whole Week',
        sourceLocation: 'Pages 2-3',
        itemCount: 18,
      },
      {
        id: 'math-lessons',
        title: 'Arithmetic 4 Lesson Plans',
        subject: 'Math',
        sourceLocation: 'Pages 12-18',
        itemCount: 7,
      },
      {
        id: 'latin-recitation',
        title: 'Latin Recitation and Drill',
        subject: 'Latin',
        sourceLocation: 'Pages 19-21',
        itemCount: 4,
      },
      {
        id: 'science',
        title: 'Science Activity',
        subject: 'Science',
        sourceLocation: 'Pages 30-32',
        itemCount: 5,
      },
    ],
    lessons: [
      {
        id: 'math-lesson-32',
        title: 'Arithmetic 4 Lesson 32',
        subject: 'Math',
        sourceLocation: 'Page 12',
        instructionCount: 7,
      },
      {
        id: 'latin-drill',
        title: 'Latin Recitation and Drill',
        subject: 'Latin',
        sourceLocation: 'Pages 19-20',
        instructionCount: 4,
      },
      {
        id: 'science-magnets',
        title: 'Magnet Activity',
        subject: 'Science',
        sourceLocation: 'Pages 30-31',
        instructionCount: 3,
      },
    ],
    assessments: [
      {
        id: 'math-quiz',
        title: 'Arithmetic Review / Oral Review',
        subject: 'Math',
        sourceLocation: 'Page 13',
        status: 'detected',
      },
      {
        id: 'latin-review',
        title: 'Latin Forms Review',
        subject: 'Latin',
        sourceLocation: 'Page 21',
        status: 'needs-review',
      },
    ],
    parentNotes: [
      {
        id: 'note-1',
        scope: 'Math',
        note: 'Placeholder: record whether odds-together / evens-independent works well for this student.',
      },
      {
        id: 'note-2',
        scope: 'Science',
        note: 'Placeholder: save prep reminders and favorite materials here after the lesson.',
      },
    ],
  },
  {
    id: 'nature-reader',
    title: 'Nature Reader and Observation Journal',
    publisher: 'Family Library',
    level: 'Upper Elementary',
    schoolYear: '2026-2027',
    description:
      'A lighter bookshelf entry for readings, observation prompts, and optional outdoor work.',
    subjects: ['Reading', 'Science', 'Nature Study'],
    blueprintStatus: 'not-started',
    uploadedResources: [
      {
        id: 'reader-pdf',
        title: 'Reader PDF',
        kind: 'Primary Text',
        sourceLocation: 'Uploaded PDF',
        status: 'uploaded',
      },
    ],
    companionResources: [
      {
        id: 'journal',
        title: 'Observation Journal',
        relationship: 'Mentioned in weekly notes',
        status: 'unknown',
      },
    ],
    sections: [
      {
        id: 'readings',
        title: 'Weekly Readings',
        subject: 'Reading',
        sourceLocation: 'Pages 4-20',
        itemCount: 8,
      },
    ],
    lessons: [
      {
        id: 'pond-reading',
        title: 'Pond Life Reading',
        subject: 'Nature Study',
        sourceLocation: 'Page 7',
        instructionCount: 2,
      },
    ],
    assessments: [],
    parentNotes: [
      {
        id: 'note-1',
        scope: 'Nature Study',
        note: 'Placeholder: add favorite outdoor locations or seasonal timing notes.',
      },
    ],
  },
];
