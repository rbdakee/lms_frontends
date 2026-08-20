"use client";

/**
 * Публичные настройки (`GET /settings`) нужны нескольким местам сразу:
 * контакты администратора — кнопке «Связаться» и подвалу. Грузим один раз
 * на вкладку, как справочники.
 */

import { api } from "./client";
import { useLoad } from "./useLoad";
import type { PublicSettings } from "./types";

let cached: Promise<PublicSettings> | null = null;

export function fetchPublicSettings(): Promise<PublicSettings> {
  cached ??= api<PublicSettings>("/settings").catch((e) => {
    /* неудачную загрузку не кэшируем — иначе «Повторить» не поможет */
    cached = null;
    throw e;
  });
  return cached;
}

export function usePublicSettings() {
  return useLoad(fetchPublicSettings, []);
}

/** Ссылка wa.me из номера: в контактах хранится номер, а не ссылка.
    Пустой номер — null: кнопке WhatsApp тогда не рисоваться. */
export function waHref(number: string): string | null {
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
