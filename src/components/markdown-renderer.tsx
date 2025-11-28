'use client';

import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
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
  const normalized = useMemo(() => normalizeDocsLinks(content), [content]);

  const elements = useMemo(() => {
    const parts: React.ReactNode[] = [];
    // Allow optional leading spaces and Windows newlines.
    const codeBlockRegex = /```[ \t]*([^\r\n]*)[\r\n]([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        const textContent = normalized.slice(lastIndex, match.index);
        parts.push(
          <BlockContent key={`text-${lastIndex}`} content={textContent} />
        );
      }

      const langRaw = match[1].trim();
      const lang = langRaw.split(/\s+/)[0] || '';
      const code = match[2];

      if (lang === 'suggestions') {
        parts.push(
          <SuggestionsBlock key={`suggestions-${match.index}`} content={code} />
        );
      } else {
        parts.push(
          <CodeBlock key={`code-${match.index}`} language={lang} code={code} />
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < normalized.length) {
      parts.push(
        <BlockContent
          key={`text-${lastIndex}`}
          content={normalized.slice(lastIndex)}
        />
      );
    }

    return parts;
  }, [normalized]);

  return <div className='space-y-3'>{elements}</div>;
});

function BlockContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  return <div className='space-y-3'>{blocks}</div>;
}

function SuggestionsBlock({ content }: { content: string }) {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <div className='mt-2 border border-border rounded-lg bg-muted/50 px-3 py-2 space-y-1'>
      <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        Docs links
      </div>
      <ul className='space-y-1'>
        {lines.map((line, idx) => {
          const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(line);
          if (linkMatch) {
            return (
              <li key={idx}>
                <a
                  href={linkMatch[2]}
                  target='_blank'
                  rel='noreferrer'
                  className='text-sm text-orange-600 dark:text-orange-400 underline underline-offset-2'
                >
                  {linkMatch[1]}
                </a>
              </li>
            );
          }
          return (
            <li key={idx} className='text-sm text-foreground'>
              {line}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function parseBlocks(content: string): React.ReactNode[] {
  const paragraphs = content.trim().split(/\n\s*\n/);

  return paragraphs.map((block, idx) => {
    const lines = block.split('\n');
    const first = lines[0]?.trim() ?? '';

    const headingMatch = /^#{1,6}\s+(.*)$/.exec(first);
    if (headingMatch) {
      const level = Math.min(6, first.indexOf(' ') /* number of # */);
      const text = first.replace(/^#{1,6}\s+/, '');
      const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return React.createElement(
        HeadingTag,
        {
          key: `h-${idx}`,
          className: cn(
            'font-semibold tracking-tight text-foreground',
            level === 1 && 'text-xl',
            level === 2 && 'text-lg',
            level >= 3 && 'text-base'
          ),
        },
        renderInline(text)
      );
    }

    const isList = lines.every((line) => /^[-*•]\s+/.test(line.trim()));
    if (isList) {
      return (
        <ul key={`ul-${idx}`} className='list-disc list-inside space-y-1'>
          {lines.map((line, li) => (
            <li key={li} className='text-foreground'>
              {renderInline(line.replace(/^[-*•]\s+/, ''))}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={`p-${idx}`} className='leading-relaxed text-foreground'>
        {renderInline(block.replace(/\n/g, ' '))}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(processLinksAndBold(text.slice(lastIndex, match.index)));
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

  if (lastIndex < text.length) {
    parts.push(processLinksAndBold(text.slice(lastIndex)));
  }

  return parts.flat();
}

function processLinksAndBold(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex =
    /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(https?:\/\/[^\s)\]]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`txt-${lastIndex}`} className='whitespace-pre-wrap'>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    if (match[1]) {
      const label = match[2];
      const href = match[3];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={href}
          target='_blank'
          rel='noreferrer'
          className='text-orange-600 dark:text-orange-400 underline underline-offset-2'
        >
          {label}
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <strong key={`bold-${match.index}`} className='font-semibold'>
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      const url = match[6];
      parts.push(
        <a
          key={`url-${match.index}`}
          href={url}
          target='_blank'
          rel='noreferrer'
          className='text-orange-600 dark:text-orange-400 underline underline-offset-2 break-all'
        >
          {url}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`txt-${lastIndex}`} className='whitespace-pre-wrap'>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

function normalizeDocsLinks(text: string): string {
  // Convert "(Label)[/path]" into proper Markdown links to docs.firecrawl.dev
  return text.replace(/\(([^)]+)\)\[([^\]]+)\]/g, (_, label, path) => {
    const cleanPath = String(path).trim();
    const href =
      cleanPath.startsWith('http') || cleanPath.startsWith('https')
        ? cleanPath
        : `https://docs.firecrawl.dev${
            cleanPath.startsWith('/') ? '' : '/'
          }${cleanPath}`;
    return `[${String(label).trim()}](${href})`;
  });
}
