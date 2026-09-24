"use client";

/**
 * Материал, который ещё не готов или не получился.
 *
 * Сбой одного материала — его дело: соседи комплекта от него не зависят
 * (`CONTRACT.md`, L5, «упавший план соседей не валит»), поэтому и экран
 * говорит о сбое только здесь, а не шапкой всего комплекта.
 */

import type { LessonMaterial } from "@lms/api";
import { Empty, LinkButton, Note } from "@lms/ui";
import { IconClock, IconCopy } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useRoutes } from "../../host";

export function MaterialPending({
  material,
  kitId,
  planPending = false,
}: {
  material: LessonMaterial;
  /** Комплект — для копии урока: собрать заново один материал сервер пока не умеет */
  kitId: number;
  /** Ждёт плана урока — строится по нему, поэтому стоит в очереди дольше */
  planPending?: boolean;
}) {
  const { t } = useLang();
  const routes = useRoutes();

  if (material.status === "failed") {
    const reason = material.error
      ? ((t.laMaterialErrors as Record<string, string>)[material.error.code] ?? material.error.message)
      : null;
    return (
      <div className="stack g10">
        <Note kind="danger">
          <div className="stack g4">
            <strong>{t.laMaterialFailedTitle}</strong>
            {reason && <span>{reason}</span>}
          </div>
        </Note>
        <p className="small muted pretty" style={{ margin: 0 }}>
          {t.laMaterialFailedHint}
        </p>
        {/* Выход рядом с объяснением: иначе учитель ищет кнопку копии в шапке комплекта */}
        <div>
          <LinkButton href={routes.newFrom(kitId)} variant="secondary" icon={<IconCopy size={16} />}>
            {t.laMaterialFailedCopy}
          </LinkButton>
        </div>
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
