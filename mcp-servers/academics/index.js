const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3004;

// ── Mock academic data ────────────────────────────────────────────────────────
const courses = [
  { code: "CS301", name: "Data Structures & Algorithms", credits: 4, instructor: "Dr. Priya Sharma", semester: 3, schedule: "Mon/Wed/Fri 10:00–11:00 AM", room: "LH-101" },
  { code: "CS401", name: "Machine Learning", credits: 4, instructor: "Dr. Amit Patel", semester: 5, schedule: "Tue/Thu 2:00–3:30 PM", room: "LH-204" },
  { code: "CS402", name: "Computer Networks", credits: 3, instructor: "Prof. R. Narayanan", semester: 5, schedule: "Mon/Wed 11:00 AM–12:00 PM", room: "LH-105" },
  { code: "CS501", name: "Distributed Systems", credits: 4, instructor: "Dr. K. Subramaniam", semester: 7, schedule: "Tue/Thu 10:00–11:30 AM", room: "LH-302" },
  { code: "CS502", name: "Deep Learning", credits: 3, instructor: "Dr. Amit Patel", semester: 7, schedule: "Mon/Wed/Fri 3:00–4:00 PM", room: "ML-Lab" },
  { code: "MA201", name: "Probability & Statistics", credits: 3, instructor: "Prof. S. Mehta", semester: 3, schedule: "Mon/Wed/Fri 9:00–10:00 AM", room: "LH-102" },
  { code: "EC301", name: "Digital Signal Processing", credits: 3, instructor: "Dr. L. Krishnan", semester: 5, schedule: "Tue/Thu 11:00 AM–12:00 PM", room: "EC-201" },
];

const deadlines = [
  { id: "D001", type: "Assignment", course: "CS401", title: "ML Assignment 2 — Linear Regression", dueDate: "2026-06-12", dueTime: "11:59 PM", submissionLink: "https://lms.example.edu/ml-a2" },
  { id: "D002", type: "Project", course: "CS301", title: "DSA Project: Graph Algorithms Implementation", dueDate: "2026-06-20", dueTime: "5:00 PM", submissionLink: "https://lms.example.edu/dsa-proj" },
  { id: "D003", type: "Exam", course: "CS402", title: "Mid-Semester Exam — Computer Networks", dueDate: "2026-06-15", dueTime: "2:00 PM", venue: "Exam Hall B" },
  { id: "D004", type: "Quiz", course: "MA201", title: "Probability Quiz 3", dueDate: "2026-06-09", dueTime: "10:00 AM", submissionLink: "https://lms.example.edu/prob-q3" },
  { id: "D005", type: "Assignment", course: "CS502", title: "CNN Architecture Report", dueDate: "2026-06-18", dueTime: "11:59 PM", submissionLink: "https://lms.example.edu/dl-cnn" },
  { id: "D006", type: "Registration", course: null, title: "Course Registration for Semester 7", dueDate: "2026-06-25", dueTime: "5:00 PM", submissionLink: "https://erp.example.edu/register" },
];

const handbookSections = [
  { section: "1.1", title: "Academic Calendar", content: "Odd semester: July–November. Even semester: December–April. Summer term: May–June. Re-registration deadline is 3 days after semester start." },
  { section: "1.2", title: "Attendance Policy", content: "Minimum 75% attendance required per course to be eligible for end-semester exams. Medical leave is counted but supporting documents must be submitted within 3 days." },
  { section: "2.1", title: "Grading System", content: "10-point grading scale. O (Outstanding): 10, A+ (Excellent): 9, A (Very Good): 8, B+ (Good): 7, B (Above Average): 6, C (Average): 5, P (Pass): 4, F (Fail): 0." },
  { section: "2.2", title: "CGPA Calculation", content: "CGPA = Sum(Grade Points × Credits) / Sum(Credits) across all completed semesters. Minimum CGPA of 5.0 required for graduation." },
  { section: "3.1", title: "Anti-Plagiarism Policy", content: "Any form of plagiarism results in zero marks for the submission. Repeat offenses lead to academic probation. Use Turnitin via LMS for self-check before submission." },
  { section: "4.1", title: "Hostel Rules", content: "Curfew at 11 PM for UG students. Visitors allowed in common areas only (10 AM–8 PM). Ragging strictly prohibited and punishable under law." },
  { section: "5.1", title: "Examination Rules", content: "Report 15 minutes before exam. No electronic devices allowed. Blue/black pen only. Rough work on answer sheet margins only." },
];

// ── MCP Tool Definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_deadlines",
    description: "Get upcoming assignment, exam, and project deadlines",
    inputSchema: {
      type: "object",
      properties: {
        course_code: { type: "string", description: "Filter by course code (e.g. CS401)" },
        type: { type: "string", enum: ["Assignment", "Project", "Exam", "Quiz", "Registration"], description: "Filter by type" },
        days_ahead: { type: "number", description: "Show deadlines within next N days (default 14)" },
      },
    },
  },
  {
    name: "search_courses",
    description: "Search for courses by name, code, or instructor",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Course name, code, or instructor name" },
        semester: { type: "number", description: "Filter by semester number" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_handbook",
    description: "Search the academic handbook for policies, rules, and procedures",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What policy or rule to search for" },
      },
      required: ["query"],
    },
  },
];

// ── Tool Handlers ─────────────────────────────────────────────────────────────
function getDeadlines({ course_code, type, days_ahead = 14 }) {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days_ahead);

  let results = deadlines.filter((d) => {
    const due = new Date(d.dueDate);
    return due >= today && due <= cutoff;
  });

  if (course_code) results = results.filter((d) => d.course === course_code.toUpperCase());
  if (type) results = results.filter((d) => d.type === type);
  results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { count: results.length, deadlines: results };
}

function searchCourses({ query, semester }) {
  const q = query.toLowerCase();
  let results = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.instructor.toLowerCase().includes(q)
  );
  if (semester) results = results.filter((c) => c.semester === semester);
  return { count: results.length, courses: results };
}

function getHandbook({ query }) {
  const q = query.toLowerCase();
  const results = handbookSections.filter(
    (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
  );
  return { count: results.length, sections: results };
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/mcp/manifest", (req, res) => {
  res.json({
    server: "academics",
    displayName: "Academic Resources",
    description: "Course schedules, deadlines, and handbook policies",
    version: "1.0.0",
    tools: TOOLS,
  });
});

app.post("/mcp/invoke", (req, res) => {
  const { tool, input } = req.body;
  try {
    let result;
    switch (tool) {
      case "get_deadlines": result = getDeadlines(input || {}); break;
      case "search_courses": result = searchCourses(input); break;
      case "get_handbook": result = getHandbook(input); break;
      default: return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }
    res.json({ success: true, tool, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", server: "academics" }));

app.listen(PORT, () => console.log(`📖 Academics MCP Server running on :${PORT}`));
