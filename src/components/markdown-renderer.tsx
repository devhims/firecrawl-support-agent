'use client';

import type React from 'react';

import { memo, useMemo } from 'react';
import { useTheme } from './theme-provider';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='relative group my-3 rounded-lg overflow-hidden border border-border'>
      <div className='flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border'>
        <span className='text-xs font-mono text-muted-foreground'>
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className='flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
        >
          {copied ? (
            <Check className='w-3.5 h-3.5' />
          ) : (
            <Copy className='w-3.5 h-3.5' />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={theme === 'dark' ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          background: 'transparent',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-mono)',
          },
        }}
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  const elements = useMemo(() => {
    const parts: React.ReactNode[] = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index);
        parts.push(
          <TextContent key={`text-${lastIndex}`} content={textContent} />
        );
      }

      // Add code block
      parts.push(
        <CodeBlock
          key={`code-${match.index}`}
          language={match[1]}
          code={match[2]}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <TextContent
          key={`text-${lastIndex}`}
          content={content.slice(lastIndex)}
        />
      );
    }

    return parts;
  }, [content]);

  return <div className='space-y-1'>{elements}</div>;
});

function TextContent({ content }: { content: string }) {
  // Process inline code and other markdown
  const processedContent = useMemo(() => {
    const parts: React.ReactNode[] = [];
    const inlineCodeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineCodeRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className='whitespace-pre-wrap'>
            {processText(content.slice(lastIndex, match.index))}
          </span>
        );
      }
      parts.push(
        <code
          key={`inline-${match.index}`}
          className='px-1.5 py-0.5 rounded bg-muted font-mono text-sm text-orange-600 dark:text-orange-400'
        >
          {match[1]}
        </code>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className='whitespace-pre-wrap'>
          {processText(content.slice(lastIndex))}
        </span>
      );
    }

    return parts;
  }, [content]);

  return <>{processedContent}</>;
}

function processText(text: string): React.ReactNode {
  // Handle bold text
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`bold-${match.index}`} className='font-semibold'>
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
