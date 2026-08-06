"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/planner";
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Login failed");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@email.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <Button className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8">
        <Link href="/" className="font-[family-name:var(--font-display)] text-3xl text-[var(--sand)]">
          Voyara
        </Link>
        <p className="mt-2 text-sm text-[var(--muted)]">Welcome back. Let’s keep planning.</p>
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
