"use client";

/**
 * Рабочее место «Жоспара» в стиле ChatGPT (решение владельца 15.10.2026):
 *
 *   слева   — все разговоры учителя и «Новый урок»; сворачивается;
 *   по центру — чат: до «Готовить» собирает заказ, после — правит материалы;
 *   справа  — материалы этой сессии: вкладки, блоки, предпросмотр, скачивание.
 *
 * Панель материалов появляется, когда у разговора есть комплект
 * (`mode: "edit"`): до этого чату нужна вся ширина. Её ширину учитель
 * тянет за край. На телефоне один столбец — чат, а сайдбар и материалы
 * выезжают поверх него.
 *
 * Писать можно сразу, без поиска кнопки «Новый урок»: вход в продукт — это
 * уже новый разговор. Прошлый разговор открывается на месте, клик по строке
 * не уводит со страницы.
 *
 * Панель чата не размонтируется ни при смене ширины окна, ни при показе
 * панелей: иначе оборвался бы идущий стрим ответа и пропал набранный текст.
 * Поэтому дерево одно на все ширины, а закрытые панели — `display: none`.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { LessonChat, LessonChatEvent, LessonChatKit, LessonChatListItem } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { IconClose, IconLayers, IconMenu } from "@lms/ui/icons";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../access";
import { listChats } from "../api";
import { useChrome, useRoutes } from "../host";
import { LESSON_AI_NAME } from "../name";
import { ChatPanel } from "../components/chat/ChatPanel";
import { Sidebar, chatTitle } from "../components/chat/Sidebar";
import { useWide } from "../components/chat/util";
import type { MaterialFlash } from "../components/kit/KitMaterials";
import { MaterialsPanel } from "../components/kit/MaterialsPanel";

const PER_PAGE = 20;
const SIDEBAR_W = 280;
const MATERIALS_W = { min: 360, max: 760, initial: 520 };
const RESIZE_STEP = 24;

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

/** То, что рабочему месту нужно знать о чате, кроме ленты. */
interface Session {
  mode: LessonChat["mode"];
  kit: LessonChatKit | null;
}

