/**
 * Отказы ручек блоков — текстом для учителя.
 *
 * Свои строки — там, где учителю нужно сказать больше, чем сервер: что блок
 * остался как был, что показан свежий. Остальное (`program_not_published`,
 * `material_not_ready`, `block_locked`) сервер уже формулирует по-человечески —
 * показываем его `message`.
 */

import { ApiError, NETWORK_ERROR } from "@lms/api";
import type { dict } from "@lms/ui/i18n";
import { AI_FAILED } from "../../api";

type T = (typeof dict)["ru"];

export const BLOCK_CHANGED = "block_changed";
export const VALIDATION_ERROR = "validation_error";

export function problemText(e: unknown, t: T): string {
  if (!(e instanceof ApiError) || e.code === NETWORK_ERROR) return t.loadErrorText;
  if (e.code === AI_FAILED) return t.laBlockAiFailed;
  if (e.code === BLOCK_CHANGED) return t.laBlockChanged;
  return e.message;
}

/** Строки `422`: `details.fields[]` — где и что не так. */
export function fieldProblems(e: unknown): { field: string; message: string }[] {
  if (!(e instanceof ApiError) || e.code !== VALIDATION_ERROR) return [];
  const fields = e.details.fields;
  return Array.isArray(fields) ? (fields as { field: string; message: string }[]) : [];
}
