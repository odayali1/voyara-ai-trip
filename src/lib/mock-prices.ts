export type PriceOffer = {
  id: string;
  type: "flight" | "hotel";
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  meta: string;
  deepLink: string;
  isMock: true;
};

export interface PriceProvider {
  searchFlights(input: {
    origin: string;
    destination: string;
    days: number;
  }): Promise<PriceOffer[]>;
  searchHotels(input: {
    destination: string;
    nights: number;
    budget?: "BUDGET" | "MID" | "LUXURY";
  }): Promise<PriceOffer[]>;
}

function hashSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function seededPrice(seed: string, base: number, variance: number) {
  const h = hashSeed(seed);
  return Math.round(base + (h % variance));
}

export class MockPriceProvider implements PriceProvider {
  async searchFlights(input: {
    origin: string;
    destination: string;
    days: number;
  }): Promise<PriceOffer[]> {
    const dest = input.destination || "Destination";
    const origin = input.origin || "Home";
    const base = seededPrice(`${origin}-${dest}-flight`, 420, 380);

    return [
      {
        id: `mock-flight-1-${hashSeed(dest)}`,
        type: "flight",
        title: `${origin} to ${dest}`,
        subtitle: "Nonstop · Economy · Demo Air",
        price: base,
        currency: "USD",
        meta: "1 stop alternatives from $" + Math.round(base * 0.82),
        deepLink: "#mock-demo",
        isMock: true,
      },
      {
        id: `mock-flight-2-${hashSeed(dest)}`,
        type: "flight",
        title: `${origin} to ${dest}`,
        subtitle: "1 stop · Premium economy · Skyline Air",
        price: Math.round(base * 1.35),
        currency: "USD",
        meta: `${input.days || 5}-day round trip estimate`,
        deepLink: "#mock-demo",
        isMock: true,
      },
      {
        id: `mock-flight-3-${hashSeed(dest)}`,
        type: "flight",
        title: `${origin} to ${dest}`,
        subtitle: "Red-eye · Basic · Budget Wing",
        price: Math.round(base * 0.72),
        currency: "USD",
        meta: "Cheapest demo fare",
        deepLink: "#mock-demo",
        isMock: true,
      },
    ];
  }

  async searchHotels(input: {
    destination: string;
    nights: number;
    budget?: "BUDGET" | "MID" | "LUXURY";
  }): Promise<PriceOffer[]> {
    const dest = input.destination || "City Center";
    const nights = Math.max(input.nights || 3, 1);
    const multiplier =
      input.budget === "LUXURY" ? 2.2 : input.budget === "BUDGET" ? 0.7 : 1;
    const nightly = seededPrice(`${dest}-hotel`, 110, 90) * multiplier;

    return [
      {
        id: `mock-hotel-1-${hashSeed(dest)}`,
        type: "hotel",
        title: `Harborlight Hotel - ${dest}`,
        subtitle: "4.6 stars · City center · Breakfast",
        price: Math.round(nightly * nights),
        currency: "USD",
        meta: `$${Math.round(nightly)}/night · ${nights} nights`,
        deepLink: "#mock-demo",
        isMock: true,
      },
      {
        id: `mock-hotel-2-${hashSeed(dest)}`,
        type: "hotel",
        title: `Lantern Suites - ${dest}`,
        subtitle: "4.8 stars · Boutique · Rooftop",
        price: Math.round(nightly * 1.4 * nights),
        currency: "USD",
        meta: `$${Math.round(nightly * 1.4)}/night · ${nights} nights`,
        deepLink: "#mock-demo",
        isMock: true,
      },
      {
        id: `mock-hotel-3-${hashSeed(dest)}`,
        type: "hotel",
        title: `Traveler Nest - ${dest}`,
        subtitle: "4.2 stars · Great value · Near transit",
        price: Math.round(nightly * 0.65 * nights),
        currency: "USD",
        meta: `$${Math.round(nightly * 0.65)}/night · ${nights} nights`,
        deepLink: "#mock-demo",
        isMock: true,
      },
    ];
  }
}

export const priceProvider: PriceProvider = new MockPriceProvider();
