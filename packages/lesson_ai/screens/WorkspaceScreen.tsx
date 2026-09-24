"use client";

/**
 * Рабочее место «Жоспара» — одна страница на весь продукт, кроме комплекта:
 * слева разговор с помощником и полоса прошлых разговоров, справа свои уроки.
 * На телефоне панели становятся вкладками «Чат» | «Мои уроки».
 *
 * Писать можно сразу, без поиска кнопки «Новый урок»: вход в продукт — это
 * уже новый разговор. Прошлый разговор открывается на месте, клик по чипу
 * не уводит со страницы — список уроков рядом не перезагружается.
 *
 * Панель чата не размонтируется ни при смене вкладки, ни при смене ширины
 * окна: иначе оборвался бы идущий стрим ответа и пропал набранный текст.
 * Поэтому дерево одно на обе ширины, а спрятанная вкладка — `display: none`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { LessonChat } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { AccessUntil, useLessonAiAccess } from "../access";
import { listChats, type LessonChatListItem } from "../api";
import { useChrome, useRoutes } from "../host";
import { LESSON_AI_NAME } from "../name";
import { ChatPanel } from "../components/chat/ChatPanel";
import { History } from "../components/chat/History";
import { useWide } from "../components/chat/util";
import { LessonsPanel } from "../components/lessons/LessonsPanel";

type Tab = "chat" | "lessons";

const PER_PAGE = 20;

/** Какой разговор открыт. `epoch` — номер нового разговора: без id ключ панели иначе не сменить. */
interface Active {
  chatId?: string;
  fromKitId?: string;
  epoch: number;
}

interface HistoryState {
  items: LessonChatListItem[];
  /** Сколько всего у сервера и сколько из них уже пришло страницами — для «Ещё» */
  total: number;
  fetched: number;
}

