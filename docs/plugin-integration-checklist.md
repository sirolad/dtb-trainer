# DTB C1 plugin integration checklist

Status: **prepared, not released**

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

- Host: not selected
- Stable HTTPS MCP URL: not assigned
- Expected recurring cost: not recorded
- HTTP transport verification: automated locally
- Public MCP Inspector verification: pending

Do not create the release `mcp.json` while the URL is pending.

## Live ChatGPT acceptance run

Use ChatGPT developer mode with the deployed HTTPS `/mcp` endpoint. Refresh the connection after server metadata changes.

- [ ] Start one three-question diagnostic quiz from a new chat.
- [ ] Confirm exactly one question is visible at a time with four clickable A/B/C/D choices.
- [ ] Confirm Next is disabled before selection and a rapid double-click does not skip a question.
- [ ] Complete all three questions with at least one wrong answer.
- [ ] Confirm the same component shows the actual score.
- [ ] Expand an error card and confirm selected and correct options, both explanations, category, transfer prompt, and semantic inline-code quote.
- [ ] Confirm no more than two observations appear and a short quiz is labeled provisional.
- [ ] Restart and complete a second attempt without inherited answers.
- [ ] Repeat once in exam mode and confirm no correctness feedback appears before completion.
- [ ] Save desktop and narrow-width screenshots of the live result.

Only a completed checklist permits the statement “the quiz works in ChatGPT.”

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

- Backend plugin ID: unresolved
- Source `current_release_id`: unresolved
- Candidate version: `0.1.7` (gated)
- Published release ID: none
- New-chat verification: pending
