import { requireRole } from "@/lib/auth-server";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Travelers can still open the page and become providers via the form;
  // require any authenticated session.
  await requireRole(["TRAVELER", "PROVIDER", "ADMIN"]);
  return children;
}
