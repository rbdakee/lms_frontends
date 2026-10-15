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
import type { LessonChatKit, LessonKitStatus } from "@lms/api";
import { Badge, Button, Empty, LinkButton, Note, Skeleton, type BadgeKind } from "@lms/ui";
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
    <div className="stack g14" style={{ padding: 16 }}>
      <header className="stack g8">
        <div className="row wrap g6">
          <Badge kind={KIT_BADGE[kit.status]}>{t.laKitStatus[kit.status]}</Badge>
          <Badge kind="neutral">{t.laGrade(kit.grade)}</Badge>
          <Badge kind="new" icon={<IconGlobe size={13} />}>
            {t.laDocsLang[kit.lang]}
          </Badge>
        </div>
        <h2 className="h3" lang={contentLang(kit.lang)} style={{ margin: 0, overflowWrap: "anywhere" }}>
          {kit.topic}
        </h2>
        <div>
          <LinkButton href={routes.kit(kit.id)} variant="ghost" size="sm" icon={<IconExternal size={15} />}>
            {t.laWsOpenPage}
          </LinkButton>
        </div>
      </header>

      {kit.status === "generating" && (
        <Note kind="info" icon={<span className="spinner" />}>
          <span className="small">
            {t.laKitWaiting} {t.laLessonsMaterialsReady(ready, kit.materials.length)}.
          </span>
        </Note>
      )}

      {/* Пока комплект собирается, цели менять рано: недописанные материалы возьмут новые сами,
          но учителю незачем гадать, какие */}
      <KitMaterials
        kit={full}
        onChanged={refresh}
        flash={flash}
        onEditGoals={kit.status === "generating" ? undefined : onEditGoals}
      />
    </div>
  );
}
