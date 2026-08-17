/** SILA Concierge Guest Journey — matches Conceirge Guest Journey.pptx */

export const JOURNEY_STAGES = [
  {
    id: "PRE_ARRIVAL",
    labelEn: "Pre-arrival",
    labelAr: "قبل الوصول",
    order: 1,
  },
  {
    id: "CHECKIN",
    labelEn: "Check-in",
    labelAr: "تسجيل الدخول",
    order: 2,
  },
  {
    id: "UPSELL",
    labelEn: "Offers",
    labelAr: "اقتراحات بيع",
    order: 3,
  },
  {
    id: "IN_STAY",
    labelEn: "During stay",
    labelAr: "أثناء الإقامة",
    order: 4,
  },
  {
    id: "EXTRAS",
    labelEn: "Extra services",
    labelAr: "خدمات إضافية",
    order: 5,
  },
  {
    id: "PRE_DEPARTURE",
    labelEn: "Before departure",
    labelAr: "قبل المغادرة",
    order: 6,
  },
  {
    id: "POST_STAY",
    labelEn: "After departure",
    labelAr: "بعد المغادرة",
    order: 7,
  },
] as const;

export type JourneyStageId = (typeof JOURNEY_STAGES)[number]["id"];

export const DEFAULT_OFFERS: Array<{
  stage: JourneyStageId;
  title: string;
  titleAr: string;
  description: string;
  priceFrom: number | null;
  emoji: string;
}> = [
  {
    stage: "PRE_ARRIVAL",
    title: "Airport pickup",
    titleAr: "استقبال من المطار",
    description: "Private transfer from airport to hotel",
    priceFrom: 40,
    emoji: "🚗",
  },
  {
    stage: "PRE_ARRIVAL",
    title: "City tour booking",
    titleAr: "ترتيب جولة سياحية",
    description: "Guided welcome tour on arrival day",
    priceFrom: 55,
    emoji: "🗺️",
  },
  {
    stage: "CHECKIN",
    title: "Room upgrade",
    titleAr: "ترقية غرفة",
    description: "Upgrade to a higher room category",
    priceFrom: 45,
    emoji: "⬆️",
  },
  {
    stage: "CHECKIN",
    title: "Spa / gym access",
    titleAr: "دخول سبا / جيم",
    description: "Day pass to spa and fitness",
    priceFrom: 25,
    emoji: "🧘",
  },
  {
    stage: "CHECKIN",
    title: "Special dinner",
    titleAr: "عشاء خاص",
    description: "Welcome dinner reservation",
    priceFrom: 35,
    emoji: "🍽️",
  },
  {
    stage: "UPSELL",
    title: "Happy Hour",
    titleAr: "Happy Hour",
    description: "Hotel lounge happy hour",
    priceFrom: 15,
    emoji: "🍹",
  },
  {
    stage: "UPSELL",
    title: "20% restaurant discount",
    titleAr: "خصم 20% على المطاعم",
    description: "Partner restaurants tonight",
    priceFrom: null,
    emoji: "🔥",
  },
  {
    stage: "UPSELL",
    title: "Petra day trip",
    titleAr: "رحلة يومية للبترا",
    description: "Guided Petra day excursion",
    priceFrom: 95,
    emoji: "🏜️",
  },
  {
    stage: "UPSELL",
    title: "Wadi Rum day trip",
    titleAr: "رحلة وادي رم",
    description: "Desert jeep + sunset",
    priceFrom: 120,
    emoji: "🌌",
  },
  {
    stage: "UPSELL",
    title: "Family package",
    titleAr: "باكج عائلي",
    description: "Family activities bundle",
    priceFrom: 80,
    emoji: "👨‍👩‍👧‍👦",
  },
  {
    stage: "IN_STAY",
    title: "Live music tonight",
    titleAr: "حفلة موسيقية",
    description: "Lobby live music evening",
    priceFrom: null,
    emoji: "🎵",
  },
  {
    stage: "IN_STAY",
    title: "Boat trip",
    titleAr: "رحلة بحرية",
    description: "Sunset boat experience",
    priceFrom: 50,
    emoji: "⛵",
  },
  {
    stage: "EXTRAS",
    title: "Taxi",
    titleAr: "تاكسي",
    description: "On-demand taxi booking",
    priceFrom: 12,
    emoji: "🚕",
  },
  {
    stage: "EXTRAS",
    title: "Restaurant reservation",
    titleAr: "مطعم",
    description: "Book a table for tonight",
    priceFrom: null,
    emoji: "🍴",
  },
  {
    stage: "EXTRAS",
    title: "Shopping tour",
    titleAr: "تسوق",
    description: "Local market shopping guide",
    priceFrom: 30,
    emoji: "🛍️",
  },
  {
    stage: "PRE_DEPARTURE",
    title: "Late check-out",
    titleAr: "مغادرة متأخرة",
    description: "Keep the room until 4pm",
    priceFrom: 30,
    emoji: "🕒",
  },
  {
    stage: "PRE_DEPARTURE",
    title: "Airport transfer",
    titleAr: "توصيل للمطار",
    description: "Hotel to airport private transfer",
    priceFrom: 40,
    emoji: "✈️",
  },
];

