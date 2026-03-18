"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { useTripStore } from "@/store/trip-store";

export function EditableTripName({ isOwner }: { isOwner: boolean }) {
  const tripName = useTripStore((s) => s.tripName);
  const setTripName = useTripStore((s) => s.setTripName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(tripName || "Untitled Trip");
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== tripName) {
      setTripName(trimmed);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        maxLength={200}
        className="text-xl sm:text-2xl font-bold text-primary bg-transparent border-b-2 border-primary outline-none max-w-[200px] sm:max-w-[300px]"
      />
    );
  }

  if (!isOwner) {
    return (
      <span className="text-xl sm:text-2xl font-bold text-primary truncate max-w-[200px] sm:max-w-[300px]">
        {tripName || "Untitled Trip"}
      </span>
    );
  }

  return (
    <button
      onClick={startEditing}
      className="group flex items-center gap-2 text-left"
      title="Click to rename trip"
    >
      <span className="text-xl sm:text-2xl font-bold text-primary truncate max-w-[200px] sm:max-w-[300px]">
        {tripName || "Untitled Trip"}
      </span>
      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
