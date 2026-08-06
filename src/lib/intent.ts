import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type BehaviorEventType =
  | "preference_set"
  | "destination_searched"
  | "chat_sent"
  | "trip_generated"
  | "stop_clicked"
  | "map_poi_opened"
  | "listing_viewed"
  | "listing_saved"
  | "itinerary_edited"
  | "mock_price_viewed"
  | "page_landed";

export async function trackEvent(
  eventType: BehaviorEventType,
  payload: Record<string, unknown> = {},
  userId?: string | null
) {
  await db.behaviorEvent.create({
    data: {
      eventType,
      userId: userId || undefined,
      payload: payload as Prisma.InputJsonValue,
    },
  });

  if (userId) {
    await refreshIntentSnapshot(userId, eventType, payload);
  }
}

async function refreshIntentSnapshot(
  userId: string,
  eventType: BehaviorEventType,
  payload: Record<string, unknown>
) {
  const profile = await db.travelerProfile.findUnique({ where: { userId } });
  const existing = await db.intentSnapshot.findUnique({ where: { userId } });

  const affinities = {
    ...((existing?.destinationAffinities as Record<string, number>) || {}),
  };
  const interestScores = {
    ...((existing?.interestScores as Record<string, number>) || {}),
  };

  if (typeof payload.destination === "string") {
    const key = payload.destination.toLowerCase();
    affinities[key] = (affinities[key] || 0) + 1;
  }

  if (Array.isArray(payload.interests)) {
    for (const interest of payload.interests as string[]) {
      interestScores[interest] = (interestScores[interest] || 0) + 2;
    }
  }

  if (eventType === "listing_viewed" || eventType === "listing_saved") {
    const category = String(payload.category || "").toLowerCase();
    if (category) interestScores[category] = (interestScores[category] || 0) + 1;
  }

  const travelerType = profile?.travelerType;
  const budget = profile?.budgetBand;
  const interests = profile?.interests || [];

  await db.intentSnapshot.upsert({
    where: { userId },
    create: {
      userId,
      isFamily: travelerType === "FAMILY",
      isCouple: travelerType === "COUPLE",
      isSolo: travelerType === "SOLO",
      isFriends: travelerType === "FRIENDS",
      isLuxury: budget === "LUXURY",
      isFoodie: interests.some((i) => /food|cuisine|dining/i.test(i)),
      isAdventure: interests.some((i) => /adventure|hike|outdoor/i.test(i)),
      isCulture: interests.some((i) => /culture|museum|history|art/i.test(i)),
      destinationAffinities: affinities,
      interestScores,
    },
    update: {
      isFamily: travelerType === "FAMILY",
      isCouple: travelerType === "COUPLE",
      isSolo: travelerType === "SOLO",
      isFriends: travelerType === "FRIENDS",
      isLuxury: budget === "LUXURY",
      isFoodie: interests.some((i) => /food|cuisine|dining/i.test(i)),
      isAdventure: interests.some((i) => /adventure|hike|outdoor/i.test(i)),
      isCulture: interests.some((i) => /culture|museum|history|art/i.test(i)),
      destinationAffinities: affinities,
      interestScores,
    },
  });
}
