"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import type { TripCardData } from "@/lib/types";
import { TripCard } from "@/components/trip-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MyTripsListProps {
  initialTrips: TripCardData[];
}

export function MyTripsList({ initialTrips }: MyTripsListProps) {
  const [trips, setTrips] = useState(initialTrips);
  const [deleteTarget, setDeleteTarget] = useState<TripCardData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function handleNewTrip() {
    const slug = nanoid(10);
    router.push(`/trip/${slug}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    await fetch(`/api/trips/${deleteTarget.shareSlug}`, { method: "DELETE" });

    setTrips((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Button onClick={handleNewTrip}>New Trip</Button>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No trips yet. Create your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete trip?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget?.isSaved
              ? `Remove "${deleteTarget.name}" from your saved trips?`
              : `Permanently delete "${deleteTarget?.name}" and all its locations?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
