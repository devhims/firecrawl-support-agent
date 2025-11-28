import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60;

// Tool to query Firecrawl docs via the Mintlify assistant API
const queryFirecrawlDocs = tool({
  description:
    "Query the Firecrawl documentation to find information about Firecrawl's APIs, features, and usage. Use this tool to answer user questions about Firecrawl.",
  inputSchema: z.object({
    query: z.string().describe('The question or search query about Firecrawl'),
  }),
  execute: async ({ query }) => {
    const payload = {
      id: 'firecrawl',
      fp: 'firecrawAI',
      filter: { version: 'v2' },
      messages: [
        {
          id: `user-msg-${Date.now()}`,
          createdAt: new Date().toISOString(),
          role: 'user',
          content: query,
          parts: [{ type: 'text', text: query }],
        },
      ],
    };

    try {
      const response = await fetch(
        'https://leaves.mintlify.com/api/assistant/firecrawl/message',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to query Firecrawl docs: ${response.status}`,
        };
      }

      // Parse the streaming response
      const text = await response.text();
      const lines = text.split('\n');
      let assistantText = '';

      for (const line of lines) {
        // Look for text content lines (prefixed with "0:")
        if (line.startsWith('0:')) {
          try {
            const content = JSON.parse(line.slice(2));
            if (typeof content === 'string') {
              assistantText += content;
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      const { cleanedText, links } = extractSuggestions(assistantText);
      const enrichedLinks =
        links.length > 0 ? links : inferLinksFromText(cleanedText);

      const docsSuffix =
        enrichedLinks.length > 0
          ? `\n\nDocs:\n${links
              .map(({ label, href }) => `- [${label}](${href})`)
              .join('\n')}`
          : '';

      const finalContent = `${cleanedText}${docsSuffix}`.trim();

      return {
        success: true,
        content: finalContent || 'No response from Firecrawl docs',
        links: enrichedLinks,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error querying Firecrawl docs: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  },
});

function extractSuggestions(raw: string): {
  cleanedText: string;
  links: { label: string; href: string }[];
} {
  if (!raw) return { cleanedText: '', links: [] };

  const suggestionsRegex = /```suggestions[\s\S]*?```/gi;
  const links: { label: string; href: string }[] = [];

  let cleanedText = raw.replace(suggestionsRegex, (match) => {
    const inner = match
      .replace(/```suggestions/i, '')
      .replace(/```/, '')
      .trim();

    inner
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        // Match [Label](path) or (Label)[path] patterns
        const mdMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(line);
        const altMatch = /\(([^)]+)\)\[([^\]]+)\]/.exec(line);

        const label = mdMatch?.[1] ?? altMatch?.[1];
        const path = mdMatch?.[2] ?? altMatch?.[2];

        if (label && path) {
          const href =
            path.startsWith('http') || path.startsWith('https')
              ? path
              : `https://docs.firecrawl.dev${
                  path.startsWith('/') ? '' : '/'
                }${path}`;
          links.push({ label: label.trim(), href });
        }
      });

    return '';
  });

  cleanedText = cleanedText.trim();

  return { cleanedText, links };
}

function inferLinksFromText(raw: string): { label: string; href: string }[] {
  if (!raw) return [];
  const mapping: Record<string, string> = {
    'advanced scraping guide':
      'https://docs.firecrawl.dev/advanced-scraping-guide',
    'scrape api reference':
      'https://docs.firecrawl.dev/api-reference/endpoint/scrape',
    'scrape feature': 'https://docs.firecrawl.dev/features/scrape',
    'javascript sdk documentation':
      'https://docs.firecrawl.dev/developer-guides/sdk/javascript',
    'js sdk documentation':
      'https://docs.firecrawl.dev/developer-guides/sdk/javascript',
  };

  const lower = raw.toLowerCase();
  const found: { label: string; href: string }[] = [];

  for (const [label, href] of Object.entries(mapping)) {
    if (lower.includes(label)) {
      found.push({
        label: label.replace(/\b\w/g, (c) => c.toUpperCase()),
        href,
      });
    }
  }

  return found;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4.1'),
    system: `You are a helpful Firecrawl support engineer. Your role is to help users with questions about Firecrawl - a web scraping platform.

When a user asks a question:
1. Use the queryFirecrawlDocs tool to search the official Firecrawl documentation
2. Based on the documentation results, provide a clear, helpful answer
3. Include code examples when relevant
4. Be concise but thorough

If the documentation doesn't have the answer, be honest and suggest alternatives or point them to Firecrawl's support channels.

Always be friendly, professional, and helpful.`,
    messages: convertToModelMessages(messages),
    tools: {
      queryFirecrawlDocs,
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
