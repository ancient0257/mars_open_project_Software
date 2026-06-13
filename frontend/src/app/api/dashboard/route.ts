import { NextResponse } from "next/server";

const SERVERS = {
  cafeteria: process.env.CAFETERIA_MCP_URL || "http://localhost:3002",
  events:    process.env.EVENTS_MCP_URL    || "http://localhost:3003",
  academics: process.env.ACADEMICS_MCP_URL || "http://localhost:3004",
  library:   process.env.LIBRARY_MCP_URL   || "http://localhost:3001",
};

const POST_HEADERS = { "Content-Type": "application/json" };
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" };

async function mcpCall(url: string, tool: string, parameters: Record<string, unknown> = {}) {
  const res = await fetch(`${url}/mcp/execute`, {
    method: "POST",
    headers: POST_HEADERS,
    body: JSON.stringify({ tool, parameters }),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function GET() {
  const [menuRes, eventsRes, examsRes, deadlinesRes, booksRes, roomsRes] = await Promise.allSettled([
    mcpCall(SERVERS.cafeteria, "get_todays_menu"),
    mcpCall(SERVERS.events, "get_upcoming_events", { limit: 5 }),
    mcpCall(SERVERS.academics, "get_exam_schedule"),
    mcpCall(SERVERS.academics, "get_deadlines"),
    mcpCall(SERVERS.library, "search_books", { query: "computer" }),
    mcpCall(SERVERS.library, "get_study_rooms"),
  ]);

  const ok = (r: PromiseSettledResult<unknown>) => r.status === "fulfilled" && (r.value as { success?: boolean })?.success !== false;

  return NextResponse.json(
    {
      cafeteria: ok(menuRes)      ? (menuRes as PromiseFulfilledResult<{ data: unknown }>).value.data         : null,
      events:    ok(eventsRes)    ? (eventsRes as PromiseFulfilledResult<{ data: unknown[] }>).value.data      : [],
      exams:     ok(examsRes)     ? (examsRes as PromiseFulfilledResult<{ data: unknown[] }>).value.data.slice(0, 4) : [],
      deadlines: ok(deadlinesRes) ? (deadlinesRes as PromiseFulfilledResult<{ data: unknown[] }>).value.data.slice(0, 5) : [],
      library: {
        books: ok(booksRes)       ? (booksRes as PromiseFulfilledResult<{ data: unknown[] }>).value.data.slice(0, 4)   : [],
        studyRooms: ok(roomsRes)  ? (roomsRes as PromiseFulfilledResult<{ data: unknown[] }>).value.data               : [],
      },
      timestamp: new Date().toISOString(),
    },
    { headers: CACHE_HEADERS },
  );
}
