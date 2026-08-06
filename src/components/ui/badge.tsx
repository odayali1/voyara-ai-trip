import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "demo" | "outline" | "success" | "warn";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        variant === "default" && "bg-[rgba(15,156,140,0.12)] text-[var(--accent)]",
        variant === "demo" &&
          "bg-[rgba(255,138,76,0.16)] text-[#c45a1a] border border-[rgba(255,138,76,0.35)]",
        variant === "outline" && "border border-[var(--line)] text-[var(--muted)]",
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "warn" && "bg-amber-100 text-amber-800",
        className
      )}
      {...props}
    />
  );
}
