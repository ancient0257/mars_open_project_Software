"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, LayoutDashboard, MessageSquare, User, X } from "lucide-react";
import ServerStatus from "@/components/dashboard/ServerStatus";
import DashboardWidgets from "@/components/dashboard/DashboardWidgets";
import ChatPanel from "@/components/chat/ChatPanel";

function getGreeting(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const STORAGE_KEY = "campus-intel-student-id";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");
  const [greeting, setGreeting] = useState("morning");
  const [dateStr, setDateStr] = useState("");
  const [studentId, setStudentId] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const authInputRef = useRef<HTMLInputElement>(null);

  // Load student ID from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setStudentId(stored);
  }, []);

  useEffect(() => {
    const now = new Date();
    setGreeting(getGreeting(now.getHours()));
    setDateStr(
      now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    );
  }, []);

  function handleSaveStudentId(id: string) {
    const trimmed = id.trim().toUpperCase();
    setStudentId(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setShowAuth(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 glass-bright">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-spark to-spark-bright flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="font-bold text-fog tracking-tight text-sm">
              Campus<span className="text-spark-bright">Intel</span>
            </span>
          </div>

          {/* Tabs (desktop) */}
          <nav className="hidden sm:flex items-center gap-1 p-1 bg-ink-muted rounded-xl">
            {(["dashboard", "chat"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeTab === tab ? "bg-spark/20 text-spark-bright" : "text-fog-dim hover:text-fog"
                }`}
              >
                {tab === "dashboard" ? <LayoutDashboard size={13} /> : <MessageSquare size={13} />}
                {tab}
              </button>
            ))}
          </nav>

          {/* Server status + Auth */}
          <div className="flex-1 hidden md:flex justify-end items-center gap-3">
            <ServerStatus />
            {/* Student ID button */}
            <button
              onClick={() => setShowAuth(!showAuth)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                studentId ? "bg-jade/20 text-jade border border-jade/30" : "text-fog-dim hover:text-fog border border-white/10"
              }`}
              title={studentId ? `Signed in as ${studentId}` : "Set Student ID for personalized results"}
            >
              <User size={12} />
              {studentId || "Sign In"}
            </button>
          </div>
        </div>

        {/* Auth dropdown */}
        {showAuth && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl glass border border-spark/20"
            >
              <User size={14} className="text-spark-bright flex-shrink-0" />
              <input
                ref={authInputRef}
                type="text"
                placeholder="Enter Student ID (e.g. STU001)"
                defaultValue={studentId}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveStudentId(authInputRef.current?.value || "");
                  if (e.key === "Escape") setShowAuth(false);
                }}
                className="flex-1 bg-transparent border-none outline-none text-sm text-fog placeholder:text-fog-faint"
                autoFocus
              />
              <button
                onClick={() => handleSaveStudentId(authInputRef.current?.value || "")}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-spark/20 text-spark-bright hover:bg-spark/30 transition-colors"
              >
                Save
              </button>
              <button onClick={() => setShowAuth(false)} className="text-fog-dim hover:text-fog">
                <X size={14} />
              </button>
              {studentId && (
                <button
                  onClick={() => handleSaveStudentId("")}
                  className="text-xs text-rose hover:text-rose/80 ml-2"
                >
                  Clear
                </button>
              )}
            </motion.div>
          </div>
        )}
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* Mobile tabs */}
        <div className="flex sm:hidden gap-1 p-1 bg-ink-muted rounded-xl mb-4">
          {(["dashboard", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeTab === tab ? "bg-spark/20 text-spark-bright" : "text-fog-dim"
              }`}
            >
              {tab === "dashboard" ? <LayoutDashboard size={13} /> : <MessageSquare size={13} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Mobile server status */}
        <div className="md:hidden mb-4">
          <ServerStatus />
        </div>

        {/* ── Dashboard View ───────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Hero */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-bold text-fog"
              >
                Good {greeting} 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="text-fog-dim text-sm mt-1"
              >
                {dateStr && <>{dateStr}{" · "}</>}Live data from all campus systems
              </motion.p>
            </div>

            {/* Widgets grid */}
            <DashboardWidgets />

            {/* AI Assistant prompt strip */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-spark/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={18} className="text-spark-bright" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fog">Have a specific question?</p>
                  <p className="text-xs text-fog-dim mt-0.5">
                    The AI assistant can answer anything — it queries all campus servers in real-time.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("chat")}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 glow-spark"
                style={{ background: "linear-gradient(135deg, #7c6af5, #a594ff)" }}
              >
                Open Chat →
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Chat View ────────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-[calc(100vh-9rem)]"
          >
            <ChatPanel studentId={studentId} />
          </motion.div>
        )}
      </main>
    </div>
  );
}
