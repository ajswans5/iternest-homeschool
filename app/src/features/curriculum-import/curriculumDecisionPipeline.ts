import type { LearnerContext, ParentDecision } from '../../domain/contracts';
import { buildParentDecision } from './decisionEngine';
import { buildSingleLessonModel } from './lessonUnderstandingEngine';
import { analyzeUploadedCurriculumFile } from './realFileAnalysis';

export async function analyzeCurriculumForParentDecision(
  file: File,
  learnerContext: LearnerContext,
): Promise<ParentDecision> {
  const sourceAnalysis = await analyzeUploadedCurriculumFile(file);
  const lessonModel = buildSingleLessonModel(sourceAnalysis);

  return buildParentDecision({
    learnerContext,
    lessonModels: lessonModel ? [lessonModel] : [],
  });
}
