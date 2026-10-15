"use client";

/**
 * Сайдбар рабочего места: «Новый урок» и разговоры учителя как рабочий
 * инструмент (решение владельца 15.10.2026) — закреплённые, группы по
 * предметам, остальные по дням и архив. Группы и порядок личные.
 *
 * Перетаскивание — нативный HTML5 DnD, без зависимостей: чат внутри секции
 * (порядок) и на заголовок группы или секции (перенос), группы между собой.
 * Только там, где есть мышь: на телефоне перетаскивание не начинается, а всё
 * то же самое делает меню «⋯». Меню умеет всё, что умеет перетаскивание,
 * поэтому клавиатуре ничего больше не нужно.
 *
 * Группировка по дням и подсветка открытого — приём «Conversation List»
 * (21st.dev, arihantcodes): заголовки мелким капсом, строка с иконкой и
 * усечённым названием. Разметка переписана на токены проекта, без Tailwind.
 */

import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Button, LinkButton, Sheet } from "@lms/ui";
import { IconChevronDown, IconChevronRight, IconLayers, IconMessage, IconMore, IconPlus } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import type { LessonChatListItem } from "@lms/api";
import { AccessUntil } from "../../access";
import { useRoutes } from "../../host";
import type { ChatLibrary } from "./useChatLibrary";
import { layout, sectionIds, targetOf, type Item, type Target } from "./sidebarModel";

type T = ReturnType<typeof useLang>["t"];

const NAME_MAX = 60;

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

/** Перетаскивать есть чем: мышь и наведение. На сенсорном экране работает меню. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const on = () => setFine(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return fine;
}

type Drag = { kind: "chat" | "group"; id: number } | null;
/** Куда сейчас целится перетаскивание: ключ элемента и место относительно него. */
type Over = { key: string; at: "before" | "after" | "into" } | null;

type Menu =
  | { kind: "chat"; id: number; x: number; y: number }
  | { kind: "group"; id: number; x: number; y: number };

type NameDialog = { mode: "create"; chatId?: number } | { mode: "rename"; groupId: number } | null;

