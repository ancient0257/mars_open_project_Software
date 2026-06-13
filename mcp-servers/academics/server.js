const express = require("express");
const cors    = require("cors");
const app     = express();

const CORS_OPTS = { origin: process.env.FRONTEND_URL || "*", methods: ["GET","POST"] };
app.use(cors(CORS_OPTS));
app.use(express.json({ limit: "16kb" }));
app.use((_, res, next) => { res.setHeader("X-Content-Type-Options","nosniff"); res.setHeader("X-Frame-Options","DENY"); next(); });

const examSchedule = [
  { courseCode:"CSN-301", courseName:"Theory of Computation",    date:"2026-06-18", time:"09:00", duration:"3h", venue:"Examination Hall A",   type:"mid_semester" },
  { courseCode:"ECN-202", courseName:"Signals and Systems",      date:"2026-06-19", time:"14:00", duration:"3h", venue:"Examination Hall B",   type:"mid_semester" },
  { courseCode:"MTN-201", courseName:"Probability & Statistics", date:"2026-06-20", time:"09:00", duration:"3h", venue:"Lecture Hall Complex", type:"mid_semester" },
  { courseCode:"CSN-401", courseName:"Computer Networks",        date:"2026-06-21", time:"14:00", duration:"3h", venue:"Examination Hall A",   type:"mid_semester" },
  { courseCode:"HMN-101", courseName:"Professional Communication",date:"2026-06-22",time:"09:00", duration:"2h", venue:"Seminar Hall 1",       type:"mid_semester" },
];

const academicCalendar = [
  { event:"Mid Semester Examinations Begin", date:"2026-06-18", type:"exam" },
  { event:"Mid Semester Examinations End",   date:"2026-06-26", type:"exam" },
  { event:"Last Date for Course Withdrawal", date:"2026-06-25", type:"deadline" },
  { event:"Summer Internship End",           date:"2026-07-15", type:"general" },
  { event:"End Semester Examinations Begin", date:"2026-11-20", type:"exam" },
  { event:"Winter Break Begins",             date:"2026-12-15", type:"holiday" },
];

const courses = [
  { code:"CSN-301", name:"Theory of Computation",          credits:4, department:"CSE",         semester:5, faculty:"Prof. Manish Kumar",           prerequisites:["CSN-201"], description:"Automata theory, formal languages, Turing machines." },
  { code:"CSN-401", name:"Computer Networks",              credits:4, department:"CSE",         semester:7, faculty:"Prof. S.R. Singh",             prerequisites:["CSN-301"], description:"OSI/TCP-IP models, routing, wireless networks." },
  { code:"CSN-501", name:"Machine Learning",               credits:4, department:"CSE",         semester:7, faculty:"Prof. Balasubramanian Raman",  prerequisites:["MTN-201"], description:"Supervised and unsupervised learning, neural networks." },
  { code:"MTN-201", name:"Probability & Statistics",       credits:4, department:"Mathematics", semester:3, faculty:"Prof. A.K. Lal",               prerequisites:[],          description:"Probability theory, distributions, hypothesis testing." },
  { code:"ECN-202", name:"Signals and Systems",            credits:4, department:"ECE",         semester:3, faculty:"Prof. K.K. Sharma",            prerequisites:["MTN-101"], description:"Signals, Fourier analysis, Laplace and Z-transforms." },
  { code:"PHN-101", name:"Engineering Physics",            credits:4, department:"Physics",     semester:1, faculty:"Prof. R.P. Tandon",            prerequisites:[],          description:"Mechanics, optics, quantum physics, EM theory." },
];

const faculty = [
  { id:"F001", name:"Prof. Balasubramanian Raman", department:"CSE",         designation:"Professor",           email:"balarfec@iitr.ac.in",        officeHours:"Tue 15:00–17:00, Thu 15:00–17:00", room:"Faculty Block II, Room 203", researchAreas:["Machine Learning","Computer Vision","Medical Imaging"] },
  { id:"F002", name:"Prof. Manish Kumar",           department:"CSE",         designation:"Associate Professor", email:"manish.kumar@cs.iitr.ac.in", officeHours:"Mon 14:00–16:00",                  room:"Faculty Block I, Room 108",  researchAreas:["Automata Theory","Formal Verification"] },
  { id:"F003", name:"Prof. K.K. Sharma",            department:"ECE",         designation:"Professor",           email:"kksharma@iitr.ac.in",        officeHours:"Wed 10:00–12:00",                  room:"EC Block, Room 305",         researchAreas:["Signal Processing","VLSI Design"] },
];

