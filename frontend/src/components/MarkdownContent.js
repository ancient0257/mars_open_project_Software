"use client";
import { memo, useMemo } from "react";

const ESC = { "&":"&amp;", "<":"&lt;", ">":"&gt;" };

// Pre-compiled regexes — module level, compiled once
const RE_ESC     = /[&<>]/g;
const RE_BOLD    = /\*\*(.+?)\*\*/g;
const RE_EM      = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
const RE_CODE    = /`([^`\n]+)`/g;
const RE_H3      = /^### (.+)$/gm;
const RE_H2      = /^## (.+)$/gm;
const RE_H1      = /^# (.+)$/gm;
const RE_LI      = /^- (.+)$/gm;
const RE_UL      = /(<li>[^\n]*\n?)+/g;
const RE_PARA    = /\n\n+/g;
const RE_BARE    = /^(?!<)(.+)$/gm;   // lines not starting with < — wrap in <p>
const RE_EMPTY_P = /<p>\s*<\/p>/g;

function toHtml(raw) {
  let s = raw.replace(RE_ESC, (c) => ESC[c]);
  s = s.replace(RE_BOLD, "<strong>$1</strong>");
  s = s.replace(RE_EM,   "<em>$1</em>");
  s = s.replace(RE_CODE, "<code>$1</code>");
  s = s.replace(RE_H3,   "<h3>$1</h3>");
  s = s.replace(RE_H2,   "<h2>$1</h2>");
  s = s.replace(RE_H1,   "<h1>$1</h1>");
  s = s.replace(RE_LI,   "<li>$1</li>");
  s = s.replace(RE_UL,   "<ul>$&</ul>");
  s = s.replace(RE_PARA, "</p><p>");
  // Replace bare lines with <p>…</p> — single regex pass, zero array allocations
  // (Previously: split → map → join  = N+2 array allocations)
  s = s.replace(RE_BARE, "<p>$1</p>");
  s = s.replace(RE_EMPTY_P, "");
  return s;
}

function MarkdownContent({ content }) {
  const html = useMemo(() => toHtml(content), [content]);
  return <div className="chat-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default memo(MarkdownContent);
