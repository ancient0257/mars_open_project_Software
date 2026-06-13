"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, ChevronDown, ChevronRight } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolCalls?: { tool: string; server: string; result: unknown }[];
  loading?: boolean;
}

const SUGGESTIONS = [
  "What's for lunch today?",
  "Any upcoming hackathons this week?",
  "Is 'Clean Code' available in the library?",
  "What assignments are due this week?",
  "Tell me about today's cafeteria specials",
  "Search for ML books in the library",
];

const SERVER_META: Record<string, { icon: string; color: string; label: string }> = {
  library:   { icon: "📚", color: "#7c6af5", label: "Library" },
  cafeteria: { icon: "🍽️", color: "#2dd4a0", label: "Cafeteria" },
  events:    { icon: "📅", color: "#f5a623", label: "Events" },
  academics: { icon: "📖", color: "#f56b8a", label: "Academics" },
};

function ToolCallPill({ toolCall }: { toolCall: { tool: string; server: string; result: unknown } }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SERVER_META[toolCall.server] || { icon: "⚙️", color: "#9d9ab0", label: toolCall.server };
  const toolName = toolCall.tool.split("__")[1] || toolCall.tool;

  return (
    <div
      className="rounded-lg overflow-hidden text-xs font-mono mb-2"
      style={{ background: `${meta.color}10`, border: `1px solid ${meta.color}25` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
      >
        <span style={{ color: meta.color }}>{meta.icon}</span>
        <span style={{ color: meta.color }} className="font-semibold">{meta.label}</span>
        <span className="text-fog-faint">·</span>
        <span className="text-fog-dim">{toolName.replace(/_/g, " ")}</span>
        <span className="ml-auto text-fog-faint">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t text-fog-dim overflow-auto max-h-48" style={{ borderColor: `${meta.color}20` }}>
          <pre className="text-[10px] whitespace-pre-wrap break-all">
            {JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-6 h-6 rounded-full bg-spark/20 flex items-center justify-center flex-shrink-0">
        <Sparkles size={12} className="text-spark" />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-spark/60 typing-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm mt-1 ${
          isUser ? "bg-spark/20" : "bg-spark/15"
        }`}
      >
        {isUser ? "👤" : <Sparkles size={13} className="text-spark-bright" />}
      </div>

      <div className={`flex-1 ${isUser ? "items-end" : "items-start"} flex flex-col gap-1 min-w-0`}>
        {/* Tool calls (assistant only) */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full mb-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallPill key={i} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Bubble */}
        {message.loading ? (
          <TypingIndicator />
        ) : (
          <div
            className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
              isUser
                ? "bg-spark/20 text-fog rounded-tr-sm"
                : "glass text-fog rounded-tl-sm"
            }`}
          >
            <div
              className="prose-chat"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(message.text),
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Very lightweight Markdown renderer (bold, bullets, code)
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<p><strong>$1</strong></p>")
    .replace(/^## (.+)$/gm, "<p><strong>$1</strong></p>")
    .replace(/^# (.+)$/gm, "<p><strong>$1</strong></p>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .split("\n\n")
    .map((p) => (p.startsWith("<") ? p : `<p>${p}</p>`))
    .join("");
}

export default function ChatPanel({ studentId }: { studentId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm **Campus Intel**, your AI guide to everything on campus. Ask me about the cafeteria menu, upcoming events, library books, assignment deadlines — anything campus-related!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent | null, overrideText?: string) {
    e?.preventDefault();
    const text = overrideText ?? input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `${Date.now()}`, role: "user", text };
    const loadingMsg: Message = { id: `${Date.now()}-loading`, role: "assistant", text: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    // Build conversation history for Claude (exclude loading indicator, exclude welcome)
    const history = [...messages, userMsg]
      .filter((m) => !m.loading && m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.text }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, studentId }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: `${Date.now()}-reply`,
        role: "assistant",
        text: data.text || data.error || "Sorry, I couldn't get a response.",
        toolCalls: data.toolCalls || [],
      };

      setMessages((prev) => [...prev.slice(0, -1), assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          text: "⚠️ Network error. Make sure the MCP servers are running and your API key is configured.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-full glass-bright rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-spark/20 flex items-center justify-center">
          <Sparkles size={16} className="text-spark-bright" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fog">AI Assistant</h2>
          <p className="text-[11px] text-fog-dim">Powered by DeepSeek · Routes queries to campus servers</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {messages.length <= 2 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-3 flex flex-wrap gap-2"
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSubmit(null, s)}
                className="text-xs px-3 py-1.5 rounded-full border border-spark/25 text-spark-bright/80 hover:bg-spark/10 hover:border-spark/40 transition-all"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/5">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about campus..."
            disabled={isLoading}
            className="flex-1 bg-ink-muted rounded-xl px-4 py-2.5 text-sm text-fog placeholder-fog-faint outline-none border border-white/5 focus:border-spark/40 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 glow-spark flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c6af5, #a594ff)" }}
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}
