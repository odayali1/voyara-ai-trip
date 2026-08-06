import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !roles.includes(user.role)) {
    redirect("/planner");
  }
  return { session, user };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    include: {
      travelerProfile: true,
      providerProfile: true,
    },
  });
}

export async function assertApiRole(roles: Role[]) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const, status: 401 as const };
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !roles.includes(user.role)) {
    return { error: "Forbidden" as const, status: 403 as const };
  }
  return { session, user };
}
