import { z } from "zod";

export const itineraryStopSchema = z.object({
  title: z.string(),
  time: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  tips: z.string().optional(),
  estimatedCost: z.number().optional(),
  currency: z.string().optional(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().optional(),
  notes: z.string().optional(),
  stops: z.array(itineraryStopSchema),
});

export const itinerarySchema = z.object({
  title: z.string(),
  destination: z.string(),
  summary: z.string(),
  days: z.array(itineraryDaySchema).min(1),
});

export type ItineraryPlan = z.infer<typeof itinerarySchema>;
export type ItineraryDayPlan = z.infer<typeof itineraryDaySchema>;
export type ItineraryStopPlan = z.infer<typeof itineraryStopSchema>;
