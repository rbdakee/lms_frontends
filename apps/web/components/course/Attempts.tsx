"use client";

/**
 * История попыток теста — раздел 5.8 брифа.
 * Попытки не затираются, даже когда засчитывается последняя: админу нужна
 * история, восстановить её потом неоткуда. Зачётную помечает сервер
 * (`is_counted`) — угадывать её по порядку на клиенте нельзя, у пересдаваемого
 * теста зачёт переезжает на последнюю завершённую попытку.
 */

import type { QuizAttemptHistory } from "@lms/api";
import { useStore } from "@lms/prototype";
import { Badge } from "@lms/ui";
import { dayMonth } from "@lms/ui/i18n";

export function AttemptsHistory({
  attempts,
  retakable,
}: {
  attempts: QuizAttemptHistory[];
  retakable: boolean;
}) {
  const { t, lang } = useStore();
  if (attempts.length === 0) return null;

  return (
    <section className="card card-pad stack g12">
      <div className="row between wrap g8">
        <h2 className="h3">{t.secAttempts}</h2>
        <span className="caption muted-3">
          {retakable ? t.countedLast : t.oneAttemptShort}
        </span>
      </div>
      <div className="stack g8">
        {/* Старые сверху — порядок сервера, номер попытки идёт по нему */}
        {attempts.map((a, i) => (
          <div key={a.id} className="row between g10" style={{ minHeight: 36 }}>
            <span className="stack g2" style={{ minWidth: 0 }}>
              <span className="small" style={{ fontWeight: 600 }}>
                {t.attemptN(i + 1)}
              </span>
              <span className="caption muted-3">
                {dayMonth(a.finished_at, lang)} · {t.minShort(a.minutes_spent)}
                {a.timed_out ? ` · ${t.timedOutShort}` : ""}
              </span>
            </span>
            <span className="row g8 nowrap">
              <strong
                className="small"
                style={{ color: a.passed ? "var(--success)" : "var(--danger)" }}
              >
                {a.score_percent}%
              </strong>
              {a.is_counted && <Badge kind="new">{t.countedBadge}</Badge>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
