export const question = (id = 'q1', overrides = {}) => ({
  id,
  area: 'Lesen',
  category: 'Schlussfolgerung',
  prompt: 'Was folgt aus der Mitteilung?',
  options: ['A', 'B', 'C', 'D'].map(value => ({
    value,
    label: `Antwort ${value} zu ${id}`,
    feedback: `Erklärung ${value} zu ${id}`
  })),
  correctValue: 'B',
  hint: 'Achten Sie auf die Einschränkung.',
  evidenceQuote: 'kaum zu verantworten',
  transferPrompt: 'Formulieren Sie die Haltung mit eigenen Worten neu.',
  ...overrides
});

export const quiz = (questions = [question()], overrides = {}) => ({
  title: 'DTB C1 · Entscheidungsprobe',
  mode: 'diagnostic',
  questions,
  ...overrides
});

export const threeQuestionQuiz = (overrides = {}) => quiz([
  question('q1', {
    area: 'Lesen',
    category: 'Schlussfolgerungen',
    correctValue: 'B'
  }),
  question('q2', {
    area: 'Grammatik',
    category: 'Konzessive Konnektoren',
    prompt: 'Welche Ergänzung drückt eine Einräumung aus?',
    correctValue: 'C',
    evidenceQuote: 'wenngleich die Lieferfrist knapp bemessen ist'
  }),
  question('q3', {
    area: 'Lesen',
    category: 'Schlussfolgerungen',
    prompt: '<script>window.__quizXss = true</script> Welche Haltung wird deutlich?',
    correctValue: 'D',
    evidenceQuote: 'obwohl `Pilotphase` ausdrücklich genannt wird'
  })
], overrides);

