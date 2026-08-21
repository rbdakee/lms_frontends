/**
 * Обёртка над fetch — единственная дорога на бэкенд.
 *
 * Сессия живёт в HttpOnly-куке, токена на клиенте нет, поэтому каждый запрос
 * идёт с `credentials: "include"`. Имя куки выбирает сервер по `Origin`
 * (`sid` у кабинета учителя, `sid_admin` у админки) — клиенту оно не нужно
 * и здесь не упоминается.
 *
 * Ошибки сервер отдаёт в едином формате `{ error: { code, message, details } }` —
 * здесь они превращаются в `ApiError`, и экраны ветвятся по `code`,
 * а текст берут из `message`.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Код «ошибки сети»: сервер не ответил вовсе. HTTP-статус в этом случае 0. */
export const NETWORK_ERROR = "network_error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? {};
  }

  /** Секунды до следующей попытки из 429 — на таймер экрана. */
  get retryAfterSec(): number {
    return Number(this.details.retry_after_sec ?? 0);
  }

  /** Осталось попыток ввода кода — из `wrong_code`. */
  get attemptsLeft(): number {
    return Number(this.details.attempts_left ?? 0);
  }
}

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers:
        json === undefined
          ? rest.headers
          : { "Content-Type": "application/json", ...rest.headers },
      body: json === undefined ? rest.body : JSON.stringify(json),
    });
  } catch {
    throw new ApiError(0, {
      code: NETWORK_ERROR,
      message: "Не удалось соединиться с сервером",
    });
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* тело пустое или не JSON — для ошибки ниже подставится заглушка */
  }

  if (!res.ok) {
    const err = (body as { error?: ApiErrorBody } | null)?.error;
    throw new ApiError(
      res.status,
      err ?? { code: "internal_error", message: "Что-то пошло не так" },
    );
  }
  return body as T;
}

/** `qs({ page: 2, status: "open", q: "" })` → `?page=2&status=open` — пустое не шлём. */
export function qs(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
