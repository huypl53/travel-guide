"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTripStore } from "@/store/trip-store";

interface ShareExportProps {
  slug: string;
}

export function ShareExport({ slug }: ShareExportProps) {
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState(false);
  const locations = useTripStore((s) => s.locations);
  const tripName = useTripStore((s) => s.tripName);

  async function handleShare() {
    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tripName || "Untitled Trip", locations }),
      });
      const data = await res.json();
      const shareSlug = data.slug ?? slug;
      await navigator.clipboard.writeText(`${window.location.origin}/trip/${shareSlug}/share`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    const data = JSON.stringify({ name: tripName, locations }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tripName || "trip"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button variant="outline" size="sm" onClick={handleShare} disabled={saving}>
        {shared ? "Link copied!" : "Share"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport}>
        Export
      </Button>
    </div>
  );
}
