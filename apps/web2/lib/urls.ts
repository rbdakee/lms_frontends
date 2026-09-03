/**
 * Админка живёт на другом домене и деплоится отдельно, поэтому ссылки туда —
 * не маршруты Next, а полные адреса. Админка одна на обе площадки.
 *
 * В разработке это соседний порт, в продакшне — `NEXT_PUBLIC_ADMIN_URL`
 * (`https://admin.domain.kz`), который в бою может быть ещё и закрыт по IP.
 */
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

/** Адрес страницы админки: `admin("/leads")`. */
export function admin(path = "/"): string {
  return `${ADMIN_URL}${path}`;
}
