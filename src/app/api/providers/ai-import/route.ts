import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { deepseek, deepseekModel } from "@/lib/ai";
import { extractDocumentText } from "@/lib/extract-document";
import { buildHotelExtractPrompt, parseHotelExtract } from "@/lib/hotel-ai";
import { geocodePlace } from "@/lib/geo";

export const maxDuration = 90;

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "Create your hotel profile first" },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const publish = String(form.get("publish") || "") === "1";
  const pasted = String(form.get("text") || "").trim();

  let documentText = pasted;
  let kind = "paste";

  if (file instanceof File && file.size > 0) {
    try {
      const extracted = await extractDocumentText(file);
      documentText = extracted.text;
      kind = extracted.kind;
    } catch (err) {
      console.error("document extract failed", err);
      return NextResponse.json(
        {
          error:
            "Could not read that file. Try PDF, DOCX, or paste the room list as text.",
        },
        { status: 400 }
      );
    }
  }

  if (!documentText || documentText.length < 40) {
    return NextResponse.json(
      { error: "Document is empty or too short to extract rooms." },
      { status: 400 }
    );
  }

  try {
    const { text } = await generateText({
      model: deepseek.chat(deepseekModel),
      prompt: buildHotelExtractPrompt({
        documentText,
        hotelName: profile.businessName,
        city: profile.city || undefined,
        country: profile.country || undefined,
      }),
    });

    const extracted = parseHotelExtract(text);
    if (extracted.rooms.length === 0) {
      return NextResponse.json(
        { error: "AI found no rooms in that document. Try a clearer rate sheet." },
        { status: 422 }
      );
    }

    const city = extracted.city || profile.city || "Amman";
    const country = extracted.country || profile.country || "Jordan";

    if (!publish) {
      return NextResponse.json({
        mode: "preview",
        source: kind,
        hotelName: extracted.hotelName || profile.businessName,
        city,
        country,
        rooms: extracted.rooms.map((r) => ({
          ...r,
          city: r.city || city,
          country: r.country || country,
          category: "HOTEL",
        })),
      });
    }

    const created = [];
    for (const room of extracted.rooms.slice(0, 20)) {
      const roomCity = room.city || city;
      const roomCountry = room.country || country;
      const geo = await geocodePlace(
        `${room.title}, ${profile.businessName}, ${roomCity}, ${roomCountry}`
      );

      const listing = await db.providerListing.create({
        data: {
          providerId: profile.id,
          category: "HOTEL",
          title: room.title,
          description: [
            room.description,
            room.bedType ? `Bed: ${room.bedType}.` : "",
            room.capacity ? `Sleeps ${room.capacity}.` : "",
          ]
            .filter(Boolean)
            .join(" "),
          city: roomCity,
          country: roomCountry,
          lat: geo?.lat,
          lng: geo?.lng,
          priceFrom: room.priceFrom ?? null,
          currency: room.currency || "USD",
          tags: room.tags || [],
          amenities: room.amenities || [],
          images: [],
          status: "ACTIVE",
        },
      });
      created.push(listing);
    }

    return NextResponse.json({
      mode: "published",
      imported: created.length,
      listings: created,
    });
  } catch (err) {
    console.error("hotel ai-import failed", err);
    return NextResponse.json(
      { error: "AI extraction failed. Please retry in a moment." },
      { status: 500 }
    );
  }
}
