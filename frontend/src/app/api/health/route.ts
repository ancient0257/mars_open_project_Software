import { NextResponse } from "next/server";
import { MCP_SERVERS } from "@/lib/mcp-client";

export async function GET() {
  const results = await Promise.allSettled(
    MCP_SERVERS.map(async (server) => {
      try {
        const res = await fetch(`${server.url}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        return { id: server.id, name: server.name, online: res.ok, status: data.status };
      } catch {
        return { id: server.id, name: server.name, online: false, status: "offline" };
      }
    })
  );

  const servers = results.map((r) =>
    r.status === "fulfilled" ? r.value : { online: false, status: "error" }
  );

  return NextResponse.json({ servers, timestamp: new Date().toISOString() });
}
