import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PlannerStudio } from "@/components/planner/planner-studio";
import { getCurrentUser, getSession } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  const user = await getCurrentUser();
  const params = await searchParams;
  const destinationHint = params.q?.trim() || undefined;

  return (
    <main className="app-shell min-h-screen">
      <div className="relative px-4 pb-4 pt-20 md:px-6">
        <SiteHeader role={user?.role} />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            Planner studio
            {!session && (
              <span className="ml-2 text-[var(--accent)]">· Guest mode</span>
            )}
          </p>
          {session ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/trips">My trips</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link href="/signup?next=/planner">Save trips — sign up free</Link>
            </Button>
          )}
        </div>
        <PlannerStudio
          isAuthenticated={Boolean(session)}
          destinationHint={destinationHint}
        />
      </div>
    </main>
  );
}
