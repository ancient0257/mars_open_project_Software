const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ── Mock library data ─────────────────────────────────────────────────────────
const books = [
  { id: "B001", title: "Introduction to Algorithms", author: "Cormen et al.", isbn: "978-0262033848", category: "Computer Science", available: 2, total: 5, location: "Shelf CS-3A" },
  { id: "B002", title: "The Pragmatic Programmer", author: "Hunt & Thomas", isbn: "978-0135957059", category: "Computer Science", available: 0, total: 3, location: "Shelf CS-1B", dueBack: "2026-06-15" },
  { id: "B003", title: "Clean Code", author: "Robert C. Martin", isbn: "978-0132350884", category: "Computer Science", available: 1, total: 4, location: "Shelf CS-2A" },
  { id: "B004", title: "Design Patterns", author: "Gang of Four", isbn: "978-0201633610", category: "Computer Science", available: 3, total: 3, location: "Shelf CS-4C" },
  { id: "B005", title: "Deep Learning", author: "Goodfellow et al.", isbn: "978-0262035613", category: "AI/ML", available: 1, total: 2, location: "Shelf ML-1A" },
  { id: "B006", title: "Pattern Recognition & ML", author: "Bishop", isbn: "978-0387310732", category: "AI/ML", available: 0, total: 2, location: "Shelf ML-1B", dueBack: "2026-06-20" },
  { id: "B007", title: "Operating System Concepts", author: "Silberschatz et al.", isbn: "978-1119800361", category: "Systems", available: 4, total: 6, location: "Shelf SYS-2A" },
  { id: "B008", title: "Computer Networks", author: "Tanenbaum", isbn: "978-0132126953", category: "Networks", available: 2, total: 4, location: "Shelf NET-1A" },
  { id: "B009", title: "The Mythical Man-Month", author: "Frederick Brooks", isbn: "978-0201835953", category: "Software Engineering", available: 1, total: 2, location: "Shelf SE-1A" },
  { id: "B010", title: "Discrete Mathematics", author: "Kenneth Rosen", isbn: "978-0072899054", category: "Mathematics", available: 5, total: 8, location: "Shelf MATH-3B" },
];

const dueDates = [
  { studentId: "S001", bookId: "B002", dueDate: "2026-06-15", title: "The Pragmatic Programmer" },
  { studentId: "S002", bookId: "B006", dueDate: "2026-06-20", title: "Pattern Recognition & ML" },
];

// ── MCP Tool Definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "search_books",
    description: "Search the library catalog by title, author, or category",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (title, author, or category)" },
        category: { type: "string", description: "Filter by category (optional)" },
        available_only: { type: "boolean", description: "Show only available books" },
      },
      required: ["query"],
    },
  },
  {
    name: "check_availability",
    description: "Check availability of a specific book by title or ID",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book ID (e.g. B001)" },
        title: { type: "string", description: "Book title to search for" },
      },
    },
  },
  {
    name: "get_due_dates",
    description: "Get upcoming due dates for borrowed books",
    inputSchema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "Student ID (optional)" },
      },
    },
  },
];

// ── Tool Handlers ─────────────────────────────────────────────────────────────
function searchBooks({ query, category, available_only }) {
  const q = query.toLowerCase();
  let results = books.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
  );
  if (category) results = results.filter((b) => b.category.toLowerCase() === category.toLowerCase());
  if (available_only) results = results.filter((b) => b.available > 0);
  return { count: results.length, books: results };
}

function checkAvailability({ book_id, title }) {
  let book = null;
  if (book_id) book = books.find((b) => b.id === book_id);
  else if (title) book = books.find((b) => b.title.toLowerCase().includes(title.toLowerCase()));
  if (!book) return { found: false, message: "Book not found in catalog" };
  return {
    found: true,
    book,
    status: book.available > 0 ? "Available" : "All copies checked out",
    availableCopies: book.available,
    totalCopies: book.total,
    dueBack: book.dueBack || null,
  };
}

function getDueDates({ student_id }) {
  const results = student_id ? dueDates.filter((d) => d.studentId === student_id) : dueDates;
  return { count: results.length, dueDates: results };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// MCP manifest — lists available tools
app.get("/mcp/manifest", (req, res) => {
  res.json({
    server: "library",
    displayName: "Campus Library",
    description: "Search books, check availability, and view due dates",
    version: "1.0.0",
    tools: TOOLS,
  });
});

// MCP tool invocation
app.post("/mcp/invoke", (req, res) => {
  const { tool, input } = req.body;
  try {
    let result;
    switch (tool) {
      case "search_books":
        result = searchBooks(input);
        break;
      case "check_availability":
        result = checkAvailability(input);
        break;
      case "get_due_dates":
        result = getDueDates(input);
        break;
      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }
    res.json({ success: true, tool, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", server: "library" }));

app.listen(PORT, () => console.log(`📚 Library MCP Server running on :${PORT}`));
