'use client';

import type React from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Moon, Sun, Github } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { useTheme } from './theme-provider';
import { MarkdownRenderer } from './markdown-renderer';
import { FirecrawlLogoIcon } from './firecrawl-logo-icon';

export function FirecrawlChat() {
  const [input, setInput] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const quickPrompts = [
    {
      title: 'What is the difference between the scrape and crawl endpoints?',
      prompt:
        'What is the difference between Firecrawl’s scrape and crawl endpoints, and when should I use each?',
    },
    {
      title: 'Which crawl params control scope?',
      prompt:
        'Show me crawl examples that set allowedDomains, max pages, depth, and output format.',
    },
    {
      title: 'How do webhooks stream crawl progress?',
      prompt:
        'How do I configure webhooks for crawl progress or batch scrape results, and validate signatures?',
    },
    {
      title: 'How do I use the actions property?',
      prompt:
        'How do I use the actions property in a Firecrawl crawl to run custom page interactions before scraping?',
    },
  ];

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    setShowQuickPrompts(false);
    sendMessage({ text: prompt });
    setInput('');
  };

  return (
    <div className='flex flex-col h-screen max-w-3xl mx-auto'>
      {/* Header */}
      <header className='flex items-center justify-between px-6 py-4 border-b border-border'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10'>
            <FirecrawlLogoIcon size={28} />
          </div>
          <div>
            <h1 className='font-semibold text-foreground'>
              Firecrawl Support Agent
            </h1>
            <p className='text-sm text-muted-foreground'>
              Ask me anything about Firecrawl
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            asChild
            variant='ghost'
            size='icon'
            className='h-10 w-10 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors'
          >
            <Link
              href='https://github.com/devhims/firecrawl-support-agent'
              target='_blank'
              rel='noreferrer'
              aria-label='View on GitHub'
            >
              <Github className='w-5 h-5' />
            </Link>
          </Button>
          <Button
            variant='ghost'
            onClick={toggleTheme}
            size='icon'
            className='h-10 w-10 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors cursor-pointer'
          >
            {theme === 'dark' ? (
              <Sun className='w-5 h-5' />
            ) : (
              <Moon className='w-5 h-5' />
            )}
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto px-6 py-4'>
        {messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center'>
            <div className='flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-4'>
              <FirecrawlLogoIcon size={40} />
            </div>
            <h2 className='text-xl font-semibold text-foreground mb-2'>
              How can I help you today?
            </h2>
            <p className='text-muted-foreground max-w-sm'>
              Ask me about Firecrawl's APIs, web scraping, crawling, or any
              other documentation questions.
            </p>
          </div>
        ) : (
          <div className='space-y-6'>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center'>
                    <FirecrawlLogoIcon size={26} />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return (
                        <MarkdownRenderer key={index} content={part.text} />
                      );
                    }
                    // Handle tool states
                    if (part.type === 'tool-queryFirecrawlDocs') {
                      const query =
                        part.input && typeof part.input === 'object'
                          ? (part.input as { query?: string }).query
                          : undefined;

                      if (
                        part.state === 'input-streaming' ||
                        part.state === 'input-available'
                      ) {
                        return (
                          <div
                            key={index}
                            className='flex items-center gap-2 text-sm text-muted-foreground'
                          >
                            <Loader2 className='w-3 h-3 animate-spin' />
                            {`Searching docs${
                              query ? ` for "${query}"` : ''
                            }...`}
                          </div>
                        );
                      }

                      if (part.state === 'output-error') {
                        return (
                          <div key={index} className='text-sm text-red-500'>
                            {part.errorText ?? 'Doc search failed.'}
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                  {/* Render doc links after the text content for the assistant */}
                  {message.role === 'assistant' &&
                    message.parts
                      .filter(
                        (part) =>
                          part.type === 'tool-queryFirecrawlDocs' &&
                          (part as any).state === 'output-available'
                      )
                      .map((part, idx) => {
                        const output = (part as any).output as {
                          links?: { label: string; href: string }[];
                        };
                        const links = output?.links ?? [];
                        if (links.length === 0) return null;
                        return (
                          <div
                            key={`doclinks-${idx}`}
                            className='mt-3 border border-border rounded-lg bg-muted/50 px-3 py-2 space-y-1'
                          >
                            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                              Docs links
                            </div>
                            <ul className='space-y-1'>
                              {links.map((link, i) => (
                                <li key={i}>
                                  <a
                                    href={link.href}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='text-sm text-orange-600 dark:text-orange-400 underline underline-offset-2'
                                  >
                                    {link.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className='flex gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center'>
                  <FirecrawlLogoIcon size={26} />
                </div>
                <div className='bg-muted rounded-2xl px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />
                    <span className='text-sm text-muted-foreground'>
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className='px-6 py-4 space-y-4'>
        {showQuickPrompts && (
          <ItemGroup className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            {quickPrompts.map((item) => (
              <Item
                key={item.title}
                asChild
                variant='muted'
                size='sm'
                className={cn(
                  'cursor-pointer border border-border/70 hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors duration-150 h-full min-h-[64px]',
                  isLoading && 'opacity-60 cursor-not-allowed'
                )}
              >
                <button
                  type='button'
                  onClick={() => handleQuickPrompt(item.prompt)}
                  disabled={isLoading}
                  className='flex w-full h-full text-left items-center gap-2'
                >
                  <ItemContent>
                    <ItemTitle className='text-foreground'>
                      {item.title}
                    </ItemTitle>
                  </ItemContent>
                </button>
              </Item>
            ))}
          </ItemGroup>
        )}
        <form onSubmit={handleSubmit} className='flex gap-3'>
          <input
            type='text'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask about Firecrawl...'
            className='flex-1 bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50'
            disabled={isLoading}
          />
          <Button
            type='submit'
            size='icon'
            disabled={isLoading || !input.trim()}
            className='h-12 w-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white'
          >
            {isLoading ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              <Send className='w-5 h-5' />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
