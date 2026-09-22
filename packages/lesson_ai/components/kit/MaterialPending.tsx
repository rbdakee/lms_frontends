"use client";

/**
 * Материал, который ещё не готов или не получился.
 *
 * Сбой одного материала — его дело: соседи комплекта от него не зависят
 * (`CONTRACT.md`, L5, «упавший план соседей не валит»), поэтому и экран
 * говорит о сбое только здесь, а не шапкой всего комплекта.
 */

import type { LessonMaterial } from "@lms/api";
import { Empty, Note } from "@lms/ui";
import { IconClock } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";

export function MaterialPending({
  material,
  planPending = false,
}: {
  material: LessonMaterial;
  /** Ждёт плана урока — строится по нему, поэтому стоит в очереди дольше */
  planPending?: boolean;
}) {
  const { t } = useLang();

  if (material.status === "failed") {
    const reason = material.error
      ? ((t.laMaterialErrors as Record<string, string>)[material.error.code] ?? material.error.message)
      : null;
    return (
      <div className="stack g10">
        <Note kind="danger">
          <div className="stack g4">
            <strong>{t.laMaterialStatus.failed}</strong>
            {reason && <span>{reason}</span>}
          </div>
        </Note>
        <p className="small muted pretty" style={{ margin: 0 }}>
          {t.laMaterialFailedHint}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <Empty
        icon={material.status === "generating" ? <span className="spinner" style={{ width: 34, height: 34 }} /> : <IconClock size={38} />}
        title={t.laMaterialStatus[material.status]}
        text={planPending ? `${t.laKitWaitsPlan} ${t.laKitWaitingOne}` : t.laKitWaitingOne}
      />
    </div>
  );
}
