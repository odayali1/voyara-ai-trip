import { NextResponse } from "next/server";
import { priceProvider } from "@/lib/mock-prices";
import { getSession } from "@/lib/auth-server";
import { trackEvent } from "@/lib/intent";

export async function POST(req: Request) {
  const body = await req.json();
  const destination = String(body.destination || "Tokyo");
  const days = Number(body.days || 5);
  const nights = Number(body.nights || Math.max(days - 1, 1));
  const origin = String(body.origin || "Home");
  const budget = body.budget as "BUDGET" | "MID" | "LUXURY" | undefined;

  const [flights, hotels] = await Promise.all([
    priceProvider.searchFlights({ origin, destination, days }),
    priceProvider.searchHotels({ destination, nights, budget }),
  ]);

  const session = await getSession();
  await trackEvent(
    "mock_price_viewed",
    { destination, days },
    session?.user?.id
  );

  return NextResponse.json({ flights, hotels, isMock: true });
}
