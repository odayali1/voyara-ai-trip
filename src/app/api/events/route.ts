import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { trackEvent, type BehaviorEventType } from "@/lib/intent";

export async function POST(req: Request) {
  const body = await req.json();
  const eventType = body.eventType as BehaviorEventType;
  if (!eventType) {
    return NextResponse.json({ error: "eventType required" }, { status: 400 });
  }
  const session = await getSession();
  await trackEvent(eventType, body.payload || {}, session?.user?.id);
  return NextResponse.json({ ok: true });
}
