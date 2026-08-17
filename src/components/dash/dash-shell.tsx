"use client";

import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { Eyebrow } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function DashShell({
  role,
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  role?: string | null;
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("dash-canvas min-h-screen", className)}>
      <SiteHeader role={role} sticky />
      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-24 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] md:text-5xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </main>
  );
}
