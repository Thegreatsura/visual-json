import { useMemo } from "react";
import { computeDiff, type DiffEntry, type DiffType } from "@visual-json/core";

const DIFF_COLORS: Record<
  DiffType,
  { bg: string; marker: string; label: string }
> = {
  added: { bg: "#1e3a1e", marker: "+", label: "#4ec94e" },
  removed: { bg: "#3a1e1e", marker: "-", label: "#f48771" },
  changed: { bg: "#3a3a1e", marker: "~", label: "#dcdcaa" },
  unchanged: { bg: "transparent", marker: " ", label: "#666666" },
};

function formatValue(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "object") {
    const json = JSON.stringify(value, null, 2);
    if (json.length > 80) {
      return JSON.stringify(value).slice(0, 77) + "...";
    }
    return json;
  }
  return String(value);
}

interface DiffRowProps {
  entry: DiffEntry;
}

function DiffRow({ entry }: DiffRowProps) {
  const colors = DIFF_COLORS[entry.type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "3px 12px",
        borderBottom: "1px solid var(--vj-border-subtle, #2a2a2a)",
        backgroundColor: colors.bg,
        fontFamily: "var(--vj-font, monospace)",
        fontSize: 12,
        gap: 8,
      }}
    >
      <span
        style={{
          color: colors.label,
          fontWeight: 600,
          width: 14,
          flexShrink: 0,
          textAlign: "center",
        }}
      >
        {colors.marker}
      </span>
      <span
        style={{
          color: "var(--vj-text, #cccccc)",
          flexShrink: 0,
          minWidth: 100,
        }}
      >
        {entry.path}
      </span>
      <span style={{ flex: 1, display: "flex", gap: 8, overflow: "hidden" }}>
        {entry.type === "changed" && (
          <>
            <span style={{ color: "#f48771", textDecoration: "line-through" }}>
              {formatValue(entry.oldValue)}
            </span>
            <span style={{ color: "var(--vj-text-dim, #666666)" }}>&rarr;</span>
            <span style={{ color: "#4ec94e" }}>
              {formatValue(entry.newValue)}
            </span>
          </>
        )}
        {entry.type === "added" && (
          <span style={{ color: "#4ec94e" }}>
            {formatValue(entry.newValue)}
          </span>
        )}
        {entry.type === "removed" && (
          <span style={{ color: "#f48771", textDecoration: "line-through" }}>
            {formatValue(entry.oldValue)}
          </span>
        )}
      </span>
    </div>
  );
}

export interface DiffViewProps {
  originalJson: unknown;
  currentJson: unknown;
  className?: string;
}

export function DiffView({
  originalJson,
  currentJson,
  className,
}: DiffViewProps) {
  const entries = useMemo(
    () => computeDiff(originalJson as never, currentJson as never),
    [originalJson, currentJson],
  );

  const added = entries.filter((e) => e.type === "added").length;
  const removed = entries.filter((e) => e.type === "removed").length;
  const changed = entries.filter((e) => e.type === "changed").length;

  return (
    <div
      className={className}
      style={{
        backgroundColor: "var(--vj-bg, #1e1e1e)",
        color: "var(--vj-text, #cccccc)",
        overflow: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 12px",
          borderBottom: "1px solid var(--vj-border, #333333)",
          backgroundColor: "var(--vj-bg-panel, #252526)",
          fontFamily: "var(--vj-font, monospace)",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ color: "var(--vj-text-muted, #999999)" }}>
          {entries.length === 0 ? "No changes" : `${entries.length} changes`}
        </span>
        {added > 0 && <span style={{ color: "#4ec94e" }}>+{added} added</span>}
        {removed > 0 && (
          <span style={{ color: "#f48771" }}>-{removed} removed</span>
        )}
        {changed > 0 && (
          <span style={{ color: "#dcdcaa" }}>~{changed} modified</span>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {entries.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--vj-text-dimmer, #555555)",
              fontFamily: "var(--vj-font, monospace)",
              fontSize: 13,
            }}
          >
            No differences detected
          </div>
        ) : (
          entries.map((entry, i) => <DiffRow key={i} entry={entry} />)
        )}
      </div>
    </div>
  );
}
