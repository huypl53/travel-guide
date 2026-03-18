"use client";

import { useCollabStore } from "@/store/collab-store";
import { Users } from "lucide-react";

export function CollabPresenceBar() {
  const participants = useCollabStore((s) => s.participants);

  if (participants.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Users className="h-4 w-4" />
      <div className="flex items-center gap-1">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1"
            title={p.nickname}
          >
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="hidden sm:inline text-xs max-w-[80px] truncate">
              {p.nickname}
            </span>
          </div>
        ))}
      </div>
      <span className="text-xs">
        {participants.length} {participants.length === 1 ? "person" : "people"} editing
      </span>
    </div>
  );
}