const deadlines = [
  { title:"Minor Project — Phase 1 Submission",         date:"2026-06-16", course:"CSN-499", type:"assignment" },
  { title:"Course Registration for Odd Semester 2026–27",date:"2026-06-20",                  type:"registration" },
  { title:"Scholarship Application Deadline",           date:"2026-06-18",                  type:"financial" },
  { title:"Last Day to Add/Drop Courses",               date:"2026-06-14",                  type:"registration" },
];

// Pre-sorted at startup
const sortedExams     = [...examSchedule].sort((a, b) => a.date.localeCompare(b.date));
const sortedDeadlines = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));
const sortedCalendar  = [...academicCalendar].sort((a, b) => a.date.localeCompare(b.date));

// Pre-computed lowercase search fields for courses and faculty
const courseIndex  = courses.map((c, i) => ({ _nameLC: c.name.toLowerCase(), _codeLC: c.code.toLowerCase(), _deptLC: c.department.toLowerCase(), _descLC: c.description.toLowerCase(), _idx: i }));
const facultyIndex = faculty.map((f, i) => ({ _nameLC: f.name.toLowerCase(), _deptLC: f.department.toLowerCase(), _idx: i }));


// Binary search — O(log n) date lookup on sorted arrays
function firstDateGte(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].date < target) lo = mid + 1; else hi = mid;
  }
  return lo;
}

const MANIFEST_JSON = JSON.stringify({
  name:"academics-mcp", description:"Campus Academics MCP Server — exams, courses, faculty, deadlines", version:"1.0.0",
  tools:[
    { name:"get_exam_schedule",     description:"Get exam schedule, optionally filtered by course code", parameters:{ type:"object", properties:{ course_code:{type:"string"} } } },
    { name:"get_academic_calendar", description:"Get upcoming academic dates and events",                parameters:{ type:"object", properties:{} } },
    { name:"search_courses",        description:"Search courses by name, code, or department",           parameters:{ type:"object", properties:{ query:{type:"string"} }, required:["query"] } },
    { name:"get_faculty_info",      description:"Get faculty info including office hours",               parameters:{ type:"object", properties:{ name:{type:"string"}, department:{type:"string"} } } },
    { name:"get_deadlines",         description:"Get upcoming academic deadlines",                       parameters:{ type:"object", properties:{} } },
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

  if (tool === "get_exam_schedule") {
    const cc = (parameters.course_code ?? "").toLowerCase().trim();
    const data = cc ? sortedExams.filter((e) => e.courseCode.toLowerCase() === cc) : sortedExams;
    return res.json({ success:true, data });
  }

  if (tool === "get_academic_calendar") {
    return res.json({ success:true, data: sortedCalendar.slice(firstDateGte(sortedCalendar, today)) });
  }

  if (tool === "search_courses") {
    const q = (parameters.query ?? "").toLowerCase().trim();
    if (!q) return res.json({ success:false, error:"query required" });
    const data = courseIndex
      .filter((c) => c._nameLC.includes(q) || c._codeLC.includes(q) || c._deptLC.includes(q) || c._descLC.includes(q))
      .map((c) => courses[c._idx]);
    return res.json({ success:true, data });
  }

  if (tool === "get_faculty_info") {
    const nameQ = (parameters.name ?? "").toLowerCase().trim();
    const deptQ = (parameters.department ?? "").toLowerCase().trim();
    const data  = facultyIndex
      .filter((f) => (!nameQ || f._nameLC.includes(nameQ)) && (!deptQ || f._deptLC.includes(deptQ)))
      .map((f) => faculty[f._idx]);
    return res.json({ success:true, data });
  }

  if (tool === "get_deadlines") {
    return res.json({ success:true, data: sortedDeadlines.slice(firstDateGte(sortedDeadlines, today)) });
  }

  res.status(400).json({ success:false, error:`Unknown tool: ${tool}` });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`📖 Academics MCP :${PORT}`));
