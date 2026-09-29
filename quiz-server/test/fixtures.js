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

export const lesson = (category = 'Schlussfolgerung', overrides = {}) => ({
  category,
  rule: `Bei ${category} zählt die Aussage des gesamten Zusammenhangs, nicht nur ein einzelnes Schlüsselwort.`,
  examples: [
    { label: 'Treffend', text: 'Obwohl die Frist knapp ist, bleibt der Termin bestehen.' },
    { label: 'Anderer Zusammenhang', text: 'Weil die Frist knapp ist, wird der Termin verschoben.' }
  ],
  commonMistake: {
    incorrect: 'Ein bekanntes Wort reicht als Begründung für die Antwort.',
    correction: 'Prüfen Sie, welche logische Beziehung der ganze Satz ausdrückt.',
    explanation: 'Einzelne Wörter können in plausiblen Distraktoren wiederholt werden.'
  },
  practice: {
    prompt: `Welche Antwort zeigt ${category} korrekt?`,
    options: ['A', 'B', 'C', 'D'].map(value => ({
      value,
      label: `Lektionsantwort ${value} zu ${category}`,
      feedback: value === 'C' ? 'Richtig: Der gesamte Zusammenhang passt.' : `Noch nicht: Antwort ${value} übersieht den Zusammenhang.`
    })),
    correctValue: 'C'
  },
  ...overrides
});

export const quiz = (questions = [question()], overrides = {}) => ({
  title: 'DTB C1 · Entscheidungsprobe',
  mode: 'diagnostic',
  questions,
  lessons: [...new Set(questions.map(item => item.category))].map(category => lesson(category)),
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
