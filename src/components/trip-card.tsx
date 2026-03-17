"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { TripCardData } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Share2, Trash2 } from "lucide-react";

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
  onRename?: (trip: TripCardData, newName: string) => void;
}

export function TripCard({ trip, onDelete, onRename }: TripCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  function startEditing(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(trip.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== trip.name && onRename) {
      onRename(trip, trimmed);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => router.push(`/trip/${trip.shareSlug}`)}
    >
      <CardContent className="p-3 sm:p-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="font-medium bg-transparent border-b-2 border-primary outline-none w-full max-w-[180px] sm:max-w-[250px]"
              />
            ) : (
              <h3 className="font-medium truncate">{trip.name}</h3>
            )}
            {trip.isSaved && !editing && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
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
        <div className="flex gap-1.5 sm:gap-1 ml-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={startEditing} title="Rename">
            <Pencil className="h-4 w-4" />
          </Button>
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
