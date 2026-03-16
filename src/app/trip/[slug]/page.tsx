"use client";

import { useParams } from "next/navigation";
import { MapView } from "@/components/map-view";
import { LocationInput } from "@/components/location-input";
import { LocationList } from "@/components/location-list";
import { RankingList } from "@/components/ranking-list";
import { DistanceMatrix } from "@/components/distance-matrix";
import { ShareExport } from "@/components/share-export";
import { Card } from "@/components/ui/card";

export default function TripPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trip Planner</h1>
        <ShareExport slug={slug} />
      </header>

      {/* Data Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Homestays</h2>
          <LocationInput type="homestay" />
          <LocationList type="homestay" />
        </Card>
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Destinations</h2>
          <LocationInput type="destination" />
          <LocationList type="destination" />
        </Card>
      </div>

      {/* Map */}
      <MapView />

      {/* Ranking + Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <RankingList />
        </Card>
        <Card className="p-4">
          <DistanceMatrix />
        </Card>
      </div>
    </div>
  );
}
