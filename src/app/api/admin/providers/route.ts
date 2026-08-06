import { NextResponse } from "next/server";
import { assertApiRole } from "@/lib/auth-server";
import { db } from "@/lib/db";

export async function GET() {
  const gate = await assertApiRole(["ADMIN"]);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const providers = await db.providerProfile.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
      listings: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(providers);
}

export async function PATCH(req: Request) {
  const gate = await assertApiRole(["ADMIN"]);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const body = await req.json();
  const id = String(body.id || "");
  const status = body.status as "APPROVED" | "REJECTED" | "PENDING";
  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const updated = await db.providerProfile.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json(updated);
}
