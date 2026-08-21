/**
 * Клиентское приложение живёт на другом домене и деплоится отдельно,
 * поэтому ссылки туда — не маршруты Next, а полные адреса.
 *
 * В разработке это соседний порт, в продакшне — `NEXT_PUBLIC_WEB_URL`
 * (`https://domain.kz`). Переменная читается на сборке: без неё
 * работает локальный запуск, с ней — боевой домен.
 */
export const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** Адрес страницы клиентского приложения: `web("/my")`. */
export function web(path = "/"): string {
  return `${WEB_URL}${path}`;
}

/**
 * «Предпросмотр как учитель» живёт в самой админке — маршрут `/preview/:id`.
 * Режим включает его layout запросом `POST /admin/preview/enter`, поэтому
 * отсюда достаточно обычной ссылки.
 */
export function preview(course_id: number | string): string {
  return `/preview/${course_id}`;
}
