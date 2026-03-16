"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";

export default function HomePage() {
  const router = useRouter();

  function handleNewTrip() {
    const slug = nanoid(10);
    router.push(`/trip/${slug}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold text-center">Homestay Locator</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Find the best homestay based on proximity to the places you want to visit.
        Add homestays and destinations, and we&apos;ll rank them for you.
      </p>
      <Button size="lg" onClick={handleNewTrip}>
        New Trip
      </Button>
    </div>
  );
}
