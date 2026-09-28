# DTB C1 Interactive Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clickable diagnostic quiz to the existing plugin that records choices and displays score, error cards, and a provisional weakness analysis in one view.

**Architecture:** A stateless Node MCP server validates generated questions and returns an MCP Apps UI resource. The iframe owns the answer state and scores locally; no attempt database is needed. The plugin skill routes diagnostic requests to the new tool after its HTTPS endpoint is deployed and verified.

**Tech Stack:** Node.js, `@modelcontextprotocol/sdk`, `@modelcontextprotocol/ext-apps`, Zod, plain HTML/CSS/JavaScript, Node test runner, Playwright for browser checks.

**Spec:** `docs/superpowers/specs/2026-09-28-dtb-c1-interactive-quiz-design.md`

## Global Constraints

- Preserve the plugin identity `gpt-59b5717b0585d366ab4ff5209bf0b9d4`, existing prompts, metadata, skill content outside quiz flow, and exam assets.
- Support 1 to 20 questions, each with A/B/C/D options and exactly one correct answer.
- Modes are `practice`, `diagnostic`, and `exam`; exam mode cannot show correctness before completion.
- Keep attempts in component state only; no account, storage, audio player, or custom GPT integration.
- Treat model-generated question text as untrusted data; do not render it with `innerHTML`.
- Do not publish the plugin update until the public HTTPS endpoint and final result are verified live.

## Review Focus

- Blank or duplicated question ids and option values must fail validation.
- Correct answers absent from options and missing distractor feedback must fail validation.
- Double clicks and pressing Next before choosing must never count a question twice or skip it.
- HTML-like question text and a quote containing backticks must display literally without executing markup.
- An iframe reload mid-attempt must show a restart state and never invent a completed score.

## File map

- `quiz-server/package.json`: dependencies, scripts, module type.
- `quiz-server/src/schema.js`: Zod schema and quiz input validation.
- `quiz-server/src/diagnosis.js`: pure scoring and evidence-based observations.
- `quiz-server/src/server.js`: MCP tool and UI resource; streamable HTTP `/mcp` endpoint.
- `quiz-server/public/quiz.html`: accessible self-contained UI with local state and result cards.
- `quiz-server/test/schema.test.js`, `quiz-server/test/diagnosis.test.js`: contract and scoring tests.
- `quiz-server/test/ui.spec.js`: browser interaction and safety tests.
- `mcp.json`, `plugin.json`, `.codex-plugin/plugin.json`, `skills/instructions/SKILL.md`: final plugin integration after deployment.
- `README.md`: local run, environment, deployment, and live test instructions.

---

### Task 1: Question contract and scoring

**Files:** Create `quiz-server/package.json`, `quiz-server/src/schema.js`, `quiz-server/src/diagnosis.js`, `quiz-server/test/schema.test.js`, `quiz-server/test/diagnosis.test.js`.

**Interfaces:** `parseQuiz(input: unknown): Quiz` throws validation errors; `summarizeQuiz(quiz: Quiz, answers: Record<string, 'A'|'B'|'C'|'D'>): {score: number, total: number, errors: ErrorCard[], observations: Observation[]}`. `Quiz` has title, mode, and questions with id, area, category, prompt, options, correctValue, feedback for all four options, hint, evidenceQuote, and transferPrompt.

- [ ] **Step 1: Write failing validation tests.** Assert valid three-question data parses; 0/21 questions, duplicate ids, duplicate/missing A-D options, missing correct value, absent category, blank prompt, and missing feedback reject with an identifiable error.
- [ ] **Step 2: Run `npm test -- --test-name-pattern=validation` in `quiz-server`; confirm failure.**
- [ ] **Step 3: Implement `parseQuiz` and package scripts/dependencies.** Require nonempty title and prompts, unique ids, all four option values, exactly one valid correct value, four feedback entries, and a category. Permit empty evidenceQuote only for questions without a quoted source.
- [ ] **Step 4: Run validation tests; confirm pass.**
- [ ] **Step 5: Write failing scoring tests.** Assert 0/3 and 3/3; an incomplete answer map cannot be summarized; repeated category errors yield one cited observation; one error in one category yields a provisional observation; no errors yields no asserted weakness; no more than two observations.
- [ ] **Step 6: Run scoring tests; confirm failure, then implement `summarizeQuiz`; rerun and confirm pass.** Preserve question order in error cards and cite ids in observations.
- [ ] **Step 7: Commit task files.**

