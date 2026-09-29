import { test, expect } from '@playwright/test';
import { lesson, question, quiz, threeQuestionQuiz } from './fixtures.js';

async function mountQuiz(page, quizData, options = {}) {
  await page.goto('/');
  await page.evaluate(({ quizData: data, sandbox }) => {
    const host = document.querySelector('#host');
    const iframe = document.createElement('iframe');
    iframe.id = 'quiz-frame';
    iframe.title = 'DTB C1 Quiz';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.minHeight = '760px';
    if (sandbox) iframe.setAttribute('sandbox', sandbox);

    window.addEventListener('message', event => {
      if (event.source !== iframe.contentWindow || !event.data) return;
      if (event.data.method === 'ui/initialize') {
        event.source.postMessage({
          jsonrpc: '2.0',
          id: event.data.id,
          result: {
            protocolVersion: '2026-01-26',
            hostCapabilities: {},
            hostInfo: { name: 'playwright-host', version: '1.0.0' },
            hostContext: { theme: 'light', displayMode: 'inline', locale: 'de-DE' }
          }
        }, '*');
      }
      if (event.data.method === 'ui/notifications/initialized') {
        event.source.postMessage({
          jsonrpc: '2.0',
          method: 'ui/notifications/tool-result',
          params: { content: [], structuredContent: { quiz: data } }
        }, '*');
      }
    });

    host.append(iframe);
    iframe.src = '/quiz.html';
  }, { quizData, sandbox: options.sandbox });

  const frame = page.frameLocator('#quiz-frame');
  await expect(frame.getByRole('heading', { name: quizData.title })).toBeVisible();
  return frame;
}

async function answer(frame, value) {
  await frame.getByRole('button', { name: new RegExp(`^${value}\\s`) }).click();
}

async function answerAndAdvance(frame, value) {
  await answer(frame, value);
  await frame.getByRole('button', { name: /Weiter|Auswertung/ }).click();
}

async function openLessonFromError(frame, category, questionId = 'q1') {
  const error = frame.getByRole('group', { name: `Fehler bei Frage 1: ${questionId}` });
  await error.locator('summary').click();
  await error.getByRole('button', { name: `Übe ${category}` }).click();
}

