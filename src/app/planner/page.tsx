import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PlannerStudio } from "@/components/planner/planner-studio";
import { getCurrentUser, getSession } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; auto?: string }>;
}) {
  const session = await getSession();
  const user = await getCurrentUser();
  const params = await searchParams;
  const destinationHint = params.q?.trim() || undefined;
  const autoStart = params.auto === "1";

  return (
    <main className="app-shell min-h-screen">
      <div className="relative px-4 pb-4 pt-20 md:px-6">
        <SiteHeader role={user?.role} />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Planner studio
            </p>
            <p className="text-xs text-[var(--muted)]">
              {!session ? "Guest mode · chat in Arabic or English" : "Your saved trips sync here"}
            </p>
          </div>
          {session ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/trips">My trips</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link href="/signup?next=/planner">Save trips — free</Link>
            </Button>
          )}
        </div>
        <PlannerStudio
          isAuthenticated={Boolean(session)}
          destinationHint={destinationHint}
          autoStart={autoStart}
        />
      </div>
    </main>
  );
}
