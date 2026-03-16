"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TripCardData } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Share2, Trash2 } from "lucide-react";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface TripCardProps {
  trip: TripCardData;
  onDelete: (trip: TripCardData) => void;
}

export function TripCard({ trip, onDelete }: TripCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/trip/${trip.shareSlug}/share`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(trip);
  }

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => router.push(`/trip/${trip.shareSlug}`)}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{trip.name}</h3>
            {trip.isSaved && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                Saved
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {trip.homestayCount} homestays, {trip.destinationCount} destinations
            &middot; {timeAgo(trip.createdAt)}
          </p>
          {trip.topHomestay && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Top: {trip.topHomestay}
            </p>
          )}
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleShare} title="Copy share link">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
