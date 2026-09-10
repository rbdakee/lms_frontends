"use client";

/**
 * Ассистент в админке: один модуль на все экраны, которые его зовут
 * (`ASSISTANT_BRIEF`, решение владельца 09.09.2026).
 *
 * Зовут его семь мест сразу — страница чата, экран памяти, четыре карточки
 * человека и две формы ответа. Держать «создать чат» и «выдать допуск»
 * в каждом из них значило бы завести семь способов спросить одно и то же,
 * поэтому запросы, коды ошибок и разбор ответа живут здесь, а экраны знают
 * только имена функций.
 *
 * Чего здесь нет и не будет: ни одного места, где черновик отправляется
 * сам. `draftQuestionReply` и `draftReviewReply` возвращают текст — кладёт
 * его в поле и отправляет человек (раздел 11 брифа).
 */

import { useEffect, useState } from "react";
import {
  api,
  API_URL,
  ApiError,
  isApiError,
  NETWORK_ERROR,
  qs,
  type AdminTeacherCard,
  type AssistantDraftReply,
  type AssistantExecute,
  type AssistantGrant,
  type AssistantGrantLevel,
  type AssistantGrants,
  type AssistantMemory,
  type AssistantMemoryItem,
  type AssistantMessages,
  type AssistantThread,
  type AssistantThreads,
  type AssistantTurn,
} from "@lms/api";

/* ============ Ассистента может не быть вовсе ============ */

/**
 * Пустой `OPENAI_API_KEY` — **страницы нет и кнопки нет**, а не «кнопка есть
 * и падает» (раздел 11 брифа). Признак приехал полем `assistant.enabled`
 * в уже существующий `GET /admin/settings`.
 *
 * Кэш на вкладку — тот же приём, что у справочника площадок рядом
 * (`platforms.tsx`): признак спрашивают семь мест, а меняется он только
 * перезапуском бэкенда с другим ключом.
 */
type SettingsShape = { assistant: { enabled: boolean } };

let cached: Promise<boolean> | null = null;
/* Уже полученный ответ отдельно от обещания: без снимка кнопка на карточке
   успевала бы мигнуть при каждом переходе между экранами. */
let known: boolean | null = null;

export function fetchAssistantEnabled(): Promise<boolean> {
  cached ??= api<SettingsShape>("/admin/settings")
    .then((s) => {
      known = s.assistant.enabled;
      return known;
    })
    .catch((e) => {
      /* неудачную загрузку не кэшируем — иначе кнопка не вернётся до F5 */
      cached = null;
      throw e;
    });
  return cached;
}

/**
 * `true` — ассистент настроен, кнопку и пункт меню показываем.
 *
 * Пока признак едет и если запрос не удался — `false`: лишняя секунда без
 * кнопки лучше, чем кнопка, которая отвечает 503.
 */
