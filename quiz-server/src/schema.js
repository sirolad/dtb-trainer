import { z } from 'zod';

const nonblank = z.string().trim().min(1);
const value = z.enum(['A', 'B', 'C', 'D']);
const option = z.object({ value, label: nonblank, feedback: nonblank }).strict();
const lessonExample = z.object({ label: nonblank, text: nonblank }).strict();
const commonMistake = z.object({
  incorrect: nonblank,
  correction: nonblank,
  explanation: nonblank
}).strict();
const lessonPractice = z.object({
  prompt: nonblank,
  options: z.array(option).length(4),
  correctValue: value
}).strict().refine(item => new Set(item.options.map(candidate => candidate.value)).size === 4,
  { message: 'Each lesson practice needs unique A/B/C/D options', path: ['options'] });
const lesson = z.object({
  category: nonblank,
  rule: nonblank,
  examples: z.array(lessonExample).length(2),
  commonMistake,
  practice: lessonPractice
}).strict();
const question = z.object({
  id: nonblank, area: nonblank, category: nonblank, prompt: nonblank,
  options: z.array(option).length(4), correctValue: value,
  hint: z.string().default(''), evidenceQuote: z.string().default(''),
  transferPrompt: nonblank
}).strict().refine(q => new Set(q.options.map(o => o.value)).size === 4,
  { message: 'Each question needs unique A/B/C/D options', path: ['options'] });

const quizSchema = z.object({
  title: nonblank, mode: z.enum(['practice', 'diagnostic', 'exam']),
  questions: z.array(question).min(1).max(20),
  lessons: z.array(lesson).min(1).max(20)
}).strict().superRefine((quiz, context) => {
  if (new Set(quiz.questions.map(item => item.id)).size !== quiz.questions.length) {
    context.addIssue({ code: 'custom', message: 'Question ids must be unique', path: ['questions'] });
  }

  const questionCategories = new Set(quiz.questions.map(item => item.category));
  const lessonCategories = new Set(quiz.lessons.map(item => item.category));
  if (lessonCategories.size !== quiz.lessons.length) {
    context.addIssue({ code: 'custom', message: 'Lesson categories must be unique', path: ['lessons'] });
  }
  for (const category of questionCategories) {
    if (!lessonCategories.has(category)) {
      context.addIssue({ code: 'custom', message: `Missing lesson for category: ${category}`, path: ['lessons'] });
    }
  }
  for (const category of lessonCategories) {
    if (!questionCategories.has(category)) {
      context.addIssue({ code: 'custom', message: `Lesson has no matching question category: ${category}`, path: ['lessons'] });
    }
  }
});

export function parseQuiz(input) { return quizSchema.parse(input); }
export { quizSchema };
