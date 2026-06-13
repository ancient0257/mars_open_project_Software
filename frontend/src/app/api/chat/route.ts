import { NextRequest, NextResponse } from "next/server";

const MCP_SERVERS = [
  { id: "library",   name: "Library",   url: process.env.LIBRARY_MCP_URL   || "http://localhost:3001" },
  { id: "cafeteria", name: "Cafeteria", url: process.env.CAFETERIA_MCP_URL || "http://localhost:3002" },
  { id: "events",    name: "Events",    url: process.env.EVENTS_MCP_URL    || "http://localhost:3003" },
  { id: "academics", name: "Academics", url: process.env.ACADEMICS_MCP_URL || "http://localhost:3004" },
];

// ── Tool registry cache ───────────────────────────────────────────────────────
interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface CacheEntry {
  apiTools: ToolDef[];
  registry: Map<string, { serverUrl: string; serverId: string; actualName: string }>;
  serverNames: string[];
  ts: number;
}

const cache: { current: CacheEntry | null; inFlight: Promise<CacheEntry> | null; TTL: number } = {
  current: null,
  inFlight: null,
  TTL: 60_000,
};

async function getToolRegistry(): Promise<CacheEntry> {
  const now = Date.now();
  if (cache.current && now - cache.current.ts < cache.TTL) return cache.current;
  if (cache.inFlight) return cache.inFlight;

  cache.inFlight = Promise.allSettled(
    MCP_SERVERS.map(async (server) => {
      const res = await fetch(`${server.url}/mcp/manifest`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`${server.id} ${res.status}`);
      const manifest = await res.json();
      return { server, manifest };
    })
  ).then((results) => {
    const apiTools: ToolDef[] = [];
    const registry = new Map<string, { serverUrl: string; serverId: string; actualName: string }>();
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const { server, manifest } = r.value;
      for (const tool of (manifest.tools || [])) {
        const name = `${server.id}__${tool.name}`;
        apiTools.push({
          name,
          description: `[${server.name}] ${tool.description}`,
          parameters: tool.parameters || tool.inputSchema || { type: "object", properties: {} },
        });
        registry.set(name, { serverUrl: server.url, serverId: server.id, actualName: tool.name });
      }
    }
    const entry: CacheEntry = {
      apiTools,
      registry,
      serverNames: results.filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<{ server: typeof MCP_SERVERS[0] }>).value.server.name),
      ts: Date.now(),
    };
    cache.current = entry;
    cache.inFlight = null;
    return entry;
  });

  return cache.inFlight;
}

// ── DeepSeek API (OpenAI-compatible — raw fetch) ──────────────────────────────
function getApiKey(): string | null {
  return process.env.DEEPSEEK_API_KEY || null;
}

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

function buildDeepSeekTools(apiTools: ToolDef[]) {
  return apiTools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

const SYSTEM_MSG = {
  role: "system",
  content:
    "You are CampusIQ, a concise assistant for university students.\n" +
    "You have real-time access to: Library, Cafeteria, Events, Academics via tools.\n" +
    "- Always call the appropriate tool(s) — never fabricate data.\n" +
    "- For compound queries, call multiple tools in the SAME turn.\n" +
    "- Cite which system the data came from.\n" +
    "- Respond in clear markdown. Be brief and helpful.\n" +
    `- Today's date: ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
};

async function callDeepSeek(
  messages: { role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string }[],
  tools: ReturnType<typeof buildDeepSeekTools>,
  apiKey: string
) {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: 1024,
    messages,
  };
  if (tools.length) body.tools = tools;

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "deepseek_error");
  return data;
}

async function executeTool(
  name: string,
  input: string,
  registry: Map<string, { serverUrl: string; serverId: string; actualName: string }>,
  parentSignal: AbortSignal
) {
  const entry = registry.get(name);
  if (!entry) throw new Error(`Unknown tool: ${name}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  if (parentSignal.aborted) { clearTimeout(timer); throw new DOMException("Aborted", "AbortError"); }
  parentSignal.addEventListener("abort", () => { clearTimeout(timer); controller.abort(); }, { once: true });

  try {
    const params = JSON.parse(input);
    const res = await fetch(`${entry.serverUrl}/mcp/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: entry.actualName, parameters: params }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`MCP ${entry.actualName} ${res.status}`);
    return { serverId: entry.serverId, result: await res.json() };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });
  }

  let message: string, history: { role: string; content: string }[];
  try {
    const body = await req.json();
    message = body.message;
    history = body.history || [];
    if (!message && body.messages?.length) {
      const lastUser = [...body.messages].reverse().find((m: { role: string }) => m.role === "user");
      message = lastUser?.content || "";
      history = body.messages.slice(0, -1).filter((m: { role: string }) => m.role !== "assistant");
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  try {
    const { apiTools, registry, serverNames } = await getToolRegistry();
    const deepseekTools = buildDeepSeekTools(apiTools);

    if (apiTools.length === 0) {
      return NextResponse.json({
        text: "⚠️ All campus MCP servers appear to be offline. Please start the library, cafeteria, events, and academics servers.",
        toolCalls: [],
      });
    }

    // Build conversation thread (OpenAI format)
    const thread: { role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string }[] = [
      SYSTEM_MSG,
      ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const toolCallLog: { tool: string; server: string; result: unknown }[] = [];
    let loopCount = 0;
    let data = await callDeepSeek(thread, deepseekTools, apiKey);
    let choice = data.choices?.[0];

    while (choice?.finish_reason === "tool_calls" && loopCount++ < 4) {
      const assistantMsg = choice.message;
      thread.push(assistantMsg);

      // Execute all tool calls in parallel
      const toolCalls = assistantMsg.tool_calls || [];
      const results = await Promise.allSettled(
        toolCalls.map((tc: { id: string; function: { name: string; arguments: string } }) =>
          executeTool(tc.function.name, tc.function.arguments, registry, req.signal)
        )
      );

      // Add tool results to thread
      for (let i = 0; i < toolCalls.length; i++) {
        const tc = toolCalls[i];
        const r = results[i];
        const content = r.status === "fulfilled"
          ? JSON.stringify(r.value.result)
          : '{"error":"tool failed"}';

        if (r.status === "fulfilled") {
          toolCallLog.push({
            tool: tc.function.name.slice(tc.function.name.indexOf("__") + 2),
            server: r.value.serverId,
            result: r.value.result,
          });
        }

        thread.push({ role: "tool", tool_call_id: tc.id, content });
      }

      data = await callDeepSeek(thread, deepseekTools, apiKey);
      choice = data.choices?.[0];
    }

    const finalText = choice?.message?.content || "No response generated.";

    return NextResponse.json({
      text: finalText,
      message: finalText,
      toolCalls: toolCallLog,
      toolsUsed: toolCallLog.map((t) => ({ server: t.server, tool: t.tool })),
      availableServers: serverNames,
    });
  } catch (err) {
    console.error("chat:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", text: "⚠️ Sorry, I encountered an error processing your request. Please try again." },
      { status: 500 }
    );
  }
}
