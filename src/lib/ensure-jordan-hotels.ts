import { db } from "@/lib/db";

const JORDAN_STAYS = [
  {
    title: "Ma'in Hot Springs Resort",
    description: "Thermal-spring resort above Wadi Zarqa Ma'in - the stay for Hammamat Ma'in.",
    city: "Ma'in",
    country: "Jordan",
    lat: 31.6088,
    lng: 35.6103,
    priceFrom: 145,
    tags: ["wellness", "nature", "springs"],
  },
  {
    title: "Dead Sea Shore Retreat",
    description: "Lakeside rooms on the Dead Sea, 40 minutes from Ma'in hot springs.",
    city: "Dead Sea",
    country: "Jordan",
    lat: 31.717,
    lng: 35.585,
    priceFrom: 175,
    tags: ["wellness", "sea", "couples"],
  },
  {
    title: "Amman Citadel House",
    description: "Boutique rooms in Jabal Amman for nights before a Ma'in or Dead Sea day.",
    city: "Amman",
    country: "Jordan",
    lat: 31.9539,
    lng: 35.9106,
    priceFrom: 98,
    tags: ["city", "boutique"],
  },
] as const;

/** Production DBs that were seeded before Jordan hotels existed. */
export async function ensureJordanPartnerHotels() {
  const provider = await db.providerProfile.findFirst({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "asc" },
  });
  if (!provider) return;
  for (const stay of JORDAN_STAYS) {
    const existing = await db.providerListing.findFirst({
      where: { title: stay.title },
    });
    if (existing) continue;
    await db.providerListing.create({
      data: {
        providerId: provider.id,
        category: "HOTEL",
        currency: "USD",
        status: "ACTIVE",
        ...stay,
        tags: [...stay.tags],
      },
    });
  }
}
