/**
 * Все запросы «Жоспара» — одно место на пакет, как `assistantApi.ts` у админки.
 *
 * Формы ответов — из схемы бэкенда (`@lms/api`), контракт с примерами —
 * `backend/CONTRACT.md`, разделы L3–L7. Исключение одно — список своих
 * комплектов, см. `listKits`: ручки на сервере ещё нет.
 *
 * Отказы приходят `ApiError` с `code`, и два из них экраны не показывают
 * «ошибкой»: `lesson_ai_off` (продукта нет — прячем вход) и `lesson_ai_no_access`
 * (доступа нет — экран «как получить доступ»). Их ловит `access.tsx`.
 */

import {
  API_URL,
  ApiError,
  NETWORK_ERROR,
  api,
  qs,
  type DifficultyLevel,
  type EngagementLevel,
  type LessonAccessStatus,
  type LessonBlock,
  type LessonBlocks,
  type LessonBlockVersions,
  type LessonChat,
  type LessonChatConfirm,
  type LessonChatConfirmIn,
  type LessonChatObjective,
  type LessonChatOrderPatch,
  type LessonChatTurn,
  type LessonKit,
  type LessonLang,
  type LessonMaterial,
  type LessonObjectives,
} from "@lms/api";

/* ============ Коды отказов, на которые ветвятся экраны ============ */

/** Продукт выключен на сервере — вход в него не показываем вовсе. */
export const LESSON_AI_OFF = "lesson_ai_off";
/** Доступа нет: не выдан, снят или истёк. */
export const LESSON_AI_NO_ACCESS = "lesson_ai_no_access";
/** Суточный лимит комплектов или потолок реплик чата. */
export const RATE_LIMITED = "rate_limited";
export const AI_FAILED = "ai_failed";

/* ============ Доступ ============ */

/** Единственная ручка продукта вне проверки доступа. */
export function getAccess(): Promise<LessonAccessStatus> {
  return api<LessonAccessStatus>("/lesson_ai/access");
}

/* ============ Комплект ============ */

/** Опрос комплекта: та же форма, что у заказа, — экран перерисовывается ею целиком. */
export function getKit(id: number | string): Promise<LessonKit> {
  return api<LessonKit>(`/lesson_ai/kits/${id}`);
}

/* ============ Свои уроки — ручки на сервере ещё нет ============

   Бриф (раздел 4.3): «список своих уроков, поиск, копия как основа». На бэкенде
   L3–L7 ручки списка не сделали, а L8 бэкенд не правит. Экран написан под
   предложенную форму — она же записана владельцу в `SESSION_L8_QA.md`
   («Нужно от бэкенда», пункт 1) — и собрана из уже сгенерированных типов,
   чтобы руками описывать как можно меньше:

     GET /lesson_ai/kits?q=&page=&per_page=
     → { items: [комплект без content, notes и class_size], total, page, per_page }

   Свежие сверху; `q` ищет по теме и по коду и тексту цели.

   Пока ручки нет, FastAPI отвечает на GET по этому пути `405` (у пути есть
   только POST) — `listKits` возвращает `null`, и экран показывает комплекты,
   открытые на этом устройстве (`recent.ts`). Появится ручка — перегенерировать
   типы, заменить `LessonKitListItem` на тип из схемы, убрать ветку `405`
   и удалить `recent.ts`. */

export type LessonKitListItem = Omit<LessonKit, "materials" | "notes" | "class_size"> & {
  materials: Pick<LessonMaterial, "id" | "kind" | "status">[];
};

export interface LessonKitsPage {
  items: LessonKitListItem[];
  total: number;
  page: number;
  per_page: number;
}

