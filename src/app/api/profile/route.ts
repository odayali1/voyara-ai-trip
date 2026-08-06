import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { trackEvent } from "@/lib/intent";
import type { BudgetBand, TravelerType } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { travelerProfile: true, providerProfile: true },
  });
  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const profile = await db.travelerProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      travelerType: body.travelerType as TravelerType,
      budgetBand: body.budgetBand as BudgetBand,
      interests: body.interests || [],
      homeCity: body.homeCity,
      constraints: body.constraints,
      onboarded: true,
    },
    update: {
      travelerType: body.travelerType as TravelerType,
      budgetBand: body.budgetBand as BudgetBand,
      interests: body.interests || [],
      homeCity: body.homeCity,
      constraints: body.constraints,
      onboarded: true,
    },
  });

  await trackEvent(
    "preference_set",
    {
      travelerType: body.travelerType,
      budgetBand: body.budgetBand,
      interests: body.interests || [],
    },
    session.user.id
  );

  return NextResponse.json(profile);
}
