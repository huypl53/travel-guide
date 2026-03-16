"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface SaveTripButtonProps {
  tripId: string;
  initialSaved: boolean;
}

export function SaveTripButton({ tripId, initialSaved }: SaveTripButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const method = saved ? "DELETE" : "POST";
    const res = await fetch("/api/saved-trips", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId }),
    });
    if (res.ok) {
      setSaved(!saved);
    }
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={loading}>
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4 mr-1" /> Saved
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 mr-1" /> Save to My Trips
        </>
      )}
    </Button>
  );
}
