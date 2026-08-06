"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function ChatMarkdown({
  content,
  className,
  tone = "assistant",
}: {
  content: string;
  className?: string;
  tone?: "assistant" | "user";
}) {
  const user = tone === "user";

  return (
    <div
      className={cn(
        "chat-md text-sm leading-relaxed",
        user ? "text-white" : "text-[var(--ink)]",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-1 font-[family-name:var(--font-display)] text-xl font-semibold first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 font-[family-name:var(--font-display)] text-lg font-semibold first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className={cn("font-semibold", user ? "text-white" : "text-[var(--ink-deep)]")}>
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic opacity-95">{children}</em>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 ps-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 ps-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => (
            <hr
              className={cn(
                "my-3 border-0 border-t",
                user ? "border-white/25" : "border-[var(--line)]"
              )}
            />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "underline underline-offset-2",
                user ? "text-white" : "text-[var(--accent)]"
              )}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "my-2 border-s-2 ps-3 text-[13px]",
                user ? "border-white/40 text-white/90" : "border-[var(--accent)] text-[var(--muted)]"
              )}
            >
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code
              className={cn(
                "rounded px-1 py-0.5 text-[12px]",
                user ? "bg-white/15" : "bg-black/5"
              )}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
