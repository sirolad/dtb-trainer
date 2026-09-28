import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeQuiz } from '../src/diagnosis.js';
import { question, quiz } from './fixtures.js';

const three = quiz([question('q1'), question('q2'), question('q3')]);
test('scoring counts actual choices and rejects incomplete attempts', () => {
  assert.equal(summarizeQuiz(three, {q1:'A',q2:'A',q3:'A'}).score, 0);
  assert.equal(summarizeQuiz(three, {q1:'B',q2:'B',q3:'B'}).score, 3);
  assert.throws(() => summarizeQuiz(three, {q1:'A'}));
});
test('diagnosis cites repeated errors and limits observations', () => {
  const result = summarizeQuiz(three, {q1:'A',q2:'A',q3:'A'});
  assert.equal(result.errors.length, 3);
  assert.deepEqual(result.observations[0].questionIds, ['q1','q2','q3']);
  assert.ok(result.observations.length <= 2);
});
test('diagnosis flags one example as provisional and never invents a weakness on success', () => {
  const result = summarizeQuiz(three, {q1:'A',q2:'B',q3:'B'});
  assert.equal(result.observations[0].provisional, true);
  assert.deepEqual(summarizeQuiz(three, {q1:'B',q2:'B',q3:'B'}).observations, []);
});
