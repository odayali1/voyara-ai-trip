"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { VoyaraMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function SiteHeader({
  role,
  light = false,
  sticky = false,
}: {
  role?: string | null;
  light?: boolean;
  sticky?: boolean;
}) {
  const { data: session } = useSession();
  const overlay = light && !sticky;
  const mutedHover = overlay ? "hover:bg-white/10 text-white" : undefined;

  return (
    <header
      className={cn(
        "z-40 flex items-center justify-between px-5 py-3.5 md:px-8",
        overlay ? "absolute inset-x-0 top-0 site-nav is-overlay" : "site-nav",
        sticky && "sticky top-0"
      )}
    >
      <VoyaraMark light={overlay} />
      <nav className="flex items-center gap-1 md:gap-2">
        <Button asChild variant="ghost" size="sm" className={mutedHover}>
          <Link href="/how-it-works">How it works</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className={cn("hidden sm:inline-flex", mutedHover)}>
          <Link href="/planner">Planner</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className={cn("hidden sm:inline-flex", mutedHover)}>
          <Link href="/listings">Hotels</Link>
        </Button>
        {session ? (
          <>
            <Button asChild variant="ghost" size="sm" className={cn("hidden md:inline-flex", mutedHover)}>
              <Link href="/trips">Trips</Link>
            </Button>
            {(role === "PROVIDER" || role === "ADMIN") && (
              <Button asChild variant="ghost" size="sm" className={mutedHover}>
                <Link href="/provider">Hotel</Link>
              </Button>
            )}
            {role === "ADMIN" && (
              <Button asChild variant="ghost" size="sm" className={mutedHover}>
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            <Button
              variant={overlay ? "hero" : "secondary"}
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
            <Button asChild size="sm" variant={overlay ? "hero" : "default"} className="hidden sm:inline-flex">
              <Link href="/signup">Get started</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
