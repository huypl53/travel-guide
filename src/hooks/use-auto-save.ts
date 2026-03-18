"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useTripStore } from "@/store/trip-store";
import { useDistanceStore } from "@/store/distance-store";
import type { User } from "@supabase/supabase-js";

export function useAutoSave(slug: string) {
  const supabase = createSupabaseBrowser();
  const tripIdRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  const initializedSlugRef = useRef<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const save = useCallback(async () => {
    if (!userRef.current || !tripIdRef.current) return;

    const { tripName, locations } = useTripStore.getState();

    try {
      // Update trip name
      await supabase
        .from("trips")
        .update({ name: tripName || "Untitled Trip" })
        .eq("id", tripIdRef.current);

      if (locations.length > 0) {
        // Replace locations: delete all, then re-insert
        const { error: deleteError } = await supabase
          .from("locations")
          .delete()
          .eq("trip_id", tripIdRef.current);

        if (deleteError) {
          console.error("Failed to delete locations:", deleteError);
          return;
        }

        const { error: insertError } = await supabase
          .from("locations")
          .insert(
            locations.map((loc) => ({
              trip_id: tripIdRef.current,
              type: loc.type,
              name: loc.name,
              address: loc.address,
              lat: loc.lat,
              lon: loc.lon,
              priority: loc.priority,
              source: loc.source,
              notes: loc.notes,
              photo_url: loc.photoUrl,
            }))
          );

        if (insertError) {
          console.error(
            "Failed to insert locations after delete:",
            insertError
          );
        }
      } else {
        // No locations to save, just delete existing ones
        await supabase
          .from("locations")
          .delete()
          .eq("trip_id", tripIdRef.current);
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  }, [supabase]);

  useEffect(() => {
    if (initializedSlugRef.current === slug) return;
    initializedSlugRef.current = slug;

    async function init() {
      // Disable auto-save before resetting to prevent the subscription
      // from saving empty state to the database.
      tripIdRef.current = null;
      useTripStore.getState().reset();
      useDistanceStore.getState().clear();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      userRef.current = user ?? null;

      // Try to load existing trip
      const { data: existing } = await supabase
        .from("trips")
        .select("id, name, user_id, locations(*)")
        .eq("share_slug", slug)
        .maybeSingle();

      if (existing) {
        // Load trip data into store for any user (authenticated or anonymous)
        tripIdRef.current = existing.id;
        const store = useTripStore.getState();
        if (existing.name) store.setTripName(existing.name);
        if (existing.locations?.length > 0) {
          for (const loc of existing.locations) {
            store.addLocation({
              type: loc.type,
              name: loc.name,
              lat: loc.lat,
              lon: loc.lon,
              address: loc.address,
              source: loc.source,
              priority: loc.priority,
              notes: loc.notes,
              photoUrl: loc.photo_url,
            });
          }
        }

        // Only enable auto-save if the current user owns this trip
        if (!user || existing.user_id !== user.id) {
          tripIdRef.current = null;
        } else {
          setIsOwner(true);
        }
      } else if (user) {
        // Create new trip (only for authenticated users)
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
          setIsOwner(true);
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

  return { isOwner };
}