test('moves through three questions without unanswered skips or double-counting', async ({ page }) => {
  const frame = await mountQuiz(page, threeQuestionQuiz());
  const next = frame.getByRole('button', { name: 'Weiter' });
  await expect(next).toBeDisabled();

  await answer(frame, 'A');
  await expect(next).toBeEnabled();
  await next.evaluate(button => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await expect(frame.getByText('Frage 2 von 3')).toBeVisible();
  await expect(frame.getByText('Frage 3 von 3')).not.toBeVisible();
});

test('shows practice feedback but suppresses exam feedback until completion', async ({ page }) => {
  const practice = await mountQuiz(page, quiz([question()], { mode: 'practice' }));
  await answer(practice, 'A');
  await expect(practice.getByText('Erklärung A zu q1')).toBeVisible();

  await page.locator('#quiz-frame').evaluate(frame => frame.remove());
  const exam = await mountQuiz(page, quiz([question()], { mode: 'exam' }));
  await answer(exam, 'A');
  await expect(exam.getByText('Erklärung A zu q1')).not.toBeVisible();
  await expect(exam.getByRole('button', { name: 'Übe Schlussfolgerung' })).toHaveCount(0);
  await exam.getByRole('button', { name: 'Auswertung' }).click();
  await exam.getByRole('group', { name: /Fehler bei Frage 1/ }).locator('summary').click();
  await expect(exam.getByRole('button', { name: 'Übe Schlussfolgerung' })).toBeVisible();
  await expect(exam.getByText('Erklärung A zu q1')).toBeVisible();
});

test('keeps quiz results intact through lesson practice and return', async ({ page }) => {
  const frame = await mountQuiz(page, quiz([question()]));
  await answerAndAdvance(frame, 'A');
  await expect(frame.getByRole('heading', { name: 'Ergebnis: 0/1' })).toBeVisible();

  await openLessonFromError(frame, 'Schlussfolgerung');
  const lessonHeading = frame.getByRole('heading', { name: 'Lektion: Schlussfolgerung' });
  await expect(lessonHeading).toBeFocused();
  await expect(frame.getByText('Bei Schlussfolgerung zählt die Aussage des gesamten Zusammenhangs, nicht nur ein einzelnes Schlüsselwort.')).toBeVisible();
  await expect(frame.getByText('Obwohl die Frist knapp ist, bleibt der Termin bestehen.')).toBeVisible();
  await expect(frame.getByText('Weil die Frist knapp ist, wird der Termin verschoben.')).toBeVisible();
  await expect(frame.getByText('Ein bekanntes Wort reicht als Begründung für die Antwort.')).toBeVisible();
  await expect(frame.getByText('Prüfen Sie, welche logische Beziehung der ganze Satz ausdrückt.')).toBeVisible();

  await frame.getByRole('button', { name: /^A\sLektionsantwort/ }).click();
  await expect(frame.getByText('Noch nicht: Antwort A übersieht den Zusammenhang.')).toBeVisible();

  await frame.getByRole('button', { name: 'Zurück zur Auswertung', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Ergebnis: 0/1' })).toBeFocused();
  const error = frame.getByRole('group', { name: 'Fehler bei Frage 1: q1' });
  await expect(error).toBeVisible();
  await error.locator('summary').click();
  await expect(error.getByText('A · Antwort A zu q1')).toBeVisible();
  await expect(error.getByText('B · Antwort B zu q1')).toBeVisible();
});

test('renders lesson-generated text literally and never changes the quiz score', async ({ page }) => {
  const unsafe = '<img src=x onerror="window.__lessonXss=true">';
  const data = quiz([question()], { lessons: [lesson('Schlussfolgerung', {
    rule: unsafe,
    examples: [
      { label: '<script>window.__lessonXss=true</script>', text: unsafe },
      { label: 'Kontrast', text: '<b>Nur Text</b>' }
    ],
    commonMistake: { incorrect: unsafe, correction: '<i>Korrektur</i>', explanation: '<svg onload="window.__lessonXss=true"></svg>' },
    practice: {
      ...lesson().practice,
      prompt: '<script>window.__lessonXss=true</script>',
      options: lesson().practice.options.map(option => ({ ...option, label: `${option.value} ${unsafe}`, feedback: `${option.feedback} ${unsafe}` }))
    }
  })] });
  const frame = await mountQuiz(page, data);
  await answerAndAdvance(frame, 'A');
  await openLessonFromError(frame, 'Schlussfolgerung');
  await expect(frame.getByText(unsafe, { exact: true }).first()).toBeVisible();
  expect(await frame.locator('script').count()).toBe(1);
  expect(await frame.locator('body').evaluate(() => window.__lessonXss)).toBeUndefined();
  await frame.getByRole('button', { name: /^C\s/ }).click();
  await frame.getByRole('button', { name: 'Zurück zur Auswertung', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'Ergebnis: 0/1' })).toBeVisible();
});

test('clears lesson practice state when a learner starts a new attempt', async ({ page }) => {
  const frame = await mountQuiz(page, quiz([question()]));
  await answerAndAdvance(frame, 'A');
  await openLessonFromError(frame, 'Schlussfolgerung');
  await frame.getByRole('button', { name: /^A\sLektionsantwort/ }).click();
  await expect(frame.getByText('Noch nicht: Antwort A übersieht den Zusammenhang.')).toBeVisible();
  await frame.getByRole('button', { name: 'Zurück zur Auswertung', exact: true }).click();

  await frame.getByRole('button', { name: 'Neu starten' }).click();
  await answerAndAdvance(frame, 'A');
  await openLessonFromError(frame, 'Schlussfolgerung');
  await expect(frame.getByText('Noch nicht: Antwort A übersieht den Zusammenhang.')).toHaveCount(0);
  await expect(frame.getByRole('button', { name: /^A\sLektionsantwort/ })).toHaveAttribute('aria-pressed', 'false');
});

test('keeps legacy quiz results usable without exposing a broken lesson action', async ({ page }) => {
  const { lessons: _lessons, ...legacyQuiz } = quiz([question()]);
  const frame = await mountQuiz(page, legacyQuiz);
  await answerAndAdvance(frame, 'A');

  await expect(frame.getByRole('heading', { name: 'Ergebnis: 0/1' })).toBeVisible();
  const error = frame.getByRole('group', { name: 'Fehler bei Frage 1: q1' });
  await error.locator('summary').click();
  await expect(error.getByRole('button', { name: 'Übe Schlussfolgerung' })).toHaveCount(0);
  await expect(error.getByText('A · Antwort A zu q1')).toBeVisible();
});

test('wraps long lesson content without horizontal overflow on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const category = 'Datenschutzfolgenabschätzung';
  const data = quiz([question('q1', { category })], { lessons: [lesson(category, {
    rule: 'Datenschutzfolgenabschätzungsergebnisdokumentation muss im Zusammenhang gelesen werden.'
  })] });
  const frame = await mountQuiz(page, data);
  await answerAndAdvance(frame, 'A');
  await openLessonFromError(frame, category);

  const hasOverflow = await frame.locator('html').evaluate(element => element.scrollWidth > element.clientWidth);
  expect(hasOverflow).toBe(false);
  await expect(frame.getByRole('heading', { name: `Lektion: ${category}` })).toBeVisible();
});

test('renders a zero score, three error cards, and at most two provisional observations', async ({ page }) => {
  const frame = await mountQuiz(page, threeQuestionQuiz());
  await answerAndAdvance(frame, 'A');
  await answerAndAdvance(frame, 'A');
  await answerAndAdvance(frame, 'A');

  await expect(frame.getByRole('heading', { name: 'Ergebnis: 0/3' })).toBeVisible();
  await expect(frame.getByRole('group', { name: /Fehler bei Frage/ })).toHaveCount(3);
  expect(await frame.getByTestId('observation').count()).toBeLessThanOrEqual(2);
  await expect(frame.getByText(/vorläufig/i).first()).toBeVisible();
});

test('renders a perfect score without inventing a weakness', async ({ page }) => {
  const frame = await mountQuiz(page, threeQuestionQuiz());
  await answerAndAdvance(frame, 'B');
  await answerAndAdvance(frame, 'C');
  await answerAndAdvance(frame, 'D');

  await expect(frame.getByRole('heading', { name: 'Ergebnis: 3/3' })).toBeVisible();
  await expect(frame.getByText('In diesem Quiz wurde keine Schwäche nachgewiesen.')).toBeVisible();
  await expect(frame.getByTestId('observation')).toHaveCount(0);
});

test('supports keyboard selection and keeps the selected answer focused', async ({ page }) => {
  const frame = await mountQuiz(page, quiz([question()]));
  const option = frame.getByRole('button', { name: /^B\s/ });
  await option.focus();
  await option.press('Enter');
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await expect(option).toBeFocused();
  await expect(frame.getByRole('button', { name: 'Auswertung' })).toBeEnabled();
});

test('stacks cleanly on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const frame = await mountQuiz(page, threeQuestionQuiz());
  const hasOverflow = await frame.locator('html').evaluate(element => element.scrollWidth > element.clientWidth);
  expect(hasOverflow).toBe(false);
  await expect(frame.getByRole('button', { name: /^A\s/ })).toBeVisible();
});

