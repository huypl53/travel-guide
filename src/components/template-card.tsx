"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import type { TripTemplate } from "@/lib/templates";

interface TemplateCardProps {
  template: TripTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseCount = template.locations.filter(
    (l) => l.type === "base",
  ).length;
  const destinationCount = template.locations.filter(
    (l) => l.type === "destination",
  ).length;

  async function handleUseTemplate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          locations: template.locations.map((loc) => ({
            type: loc.type,
            name: loc.name,
            lat: loc.lat,
            lon: loc.lon,
            address: loc.address,
            priority: loc.priority ?? 3,
            source: "manual",
          })),
        }),
      });

      if (!res.ok) {
        setError("Failed to create trip. Please try again.");
        return;
      }

      const { slug } = await res.json();
      router.push(`/trip/${slug}`);
    } catch (err) {
      console.error("Error creating trip from template:", err);
      setError("Failed to create trip. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-hidden="true">
              {template.coverEmoji}
            </span>
            <CardTitle className="text-base font-semibold">
              {template.name}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {template.region}
        </span>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {template.duration}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {baseCount} stays
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {destinationCount} spots
          </span>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          size="sm"
          className="w-full cursor-pointer gap-2"
          onClick={handleUseTemplate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Use Template
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        {error && <p className="text-destructive text-sm mt-1">{error}</p>}
      </CardFooter>
    </Card>
  );
}
