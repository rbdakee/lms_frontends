"use client";

/**
 * Событие ленты — компактная плашка посреди разговора: «Комплект готов»,
 * «Презентация: добавлен слайд 5». Не реплика ни учителя, ни помощника, поэтому
 * без пузыря и по центру.
 *
 * Подпись строится по объекту `event` на языке интерфейса: серверный `content`
 * написан по-русски и годится только запасным, если придёт тип, которого
 * экран ещё не знает.
 */

import type { LessonChatEvent, LessonChatMessage } from "@lms/api";
import { IconCheck, IconClock, IconEdit, IconAlert } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { blockTitle, kindTitle } from "../../labels";

type T = ReturnType<typeof useLang>["t"];

function eventText(t: T, ev: LessonChatEvent, fallback: string): string {
  if (ev.type === "kit_status") {
    switch (ev.status) {
      case "generating":
        return t.laEvKitGenerating;
      case "ready":
        return t.laEvKitReady;
      case "partial":
        return t.laEvKitPartial((ev.failed_kinds ?? []).map((k) => kindTitle(t, k)).join(", "));
      case "failed":
        return t.laEvKitFailed;
    }
    return fallback;
  }
  if (ev.type === "kit_opened") return t.laEvKitOpened;
  if (ev.type === "objectives_changed") {
    return t.laEvObjectives((ev.objectives ?? []).map((o) => o.code).join(", "));
  }
  if (ev.type === "block_changed" && ev.kind && ev.action) {
    if (ev.action === "rewritten") {
      return t.laEvRewritten(kindTitle(t, ev.kind), ev.block ? blockTitle(t, ev.kind, ev.block) : "");
    }
    if (ev.slide != null) return t.laEvSlide[ev.action](ev.slide);
    if (ev.index != null) return t.laEvItem[ev.action](kindTitle(t, ev.kind), ev.index);
  }
  return fallback;
}

function icon(ev: LessonChatEvent) {
  if (ev.type === "block_changed" || ev.type === "objectives_changed") return <IconEdit size={13} />;
  if (ev.status === "ready") return <IconCheck size={13} />;
  if (ev.status === "partial" || ev.status === "failed") return <IconAlert size={13} />;
  return <IconClock size={13} />;
}

export function EventPill({ message }: { message: LessonChatMessage }) {
  const { t } = useLang();
  const ev = message.event;
  if (!ev) return null;
  return (
    <div style={{ alignSelf: "center", maxWidth: "100%" }}>
      <span
        className="row g6 caption"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 12px",
          borderRadius: 999,
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--text-on-muted)",
          fontWeight: 600,
        }}
      >
        <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon(ev)}</span>
        <span style={{ overflowWrap: "anywhere" }}>{eventText(t, ev, message.content)}</span>
      </span>
    </div>
  );
}
