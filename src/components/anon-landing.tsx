"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import { MapPin, BarChart3, Share2, Navigation } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Pin Locations",
    desc: "Add homestays and destinations via Google Maps links, address search, or CSV upload.",
  },
  {
    icon: BarChart3,
    title: "Smart Ranking",
    desc: "Automatic ranking by weighted average distance with priority controls.",
  },
  {
    icon: Navigation,
    title: "Driving Time",
    desc: "On-demand driving distance and duration via OSRM routing engine.",
  },
  {
    icon: Share2,
    title: "Share & Export",
    desc: "Save trips to the cloud and share read-only links with your group.",
  },
];

export function AnonLanding() {
  const router = useRouter();

  function handleNewTrip() {
    const slug = nanoid(10);
    router.push(`/trip/${slug}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-20 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-10 w-10" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Homestay Locator
          </h1>
        </div>
        <p className="text-muted-foreground text-center max-w-lg text-lg leading-relaxed">
          Find the best homestay based on proximity to the places you want to
          visit. Compare distances, check driving times, and pick the perfect
          base for your trip.
        </p>
        <Button size="lg" onClick={handleNewTrip} className="text-base px-8 py-6 cursor-pointer">
          Start New Trip
        </Button>
      </section>

      {/* Features */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow"
            >
              <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
