import { db } from "@/lib/db";
import { normalizeWhatsAppNumber } from "@/lib/evolution";

export function looksLikeWhatsAppReset(text: string) {
  const t = (text || "").trim();
  return /^(reset|reset!|\/reset|جديد|اعادة|إعادة|ابدأ من جديد|ابدا من جديد)$/i.test(t);
}

async function phonesFor(raw: string) {
  const digits = normalizeWhatsAppNumber(raw) || raw.replace(/\D/g, "");
  const guests = await db.whatsAppGuest.findMany({
    where: {
      OR: [{ phone: digits }, { phone: { endsWith: digits.slice(-9) } }],
    },
  });
  return [...new Set([digits, ...guests.map((g) => g.phone)].filter(Boolean))];
}

/** Wipe memory, chat, and open stays so the next WhatsApp feels brand new. */
export async function resetWhatsAppSession(rawPhone: string) {
  const phones = await phonesFor(rawPhone);
  if (phones.length === 0) {
    return { phones: [], trips: 0, stays: 0, guests: 0 };
  }

  const trips = await db.trip.findMany({
    where: { guestPhone: { in: phones } },
    select: { id: true },
  });
  const tripIds = trips.map((t) => t.id);
  if (tripIds.length) {
    await db.chatMessage.deleteMany({ where: { tripId: { in: tripIds } } });
    await db.itineraryDay.deleteMany({ where: { tripId: { in: tripIds } } });
    await db.trip.deleteMany({ where: { id: { in: tripIds } } });
  }

  const stays = await db.conciergeStay.findMany({
    where: { guestPhone: { in: phones } },
    select: { id: true },
  });
  const stayIds = stays.map((s) => s.id);
  if (stayIds.length) {
    await db.conciergeMessage.deleteMany({ where: { stayId: { in: stayIds } } });
    await db.conciergeRequest.deleteMany({ where: { stayId: { in: stayIds } } });
    await db.conciergeStay.deleteMany({ where: { id: { in: stayIds } } });
  }

  const guestDel = await db.whatsAppGuest.deleteMany({
    where: { phone: { in: phones } },
  });

  return {
    phones,
    trips: tripIds.length,
    stays: stayIds.length,
    guests: guestDel.count,
  };
}

export async function resetAllWhatsAppSessions() {
  const guests = await db.whatsAppGuest.findMany({ select: { phone: true } });
  const extra = await db.conciergeStay.findMany({
    where: { guestPhone: { not: null } },
    select: { guestPhone: true },
  });
  const phones = [
    ...new Set(
      [...guests.map((g) => g.phone), ...extra.map((s) => s.guestPhone || "")].filter(Boolean)
    ),
  ];
  let trips = 0;
  let stays = 0;
  let guestCount = 0;
  for (const phone of phones) {
    const r = await resetWhatsAppSession(phone);
    trips += r.trips;
    stays += r.stays;
    guestCount += r.guests;
  }
  return { phones: phones.length, trips, stays, guests: guestCount };
}
