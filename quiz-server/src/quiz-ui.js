import { App, applyDocumentTheme } from '@modelcontextprotocol/ext-apps';
import { summarizeQuiz } from './diagnosis.js';

const root = document.querySelector('#app');
let state;

function node(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'className') element.className = value;
    else if (name === 'dataset') Object.assign(element.dataset, value);
    else if (name.startsWith('on')) element.addEventListener(name.slice(2).toLowerCase(), value);
    else if (value === true) element.setAttribute(name, '');
    else if (value !== false && value !== undefined && value !== null) element.setAttribute(name, String(value));
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

function modeLabel(mode) {
  return { practice: 'Übung', diagnostic: 'Schwächentest', exam: 'Prüfungsmodus' }[mode] ?? mode;
}

function isReloadedAttempt() {
  const navigation = performance.getEntriesByType('navigation')[0];
  return navigation?.type === 'reload';
}

function startAttempt(quiz, restarted = false) {
  state = {
    quiz,
    index: 0,
    answers: Object.create(null),
    lessonAnswers: Object.create(null),
    activeLessonCategory: undefined,
    complete: false,
    restarted
  };
  renderQuestion();
}

function restartAttempt() {
  startAttempt(state.quiz, false);
  const notice = node('p', { className: 'notice', role: 'status' }, 'Neuer Versuch gestartet. Alle Antworten wurden zurückgesetzt.');
  root.querySelector('.quiz-shell')?.prepend(notice);
}

function progressRail(total, current) {
  return node('ol', { className: 'progress-rail', 'aria-label': 'Fortschritt' },
    Array.from({ length: total }, (_, index) => {
      const status = index < current ? 'done' : index === current ? 'current' : 'upcoming';
      return node('li', { className: `progress-step ${status}`, 'aria-current': status === 'current' ? 'step' : undefined },
        node('span', { className: 'progress-dot', 'aria-hidden': 'true' }, index + 1),
        node('span', { className: 'sr-only' }, `Frage ${index + 1}: ${status === 'done' ? 'beantwortet' : status === 'current' ? 'aktuell' : 'offen'}`)
      );
    })
  );
}

function shell(content) {
  const { quiz } = state;
  return node('article', { className: 'quiz-shell' },
    node('header', { className: 'quiz-header' },
      node('div', { className: 'eyebrow-row' },
        node('span', { className: 'eyebrow' }, 'DTB C1 · INTERAKTIV'),
        node('span', { className: `mode-badge mode-${quiz.mode}` }, modeLabel(quiz.mode))
      ),
      node('h1', {}, quiz.title)
    ),
    content
  );
}

function optionButton(question, option, selected) {
  const button = node('button', {
    type: 'button',
    className: `option${selected ? ' selected' : ''}`,
    'aria-label': `${option.value} ${option.label}`,
    'aria-pressed': selected ? 'true' : 'false',
    onclick: () => selectAnswer(question, option.value)
  },
  node('span', { className: 'option-key', 'aria-hidden': 'true' }, option.value),
  node('span', { className: 'option-label' }, option.label));
  button.dataset.value = option.value;
  return button;
}

function selectAnswer(question, value) {
  if (state.complete || state.quiz.questions[state.index].id !== question.id) return;
  state.answers[question.id] = value;
  renderQuestion(value);
}

function advanceQuestion(expectedIndex) {
  if (state.complete || state.index !== expectedIndex) return;
  const question = state.quiz.questions[state.index];
  if (!Object.hasOwn(state.answers, question.id)) return;
  if (state.index === state.quiz.questions.length - 1) {
    state.complete = true;
    renderResults();
    return;
  }
  state.index += 1;
  renderQuestion();
}

function hintBlock(question) {
  const panelId = `hint-${question.id}`;
  const panel = node('p', { id: panelId, className: 'hint-panel', hidden: true }, question.hint);
  const button = node('button', {
    type: 'button',
    className: 'text-button',
    'aria-expanded': 'false',
    'aria-controls': panelId,
    onclick: () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      button.textContent = expanded ? 'Hinweis öffnen' : 'Hinweis schließen';
    }
  }, 'Hinweis öffnen');
  return node('div', { className: 'hint-wrap' }, button, panel);
}

