import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server — chain builder that returns `this` for all query methods
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {};
function createChain() {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "eq", "gt", "maybeSingle", "single"]) {
    const fn = vi.fn();
    mockChain[method] = fn;
    fn.mockImplementation(() => chain);
    chain[method] = fn;
  }
  return chain;
}

const supabaseChain = createChain();

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServer: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue(supabaseChain),
  }),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-slug1"),
}));

describe("POST /api/collab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire chain after clearAllMocks
    for (const method of Object.keys(mockChain)) {
      mockChain[method].mockImplementation(() => supabaseChain);
    }
  });

  it("creates a session and returns slug", async () => {
    mockChain.single.mockResolvedValue({
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
    mockChain.single.mockResolvedValue({
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

  it("returns 400 for invalid location items", async () => {
    const { POST } = await import("@/app/api/collab/route");
    const request = new Request("http://localhost/api/collab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripName: "Trip",
        locations: [{ bad: "data" }],
      }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-array locations", async () => {
    const { POST } = await import("@/app/api/collab/route");
    const request = new Request("http://localhost/api/collab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripName: "Trip", locations: "not-array" }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });
});

describe("GET /api/collab/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.keys(mockChain)) {
      mockChain[method].mockImplementation(() => supabaseChain);
    }
  });

  it("returns session data", async () => {
    mockChain.maybeSingle.mockResolvedValue({
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
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const { GET } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/missing");
    const response = await GET(request as never, { params: Promise.resolve({ slug: "missing" }) });

    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid slug format", async () => {
    const { GET } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/invalid slug!");
    const response = await GET(request as never, {
      params: Promise.resolve({ slug: "invalid slug!" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/collab/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of Object.keys(mockChain)) {
      mockChain[method].mockImplementation(() => supabaseChain);
    }
  });

  it("updates session and returns ok", async () => {
    // .select("slug") after the chain returns an array with the matched row
    mockChain.select.mockResolvedValue({
      data: [{ slug: "abc" }],
      error: null,
    });

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

  it("returns 404 for non-existent or expired session", async () => {
    mockChain.select.mockResolvedValue({
      data: [],
      error: null,
    });

    const { PATCH } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/expired", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripName: "Updated" }),
    });

    const response = await PATCH(request as never, { params: Promise.resolve({ slug: "expired" }) });
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid slug format", async () => {
    const { PATCH } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/bad!slug", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripName: "X" }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ slug: "bad!slug" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid tripData items", async () => {
    const { PATCH } = await import("@/app/api/collab/[slug]/route");
    const request = new Request("http://localhost/api/collab/abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripData: [{ wrong: "shape" }] }),
    });

    const response = await PATCH(request as never, { params: Promise.resolve({ slug: "abc" }) });
    expect(response.status).toBe(400);
  });
});
