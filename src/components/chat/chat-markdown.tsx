"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { textDirection } from "@/lib/has-arabic";

export function ChatMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const dir = textDirection(content);

  return (
    <div dir={dir} className={cn("voyara-md text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)] first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 border-t border-[var(--line)] pt-4 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)] first:mt-0 first:border-0 first:pt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-[15px] font-semibold text-[var(--ink)]">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--ink)]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-[var(--ink)]/90">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 ps-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 ps-5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-4 border-[var(--line)]" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--accent)] underline underline-offset-2"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-s-4 border-[var(--accent)] bg-[rgba(15,156,140,0.06)] px-3 py-2 text-[var(--ink)]">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-black/5 px-1 py-0.5 text-[12px]">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
