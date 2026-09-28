# DTB C1 clickable quiz MCP

This repository contains the stateless MCP server and self-contained MCP Apps view for the DTB C1 Prüfungstrainer quiz flow.

## Verified locally

- The server validates 1–20 complete A/B/C/D questions.
- The component owns answer state and displays score, expandable error cards, evidence quotes, transfer prompts, and at most two provisional observations.
- Practice feedback appears after selection; exam feedback remains hidden until the final result.
- Restart, immediate replay, rapid double-clicks, reload recovery, keyboard use, literal HTML-like text, and phone-width layout are covered by browser tests.

This does **not** establish that the quiz works in ChatGPT. That claim remains blocked until the public endpoint is connected in ChatGPT developer mode and a live question-to-results attempt reaches the final score, error cards, quote formatting, and provisional analysis in the same component.

## Run locally

```bash
cd quiz-server
npm ci
npm test
npm start
```

The health response is at `http://localhost:8787/`; the streamable HTTP endpoint is `http://localhost:8787/mcp`. Set `PORT` when the hosting platform provides a different port. `public/quiz.html` is committed as the deployable self-contained artifact; run `npm run build:ui` after changing `src/quiz-ui.js` or `public/quiz.template.html`.

## Deployment requirements

The public test deployment runs on Render's free plan in Frankfurt:

- Health: `https://dtb-c1-quiz.onrender.com/`
- MCP: `https://dtb-c1-quiz.onrender.com/mcp`
- Expected recurring cost: $0 while the service remains within Render's free-plan limits.

A remote SDK smoke test has listed `start_quiz`, completed a three-question tool call, and loaded `ui://dtb-c1/quiz.html` with the `text/html;profile=mcp-app` MIME type. MCP Inspector also connects over Streamable HTTP and lists the tool and resource. Render spins the free service down after inactivity, so wake-up can delay a request by 50 seconds or more. This deployment still needs live ChatGPT acceptance testing.

The host provides:

- Node.js 20 or newer;
- a stable public HTTPS origin;
- an always-on or wakeable HTTP process running `npm start`;
- the platform-provided `PORT` environment variable;
- no credentials embedded in source or manifests.

Render installs production dependencies with `npm ci --omit=dev` and starts the process with `npm start`, as defined in `render.yaml`. Do not replace the stable deployment URL with a temporary tunnel URL in a released plugin.

## Release gate

The current plugin release is `0.1.6`. The guarded candidate is `0.1.7`, but its manifests and skill must not be changed or published until the live ChatGPT run passes. After that run:

1. Create root `mcp.json` with the portable Agent Plugins MCP schema and the verified stable HTTPS `/mcp` URL.
2. Copy the current release as the baseline, preserve its package name, descriptions, author, three starter prompts, assets, exam materials, and skill content outside the quiz-routing section.
3. Bump both manifests to `0.1.7` and add the MCP capability without removing the skills capability.
4. Route diagnostic and multiple-choice mini-tests to `start_quiz`; keep the one-question-at-a-time chat fallback when the tool is unavailable.
5. Package only changed paths, update with the exact backend plugin ID and current release guard, read the release back, then test again in a new chat.

The portable MCP file must use this shape only after replacing the URL with the verified endpoint:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "dtb-c1-quiz": {
      "type": "streamable-http",
      "url": "https://<stable-host>/mcp"
    }
  }
}
```

Official packaging and live connection guidance: [Package your plugin](https://developers.openai.com/plugins/build/plugins) and [MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart).
