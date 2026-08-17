"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DEMOS = [
  {
    role: "Admin",
    email: "admin@voyara.app",
    password: "AdminVoyara123!",
    next: "/admin",
    blurb: "Platform command center",
  },
  {
    role: "Provider",
    email: "provider@voyara.app",
    password: "ProviderVoyara123!",
    next: "/provider",
    blurb: "Hotel · SILA · rooms",
  },
  {
    role: "Traveler",
    email: "traveler@voyara.app",
    password: "TravelerVoyara123!",
    next: "/planner",
    blurb: "AI trip planner",
  },
] as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState(params.get("next") || "/planner");

  function fillDemo(demo: (typeof DEMOS)[number]) {
    setEmail(demo.email);
    setPassword(demo.password);
    setNextPath(demo.next);
    toast.success(`${demo.role} credentials filled — tap Log in`);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Login failed");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Demo fill
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {DEMOS.map((demo) => (
            <button
              key={demo.role}
              type="button"
              onClick={() => fillDemo(demo)}
              className="rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2.5 text-start transition hover:border-[var(--accent)] hover:bg-[color-mix(in_oklab,var(--accent)_8%,white)]"
            >
              <div className="text-sm font-semibold text-[var(--ink)]">{demo.role}</div>
              <div className="text-[11px] text-[var(--muted)]">{demo.blurb}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8">
        <Link href="/" className="font-[family-name:var(--font-display)] text-3xl text-[var(--sand)]">
          Voyara
        </Link>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Welcome back — use a demo fill for stakeholder walkthroughs.
        </p>
        <div className="mt-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          New here?{" "}
          <Link href="/signup" className="text-[var(--accent)]">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
