import "dotenv/config";
import { PrismaClient, type ListingCategory } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const db = new PrismaClient();

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: "TRAVELER" | "PROVIDER" | "ADMIN";
}) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { role: input.role, name: input.name },
    });
    return existing;
  }

  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      emailVerified: true,
      role: input.role,
    },
  });

  const password = await hashPassword(input.password);
  await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password,
    },
  });

  return user;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@voyara.app";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AdminVoyara123!";
  const providerEmail = process.env.SEED_PROVIDER_EMAIL || "provider@voyara.app";
  const providerPassword = process.env.SEED_PROVIDER_PASSWORD || "ProviderVoyara123!";
  const travelerEmail = process.env.SEED_TRAVELER_EMAIL || "traveler@voyara.app";
  const travelerPassword = process.env.SEED_TRAVELER_PASSWORD || "TravelerVoyara123!";

  const admin = await upsertUser({
    email: adminEmail,
    name: "Voyara Admin",
    password: adminPassword,
    role: "ADMIN",
  });

  const traveler = await upsertUser({
    email: travelerEmail,
    name: "Demo Traveler",
    password: travelerPassword,
    role: "TRAVELER",
  });

  await db.travelerProfile.upsert({
    where: { userId: traveler.id },
    create: {
      userId: traveler.id,
      travelerType: "COUPLE",
      budgetBand: "MID",
      interests: ["food", "culture"],
      homeCity: "New York",
      onboarded: true,
    },
    update: {
      travelerType: "COUPLE",
      budgetBand: "MID",
      interests: ["food", "culture"],
      onboarded: true,
    },
  });

  await db.intentSnapshot.upsert({
    where: { userId: traveler.id },
    create: {
      userId: traveler.id,
      isCouple: true,
      isFoodie: true,
      isCulture: true,
      destinationAffinities: { tokyo: 3, lisbon: 1 },
      interestScores: { food: 5, culture: 4 },
    },
    update: {
      isCouple: true,
      isFoodie: true,
      isCulture: true,
    },
  });

  const providerUser = await upsertUser({
    email: providerEmail,
    name: "Demo Provider",
    password: providerPassword,
    role: "PROVIDER",
  });

  const provider = await db.providerProfile.upsert({
    where: { userId: providerUser.id },
    create: {
      userId: providerUser.id,
      businessName: "Lantern Collective",
      categories: ["HOTEL", "TOUR", "RESTAURANT", "EXPERIENCE"],
      description: "Curated stays and local experiences across Asia and Europe.",
      city: "Tokyo",
      country: "Japan",
      status: "APPROVED",
    },
    update: {
      businessName: "Lantern Collective",
      status: "APPROVED",
      categories: ["HOTEL", "TOUR", "RESTAURANT", "EXPERIENCE"],
    },
  });

  const listings: Array<{
    title: string;
    category: ListingCategory;
    description: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    priceFrom: number;
    tags: string[];
  }> = [
    {
      title: "Asakusa Lantern Hotel",
      category: "HOTEL",
      description: "Boutique riverfront stay near Senso-ji with quiet rooms for couples.",
      city: "Tokyo",
      country: "Japan",
      lat: 35.7148,
      lng: 139.7967,
      priceFrom: 168,
      tags: ["boutique", "couples", "central"],
    },
    {
      title: "Dawn Market Food Walk",
      category: "TOUR",
      description: "Sunrise tasting walk through Tsukiji outer market with a local chef guide.",
      city: "Tokyo",
      country: "Japan",
      lat: 35.6654,
      lng: 139.7707,
      priceFrom: 89,
      tags: ["food", "walking", "local"],
    },
    {
      title: "Alfama Night Fado Table",
      category: "RESTAURANT",
      description: "Intimate dinner with live fado in a historic Lisbon house.",
      city: "Lisbon",
      country: "Portugal",
      lat: 38.7129,
      lng: -9.1329,
      priceFrom: 72,
      tags: ["culture", "dinner", "music"],
    },
    {
      title: "Tejo Sunset Sail",
      category: "EXPERIENCE",
      description: "Private sail on the Tagus at golden hour with sparkling wine.",
      city: "Lisbon",
      country: "Portugal",
      lat: 38.6939,
      lng: -9.1469,
      priceFrom: 140,
      tags: ["couples", "sunset", "water"],
    },
    {
      title: "Amman Citadel Sunrise Walk",
      category: "TOUR",
      description: "Guided early walk through the Citadel and downtown Amman with local breakfast.",
      city: "Amman",
      country: "Jordan",
      lat: 31.954,
      lng: 35.934,
      priceFrom: 45,
      tags: ["culture", "walking", "local"],
    },
    {
      title: "Wadi Rum Night Under the Stars",
      category: "EXPERIENCE",
      description: "Desert camp experience with jeep trails, Bedouin dinner, and stargazing.",
      city: "Wadi Rum",
      country: "Jordan",
      lat: 29.573,
      lng: 35.42,
      priceFrom: 120,
      tags: ["nature", "desert", "adventure"],
    },
    {
      title: "Petra Canyon Day Guide",
      category: "TOUR",
      description: "Licensed guide through the Siq to the Treasury with timing tips to beat crowds.",
      city: "Petra",
      country: "Jordan",
      lat: 30.3285,
      lng: 35.4444,
      priceFrom: 95,
      tags: ["unesco", "history", "guide"],
    },
    {
      title: "Dead Sea Float & Spa Escape",
      category: "EXPERIENCE",
      description: "Day retreat with float session, mud ritual, and lakeside lunch.",
      city: "Dead Sea",
      country: "Jordan",
      lat: 31.5,
      lng: 35.5,
      priceFrom: 85,
      tags: ["wellness", "nature", "relax"],
    },
  ];

  for (const listing of listings) {
    const existing = await db.providerListing.findFirst({
      where: { providerId: provider.id, title: listing.title },
    });
    if (existing) continue;
    await db.providerListing.create({
      data: {
        providerId: provider.id,
        ...listing,
        currency: "USD",
        status: "ACTIVE",
      },
    });
  }

  // Fresh demo events each seed run (safe for analytics polish)
  const demoEvents = [
    { userId: traveler.id, eventType: "page_landed", payload: { page: "home" } },
    {
      userId: traveler.id,
      eventType: "preference_set",
      payload: { travelerType: "COUPLE", interests: ["food", "culture", "nature"] },
    },
    {
      userId: traveler.id,
      eventType: "destination_searched",
      payload: { destination: "Jordan" },
    },
    {
      userId: traveler.id,
      eventType: "chat_sent",
      payload: { destination: "Jordan" },
    },
    {
      userId: traveler.id,
      eventType: "trip_generated",
      payload: { destination: "Jordan", days: 5 },
    },
    {
      userId: traveler.id,
      eventType: "map_poi_opened",
      payload: { title: "Petra Canyon Day Guide", city: "Petra" },
    },
    {
      userId: traveler.id,
      eventType: "listing_viewed",
      payload: { category: "EXPERIENCE", city: "Wadi Rum", title: "Wadi Rum Night Under the Stars" },
    },
    {
      userId: traveler.id,
      eventType: "listing_viewed",
      payload: { category: "TOUR", city: "Amman", title: "Amman Citadel Sunrise Walk" },
    },
    {
      userId: traveler.id,
      eventType: "listing_saved",
      payload: { category: "EXPERIENCE", city: "Dead Sea" },
    },
    {
      userId: traveler.id,
      eventType: "stop_clicked",
      payload: { title: "Dead Sea Float & Spa Escape", destination: "Jordan" },
    },
    {
      userId: traveler.id,
      eventType: "chat_sent",
      payload: { destination: "Tokyo" },
    },
    {
      userId: traveler.id,
      eventType: "trip_generated",
      payload: { destination: "Tokyo", days: 4 },
    },
  ];
  await db.behaviorEvent.createMany({ data: demoEvents });

  console.log("Seed complete");
  console.log({ admin: admin.email, traveler: traveler.email, provider: providerUser.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
