import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { resetWhatsAppSession } from "@/lib/whatsapp-reset";

export const dynamic = "force-dynamic";

/** Temporary test reset: wipe the demo WhatsApp guest so the next text is a new traveler. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = String(body.phone || process.env.SILA_DEMO_WHATSAPP || "962796917829");
  const wiped = await resetWhatsAppSession(phone);
  return NextResponse.json({ ok: true, ...wiped });
}
