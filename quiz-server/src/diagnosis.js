export function summarizeQuiz(quiz, answers) {
  const ids = quiz.questions.map(q => q.id);
  if (Object.keys(answers).length !== ids.length || ids.some(id => !['A','B','C','D'].includes(answers[id]))) {
    throw new Error('Every question requires one valid answer');
  }
  const errors = quiz.questions.filter(q => answers[q.id] !== q.correctValue).map(q => ({
    questionId: q.id, area: q.area, category: q.category, prompt: q.prompt,
    selected: q.options.find(o => o.value === answers[q.id]),
    correct: q.options.find(o => o.value === q.correctValue),
    evidenceQuote: q.evidenceQuote, transferPrompt: q.transferPrompt
  }));
  const groups = new Map();
  for (const error of errors) {
    if (!groups.has(error.category)) groups.set(error.category, []);
    groups.get(error.category).push(error.questionId);
  }
  const observations = [...groups].sort((a,b) => b[1].length-a[1].length).slice(0,2)
    .map(([category, questionIds]) => ({
      category, questionIds,
      provisional: questionIds.length < 2 || quiz.questions.length <= 5,
      nextStep: `Übe ${category} mit weiteren gezielten Aufgaben.`
    }));
  return { score: ids.length-errors.length, total: ids.length, errors, observations };
}