### Task 2: MCP server and readable fallback

**Files:** Create `quiz-server/src/server.js`, `quiz-server/test/server.test.js`, `quiz-server/README.md`.

**Interfaces:** Register `start_quiz` with schema from Task 1 and `ui://dtb-c1/quiz.html` with MCP Apps UI MIME type; return structured quiz data and readable text content. `createAppServer()` exports the configured server for test harnesses; HTTP entrypoint serves `/mcp` with streamable transport.

- [ ] **Step 1: Write failing tool/resource tests.** Valid input returns UI metadata and 3 questions; invalid input returns a clear tool error; resource yields the correct MIME type; readable text conveys title, mode, and question count without leaking answer keys before quiz completion.
- [ ] **Step 2: Run `npm test -- --test-name-pattern=server`; confirm failure.**
- [ ] **Step 3: Implement tool, resource, HTTP entrypoint, and `npm start`.** Use official SDK functions from the quickstart; avoid persistence and credentials.
- [ ] **Step 4: Run server tests and MCP Inspector against local `/mcp`; confirm tool and resource behavior.** Document the commands and deployment URL configuration in README.
- [ ] **Step 5: Commit task files.**

### Task 3: Clickable quiz and results UI

**Files:** Create `quiz-server/public/quiz.html`, `quiz-server/test/ui.spec.js`; adjust `quiz-server/package.json` test scripts.

**Interfaces:** UI reads the MCP tool result, creates one locally held answer per question, and invokes Task 1 summary logic bundled into the component. It does not request click state from ChatGPT. Use buttons for A-D, Next, hint, Restart, and `<details>` cards for errors; quote uses `<code>` and `textContent`.

- [ ] **Step 1: Write failing browser tests.** Cover 3 question navigation, disabled Next before selection, double click idempotence, practice feedback, exam feedback suppression, 0/3 score with three expandable cards and two or fewer provisional observations, 3/3 no weakness claim, keyboard selection/focus, narrow viewport, literal `<script>` and backtick quote, and reload restart state.
- [ ] **Step 2: Run UI tests; confirm failure.**
- [ ] **Step 3: Implement responsive, accessible UI and local state machine.** Render all model text through text nodes; add visual focus styles; mark a resumed iframe without state as restarted rather than scored.
- [ ] **Step 4: Run UI tests and inspect an actual small-screen and desktop result view; confirm pass.**
- [ ] **Step 5: Commit task files.**

### Task 4: Deployment and plugin integration

**Files:** Create `mcp.json`; modify `plugin.json`, `.codex-plugin/plugin.json`, `skills/instructions/SKILL.md`, `README.md`.

**Interfaces:** Portable `mcp.json` points to one stable public HTTPS `/mcp` URL. The skill directs diagnostic and multiple-choice mini-tests to `start_quiz`, retaining the chat-by-chat fallback when the tool is unavailable. Current release is `0.1.6`; increment to `0.1.7` if still current.

- [ ] **Step 1: Deploy the server to a user-controlled HTTPS host and verify `/mcp` with Inspector.** Record host selection and any expected recurring cost in README. Never commit credentials.
- [ ] **Step 2: Connect the server in ChatGPT developer mode and complete one live 3-question diagnostic.** Confirm selected answers, score, error cards, quote formatting, and provisional analysis in the same component.
- [ ] **Step 3: Write an integration checklist with a failing current-release scenario.** The current native widget shows score without diagnosis; record screenshots and acceptance observations.
- [ ] **Step 4: Update plugin configuration and quiz skill only after live UI passes.** Compare manifests and prompts against current release; package changed paths and publish via Plugin Creator with the current release guard.
- [ ] **Step 5: Read back the new plugin release and run a new-chat end-to-end quiz.** If it fails, restore the previous routing and report the limitation rather than claiming a working release.
- [ ] **Step 6: Commit integration files and update README with the released version.**
