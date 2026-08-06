/** Curated Unsplash photos for destinations / landmarks — no API key needed. */

type Photo = { url: string; alt: string };

const DESTINATION_HERO: Array<{ match: RegExp; photo: Photo }> = [
  {
    match: /jordan|الأردن|اردن/i,
    photo: {
      url: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80",
      alt: "Petra Treasury Jordan",
    },
  },
  {
    match: /amman|عمّان|عمان/i,
    photo: {
      url: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=80",
      alt: "Amman cityscape",
    },
  },
  {
    match: /petra|البترا|بترا/i,
    photo: {
      url: "https://images.unsplash.com/photo-1579605346364-819365bac845?auto=format&fit=crop&w=1200&q=80",
      alt: "Petra",
    },
  },
  {
    match: /wadi rum|وادي رم/i,
    photo: {
      url: "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1200&q=80",
      alt: "Wadi Rum desert",
    },
  },
  {
    match: /dead sea|البحر الميت/i,
    photo: {
      url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
      alt: "Dead Sea",
    },
  },
  {
    match: /aqaba|العقبة/i,
    photo: {
      url: "https://images.unsplash.com/photo-1559827260-dc3d7584844c?auto=format&fit=crop&w=1200&q=80",
      alt: "Red Sea coast",
    },
  },
  {
    match: /tokyo|japan|طوكيو/i,
    photo: {
      url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
      alt: "Tokyo",
    },
  },
  {
    match: /lisbon|لشبونة/i,
    photo: {
      url: "https://images.unsplash.com/photo-1555881407-8d2e5f7d5c5f?auto=format&fit=crop&w=1200&q=80",
      alt: "Lisbon",
    },
  },
  {
    match: /bali/i,
    photo: {
      url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
      alt: "Bali",
    },
  },
  {
    match: /dubai|دبي/i,
    photo: {
      url: "https://images.unsplash.com/photo-1512453979798-5ea7193a3f0f?auto=format&fit=crop&w=1200&q=80",
      alt: "Dubai",
    },
  },
  {
    match: /paris|باريس/i,
    photo: {
      url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
      alt: "Paris",
    },
  },
  {
    match: /rome|روما/i,
    photo: {
      url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
      alt: "Rome",
    },
  },
];

const STOP_PHOTOS: Array<{ match: RegExp; photo: Photo }> = [
  {
    match: /citadel|قلعة|castle|fort/i,
    photo: {
      url: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=600&q=80",
      alt: "Historic citadel",
    },
  },
  {
    match: /market|سوق|souq|food|مطعم|restaurant|coffee|قهوة|كنافة/i,
    photo: {
      url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
      alt: "Local food",
    },
  },
  {
    match: /desert|رم|jeep|bedouin|بدو/i,
    photo: {
      url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=600&q=80",
      alt: "Desert",
    },
  },
  {
    match: /sea|بحر|beach|float|dive|غوص|شاطئ/i,
    photo: {
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
      alt: "Sea",
    },
  },
  {
    match: /petra|treasury|خزنة|سيق|siq/i,
    photo: {
      url: "https://images.unsplash.com/photo-1580837119756-563d608dd119?auto=format&fit=crop&w=600&q=80",
      alt: "Petra",
    },
  },
  {
    match: /temple|church|mosque|كنيسة|معبد|مسجد|culture|museum/i,
    photo: {
      url: "https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=600&q=80",
      alt: "Culture site",
    },
  },
];

const FALLBACK: Photo = {
  url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
  alt: "Travel",
};

function pick(list: Array<{ match: RegExp; photo: Photo }>, text: string): Photo | null {
  for (const item of list) {
    if (item.match.test(text)) return item.photo;
  }
  return null;
}

export function destinationHeroImage(destination: string): Photo {
  return pick(DESTINATION_HERO, destination) || FALLBACK;
}

export function dayHeroImage(dayTitle: string, destination: string): Photo {
  return (
    pick(DESTINATION_HERO, dayTitle) ||
    pick(STOP_PHOTOS, dayTitle) ||
    pick(DESTINATION_HERO, destination) ||
    FALLBACK
  );
}

export function stopImage(title: string, category?: string): Photo {
  const hay = `${title} ${category || ""}`;
  return pick(STOP_PHOTOS, hay) || pick(DESTINATION_HERO, hay) || FALLBACK;
}
