import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { SaveTripButton } from "@/components/save-trip-button";
import { isSafeImageUrl } from "@/lib/utils";

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: trip } = await supabase
    .from("trips")
    .select("*, locations(*)")
    .eq("share_slug", slug)
    .single();

  if (!trip) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadySaved = false;
  if (user) {
    const { data } = await supabase
      .from("saved_trips")
      .select("id")
      .eq("user_id", user.id)
      .eq("trip_id", trip.id)
      .maybeSingle();
    alreadySaved = !!data;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{trip.name}</h1>
          <p className="text-sm text-muted-foreground">
            Shared trip — read only
          </p>
        </div>
        {user && trip.user_id !== user.id && (
          <SaveTripButton tripId={trip.id} initialSaved={alreadySaved} />
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <h2 className="font-semibold mb-2">Homestays</h2>
          <ul className="space-y-1">
            {trip.locations
              ?.filter((l: { type: string }) => l.type === "homestay")
              .map((l: { id: string; name: string; notes: string | null; photo_url: string | null }) => (
                <li key={l.id} className="text-sm">
                  <span>{l.name}</span>
                  {l.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{l.notes}</p>
                  )}
                  {l.photo_url && isSafeImageUrl(l.photo_url) && (
                    <Image src={l.photo_url} alt={l.name} width={64} height={64} unoptimized className="mt-1 h-16 w-16 rounded object-cover" />
                  )}
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Destinations</h2>
          <ul className="space-y-1">
            {trip.locations
              ?.filter((l: { type: string }) => l.type === "destination")
              .map(
                (l: { id: string; name: string; priority: number; notes: string | null; photo_url: string | null }) => (
                  <li key={l.id} className="text-sm">
                    <span>{l.name} (priority: {l.priority})</span>
                    {l.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{l.notes}</p>
                    )}
                    {l.photo_url && isSafeImageUrl(l.photo_url) && (
                      <Image src={l.photo_url} alt={l.name} width={64} height={64} unoptimized className="mt-1 h-16 w-16 rounded object-cover" />
                    )}
                  </li>
                )
              )}
          </ul>
        </div>
      </div>
    </div>
  );
}
