"use client";

import { useCollabStore } from "@/store/collab-store";

const STATUS_CONFIG = {
  connecting: { label: "Connecting...", color: "bg-yellow-500" },
  connected: { label: "Connected", color: "bg-green-500" },
  syncing: { label: "Syncing...", color: "bg-yellow-500" },
  offline: { label: "Offline", color: "bg-red-500" },
} as const;

export function CollabStatus() {
  const syncStatus = useCollabStore((s) => s.syncStatus);
  const config = STATUS_CONFIG[syncStatus];

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className={`h-2 w-2 rounded-full ${config.color}`} />
      {config.label}
    </div>
  );
}
