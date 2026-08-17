"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { VoyaraMark } from "@/components/brand/logo";

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
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80"
          alt="Voyara stay"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-veil absolute inset-0" />
        <div className="relative z-10 flex h-full flex-col justify-end p-10 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            Voyara · SILA
          </p>
          <h1 className="mt-3 max-w-md font-[family-name:var(--font-display)] text-5xl leading-tight">
            Plan. Stay. Know the guest.
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/80">
            One product for travelers, hotels, and owners. Fill a demo role and walk A to Z.
          </p>
        </div>
      </div>
      <div className="dash-canvas flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--line)] bg-white/85 p-8 shadow-[0_24px_70px_rgba(12,28,46,0.08)]">
          <VoyaraMark />
          <p className="mt-3 text-sm text-[var(--muted)]">
            Stakeholder demo: fill a role, then follow{" "}
            <Link href="/how-it-works" className="font-semibold text-[var(--accent)]">
              How it works A to Z
            </Link>
            . Traveler confirms a hotel, hotel SILA sees the guest, WhatsApp replies.
          </p>
          <div className="mt-6">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
          <p className="mt-6 text-sm text-[var(--muted)]">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-[var(--accent)]">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
