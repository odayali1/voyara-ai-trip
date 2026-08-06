export type GeoPoint = { lat: number; lng: number; displayName?: string };

const USER_AGENT = "VoyaraTripPlanner/1.0 (mvp; contact@voyara.app)";

export async function geocodePlace(query: string): Promise<GeoPoint | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    // Force English / Latin labels instead of local-script names
    url.searchParams.set("accept-language", "en");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export type NearbyPoi = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  kind: string;
};

export async function fetchNearbyPois(
  lat: number,
  lng: number,
  radiusMeters = 2500
): Promise<NearbyPoi[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint"](around:${radiusMeters},${lat},${lng});
      node["amenity"~"restaurant|cafe"](around:${radiusMeters},${lat},${lng});
    );
    out body 20;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
      },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      elements: Array<{
        id: number;
        lat: number;
        lon: number;
        tags?: {
          name?: string;
          "name:en"?: string;
          tourism?: string;
          amenity?: string;
        };
      }>;
    };

    return (data.elements || [])
      .filter((el) => el.tags?.["name:en"] || el.tags?.name)
      .slice(0, 12)
      .map((el) => ({
        id: el.id,
        name: el.tags!["name:en"] || el.tags!.name!,
        lat: el.lat,
        lng: el.lon,
        kind: el.tags?.tourism || el.tags?.amenity || "place",
      }));
  } catch {
    return [];
  }
}

export type WeatherDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  summary: string;
};

function weatherSummary(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Stormy";
}

export async function fetchWeather(
  lat: number,
  lng: number,
  days = 5
): Promise<WeatherDay[]> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weathercode");
    url.searchParams.set("forecast_days", String(Math.min(days, 7)));
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weathercode: number[];
      };
    };

    return data.daily.time.map((date, i) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      weatherCode: data.daily.weathercode[i],
      summary: weatherSummary(data.daily.weathercode[i]),
    }));
  } catch {
    return [];
  }
}
