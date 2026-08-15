"use client";

/**
 * «Ждёт N дней» — вместо прежнего «нарушает SLA».
 *
 * Никакого SLA не существует: нет ни договора, ни согласованного срока.
 * Число считается из даты и нигде не хранится, а покраснение — просто
 * подсказка, что пора заняться: у заявок после двух дней, у работ после трёх.
 */

import { plural } from "@lms/ui/i18n";

export function Waiting({
  days,
  redAfter = 3,
  short,
}: {
  days: number;
  /** После скольких дней надпись краснеет */
  redAfter?: number;
  /** Компактный вид для узких колонок: «4 дня» вместо «ждёт 4 дня» */
  short?: boolean;
}) {
  const late = days > redAfter;
  const text =
    days === 0
      ? "сегодня"
      : `${short ? "" : "ждёт "}${days} ${plural(days, "день", "дня", "дней")}`;
  return (
    <span
      className="caption nowrap"
      style={{
        color: late ? "var(--danger)" : "var(--text-3)",
        fontWeight: late ? 700 : 600,
      }}
    >
      {text}
    </span>
  );
}
