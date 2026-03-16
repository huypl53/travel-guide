"use client";

import { useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useTripStore } from "@/store/trip-store";
import type { User } from "@supabase/supabase-js";

export function useAutoSave(slug: string) {
  const supabase = createSupabaseBrowser();
  const tripIdRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  const initializedRef = useRef(false);

  const save = useCallback(async () => {
    if (!userRef.current || !tripIdRef.current) return;

    const { tripName, locations } = useTripStore.getState();

    // Update trip name
    await supabase
      .from("trips")
      .update({ name: tripName || "Untitled Trip" })
      .eq("id", tripIdRef.current);

    // Replace locations: delete all, then re-insert
    await supabase
      .from("locations")
      .delete()
      .eq("trip_id", tripIdRef.current);

    if (locations.length > 0) {
      await supabase.from("locations").insert(
        locations.map((loc) => ({
          trip_id: tripIdRef.current,
          type: loc.type,
          name: loc.name,
          address: loc.address,
          lat: loc.lat,
          lon: loc.lon,
          priority: loc.priority,
          source: loc.source,
        }))
      );
    }
  }, [supabase]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userRef.current = user;

      // Try to load existing trip
      const { data: existing } = await supabase
        .from("trips")
        .select("id, name, locations(*)")
        .eq("share_slug", slug)
        .maybeSingle();

      if (existing) {
        tripIdRef.current = existing.id;
        // Load into store if it has data
        const store = useTripStore.getState();
        if (existing.name) store.setTripName(existing.name);
        if (existing.locations?.length > 0 && store.locations.length === 0) {
          for (const loc of existing.locations) {
            store.addLocation({
              type: loc.type,
              name: loc.name,
              lat: loc.lat,
              lon: loc.lon,
              address: loc.address,
              source: loc.source,
              priority: loc.priority,
            });
          }
        }
      } else {
        // Create new trip
        const { data: newTrip } = await supabase
          .from("trips")
          .insert({
            name: "Untitled Trip",
            share_slug: slug,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (newTrip) {
          tripIdRef.current = newTrip.id;
        }
      }
    }

    init();
  }, [slug, supabase]);

  // Subscribe to store changes and debounce save
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const unsub = useTripStore.subscribe(() => {
      if (!userRef.current || !tripIdRef.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(save, 2000);
    });

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [save]);
}
