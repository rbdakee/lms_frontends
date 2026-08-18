"use client";

/**
 * Справочники (`GET /dictionaries`) нужны сразу многим экранам: регионы —
 * профилю, категории — каталогу и карточкам. Грузим один раз на вкладку.
 */

import { api } from "./client";
import { useLoad } from "./useLoad";
import type { Category, Dictionaries } from "./types";

let cached: Promise<Dictionaries> | null = null;

export function fetchDictionaries(): Promise<Dictionaries> {
  cached ??= api<Dictionaries>("/dictionaries").catch((e) => {
    /* неудачную загрузку не кэшируем — иначе «Повторить» не поможет */
    cached = null;
    throw e;
  });
  return cached;
}

export function useDictionaries() {
  return useLoad(fetchDictionaries, []);
}

/** Подпись категории по `category_id` — id в интерфейсе не показываем. */
export function categoryTitle(categories: Category[] | undefined, id: number): string {
  return categories?.find((c) => c.id === id)?.title ?? "";
}