export function useAssistantEnabled(): boolean {
  const [on, setOn] = useState<boolean>(known ?? false);
  useEffect(() => {
    let alive = true;
    fetchAssistantEnabled().then(
      (v) => alive && setOn(v),
      () => alive && setOn(false),
    );
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

/* ============ Ошибки ============ */

/** Модель не ответила — хода не было, текст админа цел, помогает вторая попытка. */
export const AI_FAILED = "ai_failed";
/** Ключа нет или выключатель снят: экран прячется целиком, а не показывает отказ. */
export const ASSISTANT_OFF = "assistant_off";
/** Потолок обращений на админа в час; в `details.retry_after_sec` — сколько ждать. */
export const RATE_LIMITED = "rate_limited";

/**
 * Текст ошибки для тоста — один на все экраны ассистента.
 *
 * Персданных здесь нет и быть не может: сообщения приходят от сервера, а он
 * их в тексты ошибок не кладёт (`CLAUDE.md`).
 */
export function assistantErrorText(e: unknown): string {
  if (isApiError(e, ASSISTANT_OFF)) return "Ассистент не настроен";
  if (isApiError(e, AI_FAILED)) return "Модель не ответила — попробуйте ещё раз";
  if (isApiError(e, RATE_LIMITED)) {
    const min = Math.ceil((e as ApiError).retryAfterSec / 60);
    return min > 1
      ? `Слишком много обращений к ассистенту — попробуйте через ${min} мин`
      : "Слишком много обращений к ассистенту — попробуйте через минуту";
  }
  return e instanceof ApiError ? e.message : "Не удалось соединиться с сервером";
}

/* ============ Чаты ============ */

export const listThreads = (archived = false) =>
  api<AssistantThreads>(`/admin/assistant/threads${qs({ archived: archived || "" })}`);

export const createThread = (course_id?: number | null) =>
  api<AssistantThread>("/admin/assistant/threads", {
    method: "POST",
    json: course_id ? { course_id } : {},
  });

/** Меняет только присланное: `course_id: null` снимает курс, поля нет — не трогает. */
export const patchThread = (
  id: number,
  patch: { title?: string; course_id?: number | null; archived?: boolean },
) => api<AssistantThread>(`/admin/assistant/threads/${id}`, { method: "PATCH", json: patch });

export const deleteThread = (id: number) =>
  api<void>(`/admin/assistant/threads/${id}`, { method: "DELETE" });

export const loadMessages = (id: number) =>
  api<AssistantMessages>(`/admin/assistant/threads/${id}/messages`);

/* ============ Ход — стримом ============ */

/** Карточка вызова, пришедшая событием `tool`: в ленте она ещё не лежит. */
export interface TurnToolCard {
  tool_name: string;
  tool_args: Record<string, unknown> | null;
  tool_result: Record<string, unknown> | null;
}

export interface TurnHandlers {
  /** Кусок текста по мере генерации — дописывается в черновой ответ. */
  onDelta: (text: string) => void;
  /**
   * Вызов инструмента в момент вызова.
   *
   * Здесь же черновой ответ **сбрасывается**: текст, сказанный перед вызовом,
   * это присказка вроде «сейчас посмотрю», и в ленту он не ложится. Не сбросить
   * его — значит показать строку, которая исчезнет на `done`.
   */
  onTool: (card: TurnToolCard) => void;
}

/**
 * Ход: сообщение админа и ответ ассистента.
 *
 * `EventSource` здесь не годится — он умеет только GET, а ход это POST,
 * поэтому стрим читается обычным `fetch` и разбирается вручную.
 *
 * Возвращает то, что пришло событием `done`: **ленту целиком**, а не
 * приращение. Она и есть правда — куски и карточки до этого показываются,
 * но не накапливаются.
 *
 * Отказы приходят двумя разными путями, и оба кончаются `ApiError`:
 * до начала стрима — обычным статусом (`429`, `422`, `404`, `503`), после —
 * событием `error`, потому что статус уже отдан и поменять его нечем.
 */
export async function say(
  id: number,
  text: string,
  on: TurnHandlers,
): Promise<AssistantTurn> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin/assistant/threads/${id}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new ApiError(0, {
      code: NETWORK_ERROR,
      message: "Не удалось соединиться с сервером",
    });
  }

  if (!res.ok || !res.body) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* тело пустое или не JSON — ниже подставится заглушка */
    }
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err ?? { code: "internal_error", message: "Что-то пошло не так" },
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: AssistantTurn | null = null;

  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    /* Событие кончается пустой строкой; хвост буфера — недочитанное событие,
       и трогать его нельзя до следующего куска */
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const event = parseEvent(block);
      if (!event) continue;
      if (event.name === "delta") on.onDelta(String(event.data.text ?? ""));
      else if (event.name === "tool") on.onTool(event.data as unknown as TurnToolCard);
      else if (event.name === "done") done = event.data as unknown as AssistantTurn;
      else if (event.name === "error") {
        const err = event.data.error as { code: string; message: string } | undefined;
        throw new ApiError(
          502,
          err ?? { code: AI_FAILED, message: "Модель не ответила — попробуйте ещё раз" },
        );
      }
    }
  }

  if (!done) {
    /* Соединение оборвалось, не дойдя до `done`: считать это удачным ходом
       нельзя — на сервере он тоже не сохранился */
    throw new ApiError(502, {
      code: AI_FAILED,
      message: "Ответ оборвался — попробуйте ещё раз",
    });
  }
  return done;
}

