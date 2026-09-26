"use client";

import { useEffect, useRef, useState } from "react";

export type CheckGroup = {
  label: string;
  items: { value: string; label: string }[];
};

type Props = {
  label: string;
  groups: CheckGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  groupToggle?: boolean;
};

export default function CheckDropdown({
  label,
  groups,
  selected,
  onChange,
  placeholder = "Select…",
  searchable = false,
  groupToggle = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const visible = groups
    .map((g) => ({
      ...g,
      items: q ? g.items.filter((i) => i.label.toLowerCase().includes(q) || i.value.toLowerCase().includes(q)) : g.items,
    }))
    .filter((g) => g.items.length > 0);

  const names = selected.map((value) => {
    for (const g of groups) {
      const item = g.items.find((i) => i.value === value);
      if (item) return item.label;
    }
    return value;
  });
  const summary =
    names.length === 0
      ? placeholder
      : names.length <= 2
        ? names.join(", ")
        : `${names.length} selected`;

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function toggleGroup(items: { value: string }[]) {
    const values = items.map((i) => i.value);
    const allOn = values.every((v) => selected.includes(v));
    onChange(allOn ? selected.filter((v) => !values.includes(v)) : [...new Set([...selected, ...values])]);
  }

  return (
    <div className="block text-sm" ref={root}>
      {label}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 w-full bg-surface-2 border border-border rounded-lg p-2 text-sm text-left flex items-center justify-between gap-2"
      >
        <span className={selected.length ? "text-foreground truncate" : "text-muted"}>{summary}</span>
        <span className="text-muted">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-surface-2 p-2 shadow-lg">
          {searchable && (
            <input
              autoFocus
              className="mb-2 w-full rounded bg-surface-2 border border-border px-2 py-1 text-sm"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <div className="flex justify-end mb-1">
            <button
              type="button"
              className="text-[11px] text-muted underline"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          </div>
          {visible.map((g) => (
            <div key={g.label} className="mb-2">
              {groupToggle ? (
                <label className="flex items-center gap-2 px-1 py-1 text-[11px] uppercase tracking-wide text-muted">
                  <input
                    type="checkbox"
                    checked={g.items.length > 0 && g.items.every((i) => selected.includes(i.value))}
                    onChange={() => toggleGroup(g.items)}
                  />
                  {g.label}
                </label>
              ) : (
                <p className="px-1 py-1 text-[11px] uppercase tracking-wide text-muted">{g.label}</p>
              )}
              {g.items.map((item) => (
                <label key={item.value} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-2">
                  <input type="checkbox" checked={selected.includes(item.value)} onChange={() => toggle(item.value)} />
                  {item.label}
                </label>
              ))}
            </div>
          ))}
          {visible.length === 0 && <p className="text-xs text-muted px-2 py-1">No matches</p>}
        </div>
      )}
    </div>
  );
}
