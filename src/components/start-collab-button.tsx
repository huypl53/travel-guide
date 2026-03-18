"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTripStore } from "@/store/trip-store";
import { Users } from "lucide-react";

export function StartCollabButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const locations = useTripStore((s) => s.locations);
  const tripName = useTripStore((s) => s.tripName);

  async function handleStartCollab() {
    setCreating(true);
    try {
      const res = await fetch("/api/collab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripName: tripName || "Untitled Trip", locations }),
      });
      const data = await res.json();
      if (data.slug) {
        const url = `${window.location.origin}/collab/${data.slug}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        router.push(`/collab/${data.slug}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleStartCollab}
      disabled={creating}
      className="gap-1.5"
    >
      <Users className="h-3.5 w-3.5" />
      {copied ? "Collab link copied!" : creating ? "Creating..." : "Collaborate"}
    </Button>
  );
}