export async function listKits(params: {
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<LessonKitsPage | null> {
  try {
    return await api<LessonKitsPage>(`/lesson_ai/kits${qs(params)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 405 || e.status === 404)) return null;
    throw e;
  }
}

/* ============ Материал: блоки, версии, файл ============ */

export function getBlocks(materialId: number): Promise<LessonBlocks> {
  return api<LessonBlocks>(`/lesson_ai/materials/${materialId}/blocks`);
}

/** Переписать блок моделью. Синхронно, 6–10 секунд. */
export function regenerateBlock(
  materialId: number,
  block: string,
  instruction: string,
): Promise<LessonBlock> {
  const text = instruction.trim();
  return api<LessonBlock>(`/lesson_ai/materials/${materialId}/blocks/${block}/regenerate`, {
    method: "POST",
    json: text ? { instruction: text } : {},
  });
}

/** Ручная правка: блок целиком, той же формы, что в `content`. */
export function saveBlock(materialId: number, block: string, content: unknown): Promise<LessonBlock> {
  return api<LessonBlock>(`/lesson_ai/materials/${materialId}/blocks/${block}`, {
    method: "PUT",
    json: { content },
  });
}

export function getBlockVersions(materialId: number, block: string): Promise<LessonBlockVersions> {
  return api<LessonBlockVersions>(`/lesson_ai/materials/${materialId}/blocks/${block}/versions`);
}

export function restoreBlockVersion(
  materialId: number,
  block: string,
  versionId: number,
): Promise<LessonBlock> {
  return api<LessonBlock>(
    `/lesson_ai/materials/${materialId}/blocks/${block}/versions/${versionId}/restore`,
    { method: "POST" },
  );
}

/**
 * Скачать материал файлом.
 *
 * Не ссылкой, а запросом: так отказ (`403` снятого доступа, `409` неготового
 * материала) приходит экрану, а не открывается у учителя страницей с JSON.
 *
 * Имя файла сервер кладёт в `Content-Disposition`, но CORS его наружу пока
 * не выпускает (`expose_headers` нет — `SESSION_L8_QA.md`, «Нужно от бэкенда»).
 * Поэтому имя берётся из заголовка, если он виден, а иначе собирается здесь
 * по той же таблице, что у сервера (`CONTRACT.md`, L5): «ҚМЖ — тема.docx».
 * Откроет сервер заголовок — запасное имя перестанет использоваться само.
 */
export async function downloadMaterial(materialId: number, fallbackName: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/lesson_ai/materials/${materialId}/file`, {
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, { code: NETWORK_ERROR, message: "Не удалось соединиться с сервером" });
  }
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* тело пустое или не JSON — ниже подставится заглушка */
    }
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new ApiError(res.status, err ?? { code: "internal_error", message: "Что-то пошло не так" });
  }
  const blob = await res.blob();
  const name = fileNameFrom(res.headers.get("content-disposition")) ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Сразу отзывать нельзя: часть браузеров начинает скачивание после клика */
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** `attachment; filename="x.docx"; filename*=UTF-8''%D2%9A…` → имя по-человечески. */
function fileNameFrom(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (star) {
    try {
      return decodeURIComponent(star);
    } catch {
      /* кривая кодировка — берём запасное */
    }
  }
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? null;
}

/* ============ Чат сбора заказа ============ */

/** Новый чат. Модель не зовётся — приветствие рисует экран. */
export function createChat(): Promise<LessonChat> {
  return api<LessonChat>("/lesson_ai/chats", { method: "POST" });
}

export function getChat(id: number | string): Promise<LessonChat> {
  return api<LessonChat>(`/lesson_ai/chats/${id}`);
}

/** Кнопки под сообщениями: «Да, она», язык обучения, тема. `null` — стереть поле. */
export function patchOrder(id: number, body: LessonChatOrderPatch): Promise<LessonChat> {
  return api<LessonChat>(`/lesson_ai/chats/${id}/order`, { method: "PATCH", json: body });
}

/** «Готовить». Оба уровня обязательны — экран показывает вопрос всегда. */
export function confirmChat(id: number, body: LessonChatConfirmIn): Promise<LessonChatConfirm> {
  return api<LessonChatConfirm>(`/lesson_ai/chats/${id}/confirm`, { method: "POST", json: body });
}

/** «Показать другие» и «выбрать самому» — поиск без модели, мимо суточных потолков. */
export function findObjectives(params: {
  q?: string;
  grade?: number | null;
  lang?: LessonLang | null;
}): Promise<LessonObjectives> {
  return api<LessonObjectives>(`/lesson_ai/objectives${qs(params)}`);
}

/** Событие `tool`: поиск по программе в момент поиска. */
export interface ChatToolEvent {
  tool_name: string;
  tool_args: Record<string, unknown> | null;
  tool_result: Record<string, unknown> | null;
}

export interface ChatHandlers {
  /** Кусок текста по мере генерации — дописывается в черновой ответ. */
  onDelta: (text: string) => void;
  /**
   * Поиск по программе. Черновой ответ здесь **сбрасывается**: текст до поиска —
   * присказка «сейчас посмотрю», в ленту он не ляжет.
   */
  onTool: (event: ChatToolEvent) => void;
}

/**
 * Реплика учителя и ответ помощника стримом.
 *
 * `EventSource` умеет только GET, а реплика — POST, поэтому стрим читается
 * `fetch` и разбирается вручную (так же у ассистента админки). Возвращает
 * то, что пришло в `done`: **чат целиком** — ленту и заказ. Он и есть правда.
 *
 * Отказы — `ApiError` двумя путями: до стрима обычным статусом (`403`, `409`,
 * `422`, `429`), после — событием `error`: хода тогда не было вовсе.
 */
export async function say(chatId: number, text: string, on: ChatHandlers): Promise<LessonChatTurn> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/lesson_ai/chats/${chatId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new ApiError(0, { code: NETWORK_ERROR, message: "Не удалось соединиться с сервером" });
  }

  if (!res.ok || !res.body) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* тело пустое или не JSON — ниже подставится заглушка */
    }
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new ApiError(res.status, err ?? { code: "internal_error", message: "Что-то пошло не так" });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: LessonChatTurn | null = null;

  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    /* Событие кончается пустой строкой; хвост — недочитанное событие */
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const event = parseEvent(block);
      if (!event) continue;
      if (event.name === "delta") on.onDelta(String(event.data.text ?? ""));
      else if (event.name === "tool") on.onTool(event.data as unknown as ChatToolEvent);
      else if (event.name === "done") done = event.data as unknown as LessonChatTurn;
      else if (event.name === "error") {
        const err = event.data.error as { code: string; message: string } | undefined;
        throw new ApiError(502, err ?? { code: AI_FAILED, message: "Модель не ответила — попробуйте ещё раз" });
      }
    }
  }

  if (!done) {
    /* Оборвалось до `done`: на сервере ход тоже не сохранился */
    throw new ApiError(502, { code: AI_FAILED, message: "Ответ оборвался — попробуйте ещё раз" });
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

/** Цели из `tool_result` строки ленты или события `tool`. Отказ инструмента — пусто. */
export function objectivesOf(toolResult: Record<string, unknown> | null): LessonChatObjective[] {
  const items = toolResult?.items;
  return Array.isArray(items) ? (items as LessonChatObjective[]) : [];
}

/* ============ Уровни и виды ============ */

export const ENGAGEMENT_LEVELS: EngagementLevel[] = ["calm", "active", "full_game"];
export const DIFFICULTY_LEVELS: DifficultyLevel[] = ["basic", "standard", "advanced"];
