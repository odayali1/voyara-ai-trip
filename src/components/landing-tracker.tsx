"use client";

import { useEffect } from "react";

export function LandingTracker() {
  useEffect(() => {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_landed", payload: { page: "home" } }),
    });
  }, []);
  return null;
}
