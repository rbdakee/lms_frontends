"use client";

/**
 * Полоса над лентой: «Новый урок» и прошлые разговоры чипами.
 *
 * Одна строка с горизонтальной прокруткой, а не список: ленте на телефоне
 * нужна высота, а к прошлому разговору возвращаются реже, чем пишут в текущий.
 * Без истории (новый учитель или ручки на сервере ещё нет) остаётся только
 * кнопка — пустая заглушка «разговоров пока нет» здесь только мешала бы.
 */

import { useEffect, useRef } from "react";
import { Button } from "@lms/ui";
import { dayMonth } from "@lms/ui/i18n";
import { IconCheck, IconPlus } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import type { LessonChatListItem } from "../../api";
import { useWide } from "./util";

/* Зазор слева и справа от подсвеченного чипа, когда полоса докручивает до него */
const EDGE = 24;

type T = ReturnType<typeof useLang>["t"];

/** Подпись разговора — одна на чип, подсказку и всё, что появится потом. */
export function chatTitle(t: T, item: LessonChatListItem): string {
  return item.topic?.trim() || item.first_message?.trim() || t.laChatUntitled;
}

export function History({
  items,
  activeId,
  hasMore,
  loadingMore,
  onPick,
  onMore,
  onNew,
}: {
  /** `null` — истории нет: ещё грузится, ручки нет или сеть не ответила */
  items: LessonChatListItem[] | null;
  activeId: number | null;
  hasMore: boolean;
  loadingMore: boolean;
  onPick: (id: number) => void;
  onMore: () => void;
  onNew: () => void;
}) {
  const { t, lang } = useLang();
  const wide = useWide();
  const strip = useRef<HTMLElement>(null);
  const shown = !!items && items.length > 0;

  /* Открытый разговор бывает в хвосте полосы: пришёл по адресу или со второй
     страницы. Крутим только саму полосу — `scrollIntoView` дёрнул бы
     и страницу по вертикали */
  useEffect(() => {
    const nav = strip.current;
    if (!nav || activeId === null) return;
    const chip = nav.querySelector<HTMLElement>(`[data-chat-id="${activeId}"]`);
    if (!chip) return;
    /* Полоса — `position: relative`, поэтому отступ чипа отсчитан от её начала */
    const left = chip.offsetLeft;
    const right = left + chip.offsetWidth;
    /* Чип шире полосы (телефон, длинная тема) — видно хотя бы начало подписи */
    if (left < nav.scrollLeft || chip.offsetWidth + EDGE > nav.clientWidth) nav.scrollLeft = Math.max(0, left - EDGE);
    else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = right - nav.clientWidth + EDGE;
  }, [activeId, items]);

  /* Мышью без тачпада полосу иначе не прокрутить: колесо вертикальное.
     Пока полосе есть куда ехать — колесо её, у края — снова страницы.
     Слушатель не пассивный: у `onWheel` в React `preventDefault` не работает */
  useEffect(() => {
    const nav = strip.current;
    if (!nav) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = nav.scrollWidth - nav.clientWidth;
      if (max <= 0) return;
      const atEdge = e.deltaY < 0 ? nav.scrollLeft <= 0 : nav.scrollLeft >= max - 1;
      if (atEdge) return;
      e.preventDefault();
      nav.scrollLeft += e.deltaY;
    };
    nav.addEventListener("wheel", onWheel, { passive: false });
    return () => nav.removeEventListener("wheel", onWheel);
  }, [shown]);

  return (
    <div className="row g8" style={{ minHeight: 44, flexWrap: "nowrap" }}>
      <Button variant="secondary" size="sm" icon={<IconPlus size={16} />} onClick={onNew} style={{ flexShrink: 0 }}>
        {t.laNewLesson}
      </Button>

      {items && items.length > 0 && (
        <nav
          ref={strip}
          aria-label={t.laChatsHistory}
          className="row g6 grow"
          style={{
            position: "relative",
            minWidth: 0,
            flexWrap: "nowrap",
            overflowX: "auto",
            /* Мышью на компьютере видно, что полоса крутится; на телефоне
               полоса прокрутки съела бы место, свайп очевиден и так */
            scrollbarWidth: wide ? "thin" : "none",
            /* Свайп по полосе не должен листать страницу назад в истории браузера */
            overscrollBehaviorX: "contain",
            paddingBlock: 2,
          }}
        >
          {items.map((item) => {
            const title = chatTitle(t, item);
            const active = item.id === activeId;
            const hint = [title, item.grade !== null ? t.laGrade(item.grade) : null].filter(Boolean).join(" · ");
            return (
              <button
                key={item.id}
                data-chat-id={item.id}
                type="button"
                className="chip"
                data-active={active}
                aria-current={active ? "true" : undefined}
                title={hint}
                onClick={() => onPick(item.id)}
                style={{ maxWidth: wide ? 240 : 180, flexShrink: 0 }}
              >
                {item.status === "confirmed" && (
                  <span role="img" aria-label={t.laChatKitOrdered} title={t.laChatKitOrdered} style={{ display: "inline-flex", color: "var(--success)" }}>
                    <IconCheck size={14} />
                  </span>
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{title}</span>
                <span className="muted-3" style={{ fontWeight: 500 }}>
                  {dayMonth(item.updated_at, lang)}
                </span>
              </button>
            );
          })}
          {hasMore && (
            <button
              type="button"
              className="chip"
              onClick={onMore}
              disabled={loadingMore}
              aria-busy={loadingMore}
              style={{ flexShrink: 0 }}
            >
              {loadingMore ? <span className="spinner" style={{ width: 14, height: 14 }} /> : t.laChatsMore}
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
