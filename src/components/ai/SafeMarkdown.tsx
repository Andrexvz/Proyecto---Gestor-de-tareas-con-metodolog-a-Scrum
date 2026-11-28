import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * XSS-safe Markdown renderer built purely with React elements (no dangerouslySetInnerHTML).
 * Supports headings, lists, code blocks with copy button, tables, bold, and inline code.
 */
export function SafeMarkdown({ content }: { content: string }) {
  const lines = (content || '').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(<CodeBlock key={`cb-${i}`} lang={lang} code={codeLines.join('\n')} />);
      continue;
    }

    // Markdown table
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      blocks.push(<MarkdownTable key={`tbl-${i}`} lines={tableLines} />);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h4-${i}`} className="text-[13px] font-semibold text-bone mt-2.5 mb-1">
          {renderInline(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      const text = line.replace(/^#{1,2}\s+/, '');
      blocks.push(
        <h3 key={`h3-${i}`} className="text-[14px] font-semibold text-signal-teal mt-3 mb-1">
          {renderInline(text)}
        </h3>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 my-1.5 text-[13px] text-mist">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1 my-1.5 text-[13px] text-mist">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className="text-[13px] leading-relaxed text-mist my-1">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1 break-words">{blocks}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-obsidian border border-graphite font-mono text-[11px] text-signal-teal">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-paper">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-2 rounded-lg border border-graphite bg-void overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-carbon border-b border-graphite text-[11px] text-fog">
        <span className="font-mono">{lang || 'código'}</span>
        <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1 hover:text-paper transition-colors">
          {copied ? <Check className="w-3 h-3 text-pulse-green" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <pre className="p-3 text-[11px] font-mono text-mist overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const parseRow = (r: string) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);
  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-graphite">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-carbon text-bone border-b border-graphite">
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="px-3 py-2 font-semibold whitespace-nowrap">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-graphite/60 bg-obsidian/40">
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-1.5 text-mist">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