test('renders HTML-like prompts and backtick evidence literally', async ({ page }) => {
  const frame = await mountQuiz(page, threeQuestionQuiz());
  await answerAndAdvance(frame, 'A');
  await answerAndAdvance(frame, 'A');
  await answerAndAdvance(frame, 'A');

  expect(await frame.locator('script').count()).toBe(1);
  expect(await frame.locator('body').evaluate(() => window.__quizXss)).toBeUndefined();
  const thirdCard = frame.getByRole('group', { name: /Fehler bei Frage 3/ });
  await thirdCard.locator('summary').click();
  await expect(thirdCard.locator('code')).toHaveText('obwohl `Pilotphase` ausdrücklich genannt wird');
});

test('reload marks the attempt as restarted and clears partial answers', async ({ page }) => {
  const data = threeQuestionQuiz();
  const frame = await mountQuiz(page, data);
  await answerAndAdvance(frame, 'A');
  await expect(frame.getByText('Frage 2 von 3')).toBeVisible();

  await page.locator('#quiz-frame').evaluate(iframe => iframe.contentWindow.location.reload());
  await expect(frame.getByText('Der laufende Versuch wurde nach dem Neuladen neu gestartet.')).toBeVisible();
  await expect(frame.getByText('Frage 1 von 3')).toBeVisible();
  await expect(frame.getByRole('button', { name: 'Weiter' })).toBeDisabled();
});

