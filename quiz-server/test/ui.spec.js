import { test, expect } from '@playwright/test';
import { question, quiz, threeQuestionQuiz } from './fixtures.js';

async function mountQuiz(page, quizData) {
  await page.goto('/');
  await page.evaluate(data => {
    const host = document.querySelector('#host');
    const iframe = document.createElement('iframe');
    iframe.id = 'quiz-frame';
    iframe.title = 'DTB C1 Quiz';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.minHeight = '760px';

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
  }, quizData);

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
  await exam.getByRole('button', { name: 'Auswertung' }).click();
  await exam.getByRole('group', { name: /Fehler bei Frage 1/ }).locator('summary').click();
  await expect(exam.getByText('Erklärung A zu q1')).toBeVisible();
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
