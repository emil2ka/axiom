"use client";

import { useEffect, useMemo, useState } from "react";
import type { MemoryField } from "@/lib/shared/engine";

interface Segment {
  text: string;
  highlight: boolean;
}

interface Match {
  start: number;
  end: number;
}

function findMatches(text: string, quotes: string[]): Match[] {
  const lower = text.toLowerCase();
  const matches: Match[] = [];

  for (const rawQuote of quotes) {
    const cleaned = rawQuote.replace(/^…+/, "").replace(/…+$/, "").replace(/^«|»$/g, "").trim();
    if (!cleaned) continue;

    let candidate = cleaned;
    let index = lower.indexOf(candidate.toLowerCase());

    if (index === -1) {
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length > 3) {
        candidate = words.slice(0, Math.min(words.length, 6)).join(" ");
        index = lower.indexOf(candidate.toLowerCase());
      }
    }
    if (index === -1) continue;
    matches.push({ start: index, end: index + candidate.length });
  }

  matches.sort((a, b) => a.start - b.start);
  const merged: Match[] = [];
  for (const match of matches) {
    const last = merged[merged.length - 1];
    if (last && match.start <= last.end) {
      last.end = Math.max(last.end, match.end);
    } else {
      merged.push({ ...match });
    }
  }
  return merged;
}

export function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights?: { quote: string; field: MemoryField }[];
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const timer = setTimeout(() => setRevealed(true), 320);
    return () => clearTimeout(timer);
  }, [text]);

  const segments = useMemo<Segment[]>(() => {
    if (!highlights?.length) return [{ text, highlight: false }];
    const matches = findMatches(
      text,
      highlights.map((item) => item.quote),
    );
    if (!matches.length) return [{ text, highlight: false }];

    const result: Segment[] = [];
    let cursor = 0;
    for (const match of matches) {
      if (match.start > cursor) result.push({ text: text.slice(cursor, match.start), highlight: false });
      result.push({ text: text.slice(match.start, match.end), highlight: true });
      cursor = match.end;
    }
    if (cursor < text.length) result.push({ text: text.slice(cursor), highlight: false });
    return result;
  }, [text, highlights]);

  return (
    <span className="whitespace-pre-line">
      {segments.map((segment, index) =>
        segment.highlight && revealed ? (
          <mark key={index} className="hl text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
