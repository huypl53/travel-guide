import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TripCard } from "../trip-card";
import type { TripCardData } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseTripCard: TripCardData = {
  id: "trip-1",
  name: "Da Lat Trip",
  shareSlug: "abc123",
  createdAt: new Date().toISOString(),
  homestayCount: 3,
  destinationCount: 5,
  topHomestay: "Mountain View Lodge",
  isSaved: false,
};

describe("TripCard", () => {
  it("renders trip name and counts", () => {
    render(<TripCard trip={baseTripCard} onDelete={vi.fn()} />);
    expect(screen.getByText("Da Lat Trip")).toBeDefined();
    expect(screen.getByText(/3 homestays/)).toBeDefined();
    expect(screen.getByText(/5 destinations/)).toBeDefined();
  });

  it("renders top homestay name", () => {
    render(<TripCard trip={baseTripCard} onDelete={vi.fn()} />);
    expect(screen.getByText(/Mountain View Lodge/)).toBeDefined();
  });

  it("shows Saved badge when isSaved is true", () => {
    const saved = { ...baseTripCard, isSaved: true };
    render(<TripCard trip={saved} onDelete={vi.fn()} />);
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("does not show Saved badge when isSaved is false", () => {
    render(<TripCard trip={baseTripCard} onDelete={vi.fn()} />);
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
