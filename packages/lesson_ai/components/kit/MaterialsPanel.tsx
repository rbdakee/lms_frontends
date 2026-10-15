"use client";

/**
 * Правая панель рабочего места: материалы комплекта этой сессии.
 *
 * Статусы приходят от чата (`chat.kit` — опрос ленты), содержимое панель берёт
 * сама (`GET /lesson_ai/kits/{id}` и блоки). Поэтому комплект здесь читается
 * без собственного опроса: сменилась подпись статусов от чата — перечитали.
 * Правка помощника (`flash`) перечитывает комплект тоже: у ключей с ответами
 * меняется содержимое, хотя править их никто не просил.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { LessonChatKit, LessonKitStatus } from "@lms/api";
import { Badge, Button, Empty, Note, Skeleton, type BadgeKind } from "@lms/ui";
import { IconExternal, IconGlobe } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useRoutes } from "../../host";
import { contentLang } from "../../labels";
import { KitMaterials, type MaterialFlash } from "./KitMaterials";
import { useKit } from "./useKit";

const KIT_BADGE: Record<LessonKitStatus, BadgeKind> = {
  generating: "progress",
  ready: "done",
  partial: "review",
  failed: "rework",
};

export function MaterialsPanel({
  kit,
  flash,
  onEditGoals,
}: {
  kit: LessonChatKit;
  flash: MaterialFlash | null;
  /** «Изменить цели» — шторка выбора целей живёт в чате, рабочее место её открывает */
  onEditGoals: () => void;
}) {
  const { t } = useLang();
  const routes = useRoutes();
  const state = useKit(String(kit.id), { poll: false });
  const { refresh } = state;

  /* Подпись статусов: любая смена статуса комплекта или материала, а также набора
     целей — повод перечитать */
  const signature = `${kit.status}|${kit.materials.map((m) => `${m.id}:${m.status}`).join(",")}|${kit.objectives.map((o) => o.id).join(",")}`;
  const seen = useRef(signature);
  useEffect(() => {
    if (seen.current === signature) return;
    seen.current = signature;
    void refresh();
  }, [signature, refresh]);

  const flashNonce = flash?.nonce;
  const flashSeen = useRef(flashNonce);
  useEffect(() => {
    if (flashSeen.current === flashNonce) return;
    flashSeen.current = flashNonce;
    void refresh();
  }, [flashNonce, refresh]);

  const full = state.kit;

  if (!full && state.error) {
    return (
      <div className="card" style={{ margin: 16 }}>
        <Empty
          title={t.loadError}
          text={t.loadErrorText}
          action={
            <Button variant="secondary" onClick={state.reload}>
              {t.retry}
            </Button>
          }
        />
      </div>
    );
  }

  if (!full) {
    return (
      <div className="stack g12" style={{ padding: 16 }} aria-busy="true">
        <Skeleton w="70%" h={26} />
        <Skeleton w="100%" h={40} r={10} />
        <Skeleton w="100%" h={160} r={16} />
      </div>
    );
  }

  const ready = kit.materials.filter((m) => m.status === "ready").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <header className="stack g8" style={{ padding: "12px 16px 0", flexShrink: 0 }}>
        <div className="row wrap g6" style={{ alignItems: "center" }}>
          <Badge kind={KIT_BADGE[kit.status]}>{t.laKitStatus[kit.status]}</Badge>
          <Badge kind="neutral">{t.laGrade(kit.grade)}</Badge>
          <Badge kind="new" icon={<IconGlobe size={13} />}>
            {t.laDocsLang[kit.lang]}
          </Badge>
          <Link
            href={routes.kit(kit.id)}
            className="btn btn-ghost btn-sm"
            aria-label={t.laWsOpenPage}
            title={t.laWsOpenPage}
            style={{ marginLeft: "auto", minWidth: 36, padding: 0 }}
          >
            <IconExternal size={15} />
          </Link>
        </div>
        <h2
          className="h3"
          lang={contentLang(kit.lang)}
          style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={kit.topic}
        >
          {kit.topic}
        </h2>
        {kit.status === "generating" && (
          <Note kind="info" icon={<span className="spinner" />}>
            <span className="small">
              {t.laKitWaiting} {t.laLessonsMaterialsReady(ready, kit.materials.length)}.
            </span>
          </Note>
        )}
      </header>

      {/* Пока комплект собирается, цели менять рано: недописанные материалы возьмут новые сами,
          но учителю незачем гадать, какие */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, paddingTop: 12 }}>
        <KitMaterials
          kit={full}
          fill
          onChanged={refresh}
          flash={flash}
          onEditGoals={kit.status === "generating" ? undefined : onEditGoals}
        />
      </div>
    </div>
  );
}
