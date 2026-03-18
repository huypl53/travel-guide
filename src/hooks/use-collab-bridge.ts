"use client";

import { useEffect, useRef } from "react";
import { useTripStore } from "@/store/trip-store";
import { useCollabStore } from "@/store/collab-store";
import type { CollabDelta } from "@/lib/types";

/**
 * Bridge between collab-store and trip-store.
 * - Syncs collab-store state INTO trip-store so all existing components work
 * - Intercepts trip-store changes and broadcasts them via collab channel
 *
 * INVARIANT: This relies on Zustand's synchronous subscribe behavior.
 * `isRemoteUpdate` flag is set/cleared around synchronous setState calls.
 * If Zustand's subscribe ever becomes async, this would need refactoring.
 */
export function useCollabBridge() {
  const isRemoteUpdate = useRef(false);

  // Sync collab-store → trip-store when collab state changes
  useEffect(() => {
    const unsub = useCollabStore.subscribe((state, prev) => {
      // Only sync data fields, not UI state
      if (state.tripName !== prev.tripName || state.locations !== prev.locations) {
        isRemoteUpdate.current = true;
        const tripStore = useTripStore.getState();
        if (state.tripName !== tripStore.tripName) {
          tripStore.setTripName(state.tripName);
        }
        // Full location sync: replace trip-store locations
        if (state.locations !== prev.locations) {
          // Reset and repopulate — simple and correct
          useTripStore.setState({
            locations: state.locations,
            selectedHomestayIds: state.selectedHomestayIds,
            selectedDestinationIds: state.selectedDestinationIds,
          });
        }
        isRemoteUpdate.current = false;
      }
    });
    return unsub;
  }, []);

  // Intercept trip-store mutations → broadcast via collab-store
  useEffect(() => {
    // Initialize from collab-store (source of truth in collab mode)
    // to avoid spurious deltas if trip-store hasn't been synced yet
    const collabState = useCollabStore.getState();
    let prevLocations = collabState.locations;
    let prevTripName = collabState.tripName;

    const unsub = useTripStore.subscribe((state) => {
      if (isRemoteUpdate.current) return;

      const broadcast = useCollabStore.getState()._broadcast;
      if (!broadcast) return;

      // Detect trip name change
      if (state.tripName !== prevTripName) {
        const delta: CollabDelta = { action: "set-trip-name", name: state.tripName };
        broadcast(delta);
        // Also update collab-store directly (without re-broadcasting)
        isRemoteUpdate.current = true;
        useCollabStore.setState({ tripName: state.tripName });
        isRemoteUpdate.current = false;
        prevTripName = state.tripName;
      }

      // Detect location changes
      if (state.locations !== prevLocations) {
        const prevIds = new Set(prevLocations.map((l) => l.id));
        const currIds = new Set(state.locations.map((l) => l.id));

        // Added locations
        for (const loc of state.locations) {
          if (!prevIds.has(loc.id)) {
            broadcast({ action: "add-location", location: loc });
          }
        }

        // Removed locations
        for (const loc of prevLocations) {
          if (!currIds.has(loc.id)) {
            broadcast({ action: "remove-location", locationId: loc.id });
          }
        }

        // Updated locations (priority, notes, photo)
        for (const loc of state.locations) {
          if (prevIds.has(loc.id)) {
            const prev = prevLocations.find((l) => l.id === loc.id);
            if (!prev) continue;
            if (prev.priority !== loc.priority) {
              broadcast({ action: "update-priority", locationId: loc.id, priority: loc.priority });
            }
            if (prev.notes !== loc.notes) {
              broadcast({ action: "update-notes", locationId: loc.id, notes: loc.notes ?? "" });
            }
            if (prev.photoUrl !== loc.photoUrl) {
              broadcast({ action: "update-photo", locationId: loc.id, photoUrl: loc.photoUrl ?? "" });
            }
          }
        }

        // Sync back to collab-store
        isRemoteUpdate.current = true;
        useCollabStore.setState({ locations: state.locations });
        isRemoteUpdate.current = false;
        prevLocations = state.locations;
      }
    });

    return unsub;
  }, []);
}
