const express = require("express");
const cors    = require("cors");
const app     = express();

const CORS_OPTS = { origin: process.env.FRONTEND_URL || "*", methods: ["GET","POST"] };
app.use(cors(CORS_OPTS));
app.use(express.json({ limit: "16kb" }));
app.use((_, res, next) => { res.setHeader("X-Content-Type-Options","nosniff"); res.setHeader("X-Frame-Options","DENY"); next(); });

const events = [
  { id:"E001", title:"Cognizance Tech Fest — Web Dev Workshop", category:"tech_fest",  organizer:"Cognizance IITR",         date:"2026-06-14", time:"10:00", endTime:"13:00", venue:"Lecture Hall Complex — LHC 101",    description:"Hands-on React and Node.js workshop.",              tags:["web","react","javascript","workshop"], registrationRequired:true,  registrationLink:"https://cognizance.org.in/register", maxParticipants:60,   registeredCount:47, speaker:"Mr. Ankit Sharma, SDE-2 Google" },
  { id:"E002", title:"Finance Club — Quant Trading Seminar",    category:"club_event", organizer:"Finance Club, IITR",       date:"2026-06-11", time:"17:00", endTime:"18:30", venue:"New Lecture Hall — NLH 204",         description:"Quant trading strategies and paper trading demos.", tags:["finance","quant","trading"],             registrationRequired:false, maxParticipants:null, registeredCount:0, speaker:"Finance Club Core Team" },
  { id:"E003", title:"Robotics Club — Line Follower Workshop",  category:"club_event", organizer:"Robotics Club, IITR",      date:"2026-06-13", time:"14:00", endTime:"17:00", venue:"Electronics Workshop, EE Block",     description:"Build a line-following robot with Arduino.",        tags:["robotics","arduino","embedded"],         registrationRequired:true,  registrationLink:"mailto:robotics@iitr.ac.in", maxParticipants:30, registeredCount:28, speaker:"Prof. R.K. Pandey" },
  { id:"E004", title:"Thomso — Opening Ceremony",               category:"cultural",   organizer:"Thomso IITR",              date:"2026-06-20", time:"18:00", endTime:"22:00", venue:"James Thomason Ground",               description:"Opening ceremony with live music and DJ night.",    tags:["cultural","music","dance","fest"],        registrationRequired:false, maxParticipants:null, registeredCount:0, speaker:"Various Artists" },
  { id:"E005", title:"Placement Cell — Resume Building",        category:"academic",   organizer:"T&P Cell, IITR",           date:"2026-06-12", time:"15:00", endTime:"16:30", venue:"Seminar Hall, IIT Roorkee",           description:"ATS-friendly resumes for tech and finance roles.", tags:["placements","resume","career"],           registrationRequired:true,  registrationLink:"https://iitr.ac.in/tpc/register", maxParticipants:100, registeredCount:83, speaker:"T&P Alumni" },
  { id:"E006", title:"ML Study Group — Transformers Deep Dive", category:"club_event", organizer:"Data Science Group, IITR", date:"2026-06-15", time:"20:00", endTime:"21:30", venue:"Online (Google Meet)",                description:"Attention mechanisms and fine-tuning LLMs.",       tags:["ml","ai","transformers","nlp"],           registrationRequired:false, maxParticipants:null, registeredCount:0, speaker:"DSG Core" },
];

// Pre-computed indexes — built once at startup
const eventById   = Object.fromEntries(events.map((e) => [e.id, e]));
const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

// Pre-computed lowercase search fields — no .toLowerCase() per query
const searchIndex = events.map((e) => ({
  id: e.id,
  _title:    e.title.toLowerCase(),
  _desc:     e.description.toLowerCase(),
  _org:      e.organizer.toLowerCase(),
  _tags:     e.tags, // already lowercase
}));


// Binary search for first index where date >= target (sorted ascending)
// O(log n) instead of O(n) linear scan — skips all past events
function firstDateGte(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].date < target) lo = mid + 1; else hi = mid;
  }
  return lo;
}

const MANIFEST_JSON = JSON.stringify({
  name:"events-mcp", description:"Campus Events MCP Server — tech fests, clubs, workshops, cultural", version:"1.0.0",
  tools:[
    { name:"get_upcoming_events",    description:"Get upcoming events sorted by date",                         parameters:{ type:"object", properties:{ limit:{type:"number"} } } },
    { name:"search_events",          description:"Search events by keyword, tag, or organizer",               parameters:{ type:"object", properties:{ query:{type:"string"} }, required:["query"] } },
    { name:"get_event_details",      description:"Get full details of a specific event by ID",                 parameters:{ type:"object", properties:{ event_id:{type:"string"} }, required:["event_id"] } },
    { name:"get_events_by_category", description:"Get events by category: tech_fest, club_event, cultural, academic, sports", parameters:{ type:"object", properties:{ category:{type:"string"} }, required:["category"] } },
  ],
});

app.get("/health", (_, res) => res.json({ status:"ok" }));
app.get("/mcp/manifest", (_, res) => {
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","public, max-age=300");
  res.send(MANIFEST_JSON);
});

app.post("/mcp/execute", (req, res) => {
  const { tool, parameters = {} } = req.body;
  if (!tool) return res.status(400).json({ success:false, error:"Missing tool" });

  const today = new Date().toISOString().slice(0, 10);

  if (tool === "get_upcoming_events") {
    const limit = Math.min(Number(parameters.limit) || 10, 20);
    const start = firstDateGte(sortedEvents, today);
    const data  = sortedEvents.slice(start, start + limit);
    return res.json({ success:true, data, count:data.length });
  }

  if (tool === "search_events") {
    const q = (parameters.query ?? "").toLowerCase().trim();
    if (!q) return res.json({ success:false, error:"query required" });
    // Use pre-lowercased index — no allocation per field per event
    const ids = new Set(
      searchIndex
        .filter((s) => s._title.includes(q) || s._desc.includes(q) || s._org.includes(q) || s._tags.some((t) => t.includes(q)))
        .map((s) => s.id)
    );
    const data = events.filter((e) => ids.has(e.id));
    return res.json({ success:true, data, count:data.length });
  }

  if (tool === "get_event_details") {
    const event = eventById[parameters.event_id];
    return event
      ? res.json({ success:true, data:event })
      : res.json({ success:false, error:`Event not found: ${parameters.event_id}` });
  }

  if (tool === "get_events_by_category") {
    const cat = (parameters.category ?? "").trim();
    if (!cat) return res.json({ success:false, error:"category required" });
    const data = events.filter((e) => e.category === cat);
    return res.json({ success:true, data, count:data.length });
  }

  res.status(400).json({ success:false, error:`Unknown tool: ${tool}` });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`🎉 Events MCP :${PORT}`));
