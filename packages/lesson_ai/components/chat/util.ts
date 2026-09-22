"use client";

/**
 * Мелочи экрана чата, которым не место в общем `api.ts` / `labels.ts`:
 * нужны только здесь.
 */

import { useEffect, useState } from "react";
import { isApiError } from "@lms/api";

/** Первое сообщение поля из `422` — оно конкретнее общего «проверьте заполнение». */
export function fieldMessage(e: unknown): string | null {
  if (!isApiError(e)) return null;
  const fields = e.details.fields;
  if (Array.isArray(fields) && fields.length > 0) {
    const first = fields[0] as { message?: unknown };
    if (typeof first.message === "string" && first.message) return first.message;
  }
  return e.message || null;
}

/** «через 21 мин.» из `retry_after_sec`: ноль минут учителю не показываем. */
export function minutesFrom(sec: number): number {
  return Math.max(1, Math.ceil(sec / 60));
}

/**
 * Широкий экран — заказ сбоку, узкий — сверху. Решает ширина окна, а не класс
 * с `@media`: карточка заказа и форма «Готовить» рисуются один раз, в одном
 * из двух мест, — двух копий полей с общим состоянием не бывает.
 * Граница та же, что у `desktop-only` в `globals.css`.
 */
export function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}
