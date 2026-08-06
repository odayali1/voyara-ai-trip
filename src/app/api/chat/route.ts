import { generateText, streamText } from "ai";
import { NextResponse } from "next/server";
import {
  deepseek,
  deepseekModel,
  buildPlannerSystemPrompt,
  buildItineraryJsonPrompt,
} from "@/lib/ai";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { geocodePlace } from "@/lib/geo";
import type { ItineraryPlan } from "@/lib/itinerary-schema";
import { looksLikePlanRequest, parseItineraryFromText } from "@/lib/parse-itinerary";
import { trackEvent } from "@/lib/intent";

export const maxDuration = 90;

async function enrichPlan(plan: ItineraryPlan): Promise<ItineraryPlan> {
  const destGeo = await geocodePlace(plan.destination);
  const days = await Promise.all(
    plan.days.map(async (day) => ({
      ...day,
      stops: await Promise.all(
        day.stops.map(async (stop) => {
          if (
            stop.lat != null &&
            stop.lng != null &&
            Number.isFinite(stop.lat) &&
            Number.isFinite(stop.lng)
          ) {
            return stop;
          }
          const q = stop.address
            ? `${stop.title}, ${stop.address}, ${plan.destination}`
            : `${stop.title}, ${plan.destination}`;
          const geo = (await geocodePlace(q)) || destGeo;
          if (!geo) return stop;
          return {
            ...stop,
            lat: geo.lat,
            lng: geo.lng,
            address: stop.address || geo.displayName,
          };
        })
      ),
    }))
  );
  return { ...plan, days };
}

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const session = await getSession();
  const body = await req.json();
  const tripId = body.tripId ? String(body.tripId) : "";
  const messages = (body.messages || []) as Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  if (messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const isGuest = !session;
  let tripDestination = "TBD";

  if (!isGuest && tripId) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, ownerId: session.user.id },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    tripDestination = trip.destination;
  }

  const user =
    !isGuest && session
      ? await db.user.findUnique({
          where: { id: session.user.id },
          include: { travelerProfile: true },
        })
      : null;

  const listings = await db.providerListing.findMany({
    where: { status: "ACTIVE", provider: { status: "APPROVED" } },
    take: 12,
    include: { provider: true },
  });

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  await trackEvent(
    "chat_sent",
    {
      tripId: tripId || null,
      guest: isGuest,
      destination: tripDestination,
      preview: lastUser?.content?.slice(0, 120),
    },
    session?.user?.id
  );

  if (!isGuest && tripId && lastUser?.content) {
    await db.chatMessage.create({
      data: {
        tripId,
        role: "user",
        content: lastUser.content,
      },
    });
  }

  const system = buildPlannerSystemPrompt({
    travelerType: user?.travelerProfile?.travelerType,
    budgetBand: user?.travelerProfile?.budgetBand,
    interests: user?.travelerProfile?.interests,
    constraints: user?.travelerProfile?.constraints,
    providerListings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      category: l.category,
      city: l.city,
      description: l.description,
      priceFrom: l.priceFrom,
    })),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = streamText({
          model: deepseek.chat(deepseekModel),
          system,
          messages,
        });

        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          send({ type: "text", text: chunk });
        }

        if (!isGuest && tripId) {
          await db.chatMessage.create({
            data: { tripId, role: "assistant", content: fullText },
          });
        }

        const shouldPlan =
          looksLikePlanRequest(lastUser?.content || "") || fullText.length > 350;

        if (shouldPlan) {
          try {
            // DeepSeek currently rejects response_format/json_schema — use plain text JSON.
            const { text: jsonText } = await generateText({
              model: deepseek.chat(deepseekModel),
              prompt: buildItineraryJsonPrompt({
                userRequest: lastUser?.content || "",
                assistantReply: fullText,
                travelerType: user?.travelerProfile?.travelerType,
                budgetBand: user?.travelerProfile?.budgetBand,
                interests: user?.travelerProfile?.interests,
                listingsLine: listings
                  .map((l) => `${l.title} in ${l.city}`)
                  .join("; "),
              }),
            });

            const object = parseItineraryFromText(jsonText);
            const enriched = await enrichPlan(object);
            send({ type: "plan", plan: enriched });

            if (!isGuest && tripId) {
              await db.trip.update({
                where: { id: tripId },
                data: {
                  title: enriched.title,
                  destination: enriched.destination,
                  summary: enriched.summary,
                  status: "ACTIVE",
                },
              });

              await db.itineraryDay.deleteMany({ where: { tripId } });
              for (const day of enriched.days) {
                await db.itineraryDay.create({
                  data: {
                    tripId,
                    dayNumber: day.dayNumber,
                    title: day.title,
                    notes: day.notes,
                    stops: {
                      create: day.stops.map((stop, order) => ({
                        order,
                        title: stop.title,
                        time: stop.time,
                        category: stop.category,
                        address: stop.address,
                        lat: stop.lat,
                        lng: stop.lng,
                        tips: stop.tips,
                        estimatedCost: stop.estimatedCost,
                        currency: stop.currency || "USD",
                      })),
                    },
                  },
                });
              }
            }

            await trackEvent(
              "trip_generated",
              {
                tripId: tripId || null,
                guest: isGuest,
                destination: enriched.destination,
                days: enriched.days.length,
              },
              session?.user?.id
            );
          } catch (err) {
            console.error("itinerary parse failed", err);
            send({
              type: "text",
              text: "\n\n(تم إنشاء النص، لكن خريطة الأيام تحتاج إعادة محاولة — structured map pins need another try.)",
            });
          }
        }

        send({ type: "done" });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error(err);
        send({
          type: "text",
          text: "Something went wrong talking to the AI. Please try again. / حدث خطأ، حاول مرة أخرى.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
