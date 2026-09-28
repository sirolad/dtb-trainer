# DTB C1 quiz handoff

The approved design is in `docs/superpowers/specs/2026-09-28-dtb-c1-interactive-quiz-design.md`. The implementation plan is in `docs/superpowers/plans/2026-09-28-dtb-c1-interactive-quiz.md`.

## Current state

- `quiz-server/src/schema.js` validates generated questions.
- `quiz-server/src/diagnosis.js` scores answer selections and produces provisional observations.
- `quiz-server/src/server.js` registers `start_quiz` and an MCP Apps UI resource. Its server tests pass.
- `quiz-server/public/quiz.html` is a loading placeholder. The clickable UI and result cards are **not implemented**.
- No public HTTPS deployment, plugin `mcp.json`, or live ChatGPT integration exists.
- Existing plugin release 0.1.6 is unchanged.

Run `cd quiz-server && npm ci && npm test` before continuing. The test runner currently executes fixture tests more than once because the fixture is imported from a test module. Move fixtures into their own module while working on the UI.

Do not publish plugin changes before the UI is live and its full question-to-result flow is verified. The GitHub integration for this conversation returned 403 when writing to `sirolad/dtb-trainer`; this archive is the handoff for the local clone.
