const express = require("express");
const cors    = require("cors");
const app     = express();

// Scope CORS to the frontend origin only — avoids sending headers on every non-preflight
const CORS_OPTS = { origin: process.env.FRONTEND_URL || "*", methods: ["GET","POST"] };
app.use(cors(CORS_OPTS));
app.use(express.json({ limit: "16kb" }));  // tighten body limit (manifests are tiny)

app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ── Data ──────────────────────────────────────────────────────────────────────
const books = [
  { id: "B001", title: "Introduction to Algorithms",              author: "Cormen et al.",     isbn: "978-0262046305", genre: "Computer Science", available: 2, total: 5, location: "Section C, Shelf 3" },
  { id: "B002", title: "The Feynman Lectures on Physics",         author: "Richard Feynman",   isbn: "978-0465023820", genre: "Physics",          available: 0, total: 3, location: "Section A, Shelf 7" },
  { id: "B003", title: "Engineering Mathematics",                 author: "H.K. Dass",         isbn: "978-8121903455", genre: "Mathematics",      available: 4, total: 4, location: "Section B, Shelf 1" },
  { id: "B004", title: "Data Structures using C",                 author: "Aaron M. Tenenbaum",isbn: "978-8120311770", genre: "Computer Science", available: 1, total: 3, location: "Section C, Shelf 1" },
  { id: "B005", title: "Signals and Systems",                     author: "Oppenheim & Willsky",isbn:"978-0138147570", genre: "Electronics",      available: 3, total: 4, location: "Section D, Shelf 2" },
  { id: "B006", title: "Organic Chemistry",                       author: "Morrison & Boyd",   isbn: "978-8120305878", genre: "Chemistry",        available: 0, total: 2, location: "Section E, Shelf 5" },
  { id: "B007", title: "Fluid Mechanics",                         author: "Frank White",       isbn: "978-0073398273", genre: "Mechanical",       available: 2, total: 3, location: "Section F, Shelf 4" },
  { id: "B008", title: "Machine Learning: A Probabilistic Perspective", author: "Kevin Murphy",isbn:"978-0262018029",  genre: "Computer Science", available: 1, total: 2, location: "Section C, Shelf 5" },
];

// Two parallel arrays: clean originals + index-only rows.
// search_books returns from cleanBooks — no rest-spread object creation per result.
const bookIndex = books.map((b) => ({
  _titleLC:  b.title.toLowerCase(),
  _authorLC: b.author.toLowerCase(),
  _genreLC:  b.genre.toLowerCase(),
  _genreOrig: b.genre,
  _isbn: b.isbn,
  _idx: 0, // set below
}));
books.forEach((_, i) => { bookIndex[i]._idx = i; });
const bookById = Object.fromEntries(books.map((b) => [b.id, b]));


const studyRooms = [
  { id: "SR1", name: "Discussion Room Alpha",  capacity: 6,  available: true,  nextAvailableAt: null },
  { id: "SR2", name: "Discussion Room Beta",   capacity: 8,  available: false, nextAvailableAt: "14:00" },
  { id: "SR3", name: "Silent Study Pod 1",     capacity: 2,  available: true,  nextAvailableAt: null },
  { id: "SR4", name: "Silent Study Pod 2",     capacity: 2,  available: false, nextAvailableAt: "15:30" },
  { id: "SR5", name: "Group Lab Room",         capacity: 12, available: true,  nextAvailableAt: null },
];

const issuedBooks = [
  { studentId: "STU001", bookId: "B002", dueDate: "2026-06-15", title: "The Feynman Lectures on Physics" },
  { studentId: "STU001", bookId: "B006", dueDate: "2026-06-12", title: "Organic Chemistry" },
];

// Pre-sort study rooms by capacity ascending — filter becomes a slice from index
const roomsByCapacity = [...studyRooms].sort((a, b) => a.capacity - b.capacity);
function firstRoomGte(minCap) {
  let lo = 0, hi = roomsByCapacity.length;
  while (lo < hi) { const mid = (lo+hi)>>>1; if (roomsByCapacity[mid].capacity < minCap) lo=mid+1; else hi=mid; }
  return lo;
}

// Pre-index issued books by student ID — O(1) lookup instead of O(n) filter
const issuedByStudent = issuedBooks.reduce((acc, b) => {
  (acc[b.studentId] ??= []).push(b); return acc;
}, {});

// ── Manifest — pre-serialised once, sent as raw string every request ──────────
const MANIFEST_JSON = JSON.stringify({
  name: "library-mcp",
  description: "Campus Library MCP Server — book search, availability, study rooms",
  version: "1.0.0",
  tools: [
    { name: "search_books",      description: "Search for books by title, author, genre, or ISBN",     parameters: { type: "object", properties: { query: { type: "string" }, genre: { type: "string" } }, required: ["query"] } },
    { name: "check_availability",description: "Check if a specific book is available for borrowing",   parameters: { type: "object", properties: { book_id: { type: "string" } }, required: ["book_id"] } },
    { name: "get_study_rooms",   description: "Get available study rooms, optionally by min capacity", parameters: { type: "object", properties: { min_capacity: { type: "number" } } } },
    { name: "get_my_due_dates",  description: "Get due dates for books issued to a student",            parameters: { type: "object", properties: { student_id: { type: "string" } }, required: ["student_id"] } },
  ],
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Send pre-serialised JSON — bypasses JSON.stringify on every request
app.get("/mcp/manifest", (_, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=300"); // manifest never changes at runtime
  res.send(MANIFEST_JSON);
});

app.post("/mcp/execute", (req, res) => {
  const { tool, parameters = {} } = req.body;
  if (!tool) return res.status(400).json({ success: false, error: "Missing tool" });

  if (tool === "search_books") {
    const q = (parameters.query ?? "").toLowerCase().trim();
    if (!q) return res.json({ success: false, error: "query required" });
    const genreLC = (parameters.genre ?? "").toLowerCase();
    // Use pre-lowercased index fields — no .toLowerCase() calls at query time
    // Use index for matching, return original book objects — no per-result object allocation
    const data = bookIndex
      .filter((b) =>
        (b._titleLC.includes(q) || b._authorLC.includes(q) || b._genreLC.includes(q) || b._isbn.includes(q)) &&
        (!genreLC || b._genreLC === genreLC)
      )
      .map((b) => books[b._idx]);
    return res.json({ success: true, data, count: data.length });
  }

  if (tool === "check_availability") {
    const book = bookById[parameters.book_id];
    if (!book) return res.json({ success: false, error: `Book not found: ${parameters.book_id}` });
    return res.json({ success: true, data: { ...book, status: book.available > 0 ? "available" : "all_copies_issued" } });
  }

  if (tool === "get_study_rooms") {
    const min = Number(parameters.min_capacity) || 1;
    return res.json({ success: true, data: roomsByCapacity.slice(firstRoomGte(min)) });
  }

  if (tool === "get_my_due_dates") {
    const sid = (parameters.student_id ?? "").trim();
    if (!sid) return res.json({ success: false, error: "student_id required" });
    return res.json({ success: true, data: issuedByStudent[sid] ?? [] });
  }

  res.status(400).json({ success: false, error: `Unknown tool: ${tool}` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`📚 Library MCP :${PORT}`));
