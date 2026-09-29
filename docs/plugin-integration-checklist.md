# DTB C1 plugin integration checklist

Status: **live accepted and plugin version 0.1.7 published**

## Current-release baseline

- Package identity: `gpt-59b5717b0585d366ab4ff5209bf0b9d4`
- Current cached version inspected: `0.1.6`
- Current capabilities: `skills`
- Starter prompts to preserve verbatim and in order:
  1. `Starte einen schwierigen DTB-C1-Minitest.  `
  2. `Trainiere mit mir DTB C1 Schreiben.  `
  3. `Simuliere eine DTB-C1-Sprechprüfung. `
- Current failing scenario from the handoff: the native quiz can show a score and answer explanations, but the trainer cannot retrieve the selected answers for the promised weakness analysis and expandable error cards.
- Screenshot evidence for that old failure was not included in the handoff archive. Do not invent or substitute one.

## Deployment record

- Host: Render Free web service, Frankfurt
- Stable HTTPS MCP URL: `https://dtb-c1-quiz.onrender.com/mcp`
- Expected recurring cost: $0 within Render's free-plan limits; the service spins down after inactivity and can take 50 seconds or more to wake.
- HTTP transport verification: automated locally and repeated against the public endpoint; the remote SDK client listed `start_quiz`, returned three questions, and loaded the MCP Apps resource with the expected MIME type.
- Public MCP Inspector verification: passed for connection, initialization, tool listing, and resource listing.

## Live ChatGPT acceptance run

Use ChatGPT developer mode with the deployed HTTPS `/mcp` endpoint. Refresh the connection after server metadata changes.

- [x] Start one three-question diagnostic quiz from a new chat.
- [x] Confirm exactly one question is visible at a time with four clickable A/B/C/D choices.
- [x] Confirm Next is disabled before selection and a rapid double-click does not skip a question.
- [x] Complete all three questions with at least one wrong answer.
- [x] Confirm the same component shows the actual score.
- [x] Expand an error card and confirm selected and correct options, both explanations, category, transfer prompt, and semantic inline-code quote.
- [x] Confirm no more than two observations appear and a short quiz is labeled provisional.
- [x] Restart and confirm no answers or enabled navigation are inherited.
- [x] Repeat once in exam mode and confirm no correctness feedback appears before completion.
- [ ] Save a narrow-width screenshot of the live result. Desktop evidence was captured during both completed runs.

The required live question-to-results gate has passed, so it is accurate to state that the quiz works in ChatGPT. The remaining narrow-width screenshot is release documentation evidence, not an untested behavior: phone-width layout is covered by Playwright.

### Recorded live results — 2026-09-28

- Learning mode: three questions completed with score `2/3`; the wrong-answer card showed the selected and correct options, both explanations, category, semantic code-formatted evidence, and a transfer task. The result included one provisional observation.
- Restart: the same component returned to question 1 with no option selected and Next disabled.
- Exam mode: three questions completed with score `2/3`; no correctness or explanation was shown while answering, and the final result stated that feedback was withheld until completion.
- Render cold start observed: approximately 42 seconds on the first live request.

## Post-acceptance package delta

Prepare the update from the exact current release, not from a starter template.

1. Add root `mcp.json` with the verified stable URL and `type: "streamable-http"`.
2. In root `plugin.json`, preserve every existing value except:
   - bump `version` from `0.1.6` to `0.1.7`;
   - add the MCP capability if required by the current manifest validator.
3. In `.codex-plugin/plugin.json`, preserve the interface object, descriptions, author, keywords, and `skills: "./skills"`; synchronize version `0.1.7` and the portable MCP compatibility reference required by the current packaging tool.
4. In `skills/instructions/SKILL.md`, change only the multiple-choice routing:
   - diagnostic and multiple-choice mini-tests call `start_quiz` with complete validated question data;
   - the tool result owns click state, scoring, result cards, and provisional observations;
   - exam mode uses `mode: "exam"`;
   - if the tool is unavailable, ask and score one question at a time in chat;
   - never claim access to iframe-local clicks in later chat turns.
5. Preserve all reference PDFs, audio files, lookup data, writing-comparison guidance, exam rules, and non-quiz instructions unchanged.
6. Compare the candidate and current release field by field before packaging.
7. Update with the exact backend plugin ID and `current_release_id`; the GPT-style package name is not a valid substitute.
8. Read back both manifests and the changed skill, then run a new-chat end-to-end quiz. Roll back the routing if it fails.

## Release evidence

- Backend plugin ID: `plugin_832f3a7b4fcc8191bcf5ed8442cb5f68`
- Source `current_release_id`: `pluginrel_6aba504a5ba48191a52aa40235c93622`
- Published version: `0.1.7`
- Published release ID: `pluginrel_6abbe8c96e5c819188b5fc18f3c1b83b`
- Scope and visibility: private personal plugin (`USER`, `PRIVATE`)
- Read-back verification: passed for both manifests, portable `mcp.json`, generated `.mcp.json`, the quiz-routing skill, and preservation of the existing reference assets
- Direct MCP-app new-chat verification: passed in learning and exam modes
- User verification of the integrated quiz: passed before publication
- Published-plugin page verification: version `0.1.7`, one MCP server, and one skill visible
