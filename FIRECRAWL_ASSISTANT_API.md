# Firecrawl Assistant API Guide

This guide shows how to call the Mintlify Leaves Firecrawl assistant endpoint (`/api/assistant/firecrawl/message`), including streaming, payload format, and conversation threading.

## Endpoint
- URL: `https://leaves.mintlify.com/api/assistant/firecrawl/message`
- Method: `POST`
- Content-Type: `application/json`
- Auth: None observed
- Rate limits (from headers): `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`

## Minimal request payload
```json
{
  "id": "firecrawl",
  "fp": "firecrawAI",
  "filter": { "version": "v2" },
  "messages": [
    {
      "id": "user-msg-1",
      "createdAt": "2025-11-26T12:25:00Z",
      "role": "user",
      "content": "How do I use the Firecrawl search API?",
      "parts": [
        { "type": "text", "text": "How do I use the Firecrawl search API?" }
      ]
    }
  ]
}
```

Fields:
- `id`: keep as `"firecrawl"` (matches backend workspace)
- `fp`: keep as `"firecrawAI"` (fingerprint expected by service)
- `filter.version`: `"v2"` per observed traffic
- `messages`: ordered conversation turns; each needs a unique `id`, ISO timestamp `createdAt`, `role` (`user` or `assistant`), `content`, and `parts` array (at minimum one `{type:"text", text:"..."}` entry)

## Basic curl (streaming enabled)
Use `-N` to disable buffering and see streamed chunks as they arrive.
```bash
curl -N -X POST "https://leaves.mintlify.com/api/assistant/firecrawl/message" \
  -H "Content-Type: application/json" \
  --data '{
    "id": "firecrawl",
    "fp": "firecrawAI",
    "filter": { "version": "v2" },
    "messages": [
      {
        "id": "user-msg-1",
        "createdAt": "2025-11-26T12:25:00Z",
        "role": "user",
        "content": "How do I use the Firecrawl search API?",
        "parts": [{ "type": "text", "text": "How do I use the Firecrawl search API?" }]
      }
    ]
  }'
```

Expected response characteristics:
- HTTP 200 with `content-type: text/plain; charset=utf-8`
- Streaming protocol (`x-vercel-ai-data-stream: v1`)
- Lines prefixed with small markers (e.g., `f:`, `9:`, `a:`, `0:`) carrying JSON fragments:
  - `f:` message metadata (e.g., `{"messageId": "..."}`)
  - `9:` tool call requests (e.g., search)
  - `a:` tool call results
  - `0:` assistant text tokens (the actual reply, incrementally)

## Keeping conversation context
- The response headers include `x-thread-id`. Reuse that thread by:
  1) Including the same `x-thread-id` as a header in your next request (if your client supports passing it through), **and**
  2) Appending prior turns to the `messages` array when sending follow-ups.
- Continue numbering message `id`s uniquely (`user-msg-2`, `assistant-msg-2`, etc.) and update `createdAt`.

## Example follow-up payload (continuing same thread)
```json
{
  "id": "firecrawl",
  "fp": "firecrawAI",
  "filter": { "version": "v2" },
  "messages": [
    {
      "id": "user-msg-1",
      "createdAt": "2025-11-26T12:25:00Z",
      "role": "user",
      "content": "How do I use the Firecrawl search API?",
      "parts": [{ "type": "text", "text": "How do I use the Firecrawl search API?" }]
    },
    {
      "id": "assistant-msg-1",
      "createdAt": "2025-11-26T12:26:10Z",
      "role": "assistant",
      "content": "Response text from previous call",
      "parts": [{ "type": "text", "text": "Response text from previous call" }]
    },
    {
      "id": "user-msg-2",
      "createdAt": "2025-11-26T12:27:00Z",
      "role": "user",
      "content": "Give me a curl example for search",
      "parts": [{ "type": "text", "text": "Give me a curl example for search" }]
    }
  ]
}
```

## Quick reference (what the assistant returned to us)
- Basic search:
  ```bash
  curl -s -X POST "https://api.firecrawl.dev/v2/search" \
    -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "firecrawl",
      "limit": 3
    }'
  ```
- Search + scrape results:
  ```bash
  curl -X POST "https://api.firecrawl.dev/v2/search" \
    -H "Authorization: Bearer fc-YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "firecrawl web scraping",
      "limit": 3,
      "scrapeOptions": { "formats": ["markdown", "links"] }
    }'
  ```

## Tips
- Always set `Content-Type: application/json`.
- Use `curl -N` (or an HTTP client that supports streams) to read incremental tokens.
- Watch `ratelimit-remaining`/`ratelimit-reset` headers to avoid throttling.
- If you see tool call chunks (`toolName` and `args`), let the stream finish; the assistant text arrives as `0:` segments.

## Sample streamed response (readable summary)

Headers (selected):
- `HTTP/2 200`
- `x-thread-id: 01KAZESWQQGYWKP36ZQH328Y35`
- `x-message-id: 01KAZESWQW4MM7WZA0YFENGXT1`
- `content-type: text/plain; charset=utf-8`
- `x-vercel-ai-data-stream: v1`
- `ratelimit-remaining: 196`

Stream shape (line types):
- `f:` message metadata → `{"messageId":"msg-crASnHfTfg7U06w4sUaSQ7gh"}`
- `9:` tool call → `{"toolCallId":"toolu_012vP3gWzsXKjkA4xWt3u7qK","toolName":"search","args":{"query":"Firecrawl search API curl example"}}`
- `a:` tool result → large JSON payload with Firecrawl search docs (about 135 KB, Spanish copy). Example excerpt:
  - Describes search features, parameters, examples (Python/JS/cURL), response structure with `success`, `data.web[]`, `images[]`, `news[]`, and advanced options (sources, categories, tbs, location, cost notes, etc.).
- `0:` assistant text tokens (the human-readable answer), streamed in small chunks. Reconstructed text:
  ```
  The Firecrawl search API lets you perform web searches and optionally scrape results in one operation. Here's a basic curl example:

  ```bash
  curl -s -X POST "https://api.firecrawl.dev/v2/search" \
    -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "firecrawl",
      "limit": 3
    }'
  ```

  You can also scrape the search results by adding `scrapeOptions`:

  ```bash
  curl -X POST https://api.firecrawl.dev/v2/search \
    -H "Authorization: Bearer fc-YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "firecrawl web scraping",
      "limit": 3,
      "scrapeOptions": {
        "formats": ["markdown", "links"]
      }
    }'
  ```

  Want to know more? These pages may help:
  (Search feature documentation)[/features/search]
  (Search API reference)[/api-reference/endpoint/search]
  ```

Key takeaways:
- The body is a stream of multiple line-prefixed JSON fragments.
- Tool results (`a:`) can be very large and multilingual.
- The final human-readable answer is assembled from the `0:` text chunks.
