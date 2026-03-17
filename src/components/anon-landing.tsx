"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import {
  MapPin,
  BarChart3,
  Share2,
  Navigation,
  CheckCircle,
  Zap,
  Globe,
  Shield,
} from "lucide-react";

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

const steps = [
  {
    num: 1,
    icon: MapPin,
    title: "Add your locations",
    desc: "Pin homestays and destinations on the map using search, links, or CSV.",
  },
  {
    num: 2,
    icon: BarChart3,
    title: "Get smart rankings",
    desc: "Our algorithm ranks every homestay by proximity to your destinations.",
  },
  {
    num: 3,
    icon: CheckCircle,
    title: "Pick your stay",
    desc: "Choose the best option with confidence — backed by data, not guesswork.",
  },
];

const stats = [
  { value: "1,000+", label: "Trips planned", icon: Globe },
  { value: "5,000+", label: "Locations compared", icon: MapPin },
  { value: "100%", label: "Free, no ads", icon: Shield },
  { value: "< 2s", label: "Ranking speed", icon: Zap },
];

const FEATURE_DELAYS = [
  "animation-delay-200",
  "animation-delay-400",
  "animation-delay-600",
  "animation-delay-800",
] as const;

export function AnonLanding() {
  const router = useRouter();

  function handleNewTrip() {
    const slug = nanoid(10);
    router.push(`/trip/${slug}`);
  }

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-20 text-center">
        {/* Animated gradient background */}
        <div
          className="animate-gradient-shift pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--primary) 8%, transparent) 0%, color-mix(in oklch, var(--accent) 6%, transparent) 50%, color-mix(in oklch, var(--primary) 4%, transparent) 100%)",
          }}
        />

        {/* Floating decorative pins */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <MapPin className="animate-float absolute top-[15%] left-[10%] h-6 w-6 text-primary/15 sm:h-8 sm:w-8" />
          <MapPin className="animate-float animation-delay-1000 absolute top-[20%] right-[12%] h-5 w-5 text-accent/15 sm:h-7 sm:w-7" />
          <MapPin className="animate-float animation-delay-2000 absolute bottom-[25%] left-[20%] h-4 w-4 text-primary/10 sm:h-6 sm:w-6" />
          <Navigation className="animate-float animation-delay-600 absolute right-[18%] bottom-[30%] h-5 w-5 text-accent/10 sm:h-6 sm:w-6" />
        </div>

        <div className="animate-fade-in-up flex flex-col items-center gap-6">
          <MapPin className="h-10 w-10 text-primary sm:h-12 sm:w-12" />

          <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl">
            Find Your Perfect{" "}
            <span className="text-primary">Homestay</span>
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Compare distances, check driving times, and pick the ideal base
            for your trip — all in one place. The smartest way to choose
            where to stay.
          </p>

          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={handleNewTrip}
              className="bg-accent px-8 py-6 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:bg-accent/90 hover:shadow-xl sm:px-10 sm:py-7 sm:text-lg"
            >
              Start New Trip
            </Button>
            <p className="text-sm text-muted-foreground">
              Free to use. No account required.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="animate-fade-in-up mb-10 text-center sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to pick the perfect base
            </h2>
            <p className="mt-3 text-muted-foreground">
              Powerful tools, dead-simple workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`animate-fade-in-up ${FEATURE_DELAYS[i]} flex gap-4 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md sm:p-6`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-muted/50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center sm:mb-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three steps to your ideal homestay.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {/* Connector line (desktop only) */}
            <div className="absolute top-12 right-[16.67%] left-[16.67%] hidden h-0.5 bg-border sm:block" />

            {steps.map((s) => (
              <div
                key={s.num}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md sm:h-16 sm:w-16">
                  <s.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <span className="mb-1 text-xs font-semibold tracking-widest text-primary uppercase">
                  Step {s.num}
                </span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats / Social Proof ── */}
      <section className="px-4 py-16 sm:py-20">
        <h2 className="sr-only">By the numbers</h2>
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold tracking-tight sm:text-4xl">
                {s.value}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-muted/50 px-4 py-16 sm:py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to find your perfect homestay?
          </h2>
          <p className="text-muted-foreground">
            Start planning in seconds — no sign-up, no credit card, no catch.
          </p>
          <Button
            size="lg"
            onClick={handleNewTrip}
            className="cursor-pointer bg-accent px-8 py-6 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:bg-accent/90 hover:shadow-xl sm:px-10 sm:py-7 sm:text-lg"
          >
            Start New Trip
          </Button>
          <p className="text-sm text-muted-foreground">
            No sign-up required
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-semibold">Homestay Locator</span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Built for travelers, by travelers.
          </p>
          <p className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} Homestay Locator
          </p>
        </div>
      </footer>
    </div>
  );
}
