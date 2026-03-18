"use client";

import { useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useCollabStore } from "@/store/collab-store";
import type { CollabDelta, CollabParticipant } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const ADJECTIVES = ["Swift", "Calm", "Bold", "Bright", "Keen", "Warm"];
const ANIMALS = ["Fox", "Owl", "Tiger", "Deer", "Wolf", "Bear"];
const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

function randomNickname() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function useCollabSession(slug: string) {
  const supabaseRef = useRef(createSupabaseBrowser());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const myIdRef = useRef(crypto.randomUUID());
  const initRef = useRef(false);

  const initSession = useCollabStore((s) => s.initSession);
  const setSyncStatus = useCollabStore((s) => s.setSyncStatus);
  const setParticipants = useCollabStore((s) => s.setParticipants);
  const applyRemoteDelta = useCollabStore((s) => s.applyRemoteDelta);
  const setBroadcast = useCollabStore((s) => s.setBroadcast);

  const broadcast = useCallback(
    (delta: CollabDelta) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "delta",
        payload: { delta, senderId: myIdRef.current },
      });
    },
    []
  );

  const persistToDb = useCallback(async () => {
    const { tripName, locations } = useCollabStore.getState();
    setSyncStatus("syncing");
    try {
      await fetch(`/api/collab/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripName, tripData: locations }),
      });
      setSyncStatus("connected");
    } catch (err) {
      console.error("Failed to persist collab session:", err);
      setSyncStatus("connected");
    }
  }, [slug, setSyncStatus]);

  const debouncedSave = useCallback(() => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(persistToDb, 3000);
  }, [persistToDb]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      // 1. Fetch session from API
      const res = await fetch(`/api/collab/${slug}`);
      if (!res.ok) {
        setSyncStatus("offline");
        return;
      }

      const data = await res.json();
      initSession(slug, data.tripName, data.tripData ?? []);

      // 2. Set up Supabase Realtime channel
      const channel = supabaseRef.current.channel(`collab:${slug}`);
      channelRef.current = channel;

      // Listen for deltas from other users
      channel.on("broadcast", { event: "delta" }, ({ payload }) => {
        if (payload.senderId === myIdRef.current) return;
        applyRemoteDelta(payload.delta as CollabDelta);
      });

      // Listen for presence
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const participants: CollabParticipant[] = Object.values(state)
          .flat()
          .filter((p: Record<string, unknown>) =>
            typeof p.id === "string" && typeof p.nickname === "string" && typeof p.color === "string"
          )
          .map((p: Record<string, unknown>) => ({
            id: p.id as string,
            nickname: p.nickname as string,
            color: p.color as string,
          }));
        setParticipants(participants);
      });

      // Subscribe and track presence
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setSyncStatus("connected");
          await channel.track({
            id: myIdRef.current,
            nickname: randomNickname(),
            color: randomColor(),
          });
          // Wire broadcast into store
          setBroadcast(broadcast);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setSyncStatus("offline");
        }
      });
    }

    init();

    return () => {
      channelRef.current?.untrack();
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      setBroadcast(null);
      clearTimeout(saveTimeoutRef.current);
    };
  }, [slug, initSession, setSyncStatus, setParticipants, applyRemoteDelta, setBroadcast, broadcast]);

  // Subscribe to store changes for debounced persistence (only on data changes)
  useEffect(() => {
    const unsub = useCollabStore.subscribe((state, prev) => {
      if (state.tripName !== prev.tripName || state.locations !== prev.locations) {
        debouncedSave();
      }
    });
    return () => {
      unsub();
      clearTimeout(saveTimeoutRef.current);
    };
  }, [debouncedSave]);

  // Save on tab close using sendBeacon for reliability
  useEffect(() => {
    const MAX_BEACON_SIZE = 60 * 1024; // 60KB safe margin (browser limit ~64KB)

    const handleBeforeUnload = () => {
      const { tripName, locations } = useCollabStore.getState();
      let body = JSON.stringify({ tripName, tripData: locations });

      // If payload exceeds safe limit, strip notes and photoUrl to reduce size
      if (new Blob([body]).size > MAX_BEACON_SIZE) {
        const trimmedLocations = locations.map(({ notes, photoUrl, ...rest }) => rest);
        body = JSON.stringify({ tripName, tripData: trimmedLocations });
      }

      const sent = navigator.sendBeacon(
        `/api/collab/${slug}`,
        new Blob([body], { type: "application/json" })
      );
      if (!sent) {
        console.warn("sendBeacon failed — payload may exceed browser limit or page already unloaded");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [slug]);
}
