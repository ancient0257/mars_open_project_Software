"use client";

import { useEffect, useState } from "react";

// ── Types matching actual MCP server responses ───────────────────────────────
interface CafeteriaData {
  day: string;
  menu: {
    breakfast: string[];
    lunch: string[];
    snacks: string[];
    dinner: string[];
  };
  timings?: Record<string, { start: string; end: string }>;
}

interface EventItem {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  organizer?: string;
  description?: string;
}

interface ExamItem {
  courseCode: string;
  courseName: string;
  date: string;
  time: string;
  venue: string;
  type: string;
}

interface DeadlineItem {
  title: string;
  date: string;
  type: string;
  course?: string;
}

interface LibraryData {
  books: { id: string; title: string; author: string; available: number; total: number; genre?: string; location?: string }[];
  studyRooms: { id: string; name: string; capacity: number; available: boolean }[];
}

interface DashboardData {
  cafeteria: CafeteriaData | null;
  events: EventItem[];
  exams: ExamItem[];
  deadlines: DeadlineItem[];
  library: LibraryData | null;
  timestamp: string;
}

// ── Styling ───────────────────────────────────────────────────────────────────
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "var(--font-display), sans-serif",
  color: "var(--text-primary)",
};

const mutedStyle: React.CSSProperties = { color: "var(--text-muted)", fontSize: 11 };

function SkeletonCard() {
  return (
    <div style={cardStyle}>
      <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 4 }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ width: `${85 - i * 10}%`, height: 12, borderRadius: 4 }} />
      ))}
    </div>
  );
}

// ── Cafeteria Card ────────────────────────────────────────────────────────────
function CafeteriaCard({ data }: { data: CafeteriaData | null }) {
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "snacks" | "dinner">("lunch");
  if (!data) return <SkeletonCard />;

  const meals = ["breakfast", "lunch", "snacks", "dinner"] as const;
  const icons: Record<string, string> = { breakfast: "☀️", lunch: "🌤️", snacks: "🍵", dinner: "🌙" };
  const items = data.menu[meal] || [];
  const timing = data.timings?.[meal];

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span>🍽️</span> Cafeteria Today
        <span className="badge" style={{ marginLeft: "auto", background: "rgba(74,222,128,0.08)", color: "var(--green)", border: "1px solid rgba(74,222,128,0.2)" }}>
          {data.day}
        </span>
      </div>
      <div style={{ display: "flex", gap: 3, padding: "2px", background: "var(--bg-raised)", borderRadius: 8 }}>
        {meals.map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            style={{
              flex: 1, padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 500, fontFamily: "var(--font-display), sans-serif",
              textTransform: "capitalize",
              background: meal === m ? "var(--amber)" : "transparent",
              color: meal === m ? "#0b0d14" : "var(--text-muted)",
            }}
          >
            {icons[m]} {m}
          </button>
        ))}
      </div>
      {timing && <span style={mutedStyle}>⏰ {timing.start} – {timing.end}</span>}
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflow: "auto" }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6 }}>
            <span style={{ color: "var(--amber)", fontSize: 10 }}>▸</span> {item}
          </li>
        ))}
        {items.length === 0 && <li style={{ fontSize: 12, color: "var(--text-muted)" }}>No items listed</li>}
      </ul>
    </div>
  );
}

// ── Events Card ───────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  tech_fest: "#4a9eff", club_event: "#a78bfa", cultural: "#f87171",
  academic: "#fbbf24", sports: "#4ade80",
};

