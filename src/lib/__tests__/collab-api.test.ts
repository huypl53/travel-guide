import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockGt = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: mockSelect.mockReturnThis(),
      insert: mockInsert.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      gt: mockGt.mockReturnThis(),
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    }),
  }),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-slug1"),
}));

describe("POST /api/collab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session and returns slug", async () => {
    mockSingle.mockResolvedValue({
      data: { slug: "test-slug1" },
      error: null,
    });

    const { POST } = await import("@/app/api/collab/route");
    const request = new Request("http://localhost/api/collab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripName: "My Trip", locations: [] }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(body.slug).toBe("test-slug1");
    expect(response.status).toBe(200);
  });

  it("returns 500 on DB error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { POST } = await import("@/app/api/collab/route");
    const request = new Request("http://localhost/api/collab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripName: "Trip" }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(500);
  });
});

describe("GET /api/collab/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session data", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        slug: "abc",
        trip_name: "Trip",
        trip_data: [{ id: "1", name: "Test" }],
        updated_at: "2026-03-18T00:00:00Z",
      },
      error: null,
    });

    const { GET } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/abc");
    const response = await GET(request as never, { params: Promise.resolve({ slug: "abc" }) });
    const body = await response.json();

    expect(body.slug).toBe("abc");
    expect(body.tripName).toBe("Trip");
    expect(body.tripData).toHaveLength(1);
  });

  it("returns 404 for missing session", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { GET } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/missing");
    const response = await GET(request as never, { params: Promise.resolve({ slug: "missing" }) });

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/collab/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates session and returns ok", async () => {
    mockGt.mockReturnValue({ error: null });

    const { PATCH } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripName: "Updated" }),
    });

    const response = await PATCH(request as never, { params: Promise.resolve({ slug: "abc" }) });
    const body = await response.json();

    expect(body.ok).toBe(true);
  });
});
