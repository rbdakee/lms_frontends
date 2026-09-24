/**
 * Уроки, открытые на этом устройстве, — временная замена списка своих
 * комплектов, пока на сервере нет `GET /lesson_ai/kits` (см. `listKits`).
 *
 * Без неё «Мои уроки» были тупиком: экран комплекта говорит «страницу можно
 * закрыть», а найти комплект потом было негде. Здесь только номера — сами
 * комплекты экран спрашивает у сервера, и чужой номер отбивается `404`.
 * Ключ — на пользователя: школьный компьютер бывает общим.
 *
 * Появится ручка списка — файл удаляется вместе с веткой `405` в `listKits`.
 */

const MAX = 30;

function key(userId: number): string {
  return `lesson_ai_recent_kits:${userId}`;
}

/** Номера комплектов, свежие первыми. Сломанное хранилище — пустой список, а не ошибка. */
export function recentKitIds(userId: number): number[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is number => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

function save(userId: number, ids: number[]) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(ids.slice(0, MAX)));
  } catch {
    /* приватный режим или переполнено — список просто не пополнится */
  }
}

export function rememberKit(userId: number, kitId: number) {
  save(userId, [kitId, ...recentKitIds(userId).filter((id) => id !== kitId)]);
}

export function forgetKit(userId: number, kitId: number) {
  save(userId, recentKitIds(userId).filter((id) => id !== kitId));
}