/** `event: delta\ndata: {…}` → имя и разобранное тело. */
function parseEvent(block: string): { name: string; data: Record<string, unknown> } | null {
  const name = /^event: (.+)$/m.exec(block)?.[1];
  const raw = /^data: (.*)$/m.exec(block)?.[1];
  if (!name || raw === undefined) return null;
  try {
    return { name, data: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return null;
  }
}

/* ============ Предложения ============ */

/**
 * Кнопка «Выполнить» посылает **только `id`**: аргументы исполнение берёт
 * из своей строки в базе, иначе подтверждение подтверждало бы не то, что
 * было показано (раздел 6 брифа). Тела у запроса нет вовсе.
 */
export const executeProposal = (id: number) =>
  api<AssistantExecute>(`/admin/assistant/proposals/${id}/execute`, { method: "POST" });

export const cancelProposal = (id: number) =>
  api<AssistantExecute>(`/admin/assistant/proposals/${id}/cancel`, { method: "POST" });

/* ============ Допуск к персданным ============ */

/**
 * Допуск на **одного человека в одном чате** (раздел 5 брифа). Повторный
 * вызов на того же человека меняет уровень и продлевает срок.
 *
 * `read` — карточка; `write` — плюс правка данных, выдача доступа
 * и выдача сертификата этому человеку.
 */
export const grantPd = (threadId: number, user_id: number, level: AssistantGrantLevel) =>
  api<AssistantGrant>(`/admin/assistant/threads/${threadId}/grants`, {
    method: "POST",
    json: { user_id, level },
  });

export const listGrants = (threadId: number) =>
  api<AssistantGrants>(`/admin/assistant/threads/${threadId}/grants`);

export const revokeGrant = (threadId: number, user_id: number) =>
  api<void>(`/admin/assistant/threads/${threadId}/grants/${user_id}`, { method: "DELETE" });

/* ============ Память ============ */

/** Индекс памяти. Тел записей здесь нет — их читает сам ассистент. */
export const loadMemory = () => api<AssistantMemory>("/admin/assistant/memory");

/** Общие записи сверху, записи курсов под ними — как отдаёт сервер. */
export const isCourseMemory = (m: AssistantMemoryItem) => m.scope === "course";

/* ============ Черновики ответов ============ */

/**
 * Черновик ответа на вопрос учителя. Адресуется **корень ветки** — тот же
 * путь, что у `DELETE /admin/thread_messages/{id}`.
 *
 * Ничего не меняет и никуда не отправляет: возвращает текст и строку
 * «из чего собрано». Отправляет админ прежней кнопкой «Ответить».
 */
export const draftQuestionReply = (messageId: number) =>
  api<AssistantDraftReply>(`/admin/thread_messages/${messageId}/draft_reply`, {
    method: "POST",
  });

/** То же для отзыва. Тела нет, форма ответа та же. */
export const draftReviewReply = (reviewId: number) =>
  api<AssistantDraftReply>(`/admin/reviews/${reviewId}/draft_reply`, { method: "POST" });

/* ============ Имена — их подставляет браузер, а не ассистент ============ */

/**
 * Имя человека по `id` — обычной админской ручкой `/admin/teachers/{id}`,
 * право на которую у админа и так есть.
 *
 * Это не деталь реализации, а причина, по которой чипы допусков и карточка
 * выбора устроены именно так (раздел 5 брифа): **ассистент имён не видит
 * вовсе**, в его ответах стоит `Учитель #418`. Подписать `418` живым именем
 * может только браузер, и делает это здесь.
 *
 * Кэш на вкладку: чипов в шапке чата бывает несколько, и каждый спрашивает
 * своё имя при каждой перерисовке ленты.
 */
const names = new Map<number, Promise<string>>();

export function teacherName(id: number): Promise<string> {
  const hit = names.get(id);
  if (hit) return hit;
  const p = api<AdminTeacherCard>(`/admin/teachers/${id}`)
    .then((c) => [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(" "))
    .catch(() => {
      /* не нашёлся или сеть отвалилась — остаётся маска, как у ассистента */
      names.delete(id);
      return "";
    });
  names.set(id, p);
  return p;
}

/** Маска ассистента: так человек подписан везде, пока имени нет. */
export const teacherMask = (id: number) => `Учитель #${id}`;

/**
 * Имя для чипа и строки выбора: пока не приехало — маска.
 *
 * Пустой строки не отдаём никогда: подпись, исчезающая на секунду, читается
 * как «человека нет».
 */
export function useTeacherName(id: number | null): string {
  const [name, setName] = useState("");
  useEffect(() => {
    if (id === null) return;
    let alive = true;
    teacherName(id).then((n) => alive && setName(n));
    return () => {
      alive = false;
    };
  }, [id]);
  return id === null ? "" : name || teacherMask(id);
}