function renderQuestion(focusValue) {
  const { quiz, index, answers, restarted } = state;
  const question = quiz.questions[index];
  const selected = Object.hasOwn(answers, question.id) ? answers[question.id] : undefined;
  const feedback = quiz.mode === 'practice' && selected
    ? question.options.find(option => option.value === selected)?.feedback
    : undefined;
  const nextLabel = index === quiz.questions.length - 1 ? 'Auswertung' : 'Weiter';

  const main = node('main', { className: 'quiz-main' },
    restarted ? node('p', { className: 'notice', role: 'status' }, 'Der laufende Versuch wurde nach dem Neuladen neu gestartet.') : undefined,
    node('div', { className: 'progress-copy' },
      node('p', { className: 'question-count' }, `Frage ${index + 1} von ${quiz.questions.length}`),
      node('p', { className: 'area-label' }, `${question.area} · ${question.category}`)
    ),
    progressRail(quiz.questions.length, index),
    node('section', { className: 'question-card', 'aria-labelledby': 'question-prompt' },
      node('h2', { id: 'question-prompt', tabindex: '-1' }, question.prompt),
      node('div', { className: 'option-list', role: 'group', 'aria-label': 'Antwort auswählen' },
        question.options.map(option => optionButton(question, option, option.value === selected))
      ),
      feedback ? node('div', { className: 'feedback', role: 'status', 'aria-live': 'polite' },
        node('strong', {}, 'Rückmeldung'),
        node('p', {}, feedback)
      ) : node('div', { className: 'sr-only', 'aria-live': 'polite' }, selected ? 'Antwort ausgewählt.' : 'Noch keine Antwort ausgewählt.'),
      hintBlock(question)
    ),
    node('footer', { className: 'quiz-actions' },
      node('button', { type: 'button', className: 'secondary-button', onclick: restartAttempt }, 'Neu starten'),
      node('button', {
        type: 'button',
        className: 'primary-button',
        disabled: !selected,
        onclick: () => advanceQuestion(index)
      }, nextLabel)
    )
  );

  root.replaceChildren(shell(main));
  requestAnimationFrame(() => {
    const target = focusValue
      ? [...root.querySelectorAll('.option')].find(button => button.dataset.value === focusValue)
      : root.querySelector('#question-prompt');
    target?.focus();
  });
}

function labelledValue(label, option, modifier) {
  return node('div', { className: `answer-note ${modifier}` },
    node('p', { className: 'answer-note-label' }, label),
    node('p', {}, node('strong', {}, `${option.value} · `), option.label),
    node('p', { className: 'answer-explanation' }, option.feedback)
  );
}

