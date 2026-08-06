"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SiteHeader({
  role,
  light = false,
}: {
  role?: string | null;
  light?: boolean;
}) {
  const { data: session } = useSession();
  const text = light ? "text-white" : "text-[var(--ink)]";
  const mutedHover = light ? "hover:bg-white/10 text-white" : undefined;

  return (
    <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-10">
      <Link
        href="/"
        className={`font-[family-name:var(--font-display)] text-2xl tracking-tight ${text}`}
      >
        Voyara
      </Link>
      <nav className="flex items-center gap-2 md:gap-3">
        <Button asChild variant={light ? "ghost" : "ghost"} size="sm" className={mutedHover}>
          <Link href="/planner">Planner</Link>
        </Button>
        {session ? (
          <>
            <Button asChild variant="ghost" size="sm" className={mutedHover}>
              <Link href="/trips">Trips</Link>
            </Button>
            {(role === "PROVIDER" || role === "ADMIN") && (
              <Button asChild variant="ghost" size="sm" className={mutedHover}>
                <Link href="/provider">Provider</Link>
              </Button>
            )}
            {role === "ADMIN" && (
              <Button asChild variant="ghost" size="sm" className={mutedHover}>
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            <Button
              variant={light ? "hero" : "secondary"}
              size="sm"
              onClick={() => signOut()}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className={mutedHover}>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" variant={light ? "hero" : "default"}>
              <Link href="/signup">Get started</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
