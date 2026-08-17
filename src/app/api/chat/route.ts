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
import { geocodeInDestination, lookupKnownPlace } from "@/lib/destinations";
import type { ItineraryPlan } from "@/lib/itinerary-schema";
import { looksLikePlanRequest, parseItineraryFromText } from "@/lib/parse-itinerary";
import { trackEvent } from "@/lib/intent";
import { detectReplyLanguage, planHasWrongLanguage } from "@/lib/language";
import { fulfillBooking, looksLikeBooking } from "@/lib/fulfill-booking";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

async function enrichPlan(plan: ItineraryPlan): Promise<ItineraryPlan> {
  const days = await Promise.all(
    plan.days.map(async (day) => ({
      ...day,
      stops: await Promise.all(
        day.stops.map(async (stop) => {
          const geo =
            lookupKnownPlace(stop.title, plan.destination) ||
            (await geocodeInDestination(stop.title, plan.destination));
          if (!geo) {
            return { ...stop, lat: undefined, lng: undefined };
          }
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

function errorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "AI request failed";
  const anyErr = err as {
    statusCode?: number;
    message?: string;
    data?: { error?: { message?: string } };
  };
  if (anyErr.statusCode === 401 || /auth/i.test(anyErr.message || "")) {
    return "DeepSeek API key is missing or invalid on the server. Check DEEPSEEK_API_KEY in Coolify.";
  }
  if (anyErr.statusCode === 429) {
    return "AI rate limit hit - wait a moment and try again.";
  }
  return (
    anyErr.data?.error?.message ||
    anyErr.message ||
    "Something went wrong talking to the AI."
  );
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
  const abortSignal = req.signal;

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

  // Keep pre-stream work light so the SSE starts quickly
  const listings = await db.providerListing.findMany({
    where: { status: "ACTIVE", provider: { status: "APPROVED" } },
    take: 12,
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      description: true,
      priceFrom: true,
    },
  });

  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  // Fire-and-forget analytics so chat TTFT stays low
  void trackEvent(
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
    void db.chatMessage
      .create({
        data: {
          tripId,
          role: "user",
          content: lastUser.content,
        },
      })
      .catch(() => undefined);
  }

  const replyLanguage = detectReplyLanguage(lastUser?.content || "");

  const system = buildPlannerSystemPrompt({
    travelerType: user?.travelerProfile?.travelerType,
    budgetBand: user?.travelerProfile?.budgetBand,
    interests: user?.travelerProfile?.interests,
    constraints: user?.travelerProfile?.constraints,
    providerListings: listings,
    replyLanguage,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const send = (data: unknown) => {
        if (closed || abortSignal.aborted) return false;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };

      const heartbeat = setInterval(() => {
        if (closed || abortSignal.aborted) return;
        try {
          // SSE comment keeps proxies from idle-closing long DeepSeek calls
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          closed = true;
        }
      }, 12000);

      try {
        send({ type: "status", stage: "writing" });

        const result = streamText({
          model: deepseek.chat(deepseekModel),
          system,
          messages,
          abortSignal,
        });

        let fullText = "";
        for await (const chunk of result.textStream) {
          if (abortSignal.aborted) break;
          fullText += chunk;
          if (!send({ type: "text", text: chunk })) break;
        }

        if (!fullText.trim()) {
          send({
            type: "error",
            message:
              "The AI returned an empty reply. Check DEEPSEEK_API_KEY / model on the server, then retry.",
          });
          send({ type: "done" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return;
        }

        if (!isGuest && tripId) {
          void db.chatMessage
            .create({
              data: { tripId, role: "assistant", content: fullText },
            })
            .catch(() => undefined);
        }

        const shouldPlan =
          looksLikePlanRequest(lastUser?.content || "") || fullText.length > 350;

        if (shouldPlan && !abortSignal.aborted) {
          send({ type: "status", stage: "mapping" });
          try {
            const listingsLine = listings
              .map((l) => `${l.title} in ${l.city}`)
              .join("; ");

            async function generatePlanJson(forceEnglish = false) {
              const { text: jsonText } = await generateText({
                model: deepseek.chat(deepseekModel),
                prompt: buildItineraryJsonPrompt({
                  userRequest: lastUser?.content || "",
                  assistantReply: fullText.slice(0, 6000),
                  travelerType: user?.travelerProfile?.travelerType,
                  budgetBand: user?.travelerProfile?.budgetBand,
                  interests: user?.travelerProfile?.interests,
                  listingsLine,
                  replyLanguage,
                  forceEnglish,
                }),
                abortSignal,
              });
              return parseItineraryFromText(jsonText);
            }

            let object = await generatePlanJson(false);
            // DeepSeek sometimes leaks Chinese into structured JSON - reject & regenerate
            if (planHasWrongLanguage(object, replyLanguage)) {
              console.warn("itinerary CJK language leak - regenerating");
              object = await generatePlanJson(replyLanguage !== "ar");
              if (planHasWrongLanguage(object, replyLanguage) && replyLanguage !== "zh") {
                object = await generatePlanJson(true);
              }
            }

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

            void trackEvent(
              "trip_generated",
              {
                tripId: tripId || null,
                guest: isGuest,
                destination: enriched.destination,
                days: enriched.days.length,
              },
              session?.user?.id
            );
            tripDestination = enriched.destination;
          } catch (err) {
            console.error("itinerary parse failed", err);
            send({
              type: "text",
              text: "\n\n(Could not pin the map this time - try sending the destination again.)",
            });
          }
        }

        if (
          looksLikeBooking(lastUser?.content || "") &&
          !abortSignal.aborted
        ) {
          const booked = await fulfillBooking({
            guestName: user?.name || session?.user.name || "Voyara Traveler",
            destination: tripDestination !== "TBD" ? tripDestination : lastUser?.content,
            travelerUserId: session?.user.id || null,
            tripId: tripId || null,
            language: replyLanguage === "en" ? "en" : "ar",
            source: "CHAT",
          });
          if (booked.ok) {
            send({
              type: "booking",
              booking: {
                hotelName: booked.hotelName,
                room: booked.listing.title,
                guestUrl: booked.guestUrl,
                whatsapp: booked.whatsapp,
              },
            });
            send({
              type: "text",
              text:
                "\n\n---\nStay confirmed with partner hotel: " +
                booked.hotelName +
                " / " +
                booked.listing.title +
                "\nHotel SILA Journey + Admin command center now show this booking.",
            });
          }
        }

        send({ type: "done" });
        if (!closed && !abortSignal.aborted) {
          try {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch {
            closed = true;
          }
        }
      } catch (err) {
        console.error("chat stream failed", err);
        const msg = errorMessage(err);
        send({ type: "error", message: msg });
        send({
          type: "text",
          text: `${msg}\n\nPlease try again in a moment.`,
        });
        send({ type: "done" });
      } finally {
        clearInterval(heartbeat);
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