export function Sidebar({
  library,
  activeId,
  onPick,
  onNew,
  headerHeight,
}: {
  library: ChatLibrary;
  activeId: number | null;
  onPick: (id: number) => void;
  onNew: () => void;
  /** Высота шапки рабочего места: линия под названием совпадает с линиями соседних колонок */
  headerHeight: number;
}) {
  const { t } = useLang();
  const routes = useRoutes();
  const fine = useFinePointer();
  const items = library.items;
  const lay = useMemo(() => layout(items ?? [], library.groups), [items, library.groups]);

  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<Over>(null);
  const [folded, setFolded] = useState<Set<number>>(new Set());
  const [showArchive, setShowArchive] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [dialog, setDialog] = useState<NameDialog>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const clearDrag = () => {
    setDrag(null);
    setOver(null);
  };

  /* ---------- Перетаскивание ---------- */

  const half = (e: DragEvent<HTMLElement>): "before" | "after" => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientY < r.top + r.height / 2 ? "before" : "after";
  };

  /** Строка чата: цель — чат из секции `target` со списком `list` (в порядке показа). */
  const rowHandlers = (item: Item, target: Target, list: Item[]) => ({
    draggable: fine,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(item.id));
      setDrag({ kind: "chat", id: item.id });
    },
    onDragEnd: clearDrag,
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (drag?.kind !== "chat" || drag.id === item.id) return;
      e.preventDefault();
      const at = half(e);
      if (over?.key !== `c${item.id}` || over.at !== at) setOver({ key: `c${item.id}`, at });
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (drag?.kind !== "chat" || drag.id === item.id) return;
      e.preventDefault();
      const at = half(e);
      const i = list.findIndex((x) => x.id === item.id);
      const next = list.slice(i + 1).find((x) => x.id !== drag.id);
      void library.place(drag.id, target, at === "before" ? item.id : (next?.id ?? null));
      clearDrag();
    },
  });

  /** Заголовок секции или группы принимает чат «внутрь» — в конец списка. */
  const dropIntoHandlers = (key: string, target: Target) => ({
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (drag?.kind !== "chat") return;
      e.preventDefault();
      if (over?.key !== key || over.at !== "into") setOver({ key, at: "into" });
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (drag?.kind !== "chat") return;
      e.preventDefault();
      void library.place(drag.id, target, null);
      clearDrag();
    },
  });

  const groupHandlers = (groupId: number) => {
    const key = `g${groupId}`;
    const into = dropIntoHandlers(key, { section: "group", groupId });
    return {
      draggable: fine,
      onDragStart: (e: DragEvent<HTMLElement>) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `group:${groupId}`);
        setDrag({ kind: "group", id: groupId });
      },
      onDragEnd: clearDrag,
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (drag?.kind === "group") {
          if (drag.id === groupId) return;
          e.preventDefault();
          const at = half(e);
          if (over?.key !== key || over.at !== at) setOver({ key, at });
          return;
        }
        into.onDragOver(e);
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        if (drag?.kind === "group") {
          if (drag.id === groupId) return;
          e.preventDefault();
          const ids = lay.groups.map((g) => g.group.id);
          const next = ids.slice(ids.indexOf(groupId) + 1).find((x) => x !== drag.id);
          void library.moveGroup(drag.id, half(e) === "before" ? groupId : (next ?? null));
          clearDrag();
          return;
        }
        into.onDrop(e);
      },
    };
  };

  /** Линия вставки и подсветка «внутрь» — рисуются у того, на кого целимся. */
  const mark = (key: string): React.CSSProperties => {
    if (over?.key !== key) return {};
    if (over.at === "before") return { boxShadow: "inset 0 2px 0 var(--primary)" };
    if (over.at === "after") return { boxShadow: "inset 0 -2px 0 var(--primary)" };
    return { background: "var(--primary-bg)", outline: "2px dashed var(--primary)", outlineOffset: -2 };
  };

  /* ---------- Меню ---------- */

  const openMenu = (m: Menu) => setMenu(m);
  const menuChat = menu?.kind === "chat" ? items?.find((i) => i.id === menu.id) : undefined;
  const menuGroup = menu?.kind === "group" ? library.groups.find((g) => g.id === menu.id) : undefined;

  const moveBy = (item: Item, dir: -1 | 1) => {
    const target = targetOf(item);
    const ids = sectionIds(lay, target);
    const i = ids.indexOf(item.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    // «Выше» — перед соседом сверху; «ниже» — перед тем, кто идёт через одного
    void library.place(item.id, target, dir < 0 ? ids[j] : (ids[j + 1] ?? null));
  };

  const moveGroupBy = (groupId: number, dir: -1 | 1) => {
    const ids = lay.groups.map((g) => g.group.id);
    const i = ids.indexOf(groupId);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    void library.moveGroup(groupId, dir < 0 ? ids[j] : (ids[j + 1] ?? null));
  };

  /* ---------- Разметка ---------- */

  const now = new Date();
  const dayLabels = [t.laWsGroupToday, t.laWsGroupYesterday, t.laWsGroupWeek, t.laWsGroupOlder];
  // Пока учитель ничего не расставлял, «Чаты» идут по дням, как раньше;
  // расставил — порядок его, и дни только мешали бы
  const byDays = lay.ungrouped.every((i) => i.position === null);
  const days: Item[][] = [[], [], [], []];
  if (byDays) for (const i of lay.ungrouped) days[groupOf(i.updated_at, now)].push(i);

  const row = (item: Item, target: Target, list: Item[]) => {
    const active = item.id === activeId;
    const title = chatTitle(t, item);
    return (
      <li
        key={item.id}
        className="sb-row"
        style={{ position: "relative", opacity: drag?.kind === "chat" && drag.id === item.id ? 0.4 : 1, ...mark(`c${item.id}`) }}
        {...rowHandlers(item, target, list)}
      >
        <button
          type="button"
          title={title}
          aria-current={active ? "true" : undefined}
          onClick={() => onPick(item.id)}
          className="row g8 sb-main"
          style={{
            width: "100%",
            alignItems: "center",
            minHeight: 40,
            padding: "0 36px 0 8px",
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
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
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
        <button
          type="button"
          className="sb-more"
          aria-label={t.laSbChatMenu}
          title={t.laSbChatMenu}
          aria-haspopup="menu"
          aria-expanded={menu?.kind === "chat" && menu.id === item.id}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openMenu({ kind: "chat", id: item.id, x: r.right, y: r.bottom });
          }}
        >
          <IconMore size={16} />
        </button>
      </li>
    );
  };

  const list = (rows: Item[], target: Target) => (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{rows.map((i) => row(i, target, rows))}</ul>
  );

  const sectionHead = (label: string, key: string, target: Target) => (
    <p
      className="caption muted-3"
      style={{ margin: 0, padding: "4px 8px", fontWeight: 700, borderRadius: 8, ...mark(key) }}
      {...dropIntoHandlers(key, target)}
    >
      {label}
    </p>
  );

  const dragging = drag?.kind === "chat";
  const archivedCount = lay.archived.length;

  return (
    <div className="stack" style={{ flex: 1, minHeight: 0 }}>
      <div
        className="row"
        style={{
          alignItems: "center",
          height: headerHeight,
          boxSizing: "border-box",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <strong className="h3" style={{ margin: 0 }}>
          {t.laSbTitle}
        </strong>
      </div>
      <div className="stack g12" style={{ flex: 1, minHeight: 0, padding: 12 }}>
      <div className="stack g10">
        <div className="row g8">
          <Button variant="secondary" block icon={<IconPlus size={17} />} onClick={onNew}>
            {t.laNewLesson}
          </Button>
          {!showArchive && (
            <Button
              variant="ghost"
              aria-label={t.laSbAddGroup}
              title={t.laSbAddGroup}
              onClick={() => setDialog({ mode: "create" })}
              style={{ flexShrink: 0 }}
            >
              <IconPlus size={15} />
              {t.laSbGroup}
            </Button>
          )}
        </div>
      </div>

      <nav
        aria-label={t.laChatsHistory}
        className="stack g12 grow"
        style={{ minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}
      >
        {showArchive ? (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setShowArchive(false)}>
              ← {t.laSbBack}
            </Button>
            <p className="caption muted-3" style={{ margin: 0, padding: "8px 8px 4px", fontWeight: 700 }}>
              {t.laSbArchiveTitle}
            </p>
            {archivedCount === 0 && <p className="small muted" style={{ padding: "4px 8px" }}>{t.laSbArchiveEmpty}</p>}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {lay.archived.map((item) => (
                <li key={item.id} className="row g8" style={{ alignItems: "center" }}>
                  <button
                    type="button"
                    title={chatTitle(t, item)}
                    aria-current={item.id === activeId ? "true" : undefined}
                    onClick={() => onPick(item.id)}
                    className="sb-main"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 40,
                      padding: "0 8px",
                      border: 0,
                      borderRadius: 10,
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: 14,
                      color: "var(--text-2)",
                      background: item.id === activeId ? "var(--primary-bg)" : "transparent",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chatTitle(t, item)}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => void library.archive(item.id, false)}>
                    {t.laSbRestore}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {(lay.pinned.length > 0 || dragging) && (
              <div>
                {sectionHead(t.laSbPinned, "s-pinned", { section: "pinned" })}
                {list(lay.pinned, { section: "pinned" })}
              </div>
            )}

            {lay.groups.map(({ group, items: rows }) => {
              const open = !folded.has(group.id);
              const key = `g${group.id}`;
              return (
                <div key={group.id}>
                  <div
                    className="sb-row"
                    style={{
                      position: "relative",
                      borderRadius: 8,
                      opacity: drag?.kind === "group" && drag.id === group.id ? 0.4 : 1,
                      ...mark(key),
                    }}
                    {...groupHandlers(group.id)}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-label={t.laSbGroupToggle(group.name, open)}
                      onClick={() =>
                        setFolded((f) => {
                          const next = new Set(f);
                          if (open) next.add(group.id);
                          else next.delete(group.id);
                          return next;
                        })
                      }
                      className="row g6 sb-main"
                      style={{
                        width: "100%",
                        alignItems: "center",
                        minHeight: 36,
                        padding: "0 36px 0 4px",
                        border: 0,
                        background: "transparent",
                        cursor: "pointer",
                        font: "inherit",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-2)",
                        textAlign: "left",
                        borderRadius: 8,
                      }}
                    >
                      {open ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {group.name}
                      </span>
                      <span className="caption muted-3">{rows.length}</span>
                    </button>
                    <button
                      type="button"
                      className="sb-more"
                      aria-label={t.laSbGroupMenu}
                      title={t.laSbGroupMenu}
                      aria-haspopup="menu"
                      aria-expanded={menu?.kind === "group" && menu.id === group.id}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        openMenu({ kind: "group", id: group.id, x: r.right, y: r.bottom });
                      }}
                    >
                      <IconMore size={16} />
                    </button>
                  </div>
                  {open && rows.length > 0 && <div style={{ paddingLeft: 10 }}>{list(rows, { section: "group", groupId: group.id })}</div>}
                </div>
              );
            })}

            {(lay.ungrouped.length > 0 || dragging) && (
              <div>
                {(lay.pinned.length > 0 || lay.groups.length > 0 || dragging) && sectionHead(t.laSbChats, "s-ungrouped", { section: "ungrouped" })}
                {byDays
                  ? days.map((rows, g) =>
                      rows.length === 0 ? null : (
                        <div key={g}>
                          <p className="caption muted-3" style={{ margin: 0, padding: "4px 8px", fontWeight: 700 }}>
                            {dayLabels[g]}
                          </p>
                          {list(rows, { section: "ungrouped" })}
                        </div>
                      ),
                    )
                  : list(lay.ungrouped, { section: "ungrouped" })}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="stack g8" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        {!showArchive && archivedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowArchive(true)}>
            {t.laSbArchive(archivedCount)}
          </Button>
        )}
        <LinkButton href={routes.lessons} variant="ghost" size="sm" icon={<IconLayers size={16} />}>
          {t.laMyLessons}
        </LinkButton>
        <AccessUntil />
      </div>
      </div>

      {menu && (menuChat || menuGroup) && (
        <ActionMenu
          key={`${menu.kind}${menu.id}`}
          menu={menu}
          onClose={() => setMenu(null)}
          chat={menuChat}
          group={menuGroup}
          groups={lay.groups.map((g) => g.group)}
          canUp={menuChat ? sectionIds(lay, targetOf(menuChat)).indexOf(menuChat.id) > 0 : lay.groups[0]?.group.id !== menuGroup?.id}
          canDown={
            menuChat
              ? (() => {
                  const ids = sectionIds(lay, targetOf(menuChat));
                  return ids.indexOf(menuChat.id) < ids.length - 1;
                })()
              : lay.groups[lay.groups.length - 1]?.group.id !== menuGroup?.id
          }
          onPin={(pinned) => void library.pin(menu.id, pinned)}
          onArchive={() => void library.archive(menu.id, true)}
          onMove={(groupId) => void library.toGroup(menu.id, groupId)}
          onNewGroup={() => setDialog({ mode: "create", chatId: menu.id })}
          onUp={() => (menuChat ? moveBy(menuChat, -1) : moveGroupBy(menu.id, -1))}
          onDown={() => (menuChat ? moveBy(menuChat, 1) : moveGroupBy(menu.id, 1))}
          onRename={() => setDialog({ mode: "rename", groupId: menu.id })}
          onDelete={() => setDeleting(menu.id)}
        />
      )}

      <NameSheet
        dialog={dialog}
        initial={dialog?.mode === "rename" ? (library.groups.find((g) => g.id === dialog.groupId)?.name ?? "") : ""}
        onClose={() => setDialog(null)}
        onSubmit={async (name) => {
          if (!dialog) return;
          if (dialog.mode === "rename") await library.rename(dialog.groupId, name);
          else await library.addGroup(name, dialog.chatId);
          setDialog(null);
        }}
      />

      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t.laSbDeleteTitle(library.groups.find((g) => g.id === deleting)?.name ?? "")}
        footer={
          <div className="row g8" style={{ justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => {
                if (deleting !== null) void library.removeGroup(deleting);
                setDeleting(null);
              }}
            >
              {t.laSbDeleteConfirm}
            </Button>
          </div>
        }
      >
        <p className="muted">{t.laSbDeleteText}</p>
      </Sheet>
    </div>
  );
}

/* ---------- Меню «⋯» ---------- */

function ActionMenu({
  menu,
  chat,
  group,
  groups,
  canUp,
  canDown,
  onClose,
  onPin,
  onArchive,
  onMove,
  onNewGroup,
  onUp,
  onDown,
  onRename,
  onDelete,
}: {
  menu: Menu;
  chat?: Item;
  group?: { id: number; name: string };
  groups: { id: number; name: string }[];
  canUp: boolean;
  canDown: boolean;
  onClose: () => void;
  onPin: (pinned: boolean) => void;
  onArchive: () => void;
  onMove: (groupId: number | null) => void;
  onNewGroup: () => void;
  onUp: () => void;
  onDown: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const [sub, setSub] = useState(false);
  /* Кнопка, с которой меню открыли, — фокус возвращается ей */
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    return () => {
      if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as Element).closest?.(".sb-more")) onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [onClose]);

  /* Фокус на первый пункт — при открытии и при переходе в подменю */
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[role=menuitem]:not(:disabled)")?.focus({ preventScroll: true });
  }, [sub]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (sub) setSub(false);
      else onClose();
      return;
    }
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const all = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not(:disabled)") ?? [])];
    const i = all.indexOf(document.activeElement as HTMLElement);
    all[(i + dir + all.length) % all.length]?.focus();
  };

  /* Под кнопкой, у правого края; не выходит за экран ни по высоте, ни по ширине */
  const style = {
    position: "fixed" as const,
    zIndex: 60,
    top: Math.min(menu.y + 4, window.innerHeight - 280),
    left: Math.max(8, Math.min(menu.x - 220, window.innerWidth - 228)),
    width: 220,
    maxHeight: "min(70vh, 320px)",
    overflowY: "auto" as const,
    padding: 6,
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "var(--shadow-lg)",
  };

  const item = (label: string, run: () => void, opts: { disabled?: boolean; keep?: boolean; checked?: boolean } = {}) => (
    <button
      key={label}
      type="button"
      role="menuitem"
      className="sb-item"
      disabled={opts.disabled}
      onClick={() => {
        run();
        if (!opts.keep) onClose();
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {opts.checked && <span aria-hidden>✓</span>}
    </button>
  );

  return (
    <div ref={ref} role="menu" aria-label={chat ? t.laSbChatMenu : t.laSbGroupMenu} style={style} onKeyDown={onKey}>
      {chat && !sub && (
        <>
          {item(chat.pinned ? t.laSbUnpin : t.laSbPin, () => onPin(!chat.pinned))}
          {item(`${t.laSbMoveToGroup} ▸`, () => setSub(true), { keep: true })}
          {item(t.laSbUp, onUp, { disabled: !canUp })}
          {item(t.laSbDown, onDown, { disabled: !canDown })}
          {item(t.laSbArchiveAction, onArchive)}
        </>
      )}
      {chat && sub && (
        <>
          {item(`← ${t.laSbBack}`, () => setSub(false), { keep: true })}
          {groups.map((g) => item(g.name, () => onMove(g.id), { checked: chat.group_id === g.id }))}
          {item(t.laSbNoGroup, () => onMove(null), { checked: chat.group_id === null })}
          {item(t.laSbNewGroup, onNewGroup)}
        </>
      )}
      {group && (
        <>
          {item(t.laSbRename, onRename)}
          {item(t.laSbUp, onUp, { disabled: !canUp })}
          {item(t.laSbDown, onDown, { disabled: !canDown })}
          {item(t.laSbDelete, onDelete)}
        </>
      )}
    </div>
  );
}

/* ---------- Диалог с названием группы ---------- */

function NameSheet({
  dialog,
  initial,
  onClose,
  onSubmit,
}: {
  dialog: NameDialog;
  initial: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const open = dialog !== null;
  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= NAME_MAX;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={dialog?.mode === "rename" ? t.laSbRenameTitle : t.laSbCreateTitle}
      footer={
        <div className="row g8" style={{ justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button disabled={!valid} loading={busy} onClick={() => void submit()}>
            {dialog?.mode === "rename" ? t.laSbSaveName : t.laSbCreate}
          </Button>
        </div>
      }
    >
      <label className="stack g6">
        <span className="small">{t.laSbGroupName}</span>
        <input
          className="input"
          value={name}
          maxLength={NAME_MAX}
          placeholder={t.laSbGroupPlaceholder}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
      </label>
    </Sheet>
  );
}
