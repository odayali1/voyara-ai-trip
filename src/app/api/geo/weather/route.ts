import { NextResponse } from "next/server";
import { fetchWeather, geocodePlace } from "@/lib/geo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination");
  const days = Number(searchParams.get("days") || 5);
  if (!destination) {
    return NextResponse.json({ error: "destination required" }, { status: 400 });
  }

  const geo = await geocodePlace(destination);
  if (!geo) return NextResponse.json({ weather: [] });

  const weather = await fetchWeather(geo.lat, geo.lng, days);
  return NextResponse.json({ weather, geo });
}
