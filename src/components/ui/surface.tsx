import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Surface({
  className,
  padded = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={cn("surface-card", padded && "p-5 md:p-6", className)}
      {...props}
    />
  );
}

export function Eyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
      <span className="live-dot" />
      {label}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {label}
        </p>
        {icon ? (
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_12%,white)] text-[var(--accent)]">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-none text-[var(--ink)] md:text-[2rem]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: Array<{ id: T; label: string; count?: number }>;
}) {
  return (
    <div className="segmented">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn("segmented-btn", value === item.id && "is-active")}
        >
          {item.label}
          {item.count != null && (
            <span className="ms-1.5 rounded-full bg-black/10 px-1.5 py-px text-[10px]">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