test('a completed user can immediately start and finish a clean second run', async ({ page }) => {
  const frame = await mountQuiz(page, quiz([question()]));
  await answerAndAdvance(frame, 'A');
  await expect(frame.getByRole('heading', { name: 'Ergebnis: 0/1' })).toBeVisible();

  await frame.getByRole('button', { name: 'Neu starten' }).click();
  await expect(frame.getByRole('button', { name: 'Auswertung' })).toBeDisabled();
  await answerAndAdvance(frame, 'B');
  await expect(frame.getByRole('heading', { name: 'Ergebnis: 1/1' })).toBeVisible();
});

test('runs inside an allow-scripts sandbox where browser storage is unavailable', async ({ page }) => {
  const frame = await mountQuiz(page, quiz([question()]), { sandbox: 'allow-scripts' });
  await answerAndAdvance(frame, 'B');
  await expect(frame.getByRole('heading', { name: 'Ergebnis: 1/1' })).toBeVisible();
});

test('treats reserved object property names as ordinary unanswered question ids', async ({ page }) => {
  const frame = await mountQuiz(page, quiz([question('__proto__')]));
  const finish = frame.getByRole('button', { name: 'Auswertung' });
  await expect(finish).toBeDisabled();
  await answerAndAdvance(frame, 'B');
  await expect(frame.getByRole('heading', { name: 'Ergebnis: 1/1' })).toBeVisible();
});

test('moves focus to each destination during a keyboard-only attempt and restart', async ({ page }) => {
  const data = quiz([question()]);
  const frame = await mountQuiz(page, data);
  const questionHeading = frame.getByRole('heading', { name: data.questions[0].prompt });
  await expect(questionHeading).toBeFocused();

  const option = frame.getByRole('button', { name: /^B\s/ });
  await option.focus();
  await option.press('Enter');
  const finish = frame.getByRole('button', { name: 'Auswertung' });
  await finish.focus();
  await finish.press('Enter');
  const resultHeading = frame.getByRole('heading', { name: 'Ergebnis: 1/1' });
  await expect(resultHeading).toBeFocused();

  const restart = frame.getByRole('button', { name: 'Neu starten' });
  await restart.focus();
  await restart.press('Enter');
  await expect(questionHeading).toBeFocused();
});

test('uses the original question number on a mixed-result error card', async ({ page }) => {
  const frame = await mountQuiz(page, threeQuestionQuiz());
  await answerAndAdvance(frame, 'B');
  await answerAndAdvance(frame, 'C');
  await answerAndAdvance(frame, 'A');

  const error = frame.getByRole('group', { name: 'Fehler bei Frage 3: q3' });
  await expect(error).toBeVisible();
  await expect(error.locator('.summary-number')).toHaveText('03');
});
