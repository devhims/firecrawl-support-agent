# Firecrawl Support Agent

An agentic support assistant for Firecrawl. It runs on Vercel AI SDK (OpenAI GPT‑4.1), autonomously calls a docs search tool to pull live answers from Firecrawl [documentation](https://docs.firecrawl.dev), and streams responses to the UI with markdown, code, and doc links.

## How it works (agent)

- **Agent loop**: `streamText` runs with `stopWhen: stepCountIs(3)`, so the model can call tools, read results, and continue up to 3 steps (multi-step tool use).
- **Tool**: `queryFirecrawlDocs` POSTs to the Mintlify Firecrawl assistant (`https://leaves.mintlify.com/api/assistant/firecrawl/message`). We stream the response, collect text tokens, and parse suggestion fences to surface doc links.
- **UI**: `firecrawl-chat.tsx` streams messages, renders markdown/code, and shows doc links after the assistant’s reply. Loading states show model “thinking” and doc-search spinners.
- **Branding**: Animated Firecrawl flame icon (`FirecrawlLogoIcon`) replaces the default flame.

## Prerequisites

- Node 18+
- pnpm (preferred) or npm/yarn/bun
- An OpenAI API key (`OPENAI_API_KEY`) for GPT-4.1 (set in `.env`).

## Setup

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

Create `.env` in the project root:

```
OPENAI_API_KEY=sk-...
```

## API route: `/api/chat`

- Model: `openai('gpt-4.1')`
- Tools: `queryFirecrawlDocs`
- stopWhen: `stepCountIs(3)` to allow multi-step tool use (agent behavior)
- Returns: streamed UI messages with doc links appended when present.

## Docs tool payload (Mintlify)

- URL: `https://leaves.mintlify.com/api/assistant/firecrawl/message`
- Headers: `Content-Type: application/json`
- Body (minimal):
  ```json
  {
    "id": "firecrawl",
    "fp": "firecrawAI",
    "filter": { "version": "v2" },
    "messages": [
      {
        "id": "user-msg-1",
        "createdAt": "2025-11-26T13:45:00Z",
        "role": "user",
        "content": "Your query",
        "parts": [{ "type": "text", "text": "Your query" }]
      }
    ]
  }
  ```
- Response: streamed `text/plain` with prefixes `f:` (meta), `9:` (tool call), `a:` (tool result), `0:` (assistant text). We collect `0:` for the answer and parse `suggestions` fences from `a:` to surface clickable links.

## Important

The Mintlify endpoint is undocumented/internal; it may change or be rate-limited.

## UI details

- Links: Doc suggestions render after the assistant message as a list of anchors.
- Markdown: Headings, lists, inline code, fenced code, and auto-linked URLs.
- States: Shows “Thinking…” spinner and doc-search spinner when the tool runs.
- Assets: Firecrawl logos live in `public/`; the animated inline icon is code-based.

## Deploy

Standard Next.js deploy (e.g., Vercel). Ensure `OPENAI_API_KEY` is set in env.
