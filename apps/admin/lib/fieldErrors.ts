import { isApiError } from "@lms/api";

/**
 * Подписи из `422 validation_error`: сервер шлёт `details.fields`
 * готовыми русскими строками, экран только раскладывает их по полям
 * (`.input-error` + `<span className="error-text">`). Своих формулировок
 * не сочиняем — иначе экран и сервер скажут о запрете разное.
 */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!isApiError(e, "validation_error")) return {};
  const raw = e.details.fields;
  if (!Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const f of raw as { field?: string; message?: string }[]) {
    if (f?.field) out[f.field] = f.message ?? "";
  }
  return out;
}
