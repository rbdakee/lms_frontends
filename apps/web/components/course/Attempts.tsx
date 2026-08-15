"use client";

/**
 * История попыток теста — раздел 5.8 брифа.
 * Попытки не затираются, даже когда засчитывается последняя:
 * админу нужна история, восстановить её потом неоткуда.
 */

import type { QuizAttempt } from "@lms/prototype";
import { Badge } from "@lms/ui";

export function AttemptsHistory({
  attempts,
  retakable,
}: {
  attempts: QuizAttempt[];
  retakable: boolean;
}) {
  if (attempts.length === 0) return null;

  /* Зачётная — последняя у пересдаваемого, единственная у непересдаваемого */
  const countedIndex = attempts.length - 1;

  return (
    <section className="card card-pad stack g12">
      <div className="row between wrap g8">
        <h2 className="h3">История попыток</h2>
        <span className="caption muted-3">
          {retakable ? "засчитывается последний результат" : "попытка одна"}
        </span>
      </div>
      <div className="stack g8">
        {attempts.map((a, i) => (
          <div key={a.id} className="row between g10" style={{ minHeight: 36 }}>
            <span className="stack g2" style={{ minWidth: 0 }}>
              <span className="small" style={{ fontWeight: 600 }}>
                Попытка {i + 1}
              </span>
              <span className="caption muted-3">
                {a.date} · {a.minutesSpent} мин
                {a.timedOut ? " · время истекло" : ""}
              </span>
            </span>
            <span className="row g8 nowrap">
              <strong
                className="small"
                style={{ color: a.passed ? "var(--success)" : "var(--danger)" }}
              >
                {a.pct}%
              </strong>
              {i === countedIndex && <Badge kind="new">зачётная</Badge>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
