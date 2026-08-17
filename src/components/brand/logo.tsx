import Link from "next/link";
import { cn } from "@/lib/utils";

export function VoyaraMark({
  href = "/",
  light = false,
  size = "md",
}: {
  href?: string;
  light?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "lg" ? "h-11 w-11 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";
  const word = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";

  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span
        className={cn(
          "grid place-items-center rounded-2xl bg-[linear-gradient(145deg,#12b8a4,#0f9c8c_55%,#ff8a4c)] font-bold text-white shadow-[0_10px_24px_rgba(15,156,140,0.35)] ring-2 ring-white/70 transition group-hover:scale-[1.03]",
          mark
        )}
      >
        V
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-display)] tracking-tight",
          light ? "text-white" : "text-[var(--ink)]",
          word
        )}
      >
        Voyara
      </span>
    </Link>
  );
}
