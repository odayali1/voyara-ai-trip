"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function StartStayButton({
  listingId,
  hotelOnly = false,
}: {
  listingId: string;
  hotelOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function start() {
    setBusy(true);
    const res = await fetch("/api/demo/start-stay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Could not start stay");
      return;
    }
    toast.success(
      data.whatsapp?.sent
        ? "Stay confirmed — WhatsApp stage 1 sent to guest"
        : "Stay confirmed — open guest chat"
    );
    if (data.guestUrl) {
      window.open(data.guestUrl, "_blank", "noopener,noreferrer");
    }
    router.refresh();
  }

  return (
    <Button
      size="sm"
      className="mt-4 w-full"
      disabled={busy}
      onClick={() => void start()}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BedDouble className="h-4 w-4" />}
      {hotelOnly ? "Confirm this hotel stay" : "Confirm stay (connects to SILA)"}
    </Button>
  );
}
