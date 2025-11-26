'use client';

import type React from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Send, Flame, Loader2, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from './theme-provider';
import { MarkdownRenderer } from './markdown-renderer';

export function FirecrawlChat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

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

  return (
    <div className='flex flex-col h-screen max-w-3xl mx-auto'>
      {/* Header */}
      <header className='flex items-center justify-between px-6 py-4 border-b border-border'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10'>
            <Flame className='w-5 h-5 text-orange-500' />
          </div>
          <div>
            <h1 className='font-semibold text-foreground'>Firecrawl Support</h1>
            <p className='text-sm text-muted-foreground'>
              Ask me anything about Firecrawl
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleTheme}
          className='rounded-lg'
        >
          {theme === 'dark' ? (
            <Sun className='w-5 h-5' />
          ) : (
            <Moon className='w-5 h-5' />
          )}
        </Button>
      </header>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto px-6 py-4'>
        {messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center'>
            <div className='flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-4'>
              <Flame className='w-8 h-8 text-orange-500' />
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
                    <Flame className='w-4 h-4 text-orange-500' />
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
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className='flex gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center'>
                  <Flame className='w-4 h-4 text-orange-500' />
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
      <div className='border-t border-border px-6 py-4'>
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
