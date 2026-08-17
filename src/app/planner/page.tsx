import { SiteHeader } from "@/components/site-header";
import { PlannerStudio } from "@/components/planner/planner-studio";
import { getCurrentUser, getSession } from "@/lib/auth-server";

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
      <SiteHeader role={user?.role} sticky />
      <div className="relative px-3 pb-3 pt-6 md:px-5">
        <PlannerStudio
          isAuthenticated={Boolean(session)}
          destinationHint={destinationHint}
          autoStart={autoStart}
        />
      </div>
    </main>
  );
}
