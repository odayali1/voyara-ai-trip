/** Evolution API v2 (Baileys) client for SILA WhatsApp delivery. */

export type EvolutionConnectionState = "open" | "connecting" | "close" | string;

function baseUrl() {
  return (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
}

function apiKey() {
  return process.env.EVOLUTION_API_KEY || "";
}

function instanceName() {
  return process.env.EVOLUTION_INSTANCE || "voyara_sila";
}

export function evolutionConfigured() {
  return Boolean(baseUrl() && apiKey());
}

export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits;
}

async function evoFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (!evolutionConfigured()) {
    return { ok: false, status: 0, data: null, error: "Evolution API not configured" };
  }
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        apikey: apiKey(),
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    const text = await res.text();
    let data: T | null = null;
    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      data = text as unknown as T;
    }
    if (!res.ok) {
      const msg =
        typeof data === "object" && data && "response" in (data as object)
          ? JSON.stringify((data as { response?: unknown }).response)
          : text.slice(0, 300);
      return { ok: false, status: res.status, data, error: msg || res.statusText };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: e instanceof Error ? e.message : "Evolution request failed",
    };
  }
}

export async function getConnectionState() {
  const name = instanceName();
  const res = await evoFetch<{ instance?: { instanceName?: string; state?: string } }>(
    `/instance/connectionState/${encodeURIComponent(name)}`
  );
  const state = (res.data as { instance?: { state?: string } } | null)?.instance?.state;
  return {
    ...res,
    instance: name,
    state: (state || (res.ok ? "unknown" : "unavailable")) as EvolutionConnectionState,
  };
}

export async function createInstance() {
  const name = instanceName();
  return evoFetch(`/instance/create`, {
    method: "POST",
    body: JSON.stringify({
      instanceName: name,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
}

export async function getConnectQr() {
  const name = instanceName();
  return evoFetch<{
    pairingCode?: string | null;
    code?: string;
    base64?: string;
    count?: number;
    qrcode?: { base64?: string; code?: string };
  }>(`/instance/connect/${encodeURIComponent(name)}`);
}

export async function sendText(number: string, text: string) {
  const to = normalizeWhatsAppNumber(number);
  if (!to) {
    return { ok: false, status: 400, data: null, error: "Invalid WhatsApp number" };
  }
  const name = instanceName();
  return evoFetch(`/message/sendText/${encodeURIComponent(name)}`, {
    method: "POST",
    body: JSON.stringify({
      number: to,
      text,
      delay: 800,
      linkPreview: false,
    }),
  });
}

/** Format SILA stage body + numbered choices for WhatsApp. */
export function formatWhatsAppStageMessage(body: string, choices: string[]) {
  if (!choices.length) return body;
  const lines = choices.map((c, i) => `${i + 1}) ${c}`);
  return `${body}\n\n${lines.join("\n")}\n\nرد برقم الخيار أو اكتب طلبك.`;
}

export async function setInstanceWebhook(webhookUrl: string) {
  const name = instanceName();
  return evoFetch(`/webhook/set/${encodeURIComponent(name)}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      },
    }),
  });
}

export function extractInboundText(payload: unknown): {
  fromMe: boolean;
  number: string | null;
  text: string | null;
} {
  const root = payload as {
    event?: string;
    data?:
      | {
          key?: { fromMe?: boolean; remoteJid?: string };
          message?: Record<string, unknown>;
        }
      | Array<{
          key?: { fromMe?: boolean; remoteJid?: string };
          message?: Record<string, unknown>;
        }>;
    key?: { fromMe?: boolean; remoteJid?: string };
    message?: Record<string, unknown>;
  };

  const data = Array.isArray(root.data) ? root.data[0] : root.data || root;
  const key = data.key || {};
  const fromMe = Boolean(key.fromMe);
  const jid = String(key.remoteJid || "");
  // Ignore group / status broadcasts
  if (jid.endsWith("@g.us") || jid.includes("status@broadcast")) {
    return { fromMe: true, number: null, text: null };
  }
  const number = normalizeWhatsAppNumber(jid.split("@")[0] || "");

  const message = (data.message || {}) as Record<string, unknown>;
  let text: string | null = null;
  if (typeof message.conversation === "string") text = message.conversation;
  else if (
    message.extendedTextMessage &&
    typeof (message.extendedTextMessage as { text?: string }).text === "string"
  ) {
    text = (message.extendedTextMessage as { text: string }).text;
  } else if (
    message.buttonsResponseMessage &&
    typeof (message.buttonsResponseMessage as { selectedDisplayText?: string })
      .selectedDisplayText === "string"
  ) {
    text = (message.buttonsResponseMessage as { selectedDisplayText: string })
      .selectedDisplayText;
  } else if (
    message.listResponseMessage &&
    typeof (message.listResponseMessage as { title?: string }).title === "string"
  ) {
    text = (message.listResponseMessage as { title: string }).title;
  }

  return { fromMe, number, text: text?.trim() || null };
}