function EventsCard({ data }: { data: EventItem[] }) {
  if (!data) return <SkeletonCard />;
  const visible = data.slice(0, 4);

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}><span>🎉</span> Upcoming Events</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.length === 0 && <span style={mutedStyle}>No upcoming events</span>}
        {visible.map((ev) => {
          const color = CAT_COLORS[ev.category] || "#8b91b8";
          const d = new Date(ev.date + "T00:00:00");
          const day = d.getDate();
          const month = d.toLocaleDateString("en", { month: "short" });
          const venueShort = ev.venue?.split("—")[0]?.trim() || ev.venue;

          return (
            <div key={ev.id} style={{
              display: "flex", gap: 10, padding: 10,
              background: "var(--bg-raised)", borderRadius: 8,
              border: "1px solid var(--border)",
            }}>
              <div style={{
                textAlign: "center", minWidth: 36,
                background: `${color}14`, borderRadius: 6, padding: "4px 6px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "var(--font-display), sans-serif" }}>{day}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-display), sans-serif" }}>{month}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {ev.time} · {venueShort}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Exams Card ────────────────────────────────────────────────────────────────
function ExamsCard({ data }: { data: ExamItem[] }) {
  if (!data) return <SkeletonCard />;

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}><span>📝</span> Exam Schedule</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.length === 0 && <span style={mutedStyle}>No exams scheduled</span>}
        {data.map((ex, i) => {
          const d = new Date(ex.date + "T00:00:00");
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
          const urgent = diff >= 0 && diff <= 3;
          const label = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff < 0 ? `${-diff}d ago` : `In ${diff}d`;

          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 10px", background: "var(--bg-raised)", borderRadius: 8,
              border: `1px solid ${urgent ? "rgba(248,113,113,0.3)" : "var(--border)"}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ex.courseName}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                  {ex.courseCode} · {ex.time}
                </div>
              </div>
              <span className="badge" style={{
                background: urgent ? "rgba(248,113,113,0.1)" : "rgba(74,158,255,0.08)",
                color: urgent ? "var(--red)" : "var(--blue)",
                border: `1px solid ${urgent ? "rgba(248,113,113,0.2)" : "rgba(74,158,255,0.18)"}`,
                flexShrink: 0,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Deadlines Card ────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, string> = {
  assignment: "📄", registration: "📋", financial: "💰", general: "📌",
};

function DeadlinesCard({ data }: { data: DeadlineItem[] }) {
  if (!data) return <SkeletonCard />;

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}><span>⏳</span> Deadlines</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {data.length === 0 && <span style={mutedStyle}>No upcoming deadlines 🎉</span>}
        {data.map((d, i) => {
          const due = new Date(d.date + "T00:00:00");
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
          const urgent = diff <= 2;
          const label = diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : diff < 0 ? `${-diff}d ago` : `In ${diff}d`;

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 4px",
              borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontSize: 14 }}>{TYPE_ICONS[d.type] || "📌"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.title}
                </div>
                {d.course && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{d.course}</div>}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, fontFamily: "var(--font-display), sans-serif",
                color: urgent ? "var(--red)" : "var(--text-muted)", flexShrink: 0,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Library Card ──────────────────────────────────────────────────────────────
function LibraryCard({ data }: { data: LibraryData | null }) {
  if (!data) return <SkeletonCard />;
  const books = data.books.slice(0, 3);
  const rooms = data.studyRooms?.filter((r) => r.available).slice(0, 2) || [];

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}><span>📚</span> Library</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {books.map((b) => (
          <div key={b.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 8px", background: "var(--bg-raised)", borderRadius: 6,
            border: "1px solid var(--border)", gap: 8,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.title}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{b.author}</div>
            </div>
            <span className="badge" style={{
              background: b.available > 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
              color: b.available > 0 ? "var(--green)" : "var(--red)",
              border: `1px solid ${b.available > 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
              flexShrink: 0,
            }}>
              {b.available > 0 ? `${b.available}/${b.total}` : "Out"}
            </span>
          </div>
        ))}
        {books.length === 0 && <span style={mutedStyle}>No books found</span>}
      </div>
      {rooms.length > 0 && (
        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 8, marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 500, fontFamily: "var(--font-display), sans-serif", color: "var(--text-muted)", marginBottom: 4 }}>
            🟢 Study Rooms Available
          </div>
          {rooms.map((r) => (
            <div key={r.id} style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {r.name} · capacity {r.capacity}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard Widgets Grid ───────────────────────────────────────────────
export default function DashboardWidgets() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    fetch("/api/dashboard", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => {
        if (err.name !== "AbortError" && !cancelled) {
          console.error("Dashboard fetch failed:", err);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (error && !data) {
    return (
      <div style={{ ...cardStyle, textAlign: "center", gridColumn: "1 / -1" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          ⚠️ Could not load dashboard. Make sure all MCP servers are running.
        </p>
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      <CafeteriaCard data={data?.cafeteria ?? null} />
      <EventsCard data={data?.events ?? []} />
      <ExamsCard data={data?.exams ?? []} />
      <DeadlinesCard data={data?.deadlines ?? []} />
      <LibraryCard data={data?.library ?? null} />
    </div>
  );
}
