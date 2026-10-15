"use client";

/**
 * Сайдбар рабочего места: «Новый урок» и все разговоры учителя столбцом,
 * сгруппированные по дням — как в ChatGPT.
 *
 * Группировка по дням и подсветка открытого — приём «Conversation List»
 * (21st.dev, arihantcodes): заголовки групп мелким капсом, строка с иконкой
 * и усечённым названием. Закрепление из него не нужно — в продукте его нет.
 * Разметка переписана на токены проекта, без Tailwind.
 */

import { Button, LinkButton } from "@lms/ui";
import { IconLayers, IconMessage, IconPlus } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import type { LessonChatListItem } from "@lms/api";
import { AccessUntil } from "../../access";
import { useRoutes } from "../../host";
import { LESSON_AI_NAME } from "../../name";

type T = ReturnType<typeof useLang>["t"];

/** Подпись разговора — название урока с сервера (тема или цели); пока урока нет — заглушка. */
export function chatTitle(t: T, item: LessonChatListItem): string {
  return item.title?.trim() || t.laChatUntitled;
}

/** Номер группы: 0 — сегодня, 1 — вчера, 2 — последние 7 дней, 3 — раньше. */
function groupOf(iso: string, now: Date): 0 | 1 | 2 | 3 {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(now) - day(new Date(iso))) / 86_400_000);
  if (diff <= 0) return 0;
  if (diff === 1) return 1;
  if (diff < 7) return 2;
  return 3;
}

export function Sidebar({
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
  const { t } = useLang();
  const routes = useRoutes();
  const now = new Date();
  const labels = [t.laWsGroupToday, t.laWsGroupYesterday, t.laWsGroupWeek, t.laWsGroupOlder];
  const groups: LessonChatListItem[][] = [[], [], [], []];
  for (const item of items ?? []) groups[groupOf(item.updated_at, now)].push(item);

  return (
    <div className="stack g12" style={{ height: "100%", padding: 12, minHeight: 0 }}>
      <div className="stack g10">
        <strong className="h3" style={{ margin: 0, padding: "2px 4px" }}>
          {LESSON_AI_NAME}
        </strong>
        <Button variant="secondary" block icon={<IconPlus size={17} />} onClick={onNew}>
          {t.laNewLesson}
        </Button>
      </div>

      <nav
        aria-label={t.laChatsHistory}
        className="stack g12 grow"
        style={{ minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}
      >
        {groups.map((list, g) =>
          list.length === 0 ? null : (
            <div key={g}>
              <p className="caption muted-3" style={{ margin: 0, padding: "0 8px 4px", fontWeight: 700 }}>
                {labels[g]}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {list.map((item) => {
                  const active = item.id === activeId;
                  const title = chatTitle(t, item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        title={title}
                        aria-current={active ? "true" : undefined}
                        onClick={() => onPick(item.id)}
                        className="row g8"
                        style={{
                          width: "100%",
                          alignItems: "center",
                          minHeight: 40,
                          padding: "0 8px",
                          border: 0,
                          borderRadius: 10,
                          textAlign: "left",
                          cursor: "pointer",
                          font: "inherit",
                          fontSize: 14,
                          fontWeight: active ? 700 : 500,
                          color: active ? "var(--primary-pressed)" : "var(--text-2)",
                          background: active ? "var(--primary-bg)" : "transparent",
                        }}
                      >
                        <span style={{ display: "inline-flex", flexShrink: 0, color: active ? "var(--primary)" : "var(--text-3)" }}>
                          <IconMessage size={16} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {title}
                        </span>
                        {item.kit_status === "generating" && (
                          <span
                            role="img"
                            aria-label={t.laWsGenerating}
                            title={t.laWsGenerating}
                            className="spinner"
                            style={{ width: 13, height: 13, color: "var(--warning-text)" }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ),
        )}
        {hasMore && (
          <Button variant="ghost" size="sm" loading={loadingMore} onClick={onMore}>
            {t.laChatsMore}
          </Button>
        )}
      </nav>

      <div className="stack g8" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <LinkButton href={routes.lessons} variant="ghost" size="sm" icon={<IconLayers size={16} />}>
          {t.laMyLessons}
        </LinkButton>
        <AccessUntil />
      </div>
    </div>
  );
}
