import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuiz } from '../src/schema.js';
import { question, quiz } from './fixtures.js';

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
