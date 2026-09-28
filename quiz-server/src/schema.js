import { z } from 'zod';

const nonblank = z.string().trim().min(1);
const value = z.enum(['A', 'B', 'C', 'D']);
const option = z.object({ value, label: nonblank, feedback: nonblank }).strict();
const question = z.object({
  id: nonblank, area: nonblank, category: nonblank, prompt: nonblank,
  options: z.array(option).length(4), correctValue: value,
  hint: z.string().default(''), evidenceQuote: z.string().default(''),
  transferPrompt: nonblank
}).strict().refine(q => new Set(q.options.map(o => o.value)).size === 4,
  { message: 'Each question needs unique A/B/C/D options', path: ['options'] });

const quizSchema = z.object({
  title: nonblank, mode: z.enum(['practice', 'diagnostic', 'exam']),
  questions: z.array(question).min(1).max(20)
}).strict().refine(q => new Set(q.questions.map(item => item.id)).size === q.questions.length,
  { message: 'Question ids must be unique', path: ['questions'] });

export function parseQuiz(input) { return quizSchema.parse(input); }
export { quizSchema };
