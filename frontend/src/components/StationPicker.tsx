

import { useEffect, useId, useRef, useState } from "react";
import { searchStations } from "@/lib/api";
import type { StationHit } from "@/lib/types";

interface Props {
  label: string;
  value: StationHit | null;
  onChange: (s: StationHit | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function StationPicker({ label, value, onChange, placeholder, autoFocus }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [hits, setHits] = useState<StationHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const q = text.trim();
    if (!q || q === value?.label) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchStations(q, ctrl.signal);
        setHits(r);
        setActive(0);
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, open, value?.label]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (s: StationHit) => {
    onChange(s);
    setText(s.label);
    setOpen(false);
    setHits([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || hits.length === 0) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const listId = `${id}-list`;
  return (
    <div className="relative" ref={boxRef}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        className="input pr-9"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && hits[active] ? `${listId}-${hits[active].code}` : undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Station name or code"}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onKeyDown={onKeyDown}
      />
      {value && (
        <span className="pointer-events-none absolute right-3 top-[34px] rounded bg-brand-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-700 dark:bg-brand-700/30 dark:text-brand-100">
          {value.code}
        </span>
      )}
      {open && (hits.length > 0 || loading) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {loading && hits.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>}
          {hits.map((s, i) => (
            <li
              key={s.code}
              id={`${listId}-${s.code}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                i === active ? "bg-brand-50 dark:bg-brand-700/30" : ""
              }`}
            >
              <span className="truncate">
                <span className="font-medium">{s.name}</span>{" "}
                <span className="font-mono text-slate-500 dark:text-slate-400">({s.code})</span>
              </span>
              <span className="shrink-0 text-xs text-slate-400">{s.train_count} trains</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
