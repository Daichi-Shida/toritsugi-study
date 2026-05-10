import type { Question } from "@/types";
import allQuestions from "./all.json";
import seigoQuestions from "./seigo_sample.json";
import qualityQuestions from "./quality_questions.json";
import plumeriaQuestions from "./plumeria_questions.json";
import r8RevisionQuestions from "./r8_revision_questions.json";
import r8DeepQuestions from "./r8_deep_questions.json";

export const ALL_QUESTIONS: Question[] = [
  ...allQuestions,
  ...seigoQuestions,
  ...qualityQuestions,
  ...plumeriaQuestions,
  ...r8RevisionQuestions,
  ...r8DeepQuestions,
] as Question[];

export const QUESTION_BY_ID: Record<string, Question> = ALL_QUESTIONS.reduce(
  (acc, q) => {
    acc[q.id] = q;
    return acc;
  },
  {} as Record<string, Question>
);