export function WorkspaceScreen({
  chatId,
  fromKitId,
  tab = "chat",
}: {
  chatId?: string;
  fromKitId?: string;
  tab?: Tab;
}) {
  const { t } = useLang();
  const routes = useRoutes();
  const pathname = usePathname();
  const { Shell } = useChrome();
  const { handle } = useLessonAiAccess();
  const toast = useToast();
  const wide = useWide();

  /* Пропсы — только начальное состояние: дальше разговоры меняются на месте,
     а адрес подменяется `replaceState` и маршрут Next остаётся прежним */
  const [active, setActive] = useState<Active>({ chatId, fromKitId, epoch: 0 });
  const [currentId, setCurrentId] = useState<number | null>(chatId ? Number(chatId) || null : null);
  const [view, setView] = useState<Tab>(tab);

  const lastPath = useRef(pathname);

  /* Кнопка «Новый урок» ставит фокус в поле ввода — только на широком экране:
     на телефоне фокус открыл бы клавиатуру поверх ленты */
  const focusComposer = useRef(false);
  const chatSection = useRef<HTMLElement>(null);

  const startNew = useCallback(() => {
    /* Адрес меняем сами — эффект ниже не должен принять это за переход извне
       и завести ещё один разговор */
    lastPath.current = routes.home;
    focusComposer.current = true;
    window.history.replaceState(null, "", routes.home);
    setActive((a) => ({ epoch: a.epoch + 1 }));
    setCurrentId(null);
    setView("chat");
  }, [routes.home]);

  /*
   * Ссылка на вход в продукт извне экрана (таб-панель, меню) ведёт на тот же
   * маршрут, и страница не перемонтируется: адрес вернулся на вход —
   * значит, учитель просит новый разговор.
   */
  useEffect(() => {
    if (pathname === routes.home && lastPath.current !== routes.home) {
      setActive((a) => ({ epoch: a.epoch + 1 }));
      setCurrentId(null);
      setView("chat");
    }
    lastPath.current = pathname;
  }, [pathname, routes.home]);

  /* Эффект родителя идёт после монтирования новой панели — поле уже на месте */
  useEffect(() => {
    if (!focusComposer.current) return;
    focusComposer.current = false;
    if (wide) chatSection.current?.querySelector("textarea")?.focus({ preventScroll: true });
  }, [active.epoch, wide]);

  const pick = (id: number) => {
    setView("chat");
    if (id === currentId) return;
    window.history.replaceState(null, "", routes.chat(id));
    setActive((a) => ({ chatId: String(id), epoch: a.epoch }));
    setCurrentId(id);
  };

  /* ---------- История ---------- */

  /* `undefined` — ещё грузится, `null` — показывать нечего: ручки нет или сеть не ответила */
  const [history, setHistory] = useState<HistoryState | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  /* Чаты, пришедшие из панели раньше первой страницы истории */
  const early = useRef<LessonChatListItem[]>([]);

  useEffect(() => {
    let alive = true;
    listChats({ page: 1, per_page: PER_PAGE }).then(
      (page) => {
        if (!alive) return;
        if (!page) return setHistory(null);
        const items = early.current.reduceRight(place, page.items);
        setHistory({ items, total: page.total, fetched: page.items.length });
      },
      (e) => {
        if (!alive || handle(e)) return;
        /* Полоса вспомогательная: без неё разговор идёт как шёл, поэтому
           отказ сети — не экран ошибки, а просто нет чипов */
        setHistory(null);
      },
    );
    return () => {
      alive = false;
    };
  }, [handle]);

  const loadMore = async () => {
    if (!history) return;
    setLoadingMore(true);
    try {
      const next = await listChats({ page: Math.floor(history.fetched / PER_PAGE) + 1, per_page: PER_PAGE });
      if (!next) return;
      setHistory((h) => {
        if (!h) return h;
        const known = new Set(h.items.map((i) => i.id));
        return {
          items: [...h.items, ...next.items.filter((i) => !known.has(i.id))],
          total: next.total,
          fetched: h.fetched + next.items.length,
        };
      });
    } catch (e) {
      if (handle(e)) return;
      toast(t.laLessonsMoreError, "error");
    } finally {
      setLoadingMore(false);
    }
  };

  /* Ключ панели чата. Колбэк ниже помнит свой ключ: запрос старого разговора,
     вернувшийся после переключения, не должен подсветить чужой чип */
  const chatKey = `${active.chatId ?? ""}|${active.fromKitId ?? ""}|${active.epoch}`;
  const keyRef = useRef(chatKey);
  keyRef.current = chatKey;

  const onChatFor = (key: string) => (c: LessonChat) => {
    const item = itemOf(c);
    if (key === keyRef.current) setCurrentId(c.id);
    if (history === undefined) early.current = place(early.current, item);
    setHistory((h) => (h ? { ...h, items: place(h.items, item) } : h));
  };

  /* ---------- Кадр ---------- */

  const header = (
    <div className="stack g4" style={{ marginBottom: 16, minWidth: 0 }}>
      <h1 className="h2">{LESSON_AI_NAME}</h1>
      {/* Первый заход: без этой строки учитель видит имя и чат и не знает,
          что на выходе будут готовые файлы к уроку */}
      <span className="small muted pretty">{t.laTagline}</span>
      <AccessUntil />
    </div>
  );

  const tabs = (
    <div
      style={{
        position: "sticky",
        top: "var(--header-h)",
        zIndex: 6,
        background: "var(--bg)",
        paddingBlock: 8,
        marginBottom: 8,
      }}
    >
      <div className="segmented" role="tablist" style={{ display: "flex" }}>
        {(["chat", "lessons"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            data-active={view === v}
            onClick={() => setView(v)}
            style={{ flex: 1 }}
          >
            {v === "chat" ? t.laTabChat : t.laMyLessons}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Shell title={LESSON_AI_NAME}>
      <div className="page section" style={{ paddingBottom: 0 }}>
        {header}
        {/* Одно дерево на обе ширины: сменись позиция панели чата в дереве,
            React размонтировал бы её вместе со стримом */}
        <div
          style={
            wide
              ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start" }
              : undefined
          }
        >
          {!wide && tabs}
          <section
            ref={chatSection}
            className="stack g12"
            style={{
              minWidth: 0,
              ...(wide ? null : { maxWidth: 720, margin: "0 auto" }),
              ...(wide || view === "chat" ? null : { display: "none" }),
            }}
          >
            <History
              items={history ? history.items : null}
              activeId={currentId}
              hasMore={!!history && history.fetched < history.total}
              loadingMore={loadingMore}
              onPick={pick}
              onMore={() => void loadMore()}
              onNew={startNew}
            />
            <ChatPanel
              key={chatKey}
              chatId={active.chatId}
              fromKitId={active.fromKitId}
              wide={wide}
              visible={wide || view === "chat"}
              onChat={onChatFor(chatKey)}
              onNew={startNew}
            />
          </section>
          <aside
            aria-label={wide ? t.laMyLessons : undefined}
            className="stack g12"
            style={
              wide
                ? {
                    /* Уроки липнут под шапкой сайта и крутятся сами: лента слева
                       длинная, и без этого список уезжал бы вверх вместе с ней */
                    position: "sticky",
                    top: "calc(var(--header-h) + 16px)",
                    /* Под сеткой — нижний отступ `main.has-tabbar` (48px на широком).
                       Липкий блок не выходит за низ сетки: в конце страницы колонка
                       ростом в экран поднималась бы под шапку сайта. Вычитаем этот
                       хвост — верх колонки всегда остаётся под шапкой */
                    maxHeight: "calc(100vh - var(--header-h) - 16px - 48px)",
                    overflowY: "auto",
                  }
                : {
                    maxWidth: 720,
                    margin: "0 auto",
                    paddingBottom: 24,
                    ...(view === "lessons" ? null : { display: "none" }),
                  }
            }
          >
            {wide && <h2 className="h3">{t.laMyLessons}</h2>}
            <LessonsPanel compact={wide} />
          </aside>
        </div>
      </div>
    </Shell>
  );
}

/** Элемент истории из чата с сервера: тема и класс — из заказа, подпись — первая реплика учителя. */
function itemOf(c: LessonChat): LessonChatListItem {
  return {
    id: c.id,
    status: c.status,
    kit_id: c.kit_id,
    topic: c.order.topic,
    subject_code: c.order.subject_code,
    grade: c.order.grade,
    first_message: c.items.find((m) => m.role === "user")?.content ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

/**
 * Разговор в полосу. Прошлый, открытый без изменений, остаётся на своём месте —
 * иначе чипы прыгали бы от каждого клика; новый или изменённый встаёт первым,
 * как у сервера «свежие по активности сверху».
 */
function place(list: LessonChatListItem[], item: LessonChatListItem): LessonChatListItem[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0 && list[i].updated_at === item.updated_at) {
    return list.map((x, j) => (j === i ? item : x));
  }
  return [item, ...list.filter((x) => x.id !== item.id)];
}