export function stageMessage(stage: JourneyStageId, guestName: string, ar = true): {
  body: string;
  choices: string[];
} {
  if (!ar) {
    const map: Record<JourneyStageId, { body: string; choices: string[] }> = {
      PRE_ARRIVAL: {
        body: `Hi ${guestName} 👋 We're excited to welcome you tomorrow. Need anything before arrival?`,
        choices: ["Airport pickup 🚗", "Arrange a tour", "I'm all set"],
      },
      CHECKIN: {
        body: `Welcome ${guestName}! Ready to make check-in special:`,
        choices: ["Room upgrade", "Spa / gym", "Special dinner", "Maybe later"],
      },
      UPSELL: {
        body: `Today's offers 🔥 What would you like to try?`,
        choices: ["Happy Hour 🍹", "Restaurant 20% off", "Day trip", "Family package", "Not now"],
      },
      IN_STAY: {
        body: `How is your stay so far? Anything we can improve? Also happening today:`,
        choices: ["All good 👍", "Need help", "Live music", "Boat trip"],
      },
      EXTRAS: {
        body: `Need us to book something for you?`,
        choices: ["Taxi", "Restaurant", "Tour", "Shopping", "No thanks"],
      },
      PRE_DEPARTURE: {
        body: `Departure is tomorrow — want any of these?`,
        choices: ["Late check-out", "Airport transfer", "All set"],
      },
      POST_STAY: {
        body: `Thank you for staying with us. Rate your experience 1–5. Here's a discount code for your next visit: SILA-BACK10`,
        choices: ["1", "2", "3", "4", "5"],
      },
    };
    return map[stage];
  }

  const mapAr: Record<JourneyStageId, { body: string; choices: string[] }> = {
    PRE_ARRIVAL: {
      body: `أهلاً ${guestName}، بنستناك بكرا 👋\nهل بدك:`,
      choices: ["استقبال من المطار 🚗", "ترتيب جولة سياحية", "تمام، شكراً"],
    },
    CHECKIN: {
      body: `أهلاً فيك ${guestName}!\nجاهزين نوفر لك:`,
      choices: ["ترقية غرفة Upgrade", "دخول سبا / جيم", "عشاء خاص", "لاحقاً"],
    },
    UPSELL: {
      body: `عروض اليوم 🔥\nشو حاب تجرب؟`,
      choices: ["Happy Hour 🍹", "خصم 20% على المطاعم", "رحلات يومية (بترا / وادي رم)", "باكج عائلي", "مو الآن"],
    },
    IN_STAY: {
      body: `كيف إقامتك لحد الآن؟\nفي شي ممكن نحسّنه؟\nكمان في فعاليات اليوم:`,
      choices: ["تمام 👍", "بدي مساعدة", "حفلة موسيقية", "رحلة بحرية"],
    },
    EXTRAS: {
      body: `ممكن نحجزلك:`,
      choices: ["تاكسي", "مطعم", "جولة سياحية", "تسوق", "لا شكراً"],
    },
    PRE_DEPARTURE: {
      body: `موعد المغادرة بكرا\nبدك:`,
      choices: ["مغادرة متأخرة late check out", "توصيل للمطار", "تمام"],
    },
    POST_STAY: {
      body: `شكراً لإقامتك معنا\nقيّم تجربتك من 1 إلى 5\nكود خصم لزيارتك القادمة: SILA-BACK10`,
      choices: ["1", "2", "3", "4", "5"],
    },
  };
  return mapAr[stage];
}

export function nextStage(current: JourneyStageId): JourneyStageId | "DONE" {
  const order = JOURNEY_STAGES.map((s) => s.id);
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return "DONE";
  return order[idx + 1];
}
