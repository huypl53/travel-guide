"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { Input } from "@/components/ui/input";
import { isSafeImageUrl } from "@/lib/utils";
import type { Location } from "@/lib/types";

interface LocationDetailProps {
  location: Location;
}

export function LocationDetail({ location }: LocationDetailProps) {
  const updateLocationNotes = useTripStore((s) => s.updateLocationNotes);
  const updateLocationPhoto = useTripStore((s) => s.updateLocationPhoto);
  const [notes, setNotes] = useState(location.notes ?? "");
  const [photoUrl, setPhotoUrl] = useState(location.photoUrl ?? "");
  const [imgError, setImgError] = useState(false);
  const [prevNotes, setPrevNotes] = useState(location.notes);
  const [prevPhotoUrl, setPrevPhotoUrl] = useState(location.photoUrl);

  if (location.notes !== prevNotes) {
    setPrevNotes(location.notes);
    setNotes(location.notes ?? "");
  }
  if (location.photoUrl !== prevPhotoUrl) {
    setPrevPhotoUrl(location.photoUrl);
    setPhotoUrl(location.photoUrl ?? "");
    setImgError(false);
  }

  const showImage = photoUrl && isSafeImageUrl(photoUrl) && !imgError;
  const showError = photoUrl && isSafeImageUrl(photoUrl) && imgError;

  return (
    <div className="mt-1 pl-6 pr-2 pb-2 space-y-2">
      <textarea
        className="w-full text-sm rounded border border-border bg-background px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        rows={2}
        maxLength={2000}
        placeholder="Add notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => updateLocationNotes(location.id, notes)}
      />
      <div className="flex items-center gap-2">
        <Input
          className="text-sm h-8"
          maxLength={500}
          placeholder="Photo URL"
          value={photoUrl}
          onChange={(e) => {
            setPhotoUrl(e.target.value);
            setImgError(false);
          }}
          onBlur={() => updateLocationPhoto(location.id, photoUrl)}
        />
        {showImage ? (
          <img
            src={photoUrl}
            alt={location.name}
            className="h-16 w-16 rounded object-cover flex-shrink-0"
            onError={() => setImgError(true)}
          />
        ) : showError ? (
          <div className="h-16 w-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <ImageOff className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
