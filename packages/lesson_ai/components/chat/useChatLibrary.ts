"use client";

/**
 * Разговоры учителя для сайдбара: чаты (живые и архивные), группы и все
 * действия над ними — закрепить, перенести, архивировать, переименовать.
 *
 * Каждое действие сначала меняет список на экране, потом идёт на сервер; отказ
 * возвращает прежнее состояние и говорит об этом тостом. Грузим сразу всё
 * (страницами по 100): сайдбар раскладывает чаты по группам и считает их,
 * а полупустая раскладка при постраничной подгрузке только путала бы.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonChatGroup } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import {
  createChatGroup,
  deleteChatGroup,
  listChatGroups,
  listChats,
  patchChat,
  renameChatGroup,
  reorderChatGroups,
  reorderChats,
} from "../../api";
import { layout, mergeFresh, moveChat, removeGroup, sectionIds, setArchived, targetOf, type Item, type Target } from "./sidebarModel";

const PER_PAGE = 100;
const MAX_PAGES = 10;

interface State {
  items: Item[];
  groups: LessonChatGroup[];
}

async function loadAll(archived: boolean): Promise<Item[] | null> {
  const out: Item[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await listChats({ page, per_page: PER_PAGE, archived });
    if (!res) return null;
    out.push(...res.items);
    if (out.length >= res.total || res.items.length === 0) break;
  }
  return out;
}

export function useChatLibrary(handle: (e: unknown) => boolean) {
  const { t } = useLang();
  const toast = useToast();
  /* `undefined` — грузится, `null` — показывать нечего: ручки нет или сеть не ответила */
  const [state, setState] = useState<State | null | undefined>(undefined);
  const ref = useRef<State | null | undefined>(undefined);
  ref.current = state;
  /* Чаты, пришедшие из панели раньше первой загрузки */
  const early = useRef<Item[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadAll(false), loadAll(true), listChatGroups().catch(() => [] as LessonChatGroup[])]).then(
      ([live, archived, groups]) => {
        if (!alive) return;
        if (!live) return setState(null);
        const items = [...live, ...(archived ?? [])];
        const known = new Set(items.map((i) => i.id));
        setState({ items: [...early.current.filter((i) => !known.has(i.id)), ...items], groups });
      },
      (e) => {
        if (!alive || handle(e)) return;
        /* Сайдбар вспомогательный: без него разговор идёт как шёл */
        setState(null);
      },
    );
    return () => {
      alive = false;
    };
  }, [handle]);

  /** Свежая строка чата из открытой панели. */
  const upsert = useCallback((fresh: Item) => {
    if (ref.current === undefined) {
      early.current = [fresh, ...early.current.filter((i) => i.id !== fresh.id)];
      return;
    }
    setState((s) => {
      if (!s) return s;
      const known = s.items.find((i) => i.id === fresh.id);
      const next = mergeFresh(known, fresh);
      return { ...s, items: known ? s.items.map((i) => (i.id === fresh.id ? next : i)) : [next, ...s.items] };
    });
  }, []);

  /** Применить сразу, отправить на сервер, при отказе вернуть. */
  const run = useCallback(
    async (apply: (s: State) => State, request: () => Promise<unknown>) => {
      const before = ref.current;
      if (!before) return false;
      const next = apply(before);
      ref.current = next;
      setState(next);
      try {
        await request();
        return true;
      } catch (e) {
        ref.current = before;
        setState(before);
        if (!handle(e)) toast(t.laSbError, "error");
        return false;
      }
    },
    [handle, toast, t],
  );

  const s = state ?? null;

  return {
    state,
    items: s?.items ?? null,
    groups: s?.groups ?? [],
    upsert,

    pin: (id: number, pinned: boolean) =>
      run(
        (st) => {
          const item = st.items.find((i) => i.id === id);
          if (!item) return st;
          // Закрепили — наверх закреплённых; сняли — наверх прежней секции
          const target: Target = pinned ? { section: "pinned" } : targetOf({ ...item, pinned: false });
          const first = sectionIds(layout(st.items, st.groups), target)[0] ?? null;
          return { ...st, items: moveChat(st.items, st.groups, id, target, first).items };
        },
        () => patchChat(id, { pinned }),
      ),

    archive: (id: number, archived: boolean) =>
      run(
        (st) => ({ ...st, items: setArchived(st.items, st.groups, id, archived) }),
        () => patchChat(id, { archived }),
      ),

    /** Меню «Переместить в группу»: в конец группы / наверх «без группы» — как делает сервер */
    toGroup: (id: number, groupId: number | null) =>
      run(
        (st) => {
          const target: Target = groupId === null ? { section: "ungrouped" } : { section: "group", groupId };
          const first = sectionIds(layout(st.items, st.groups), target)[0] ?? null;
          return { ...st, items: moveChat(st.items, st.groups, id, target, first).items };
        },
        () => patchChat(id, { group_id: groupId }),
      ),

    /** Перетаскивание и «выше/ниже»: порядок секции целиком, заодно перенос */
    place: (id: number, target: Target, beforeId: number | null) => {
      const st = ref.current;
      if (!st) return Promise.resolve(false);
      const { ids } = moveChat(st.items, st.groups, id, target, beforeId);
      return run(
        (cur) => ({ ...cur, items: moveChat(cur.items, cur.groups, id, target, beforeId).items }),
        () =>
          reorderChats({
            section: target.section,
            group_id: target.section === "group" ? target.groupId : null,
            chat_ids: ids,
          }),
      );
    },

    /** Новая группа; чат, если назван, переезжает в неё сразу. Возвращает группу или null. */
    async addGroup(name: string, moveChatId?: number): Promise<LessonChatGroup | null> {
      try {
        const group = await createChatGroup(name);
        setState((st) => (st ? { ...st, groups: [...st.groups, group] } : st));
        if (moveChatId !== undefined) {
          setState((st) => {
            if (!st) return st;
            return { ...st, items: moveChat(st.items, st.groups, moveChatId, { section: "group", groupId: group.id }, null).items };
          });
          await patchChat(moveChatId, { group_id: group.id }).catch(() => toast(t.laSbError, "error"));
        }
        return group;
      } catch (e) {
        if (!handle(e)) toast(t.laSbError, "error");
        return null;
      }
    },

    rename: (id: number, name: string) =>
      run(
        (st) => ({ ...st, groups: st.groups.map((g) => (g.id === id ? { ...g, name } : g)) }),
        () => renameChatGroup(id, name),
      ),

    removeGroup: (id: number) =>
      run(
        (st) => ({ items: removeGroup(st.items, id), groups: st.groups.filter((g) => g.id !== id) }),
        () => deleteChatGroup(id),
      ),

    moveGroup: (id: number, beforeId: number | null) => {
      const st = ref.current;
      if (!st) return Promise.resolve(false);
      const order = (cur: State) => {
        const ids = [...cur.groups].sort((a, b) => a.position - b.position || a.id - b.id).map((g) => g.id).filter((x) => x !== id);
        const at = beforeId === null ? -1 : ids.indexOf(beforeId);
        return at < 0 ? [...ids, id] : [...ids.slice(0, at), id, ...ids.slice(at)];
      };
      return run(
        (cur) => {
          const pos = new Map(order(cur).map((gid, i) => [gid, i + 1]));
          return { ...cur, groups: cur.groups.map((g) => ({ ...g, position: pos.get(g.id) ?? g.position })) };
        },
        () => reorderChatGroups(order(st)),
      );
    },
  };
}

export type ChatLibrary = ReturnType<typeof useChatLibrary>;
