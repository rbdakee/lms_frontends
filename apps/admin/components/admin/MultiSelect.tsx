"use client";

/**
 * Свой мультивыбор для фильтров (просьба владельца 20.08.2026): нативный
 * select не умеет несколько значений без Ctrl и в каждом браузере выглядит
 * по-своему. Пустой выбор — «все», то же, что фильтра нет.
 */

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown } from "@lms/ui/icons";

export interface MultiOption<V extends string | number> {
  value: V;
  label: string;
}

/** Список галочек. Он же — содержимое мобильной шторки фильтров. */
export function MultiOptions<V extends string | number>({
  options,
  value,
  onChange,
}: {
  options: MultiOption<V>[];
  value: V[];
  onChange: (next: V[]) => void;
}) {
  const toggle = (v: V) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="stack g2">
      {options.map((o) => (
        <label
          key={String(o.value)}
          className="check"
          style={{ padding: "8px 10px", borderRadius: 10 }}
        >
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
          />
          <span className="check-box">
            <IconCheck size={14} />
          </span>
          <span className="small">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function MultiSelect<V extends string | number>({
  placeholder,
  options,
  value,
  onChange,
  minWidth = 170,
}: {
  /** Подпись пустого выбора: «Все курсы» */
  placeholder: string;
  options: MultiOption<V>[];
  value: V[];
  onChange: (next: V[]) => void;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* «Курс А +2» вместо перечисления: кнопка фильтра не должна расти
     с каждым выбранным значением */
  const first = options.find((o) => o.value === value[0])?.label ?? placeholder;
  const summary =
    value.length === 0 ? placeholder : value.length === 1 ? first : `${first} +${value.length - 1}`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="input row g8"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ width: "auto", minWidth, cursor: "pointer", alignItems: "center" }}
      >
        <span
          className="nowrap"
          style={{
            fontWeight: value.length ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 220,
          }}
        >
          {summary}
        </span>
        <IconChevronDown
          size={16}
          className="muted-3"
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 0.15s",
          }}
        />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 30,
            minWidth: "100%",
            width: "max-content",
            maxWidth: 320,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "var(--shadow-hover)",
            padding: 6,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          <MultiOptions options={options} value={value} onChange={onChange} />
          {value.length > 0 && (
            <>
              <hr className="divider" style={{ margin: "6px 0" }} />
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-block"
                onClick={() => onChange([])}
              >
                Сбросить
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
