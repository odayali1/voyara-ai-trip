/** Curated Unsplash photos for destination wow — works without API key. */

type Photo = { url: string; credit: string };

const PHOTOS: Array<{ match: RegExp; photo: Photo }> = [
  {
    match: /petra|البترا|treasury|الخزنة|siq|السيق/i,
    photo: {
      url: "https://images.unsplash.com/photo-1579606032821-4e6161c8155f?auto=format&fit=crop&w=1200&q=80",
      credit: "Petra",
    },
  },
  {
    match: /wadi rum|وادي رم|rum desert|red desert/i,
    photo: {
      url: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
      credit: "Wadi Rum",
    },
  },
  {
    match: /dead sea|البحر الميت/i,
    photo: {
      url: "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1200&q=80",
      credit: "Dead Sea",
    },
  },
  {
    match: /amman|عمّان|عمان|citadel|القلعة|jabal|جبل/i,
    photo: {
      url: "https://images.unsplash.com/photo-1580834341580-8cdee04a9e0c?auto=format&fit=crop&w=1200&q=80",
      credit: "Amman",
    },
  },
  {
    match: /aqaba|العقبة|red sea|البحر الأحمر/i,
    photo: {
      url: "https://images.unsplash.com/photo-1559827260-dc3d7584841c?auto=format&fit=crop&w=1200&q=80",
      credit: "Red Sea",
    },
  },
  {
    match: /madaba|مادبا|nebo|نيبو/i,
    photo: {
      url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80",
      credit: "Jordan hills",
    },
  },
  {
    match: /jordan|الأردن|اردن/i,
    photo: {
      url: "https://images.unsplash.com/photo-1606046604972-77cc76aee944?auto=format&fit=crop&w=1400&q=80",
      credit: "Jordan",
    },
  },
  {
    match: /tokyo|japan|طوكيو|asakusa|senso/i,
    photo: {
      url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
      credit: "Tokyo",
    },
  },
  {
    match: /lisbon|portugal|لشبونة|alfama/i,
    photo: {
      url: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80",
      credit: "Lisbon",
    },
  },
  {
    match: /bali|indonesia/i,
    photo: {
      url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
      credit: "Bali",
    },
  },
  {
    match: /dubai|دبي/i,
    photo: {
      url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
      credit: "Dubai",
    },
  },
  {
    match: /paris|باريس/i,
    photo: {
      url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
      credit: "Paris",
    },
  },
  {
    match: /rome|روما/i,
    photo: {
      url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
      credit: "Rome",
    },
  },
];

const CATEGORY_FALLBACK: Record<string, Photo> = {
  food: {
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
    credit: "Food",
  },
  restaurant: {
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
    credit: "Dining",
  },
  hotel: {
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    credit: "Stay",
  },
  nature: {
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    credit: "Nature",
  },
  experience: {
    url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
    credit: "Experience",
  },
  activity: {
    url: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=800&q=80",
    credit: "Activity",
  },
  attraction: {
    url: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    credit: "Sight",
  },
};

const DEFAULT_PHOTO: Photo = {
  url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
  credit: "Travel",
};

export function resolvePlaceImage(input: {
  title?: string;
  address?: string;
  destination?: string;
  category?: string;
  dayTitle?: string;
}): Photo {
  const haystack = [input.title, input.address, input.dayTitle, input.destination]
    .filter(Boolean)
    .join(" ");

  for (const row of PHOTOS) {
    if (row.match.test(haystack)) return row.photo;
  }

  const cat = (input.category || "").toLowerCase();
  if (cat && CATEGORY_FALLBACK[cat]) return CATEGORY_FALLBACK[cat];

  return DEFAULT_PHOTO;
}

export function resolveDestinationHero(destination?: string): Photo {
  return resolvePlaceImage({ destination, title: destination });
}
