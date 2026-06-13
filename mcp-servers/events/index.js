const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;

// ── Mock events data ──────────────────────────────────────────────────────────
const events = [
  {
    id: "E001",
    title: "TechFest 2026 — Hackathon",
    club: "IEEE Student Chapter",
    category: "Technical",
    date: "2026-06-14",
    time: "9:00 AM",
    endTime: "9:00 PM",
    venue: "Main Auditorium + Lab Block",
    description: "24-hour hackathon with cash prizes up to ₹50,000. Theme: AI for Social Good.",
    registrationLink: "https://techfest.example.edu/register",
    capacity: 200,
    registered: 147,
    tags: ["hackathon", "AI", "coding", "prizes"],
  },
  {
    id: "E002",
    title: "Workshop: Introduction to WebRTC",
    club: "Web Dev Club",
    category: "Workshop",
    date: "2026-06-10",
    time: "3:00 PM",
    endTime: "5:00 PM",
    venue: "CS Seminar Hall (Room 204)",
    description: "Hands-on workshop covering WebRTC fundamentals, peer connections, and data channels.",
    registrationLink: "https://webdevclub.example.edu/webrtc",
    capacity: 60,
    registered: 58,
    tags: ["webrtc", "web", "workshop", "networking"],
  },
  {
    id: "E003",
    title: "Cultural Night: Ranga Utsav",
    club: "Cultural Committee",
    category: "Cultural",
    date: "2026-06-13",
    time: "6:00 PM",
    endTime: "10:00 PM",
    venue: "Open Air Theatre",
    description: "Annual cultural night featuring dance, music, drama, and stand-up comedy.",
    registrationLink: null,
    capacity: 1000,
    registered: 650,
    tags: ["cultural", "dance", "music", "drama"],
  },
  {
    id: "E004",
    title: "ML Study Group: Transformer Architecture",
    club: "AI/ML Club",
    category: "Study Group",
    date: "2026-06-09",
    time: "5:00 PM",
    endTime: "7:00 PM",
    venue: "Library Reading Room B",
    description: "Deep dive into self-attention, positional encodings, and the original 'Attention Is All You Need' paper.",
    registrationLink: "https://aiml.example.edu/study",
    capacity: 30,
    registered: 22,
    tags: ["ML", "transformers", "study", "AI"],
  },
  {
    id: "E005",
    title: "Campus Placement Drive — Google",
    club: "Placement Cell",
    category: "Placement",
    date: "2026-06-16",
    time: "8:00 AM",
    endTime: "6:00 PM",
    venue: "Admin Block Hall A",
    description: "Google campus recruitment for SWE and SRE roles. Eligible: BE/BTech final year CS/ECE students.",
    registrationLink: "https://placement.example.edu/google2026",
    capacity: 120,
    registered: 98,
    tags: ["placement", "google", "interview", "jobs"],
  },
  {
    id: "E006",
    title: "Photography Walk: Campus at Dawn",
    club: "Photography Club",
    category: "Club Activity",
    date: "2026-06-08",
    time: "6:00 AM",
    endTime: "8:00 AM",
    venue: "Meet at Main Gate",
    description: "Early morning campus photography walk. Bring your phone or DSLR. All skill levels welcome.",
    registrationLink: null,
    capacity: 40,
    registered: 28,
    tags: ["photography", "art", "outdoor"],
  },
  {
    id: "E007",
    title: "Guest Lecture: Generative AI in Industry",
    club: "CSE Department",
    category: "Academic",
    date: "2026-06-11",
    time: "2:00 PM",
    endTime: "4:00 PM",
    venue: "Central Lecture Hall",
    description: "Industry talk by a senior engineer from Anthropic on real-world LLM deployment challenges.",
    registrationLink: "https://cse.example.edu/genai-lecture",
    capacity: 300,
    registered: 289,
    tags: ["AI", "lecture", "generative AI", "industry"],
  },
];

// ── MCP Tool Definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "list_events",
    description: "List all upcoming campus events, optionally filtered by category or date",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category (Technical, Cultural, Workshop, etc.)" },
        date: { type: "string", description: "Filter by date (YYYY-MM-DD)" },
        upcoming_only: { type: "boolean", description: "Show only future events (default true)" },
      },
    },
  },
  {
    name: "search_events",
    description: "Search events by keyword (title, description, tags, club name)",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_event_details",
    description: "Get full details for a specific event by ID",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "Event ID (e.g. E001)" },
      },
      required: ["event_id"],
    },
  },
];

// ── Tool Handlers ─────────────────────────────────────────────────────────────
function listEvents({ category, date, upcoming_only = true }) {
  let results = [...events];
  if (upcoming_only) {
    const today = new Date().toISOString().split("T")[0];
    results = results.filter((e) => e.date >= today);
  }
  if (category) results = results.filter((e) => e.category.toLowerCase() === category.toLowerCase());
  if (date) results = results.filter((e) => e.date === date);
  results.sort((a, b) => a.date.localeCompare(b.date));
  return { count: results.length, events: results };
}

function searchEvents({ query }) {
  const q = query.toLowerCase();
  const results = events.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.club.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
  );
  return { count: results.length, events: results };
}

function getEventDetails({ event_id }) {
  const event = events.find((e) => e.id === event_id);
  if (!event) return { found: false, message: `Event ${event_id} not found` };
  return { found: true, event, spotsLeft: event.capacity - event.registered };
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/mcp/manifest", (req, res) => {
  res.json({
    server: "events",
    displayName: "Campus Events",
    description: "Browse and search campus events, workshops, and club activities",
    version: "1.0.0",
    tools: TOOLS,
  });
});

app.post("/mcp/invoke", (req, res) => {
  const { tool, input } = req.body;
  try {
    let result;
    switch (tool) {
      case "list_events": result = listEvents(input || {}); break;
      case "search_events": result = searchEvents(input); break;
      case "get_event_details": result = getEventDetails(input); break;
      default: return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }
    res.json({ success: true, tool, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", server: "events" }));

app.listen(PORT, () => console.log(`📅 Events MCP Server running on :${PORT}`));
