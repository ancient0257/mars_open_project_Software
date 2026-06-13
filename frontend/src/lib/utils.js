// ── Today-midnight cache — refreshed at midnight, never recomputed mid-day ────
let _todayMs = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
(function scheduleMidnightRefresh() {
  setTimeout(() => { _todayMs += 86_400_000; _dateCache.clear(); scheduleMidnightRefresh(); },
    _todayMs + 86_400_000 - Date.now() + 1);
})();

// ── Date string → ms cache — same dateStr parsed at most once ever ────────────
// All date strings in this app are "YYYY-MM-DD" format, finite in number,
// reused across renders. Cache the ms value after first parse.
const _dateCache = new Map();
function dateMs(dateStr) {
  let ms = _dateCache.get(dateStr);
  if (ms === undefined) {
    ms = new Date(dateStr + "T00:00:00").getTime();
    _dateCache.set(dateStr, ms);
  }
  return ms;
}

// ── Pre-built Intl formatters — allocated once, reused via .format() ──────────
const FMT_FULL  = new Intl.DateTimeFormat("en-IN", { weekday:"short", day:"numeric", month:"short" });
const FMT_DAY   = new Intl.DateTimeFormat("en",    { day:"numeric" });
const FMT_MONTH = new Intl.DateTimeFormat("en",    { month:"short" });

// ── Formatted string cache — same dateStr formatted at most once ever ─────────
const _fmtCache     = new Map();
const _fmtEvtCache  = new Map(); // [day, month] tuples

export function getDaysUntil(dateStr) {
  const diff = Math.round((dateMs(dateStr) - _todayMs) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0)  return `${-diff}d ago`;
  return `In ${diff}d`;
}

export function isUrgent(dateStr) {
  const diff = Math.round((dateMs(dateStr) - _todayMs) / 86_400_000);
  return diff >= 0 && diff <= 3;
}

export function formatDate(dateStr) {
  let s = _fmtCache.get(dateStr);
  if (!s) { s = FMT_FULL.format(new Date(dateMs(dateStr))); _fmtCache.set(dateStr, s); }
  return s;
}

export function formatEventDate(dateStr) {
  let t = _fmtEvtCache.get(dateStr);
  if (!t) {
    const d = new Date(dateMs(dateStr));
    t = [FMT_DAY.format(d), FMT_MONTH.format(d)];
    _fmtEvtCache.set(dateStr, t);
  }
  return t;
}

// ── Stable IDs ────────────────────────────────────────────────────────────────
let _id = 0;
export const nextMsgId = () => `m${++_id}`;

// ── Static lookup tables ──────────────────────────────────────────────────────
// NavPill pre-builds full border strings — eliminates template literal per render
export const SERVER_COLORS = {
  library:   { dot:"#f5a623", bg:"rgba(245,166,35,0.08)",  border:"rgba(245,166,35,0.18)",  borderStr:"1px solid rgba(245,166,35,0.18)"  },
  cafeteria: { dot:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.18)",  borderStr:"1px solid rgba(74,222,128,0.18)"  },
  events:    { dot:"#a78bfa", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.18)", borderStr:"1px solid rgba(167,139,250,0.18)" },
  academics: { dot:"#4a9eff", bg:"rgba(74,158,255,0.08)",  border:"rgba(74,158,255,0.18)",  borderStr:"1px solid rgba(74,158,255,0.18)"  },
};

export const CAT_COLOR = {
  tech_fest:"#4a9eff", club_event:"#a78bfa", cultural:"#f87171", academic:"#fbbf24", sports:"#4ade80",
};

export const MEAL_ICON = { breakfast:"☀️", lunch:"🌤️", snacks:"🍵", dinner:"🌙" };

export const SUGGESTIONS = [
  "What's for lunch today?",
  "Any tech workshops this week?",
  "Is Introduction to Algorithms available?",
  "When are my mid-sem exams?",
  "Which study rooms are free?",
  "Show upcoming academic deadlines",
];
