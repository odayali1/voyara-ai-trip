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
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        variant === "default" && "bg-white/10 text-[var(--sand)]",
        variant === "demo" && "bg-amber-400/20 text-amber-200 border border-amber-300/30",
        variant === "outline" && "border border-[var(--line)] text-[var(--muted)]",
        variant === "success" && "bg-emerald-500/20 text-emerald-200",
        variant === "warn" && "bg-orange-500/20 text-orange-200",
        className
      )}
      {...props}
    />
  );
}
