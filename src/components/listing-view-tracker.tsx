"use client";

import { useEffect } from "react";

export function ListingViewTracker({
  listingId,
  category,
  city,
}: {
  listingId: string;
  category: string;
  city: string;
}) {
  useEffect(() => {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "listing_viewed",
        payload: { listingId, category, city },
      }),
    });
  }, [listingId, category, city]);
  return null;
}