function errorCard(error, index) {
  const lesson = state.quiz.lessons?.find(candidate => candidate.category === error.category);
  const details = node('details', { className: 'error-card', role: 'group', 'aria-label': `Fehler bei Frage ${index + 1}: ${error.questionId}` },
    node('summary', {},
      node('span', { className: 'summary-number', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
      node('span', {},
        node('strong', {}, `${error.area} · ${error.category}`),
        node('span', { className: 'summary-prompt' }, error.prompt)
      ),
      node('span', { className: 'summary-action', 'aria-hidden': 'true' }, 'öffnen')
    ),
    node('div', { className: 'error-body' },
      node('div', { className: 'answer-grid' },
        labelledValue('Ihre Antwort', error.selected, 'answer-wrong'),
        labelledValue('Richtige Antwort', error.correct, 'answer-correct')
      ),
      error.evidenceQuote ? node('div', { className: 'evidence' },
        node('p', { className: 'detail-label' }, 'Entscheidender Hinweis im Text'),
        node('code', {}, error.evidenceQuote)
      ) : undefined,
      node('div', { className: 'transfer' },
        node('p', { className: 'detail-label' }, 'Mini-Transferaufgabe'),
        node('p', {}, error.transferPrompt)
      ),
      lesson
        ? node('div', { className: 'lesson-cta' },
            node('button', {
              type: 'button',
              className: 'secondary-button lesson-button',
              onclick: () => openLesson(error.category)
            }, `Übe ${error.category}`)
          )
        : undefined
    )
  );
  details.addEventListener('toggle', () => {
    const action = details.querySelector('.summary-action');
    if (action) action.textContent = details.open ? 'schließen' : 'öffnen';
  });
  return details;
}

function lessonOptionButton(lesson, option, selected) {
  return node('button', {
    type: 'button',
    className: `option lesson-option${selected ? ' selected' : ''}`,
    'aria-label': `${option.value} ${option.label}`,
    'aria-pressed': selected ? 'true' : 'false',
    dataset: { value: option.value },
    onclick: () => selectLessonAnswer(lesson, option.value)
  },
  node('span', { className: 'option-key', 'aria-hidden': 'true' }, option.value),
  node('span', { className: 'option-label' }, option.label));
}

function openLesson(category) {
  if (!state.complete) return;
  const lesson = state.quiz.lessons?.find(candidate => candidate.category === category);
  if (!lesson) return;
  state.activeLessonCategory = category;
  renderLesson(lesson);
}

function selectLessonAnswer(lesson, value) {
  if (!state.complete || state.activeLessonCategory !== lesson.category) return;
  state.lessonAnswers[lesson.category] = value;
  renderLesson(lesson, value);
}

function returnToResults() {
  if (!state.complete) return;
  state.activeLessonCategory = undefined;
  renderResults();
}

function renderLesson(lesson, focusValue) {
  const selected = Object.hasOwn(state.lessonAnswers, lesson.category)
    ? state.lessonAnswers[lesson.category]
    : undefined;
  const selectedOption = selected
    ? lesson.practice.options.find(option => option.value === selected)
    : undefined;
  const isCorrect = selected === lesson.practice.correctValue;

  const content = node('main', { className: 'lesson-main' },
    node('button', { type: 'button', className: 'text-button lesson-back-top', onclick: returnToResults }, '← Zurück zur Auswertung'),
    node('section', { className: 'lesson-intro', 'aria-labelledby': 'lesson-heading' },
      node('p', { className: 'eyebrow' }, 'GEZIELTE LEKTION'),
      node('h2', { id: 'lesson-heading', tabindex: '-1' }, `Lektion: ${lesson.category}`),
      node('div', { className: 'lesson-rule' },
        node('p', { className: 'detail-label' }, 'Klare Regel'),
        node('p', {}, lesson.rule)
      )
    ),
    node('section', { className: 'lesson-section', 'aria-labelledby': 'examples-heading' },
      node('div', { className: 'section-heading compact-heading' },
        node('p', { className: 'eyebrow' }, 'GEGENÜBERSTELLUNG'),
        node('h3', { id: 'examples-heading' }, 'Zwei kontrastierende Beispiele')
      ),
      node('div', { className: 'lesson-example-grid' }, lesson.examples.map((example, index) =>
        node('article', { className: `lesson-example ${index === 0 ? 'example-primary' : 'example-contrast'}` },
          node('p', { className: 'detail-label' }, example.label),
          node('p', {}, example.text)
        )
      ))
    ),
    node('section', { className: 'lesson-mistake', 'aria-labelledby': 'mistake-heading' },
      node('p', { className: 'eyebrow' }, 'HÄUFIGER FEHLER'),
      node('h3', { id: 'mistake-heading' }, 'Fehler erkennen und korrigieren'),
      node('div', { className: 'mistake-grid' },
        node('div', { className: 'mistake-wrong' },
          node('p', { className: 'detail-label' }, 'Typischer Fehler'),
          node('p', {}, lesson.commonMistake.incorrect)
        ),
        node('div', { className: 'mistake-correct' },
          node('p', { className: 'detail-label' }, 'Korrektur'),
          node('p', {}, lesson.commonMistake.correction)
        )
      ),
      node('p', { className: 'mistake-explanation' }, lesson.commonMistake.explanation)
    ),
    node('section', { className: 'lesson-practice', 'aria-labelledby': 'lesson-practice-heading' },
      node('div', { className: 'section-heading compact-heading' },
        node('p', { className: 'eyebrow' }, 'DIREKT ANWENDEN'),
        node('h3', { id: 'lesson-practice-heading' }, 'Eine Übungsfrage')
      ),
      node('p', { className: 'lesson-practice-prompt' }, lesson.practice.prompt),
      node('div', { className: 'option-list lesson-option-list', role: 'group', 'aria-label': `Lektionsfrage zu ${lesson.category}` },
        lesson.practice.options.map(option => lessonOptionButton(lesson, option, option.value === selected))
      ),
      selectedOption
        ? node('div', { className: `feedback lesson-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`, role: 'status', 'aria-live': 'polite' },
            node('strong', {}, isCorrect ? 'Richtig' : 'Noch nicht'),
            node('p', {}, selectedOption.feedback)
          )
        : node('div', { className: 'sr-only', 'aria-live': 'polite' }, 'Noch keine Lektionsantwort ausgewählt.')
    ),
    node('footer', { className: 'lesson-actions' },
      node('button', { type: 'button', className: 'primary-button', onclick: returnToResults }, 'Zurück zur Auswertung')
    )
  );

  root.replaceChildren(shell(content));
  requestAnimationFrame(() => {
    const target = focusValue
      ? [...root.querySelectorAll('.lesson-option')].find(button => button.dataset.value === focusValue)
      : root.querySelector('#lesson-heading');
    target?.focus();
  });
}

function observationCard(observation) {
  const evidence = observation.questionIds.join(', ');
  return node('article', { className: 'observation-card', dataset: { testid: 'observation' } },
    node('p', { className: 'observation-kicker' }, observation.provisional ? 'Vorläufig beobachtet' : 'Beobachtet'),
    node('h3', {}, observation.category),
    node('dl', {},
      node('div', {}, node('dt', {}, 'Beleg'), node('dd', {}, `Fragen ${evidence}`)),
      node('div', {}, node('dt', {}, 'Nächster Schritt'), node('dd', {}, observation.nextStep))
    )
  );
}

function renderResults() {
  const result = summarizeQuiz(state.quiz, state.answers);
  const percentage = Math.round((result.score / result.total) * 100);
  const content = node('main', { className: 'results-main' },
    node('section', { className: 'score-panel', 'aria-labelledby': 'score-heading' },
      node('div', { className: 'score-ring', style: `--score: ${percentage}%` },
        node('span', { className: 'score-number' }, `${result.score}/${result.total}`),
        node('span', { className: 'score-caption' }, 'Punkte')
      ),
      node('div', {},
        node('p', { className: 'eyebrow' }, 'AUSWERTUNG'),
        node('h2', { id: 'score-heading', tabindex: '-1' }, `Ergebnis: ${result.score}/${result.total}`),
        node('p', { className: 'score-copy' }, state.quiz.mode === 'exam'
          ? 'Die Rückmeldungen wurden bis zum Abschluss zurückgehalten.'
          : 'Ihre Auswahl wurde vollständig in dieser Oberfläche ausgewertet.')
      )
    ),
    result.errors.length
      ? node('section', { className: 'errors-section', 'aria-labelledby': 'errors-heading' },
          node('div', { className: 'section-heading' },
            node('p', { className: 'eyebrow' }, 'FEHLERANALYSE'),
            node('h2', { id: 'errors-heading' }, `${result.errors.length} ${result.errors.length === 1 ? 'Fehler' : 'Fehler'} im Detail`)
          ),
          result.errors.map(error => errorCard(
            error,
            state.quiz.questions.findIndex(question => question.id === error.questionId)
          ))
        )
      : node('section', { className: 'no-errors', 'aria-labelledby': 'no-errors-heading' },
          node('p', { className: 'eyebrow' }, 'DIAGNOSE'),
          node('h2', { id: 'no-errors-heading' }, 'Sicher gelöst'),
          node('p', {}, 'In diesem Quiz wurde keine Schwäche nachgewiesen.')
        ),
    result.observations.length
      ? node('section', { className: 'observations-section', 'aria-labelledby': 'observations-heading' },
          node('div', { className: 'section-heading' },
            node('p', { className: 'eyebrow' }, 'PRIORITÄTEN'),
            node('h2', { id: 'observations-heading' }, 'Nächste Trainingsschritte'),
            node('p', {}, 'Diese Diagnose ist bei einem kurzen Quiz vorläufig und wird mit weiteren Aufgaben belastbarer.')
          ),
          node('div', { className: 'observation-grid' }, result.observations.map(observationCard))
        )
      : undefined,
    node('footer', { className: 'results-actions' },
      node('button', { type: 'button', className: 'primary-button', onclick: restartAttempt }, 'Neu starten')
    )
  );
  root.replaceChildren(shell(content));
  root.querySelector('#score-heading')?.focus();
}

function showLoadError(message) {
  root.replaceChildren(node('section', { className: 'load-state error-state', role: 'alert' },
    node('p', { className: 'eyebrow' }, 'QUIZ NICHT VERFÜGBAR'),
    node('h1', {}, 'Die Aufgabe konnte nicht geladen werden.'),
    node('p', {}, message)
  ));
}

function receiveToolResult(params) {
  if (params.isError) {
    showLoadError('Der Server hat die Quizdaten abgelehnt. Bitte starten Sie den Test erneut.');
    return;
  }
  const quiz = params.structuredContent?.quiz;
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    showLoadError('Die Antwort enthielt keine vollständigen Quizdaten.');
    return;
  }
  startAttempt(quiz, isReloadedAttempt());
}

const app = new App({ name: 'dtb-c1-quiz-view', version: '0.1.0' }, {}, { autoResize: true });
app.addEventListener('toolresult', receiveToolResult);
app.addEventListener('hostcontextchanged', context => {
  if (context.theme) applyDocumentTheme(context.theme);
});

app.connect().then(() => {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
}).catch(error => {
  console.error(error);
  showLoadError('Die Verbindung zur Quizoberfläche konnte nicht hergestellt werden.');
});
