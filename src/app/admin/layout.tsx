import { requireRole } from "@/lib/auth-server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["ADMIN"]);
  return children;
}