export function WorkspaceScreen({ chatId, fromKitId }: { chatId?: string; fromKitId?: string }) {
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
  const [session, setSession] = useState<Session | null>(null);
  const [flash, setFlash] = useState<MaterialFlash | null>(null);
  const flashCount = useRef(0);

  /* `null` — учитель ещё не выбирал: сайдбар и материалы открыты на широком
     экране и закрыты на телефоне, где иначе перекрывали бы чат */
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [materialsOpen, setMaterialsOpen] = useState<boolean | null>(null);
  const [materialsW, setMaterialsW] = useState(MATERIALS_W.initial);
  const showSidebar = sidebarOpen ?? wide;
  const showMaterials = materialsOpen ?? wide;

  const lastPath = useRef(pathname);

  /* Кнопка «Новый урок» ставит фокус в поле ввода — только на широком экране:
     на телефоне фокус открыл бы клавиатуру поверх ленты */
  const focusComposer = useRef(false);
  const chatSection = useRef<HTMLElement>(null);

  const reset = useCallback(() => {
    setSession(null);
    setFlash(null);
  }, []);

  const startNew = useCallback(() => {
    /* Адрес меняем сами — эффект ниже не должен принять это за переход извне
       и завести ещё один разговор */
    lastPath.current = routes.home;
    focusComposer.current = true;
    window.history.replaceState(null, "", routes.home);
    setActive((a) => ({ epoch: a.epoch + 1 }));
    setCurrentId(null);
    reset();
    if (!wide) setSidebarOpen(false);
  }, [routes.home, reset, wide]);

  /*
   * Ссылка на вход в продукт извне экрана (таб-панель, меню) ведёт на тот же
   * маршрут, и страница не перемонтируется: адрес вернулся на вход —
   * значит, учитель просит новый разговор.
   */
  useEffect(() => {
    if (pathname === routes.home && lastPath.current !== routes.home) {
      setActive((a) => ({ epoch: a.epoch + 1 }));
      setCurrentId(null);
      reset();
    }
    lastPath.current = pathname;
  }, [pathname, routes.home, reset]);

  /* Эффект родителя идёт после монтирования новой панели — поле уже на месте */
  useEffect(() => {
    if (!focusComposer.current) return;
    focusComposer.current = false;
    if (wide) chatSection.current?.querySelector("textarea")?.focus({ preventScroll: true });
  }, [active.epoch, wide]);

  const pick = (id: number) => {
    if (!wide) setSidebarOpen(false);
    if (id === currentId) return;
    window.history.replaceState(null, "", routes.chat(id));
    setActive((a) => ({ chatId: String(id), epoch: a.epoch }));
    setCurrentId(id);
    reset();
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
        /* Сайдбар вспомогательный: без него разговор идёт как шёл, поэтому
           отказ сети — не экран ошибки, а просто пустой список */
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
     вернувшийся после переключения, не должен подсветить чужую строку */
  const chatKey = `${active.chatId ?? ""}|${active.fromKitId ?? ""}|${active.epoch}`;
  const keyRef = useRef(chatKey);
  keyRef.current = chatKey;
  const modeRef = useRef<LessonChat["mode"] | null>(null);

  const onChatFor = (key: string) => (c: LessonChat) => {
    const item = itemOf(c);
    if (key === keyRef.current) {
      setCurrentId(c.id);
      setSession({ mode: c.mode, kit: c.kit });
      /* «Готовить» только что нажали: материалы появляются справа, и на
         телефоне их стоит показать — иначе непонятно, что случилось */
      if (modeRef.current === "order" && c.mode === "edit") setMaterialsOpen(true);
      modeRef.current = c.mode;
    }
    if (history === undefined) early.current = place(early.current, item);
    setHistory((h) => (h ? { ...h, items: place(h.items, item) } : h));
  };

  /* Новая панель чата начинает с чистого листа — режим прошлой не переносим */
  useEffect(() => {
    modeRef.current = null;
  }, [chatKey]);

  const onMaterial = useCallback((ev: LessonChatEvent) => {
    if (ev.material_id == null || !ev.block) return;
    setFlash({ material_id: ev.material_id, block: ev.block, nonce: ++flashCount.current });
  }, []);

  /* ---------- Ширина панели материалов ---------- */

  const dragFrom = useRef<{ x: number; w: number } | null>(null);
  const clampW = (w: number) => Math.max(MATERIALS_W.min, Math.min(w, MATERIALS_W.max, window.innerWidth * 0.6));
  const onResizeDown = (e: PointerEvent<HTMLDivElement>) => {
    dragFrom.current = { x: e.clientX, w: materialsW };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    const from = dragFrom.current;
    /* Панель справа: тянем влево — шире */
    if (from) setMaterialsW(clampW(from.w + (from.x - e.clientX)));
  };
  const onResizeKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    setMaterialsW((w) => clampW(w + dir * RESIZE_STEP));
  };

  /* ---------- Кадр ---------- */

  const hasKit = session?.mode === "edit" && session.kit !== null;
  const generating = session?.kit?.status === "generating";
  const currentItem = history?.items.find((i) => i.id === currentId);
  const title = currentItem ? chatTitle(t, currentItem) : LESSON_AI_NAME;

  /* Высота — от окна, а не от содержимого: лента и панели крутятся каждая сама,
     страница стоит. Нижний отступ `main.has-tabbar` (48px на широком, 16px + таб-панель
     на телефоне) вычитаем из высоты и гасим отрицательным полем — иначе под рабочим
     местом оставалась бы прокрутка страницы */
  const frame: CSSProperties = wide
    ? { height: "calc(100dvh - var(--header-h))", marginBottom: -48 }
    : {
        height: "calc(100dvh - var(--header-h) - var(--tabbar-h) - env(safe-area-inset-bottom))",
        marginBottom: -16,
      };

  /* Телефон: панель выезжает поверх чата между шапкой и таб-панелью сайта */
  const overlay: CSSProperties = {
    position: "fixed",
    top: "var(--header-h)",
    bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom))",
    zIndex: 44,
    background: "var(--card)",
    boxShadow: "var(--shadow-lg)",
  };

  const closeBar = (heading: string, closeLabel: string, onClose: () => void): ReactNode => (
    <div className="row between" style={{ alignItems: "center", padding: "6px 8px 6px 16px", borderBottom: "1px solid var(--border)" }}>
      <strong>{heading}</strong>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={closeLabel} title={closeLabel} style={{ minWidth: 40, padding: 0 }}>
        <IconClose size={18} />
      </button>
    </div>
  );

  return (
    <Shell title={LESSON_AI_NAME}>
      <div style={{ ...frame, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* ---------- Слева: разговоры ---------- */}
        {!wide && showSidebar && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, top: "var(--header-h)", zIndex: 43, background: "rgba(15, 23, 42, 0.4)" }}
          />
        )}
        <aside
          style={{
            display: showSidebar ? "block" : "none",
            width: wide ? SIDEBAR_W : "min(86vw, 320px)",
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            background: "var(--card)",
            ...(wide ? null : { ...overlay, left: 0 }),
          }}
        >
          <Sidebar
            items={history ? history.items : null}
            activeId={currentId}
            hasMore={!!history && history.fetched < history.total}
            loadingMore={loadingMore}
            onPick={pick}
            onMore={() => void loadMore()}
            onNew={startNew}
          />
        </aside>

        {/* ---------- По центру: чат ---------- */}
        <section ref={chatSection} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
          <div
            className="row g8"
            style={{ alignItems: "center", minHeight: 52, padding: "0 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSidebarOpen(!showSidebar)}
              aria-label={showSidebar ? t.laWsChatsHide : t.laWsChatsShow}
              aria-expanded={showSidebar}
              title={showSidebar ? t.laWsChatsHide : t.laWsChatsShow}
              style={{ minWidth: 40, padding: 0 }}
            >
              <IconMenu size={19} />
            </button>
            <strong className="grow" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </strong>
            {hasKit && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMaterialsOpen(!showMaterials)}
                aria-expanded={showMaterials}
                title={showMaterials ? t.laWsMaterialsHide : t.laWsMaterialsShow}
              >
                {generating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconLayers size={16} />}
                {t.laKitMaterials}
              </button>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatPanel
              key={chatKey}
              chatId={active.chatId}
              fromKitId={active.fromKitId}
              onChat={onChatFor(chatKey)}
              onMaterial={onMaterial}
              onNew={startNew}
            />
          </div>
        </section>

        {/* ---------- Справа: материалы этой сессии ---------- */}
        {hasKit && session.kit && (
          <>
            {wide && showMaterials && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={t.laWsResize}
                aria-valuemin={MATERIALS_W.min}
                aria-valuemax={MATERIALS_W.max}
                aria-valuenow={materialsW}
                tabIndex={0}
                onPointerDown={onResizeDown}
                onPointerMove={onResizeMove}
                onPointerUp={() => (dragFrom.current = null)}
                onKeyDown={onResizeKey}
                style={{ width: 6, flexShrink: 0, cursor: "col-resize", background: "var(--border)", touchAction: "none" }}
              />
            )}
            <aside
              aria-label={t.laKitMaterials}
              style={{
                display: showMaterials ? "block" : "none",
                overflowY: "auto",
                overscrollBehavior: "contain",
                background: "var(--bg)",
                ...(wide ? { width: materialsW, flexShrink: 0 } : { ...overlay, left: 0, right: 0 }),
              }}
            >
              {closeBar(t.laKitMaterials, t.laWsMaterialsHide, () => setMaterialsOpen(false))}
              <MaterialsPanel kit={session.kit} flash={flash} />
            </aside>
          </>
        )}
      </div>
    </Shell>
  );
}

/**
 * Строка сайдбара из чата с сервера. Подпись собираем так же, как сервер
 * (`title`): тема из заказа, пока её нет — первая реплика учителя.
 */
function itemOf(c: LessonChat): LessonChatListItem {
  const first = c.items.find((m) => m.role === "user")?.content.slice(0, 120) ?? null;
  return {
    id: c.id,
    status: c.status,
    mode: c.mode,
    kit_id: c.kit_id,
    kit_status: c.kit?.status ?? null,
    title: c.order.topic?.trim() || first,
    topic: c.order.topic,
    subject_code: c.order.subject_code,
    grade: c.order.grade,
    first_message: first,
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
