import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  createInstance,
  evolutionConfigured,
  formatWhatsAppStageMessage,
  getConnectQr,
  getConnectionState,
  sendText,
  setInstanceWebhook,
} from "@/lib/evolution";
import { db } from "@/lib/db";
import { stageMessage, type JourneyStageId } from "@/lib/sila-journey";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!evolutionConfigured()) {
    return NextResponse.json({
      configured: false,
      state: "unconfigured",
      hint: "Set EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE in Coolify.",
    });
  }

  const conn = await getConnectionState();
  return NextResponse.json({
    configured: true,
    instance: conn.instance,
    state: conn.state,
    ok: conn.ok,
    error: conn.error || null,
    demoGuestPhone: process.env.SILA_DEMO_WHATSAPP || "962796917829",
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!evolutionConfigured()) {
    return NextResponse.json({ error: "Evolution not configured" }, { status: 400 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "create_instance") {
    const created = await createInstance();
    return NextResponse.json(created);
  }

  if (action === "qr") {
    const qr = await getConnectQr();
    const base64 =
      (qr.data as { base64?: string; qrcode?: { base64?: string } } | null)?.base64 ||
      (qr.data as { qrcode?: { base64?: string } } | null)?.qrcode?.base64 ||
      null;
    return NextResponse.json({ ...qr, base64 });
  }

  if (action === "setup_webhook") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (!appUrl || appUrl.includes("localhost")) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL must be your public Coolify URL for webhooks" },
        { status: 400 }
      );
    }
    const url = `${appUrl.replace(/\/$/, "")}/api/webhooks/evolution`;
    const res = await setInstanceWebhook(url);
    return NextResponse.json({ ...res, webhookUrl: url });
  }

  if (action === "send_stage") {
    const stayId = String(body.stayId || "");
    const profile = await db.providerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: "Hotel profile required" }, { status: 400 });
    }
    const stay = await db.conciergeStay.findFirst({
      where: { id: stayId, providerId: profile.id },
    });
    if (!stay) {
      return NextResponse.json({ error: "Stay not found" }, { status: 404 });
    }
    const phone =
      stay.guestPhone ||
      process.env.SILA_DEMO_WHATSAPP ||
      body.phone ||
      null;
    if (!phone) {
      return NextResponse.json({ error: "Guest phone missing" }, { status: 400 });
    }

    const ar = stay.language !== "en";
    const stage = (stay.stage === "DONE" ? "POST_STAY" : stay.stage) as JourneyStageId;
    const msg = stageMessage(stage, stay.guestName, ar);
    const text = formatWhatsAppStageMessage(msg.body, msg.choices);
    const sent = await sendText(phone, text);
    if (sent.ok) {
      await db.conciergeMessage.create({
        data: {
          stayId: stay.id,
          role: "hotel",
          stage: stay.stage,
          body: `${text}\n\n(via WhatsApp)`,
          choices: msg.choices,
        },
      });
    }
    return NextResponse.json({ sent, phone });
  }

  if (action === "test_ping") {
    const phone = String(body.phone || process.env.SILA_DEMO_WHATSAPP || "962796917829");
    const sent = await sendText(
      phone,
      "SILA ✅ WhatsApp connected.\nThe smarter way to stay — Voyara demo ready."
    );
    return NextResponse.json({ sent, phone });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
