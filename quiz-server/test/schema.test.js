import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuiz } from '../src/schema.js';

export const question = (id = 'q1') => ({
  id, area: 'Lesen', category: 'Schlussfolgerung', prompt: 'Was folgt?',
  options: ['A', 'B', 'C', 'D'].map(value => ({ value, label: `Antwort ${value}`, feedback: `Erklärung ${value}` })),
  correctValue: 'B', hint: 'Achte auf Einschränkungen.', evidenceQuote: 'kaum zu verantworten',
  transferPrompt: 'Formuliere die Haltung neu.'
});
export const quiz = (questions = [question()]) => ({ title: 'C1 Test', mode: 'diagnostic', questions });

test('validation accepts a complete quiz', () => {
  assert.equal(parseQuiz(quiz([question('q1'), question('q2'), question('q3')])).questions.length, 3);
});
test('validation rejects malformed question counts and duplicate ids', () => {
  assert.throws(() => parseQuiz(quiz([])));
  assert.throws(() => parseQuiz(quiz(Array.from({length: 21}, (_, i) => question(`q${i}`)))));
  assert.throws(() => parseQuiz(quiz([question(), question()])));
});
test('validation rejects malformed answers and missing feedback', () => {
  assert.throws(() => parseQuiz(quiz([{...question(), correctValue: 'E'}])));
  assert.throws(() => parseQuiz(quiz([{...question(), options: question().options.slice(0, 3)}])));
  assert.throws(() => parseQuiz(quiz([{...question(), options: [question().options[0], question().options[0], ...question().options.slice(2)]}])));
  assert.throws(() => parseQuiz(quiz([{...question(), options: [{...question().options[0], feedback: ''}, ...question().options.slice(1)]}])));
});
test('validation rejects absent category and blank prompt', () => {
  assert.throws(() => parseQuiz(quiz([{...question(), category: ''}])));
  assert.throws(() => parseQuiz(quiz([{...question(), prompt: '   '}])));
});
