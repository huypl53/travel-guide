import { Compass } from "lucide-react";
import { TRIP_TEMPLATES } from "@/lib/templates";
import { TemplateCard } from "@/components/template-card";

export function TemplateBrowser() {
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center sm:mb-12">
          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <Compass className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-widest uppercase">
              Quick Start
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Popular Trip Templates
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start with a curated itinerary and customize it to your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {TRIP_TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </div>
    </section>
  );
}
