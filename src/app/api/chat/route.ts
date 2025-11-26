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

      return {
        success: true,
        content: assistantText || 'No response from Firecrawl docs',
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

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4.1'),
    system: `You are a helpful Firecrawl support engineer. Your role is to help users with questions about Firecrawl - a web scraping and crawling API.

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
