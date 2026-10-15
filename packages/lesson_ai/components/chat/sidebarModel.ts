/**
 * Чистая модель сайдбара: как чаты раскладываются по секциям и как меняется
 * раскладка от переноса. Без React и без сети — экран и перетаскивание
 * пользуются одним и тем же, а сервер повторяет те же правила порядка.
 *
 * Порядок внутри секции: сначала чаты, которых учитель не двигал (`position`
 * пуст), по свежести, — новый чат оказывается сверху; затем расставленные по
 * `position`.
 */

import type { LessonChatGroup, LessonChatListItem } from "@lms/api";

export type Item = LessonChatListItem;

/** Куда переносится чат: закреплённые, группа или «без группы». */
export type Target = { section: "pinned" } | { section: "group"; groupId: number } | { section: "ungrouped" };

export interface Layout {
  pinned: Item[];
  groups: { group: LessonChatGroup; items: Item[] }[];
  ungrouped: Item[];
  archived: Item[];
}

function bySection(a: Item, b: Item): number {
  const pa = a.position ?? -Infinity;
  const pb = b.position ?? -Infinity;
  if (pa !== pb) return pa < pb ? -1 : 1;
  if (a.updated_at !== b.updated_at) return a.updated_at < b.updated_at ? 1 : -1;
  return b.id - a.id;
}

export function layout(items: Item[], groups: LessonChatGroup[]): Layout {
  const live = items.filter((i) => !i.archived);
  const known = new Set(groups.map((g) => g.id));
  return {
    pinned: live.filter((i) => i.pinned).sort(bySection),
    groups: [...groups]
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map((group) => ({
        group,
        items: live.filter((i) => !i.pinned && i.group_id === group.id).sort(bySection),
      })),
    // Чат с группой, которой уже нет (удалили в другой вкладке), — без группы
    ungrouped: live.filter((i) => !i.pinned && (i.group_id === null || !known.has(i.group_id))).sort(bySection),
    archived: items
      .filter((i) => i.archived)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
  };
}

export function sectionIds(l: Layout, target: Target): number[] {
  const list =
    target.section === "pinned"
      ? l.pinned
      : target.section === "ungrouped"
        ? l.ungrouped
        : (l.groups.find((g) => g.group.id === target.groupId)?.items ?? []);
  return list.map((i) => i.id);
}

/**
 * Чат `id` в секцию `target` перед чатом `beforeId` (`null` — в конец).
 * Возвращает новый список и порядок секции целиком — то, что уйдёт в `reorder`.
 */
export function moveChat(
  items: Item[],
  groups: LessonChatGroup[],
  id: number,
  target: Target,
  beforeId: number | null,
): { items: Item[]; ids: number[] } {
  const rest = sectionIds(layout(items, groups), target).filter((x) => x !== id);
  const at = beforeId === null ? -1 : rest.indexOf(beforeId);
  const ids = at < 0 ? [...rest, id] : [...rest.slice(0, at), id, ...rest.slice(at)];
  const order = new Map(ids.map((x, i) => [x, i + 1]));
  return {
    ids,
    items: items.map((item) => {
      if (!order.has(item.id)) return item;
      const moved: Item = { ...item, position: order.get(item.id)! };
      if (item.id !== id) return moved;
      // Закреплённый чат помнит группу: открепили — вернулся в неё
      if (target.section === "pinned") return { ...moved, pinned: true };
      return { ...moved, pinned: false, group_id: target.section === "group" ? target.groupId : null };
    }),
  };
}

/** Секция, в которой чат лежит сейчас. */
export function targetOf(item: Item): Target {
  if (item.pinned) return { section: "pinned" };
  return item.group_id === null ? { section: "ungrouped" } : { section: "group", groupId: item.group_id };
}

export function setArchived(items: Item[], groups: LessonChatGroup[], id: number, archived: boolean): Item[] {
  const alive = new Set(groups.map((g) => g.id));
  return items.map((i) =>
    i.id !== id
      ? i
      : archived
        ? { ...i, archived: true, pinned: false, position: null }
        : { ...i, archived: false, position: null, group_id: i.group_id !== null && alive.has(i.group_id) ? i.group_id : null },
  );
}

export function removeGroup(items: Item[], groupId: number): Item[] {
  return items.map((i) => (i.group_id === groupId ? { ...i, group_id: null, position: null } : i));
}

/** Строка из свежего ответа сервера поверх известной: личные поля сайдбара не теряем. */
export function mergeFresh(known: Item | undefined, fresh: Item): Item {
  if (!known) return fresh;
  const active = known.updated_at !== fresh.updated_at;
  return {
    ...fresh,
    pinned: known.pinned,
    group_id: known.group_id,
    position: known.position,
    // Написали в архивный чат — сервер сам вернул его из архива
    archived: active ? false : known.archived,
    ...(active && known.archived ? { position: null } : null),
  };
}
