"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ServerInfo {
  id: string;
  name: string;
  online: boolean;
  status: string;
}

const SERVER_META: Record<string, { icon: string; color: string }> = {
  library:   { icon: "📚", color: "#7c6af5" },
  cafeteria: { icon: "🍽️", color: "#2dd4a0" },
  events:    { icon: "📅", color: "#f5a623" },
  academics: { icon: "📖", color: "#f56b8a" },
};

export default function ServerStatus() {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchHealth() {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setServers(data.servers);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-7 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {servers.map((server, i) => {
        const meta = SERVER_META[server.id] || { icon: "⚙️", color: "#9d9ab0" };
        return (
          <motion.div
            key={server.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono"
            style={{
              background: server.online
                ? `${meta.color}18`
                : "rgba(157,154,176,0.08)",
              border: `1px solid ${server.online ? meta.color + "40" : "rgba(157,154,176,0.2)"}`,
              color: server.online ? meta.color : "#9d9ab0",
            }}
            title={server.online ? "Online" : "Offline — check if server is running"}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 status-pulse"
              style={{ background: server.online ? meta.color : "#9d9ab0" }}
            />
            <span>{meta.icon}</span>
            <span className="hidden sm:inline">{server.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
