# 🏛️ CampusIQ — Unified Campus Intelligence Dashboard

> **IIT Roorkee Finance Club Open Projects 2026 — Problem Statement 1**

🔗 **Live Demo:** [campus-intel-frontend.onrender.com](https://campus-intel-frontend.onrender.com)

A full-stack web application that unifies fragmented campus data sources (library, cafeteria, events, academics) into a single dashboard, powered by an AI assistant that routes natural-language queries to independent **MCP (Model Context Protocol) servers** in real-time.

---

## 🎯 Problem Solved

Students at IIT Roorkee waste time navigating 5+ disconnected portals — a legacy library system, a PDF cafeteria menu, Google Calendar for club events, and massive academic PDF handbooks. CampusIQ brings everything together in one place without a brittle monolithic database.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Unified Dashboard** | Live widgets for today's cafeteria menu, upcoming events, exam schedule, academic deadlines, and library books |
| **AI Assistant** | Natural language Q&A powered by Claude — ask anything, get real data from MCP servers |
| **MCP Architecture** | 4 independent servers for Library, Cafeteria, Events, and Academics |
| **Real-time Tool Routing** | LLM dynamically selects which MCP server(s) to query based on the question |
| **Multi-server Queries** | "What's for dinner AND are there any ML workshops?" hits two servers in one call |
| **Agentic Loop** | Full tool-use loop: LLM → tool call → MCP server → result → final synthesis |
| **No Monolithic DB** | Each server manages its own data; zero shared global state |
| **Server Health Monitoring** | Real-time status indicators for all 4 MCP servers with 30s auto-refresh |
| **Optional Student Auth** | Set your Student ID for personalized results (book due dates, course deadlines) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  ┌──────────────┐    ┌────────────────────────────────┐  │
│  │  Dashboard   │    │         AI Chat Panel          │  │
│  │  Widgets     │    │  (natural language interface)  │  │
│  └──────────────┘    └────────────────────────────────┘  │
└─────────────────────┬──────────────┬────────────────────┘
                      │              │
              /api/dashboard    /api/chat (orchestrator)
                      │              │
                      │     ┌────────▼──────────┐
                      │     │  Anthropic Claude  │
                      │     │  (tool-use mode)   │
                      │     └────────┬──────────┘
                      │              │ decides which tools to call
          ┌───────────┴──────────────▼────────────────┐
          │           MCP Server Layer                  │
          │                                             │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
          │  │ Library  │  │Cafeteria │  │  Events  │  │Academics │ │
          │  │ :3001    │  │  :3002   │  │  :3003   │  │  :3004   │ │
          │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
          └─────────────────────────────────────────────────────────┘
```

### How the AI Routing Works

1. Frontend sends user's message to `/api/chat`
2. Orchestrator fetches `/mcp/manifest` from all active MCP servers
3. All tool definitions are sent to Claude alongside the user query
4. Claude selects which tool(s) to call (e.g. `library__search_books`)
5. Orchestrator executes the tool(s) on the respective MCP server(s) in parallel
6. Results are fed back to Claude for natural language synthesis
7. Final response returned to frontend with `toolsUsed` metadata

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion, Lucide Icons |
| **MCP Servers** | Node.js + Express (one per data source) |
| **AI Integration** | DeepSeek API (`deepseek-chat`) with function calling |
| **Hosting — Frontend** | Vercel |
| **Hosting — MCP Servers** | Render / Railway |

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key → [Get one here](https://console.anthropic.com/)

### 1. Clone and install

```bash
git clone https://github.com/ancient0257/mars_open_project_Software.git
cd mars_open_project_Software
npm run install:all
```

### 2. Configure environment variables

Create `frontend/.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Optionally override MCP server URLs (defaults to localhost):

```env
LIBRARY_MCP_URL=http://localhost:3001
CAFETERIA_MCP_URL=http://localhost:3002
EVENTS_MCP_URL=http://localhost:3003
ACADEMICS_MCP_URL=http://localhost:3004
```

### 3. Start MCP servers

In 4 separate terminals (or use the root `npm run dev` command):

```bash
cd mcp-servers/library   && npm start   # :3001
cd mcp-servers/cafeteria && npm start   # :3002
cd mcp-servers/events    && npm start   # :3003
cd mcp-servers/academics && npm start   # :3004
```

### 4. Start the frontend

```bash
cd frontend && npm run dev   # http://localhost:3000
```

Or run everything at once from the root:

```bash
npm run dev
```

---

## 📡 MCP Server API Reference

Each server exposes three endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check — returns `{ status: "ok" }` |
| `/mcp/manifest` | GET | Returns tool definitions (name, description, parameters) |
| `/mcp/execute` | POST | Execute a tool with `{ tool, parameters }` |

### Library (`:3001`)

| Tool | Description |
|---|---|
| `search_books` | Search books by title, author, genre, or ISBN |
| `check_availability` | Check if a specific book is available |
| `get_study_rooms` | Get available study rooms, optionally by min capacity |
| `get_my_due_dates` | Get due dates for a student's borrowed books |

### Cafeteria (`:3002`)

| Tool | Description |
|---|---|
| `get_todays_menu` | Get today's full menu (breakfast, lunch, snacks, dinner) |
| `get_weekly_menu` | Get weekly menu, optionally filtered by day and meal |
| `get_nutrition_info` | Get nutritional info for a specific dish |
| `get_timings` | Get cafeteria meal timings |

### Events (`:3003`)

| Tool | Description |
|---|---|
| `get_upcoming_events` | Get upcoming events sorted by date |
| `search_events` | Search events by keyword, tag, or organizer |
| `get_event_details` | Get full details for a specific event |
| `get_events_by_category` | Filter events by category (tech_fest, club_event, cultural, academic, sports) |

### Academics (`:3004`)

| Tool | Description |
|---|---|
| `get_exam_schedule` | Get exam schedule, optionally filtered by course code |
| `get_academic_calendar` | Get upcoming academic dates and events |
| `search_courses` | Search courses by name, code, or department |
| `get_faculty_info` | Get faculty info including office hours and research areas |
| `get_deadlines` | Get upcoming academic deadlines |

---

## 📁 Project Structure

```
campus-intel/
├── package.json              # Root workspace config
├── render.yaml               # Render.com deployment config
├── README.md
├── frontend/                 # Next.js 14 App Router
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── globals.css       # Design tokens + glass effects
│       │   ├── layout.tsx        # Root layout (fonts, metadata)
│       │   ├── page.tsx          # Main dashboard + chat UI
│       │   └── api/
│       │       ├── chat/route.ts      # AI orchestrator (Claude agentic loop)
│       │       ├── dashboard/route.ts # Aggregated widget data
│       │       └── health/route.ts    # MCP server health status
│       ├── components/
│       │   ├── chat/ChatPanel.tsx           # AI chat UI
│       │   ├── dashboard/
│       │   │   ├── DashboardWidgets.tsx     # All 5 widget cards
│       │   │   ├── ServerStatus.tsx         # MCP health indicators
│       │   │   └── LibraryWidget.tsx        # Library book widget
│       │   ├── MarkdownContent.js           # Markdown renderer (legacy)
│       │   └── Navbar.js                    # Navbar (legacy)
│       └── lib/
│           ├── mcp-client.ts     # MCP server communication
│           └── utils.js          # Date formatting, color maps
└── mcp-servers/
    ├── library/
    │   ├── server.js        # Express server with book data
    │   ├── index.js         # Alternate implementation
    │   ├── package.json
    │   └── Dockerfile
    ├── cafeteria/
    │   ├── server.js        # Express server with weekly menu
    │   ├── index.js
    │   ├── package.json
    │   └── Dockerfile
    ├── events/
    │   ├── server.js        # Express server with event data
    │   ├── index.js
    │   ├── package.json
    │   └── Dockerfile
    └── academics/
        ├── server.js        # Express server with exam/course data
        ├── index.js
        ├── package.json
        └── Dockerfile
```

---

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel deploy
```

Set environment variable `ANTHROPIC_API_KEY` in Vercel dashboard. Optionally set `LIBRARY_MCP_URL`, `CAFETERIA_MCP_URL`, `EVENTS_MCP_URL`, `ACADEMICS_MCP_URL` to point to your deployed Render services.

### MCP Servers (Render)

Each server deploys independently via `render.yaml` (Blueprint deploy):

```bash
# From repo root
render blueprint apply
```

Or deploy manually — each server in `mcp-servers/` is a standalone Node.js service on its own port.

---

## 🔐 Optional: Student Personalization

Click the **"Sign In"** button in the top nav and enter your Student ID (e.g. `STU001`). Your ID is stored locally in your browser and sent with AI queries to enable personalized results:

- Library: `get_my_due_dates` returns YOUR borrowed books
- Academics: course-specific deadlines filtered to your department

No backend auth required — it's a lightweight, privacy-respecting approach.

---

## 🧪 Example Queries

Try asking the AI assistant:

- "What's for lunch today?"
- "Any tech workshops this week?"
- "Is Introduction to Algorithms available in the library?"
- "When are my mid-semester exams?"
- "Which study rooms are free right now?"
- "Show me upcoming academic deadlines"
- "What's for dinner AND are there any ML events this week?"

---

## 📝 License

MIT — built for IIT Roorkee Finance Club Open Projects 2026.
cd mcp-servers/library && npm install && cd ../..
cd mcp-servers/cafeteria && npm install && cd ../..
cd mcp-servers/events && npm install && cd ../..
cd mcp-servers/academics && npm install && cd ../..
```

### 3. Configure environment variables

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

### 4. Start all services

Open **5 terminal tabs**:

```bash
# Terminal 1 — Library MCP Server
cd mcp-servers/library && node server.js
# → 📚 Library MCP Server running on port 3001

# Terminal 2 — Cafeteria MCP Server
cd mcp-servers/cafeteria && node server.js
# → 🍽️ Cafeteria MCP Server running on port 3002

# Terminal 3 — Events MCP Server
cd mcp-servers/events && node server.js
# → 🎉 Events MCP Server running on port 3003

# Terminal 4 — Academics MCP Server
cd mcp-servers/academics && node server.js
# → 📖 Academics MCP Server running on port 3004

# Terminal 5 — Next.js Frontend
cd frontend && npm run dev
# → http://localhost:3000
```

Or with `concurrently` (install globally: `npm i -g concurrently`):

```bash
concurrently \
  "cd mcp-servers/library && node server.js" \
  "cd mcp-servers/cafeteria && node server.js" \
  "cd mcp-servers/events && node server.js" \
  "cd mcp-servers/academics && node server.js" \
  "cd frontend && npm run dev"
```

---

## 🌐 Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set these environment variables in Vercel dashboard:
- `ANTHROPIC_API_KEY` — your Claude API key
- `LIBRARY_MCP_URL`, `CAFETERIA_MCP_URL`, `EVENTS_MCP_URL`, `ACADEMICS_MCP_URL` — deployed server URLs

### MCP Servers → Render

Deploy each `mcp-servers/*` folder as a separate **Web Service** on Render:

1. New Web Service → connect GitHub repo
2. Root Directory: `mcp-servers/library` (repeat for each)
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Environment: `PORT=10000` (Render sets this automatically)

After deployment, copy each server's URL into Vercel env vars.

---

## 📡 MCP Server API Reference

All MCP servers expose two endpoints:

### `GET /mcp/manifest`
Returns server metadata and all available tool definitions.

```json
{
  "name": "library-mcp",
  "description": "...",
  "tools": [
    {
      "name": "search_books",
      "description": "Search for books by title, author, genre, or ISBN",
      "parameters": { "type": "object", "properties": { "query": { "type": "string" } } }
    }
  ]
}
```

### `POST /mcp/execute`
Execute a specific tool with parameters.

```json
// Request
{ "tool": "search_books", "parameters": { "query": "algorithms" } }

// Response
{ "success": true, "data": [...], "count": 3 }
```

---

## 🔧 MCP Servers Reference

### 📚 Library MCP (`port 3001`)
| Tool | Description |
|---|---|
| `search_books` | Search by title, author, genre, ISBN |
| `check_availability` | Check copies available for a book ID |
| `get_study_rooms` | List available study rooms, filter by capacity |
| `get_my_due_dates` | Get issued books and due dates for a student |

### 🍽️ Cafeteria MCP (`port 3002`)
| Tool | Description |
|---|---|
| `get_todays_menu` | Full today's menu with meal timings |
| `get_weekly_menu` | Full week's menu, optionally filtered by day/meal |
| `get_nutrition_info` | Calorie and macro info for a specific dish |
| `get_timings` | Breakfast/lunch/snacks/dinner timings |

### 🎉 Events MCP (`port 3003`)
| Tool | Description |
|---|---|
| `get_upcoming_events` | List upcoming events sorted by date |
| `search_events` | Search by keyword, tag, or organizer |
| `get_event_details` | Full details for a specific event ID |
| `get_events_by_category` | Filter by: tech_fest, club_event, cultural, academic |

### 📖 Academics MCP (`port 3004`)
| Tool | Description |
|---|---|
| `get_exam_schedule` | Mid/end semester exam schedule |
| `get_academic_calendar` | Key academic dates and events |
| `search_courses` | Search by course name, code, or department |
| `get_faculty_info` | Faculty details, office hours, research areas |
| `get_deadlines` | Upcoming assignment and registration deadlines |

---

## 💬 Example Queries

| Query | Servers Used |
|---|---|
| "What's for lunch today?" | Cafeteria |
| "Is Introduction to Algorithms available?" | Library |
| "Any ML workshops this week?" | Events |
| "When is my TOC exam?" | Academics |
| "What time does the cafeteria close?" | Cafeteria |
| "Show me free study rooms that fit 6 people" | Library |
| "What are the upcoming deadlines?" | Academics |
| "What's for dinner tonight AND any club events tomorrow?" | Cafeteria + Events |

---

## 📁 Project Structure

```
campus-intel/
├── frontend/                    # Next.js application
│   ├── src/
│   │   └── app/
│   │       ├── page.js          # Main dashboard + AI chat UI
│   │       ├── layout.js        # Root layout with fonts
│   │       ├── globals.css      # Design system & global styles
│   │       └── api/
│   │           ├── chat/
│   │           │   └── route.js # AI orchestration (THE brain)
│   │           └── dashboard/
│   │               └── route.js # Dashboard overview data
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── .env.local.example
│
└── mcp-servers/
    ├── library/
    │   ├── server.js            # Library MCP server
    │   └── package.json
    ├── cafeteria/
    │   ├── server.js            # Cafeteria MCP server
    │   └── package.json
    ├── events/
    │   ├── server.js            # Events MCP server
    │   └── package.json
    └── academics/
        ├── server.js            # Academics MCP server
        └── package.json
```

---

## 🔮 Extending the System

To add a new data source (e.g., a Transport/Bus server):

1. Create `mcp-servers/transport/server.js`
2. Implement `GET /mcp/manifest` and `POST /mcp/execute`
3. Add it to the `MCP_SERVERS` array in `frontend/src/app/api/chat/route.js`
4. The AI will automatically discover and use it — **no other changes needed**

This is the power of the MCP architecture: each server is fully independent and self-describing.

---

## 👤 Author

**[Your Name]** — IIT Roorkee  
Finance Club Open Projects 2026  
GitHub: [@your-username](https://github.com/your-username)

---

## 📄 License

MIT
