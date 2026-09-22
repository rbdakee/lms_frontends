"use client";

/**
 * Шапка выбранного материала: вид, статус и место под действия.
 *
 * `actions` — слот, а не кнопка внутри: скачивание файлом пишется отдельно
 * (у него свои отказы — `403` снятого доступа, `409` неготового материала),
 * и шапке незачем о них знать.
 */

import type { ReactNode } from "react";
import type { LessonMaterial, LessonMaterialStatus } from "@lms/api";
import { Badge, type BadgeKind } from "@lms/ui";
import { IconAlert, IconCheck, IconClock } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { kindTitle } from "../../labels";

const STATUS_BADGE: Record<LessonMaterialStatus, BadgeKind> = {
  queued: "neutral",
  generating: "progress",
  ready: "done",
  failed: "rework",
};

/** Значок статуса — и в шапке, и во вкладке, где на подпись нет места. */
export function MaterialStatusIcon({ status, size = 14 }: { status: LessonMaterialStatus; size?: number }) {
  if (status === "ready") return <IconCheck size={size} />;
  if (status === "failed") return <IconAlert size={size} />;
  return <IconClock size={size} />;
}

export function MaterialStatusBadge({ status }: { status: LessonMaterialStatus }) {
  const { t } = useLang();
  return (
    <Badge kind={STATUS_BADGE[status]} icon={<MaterialStatusIcon status={status} size={13} />}>
      {t.laMaterialStatus[status]}
    </Badge>
  );
}

export function MaterialHeader({
  material,
  actions,
}: {
  material: LessonMaterial;
  /** Кнопки справа — «Скачать» у готового материала */
  actions?: ReactNode;
}) {
  const { t } = useLang();
  return (
    <div className="row wrap between g10" style={{ alignItems: "center" }}>
      <div className="row wrap g8" style={{ alignItems: "center", minWidth: 0 }}>
        <h2 className="h2" style={{ margin: 0, overflowWrap: "anywhere" }}>
          {kindTitle(t, material.kind)}
        </h2>
        <MaterialStatusBadge status={material.status} />
      </div>
      {actions && <div className="row wrap g8">{actions}</div>}
    </div>
  );
}
