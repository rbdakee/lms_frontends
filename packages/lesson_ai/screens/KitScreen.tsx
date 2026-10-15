"use client";

/**
 * Комплект к уроку: шапка заказа, материалы по видам, правка по блокам
 * (`TEACHER_AI_BRIEF`, разделы 1 и 4).
 *
 * Два языка на одном экране, и их не путаем: обвязка — на языке интерфейса,
 * тема, цель и содержимое материалов — на языке обучения комплекта. Поэтому
 * язык документов вынесен в шапку заметно: учитель с русским интерфейсом
 * ведёт казахский класс, и казахский ҚМЖ здесь — не ошибка.
 *
 * Каждый материал показывается сам по себе: упавший или ещё не готовый
 * не мешает читать и править соседние (`CONTRACT.md`, L5).
 */

import type { LessonKit, LessonKitStatus } from "@lms/api";
import { Badge, Button, Empty, LinkButton, Note, Skeleton, type BadgeKind } from "@lms/ui";
import { IconArrowLeft, IconCopy, IconGlobe } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { AccessUntil } from "../access";
import { useChrome, useRoutes } from "../host";
import { contentLang } from "../labels";
import { KitMaterials } from "../components/kit/KitMaterials";
import { ObjectiveList } from "../components/chat/ObjectiveCards";
import { useKit } from "../components/kit/useKit";
import { OpenInChatButton } from "../components/OpenChat";

const KIT_BADGE: Record<LessonKitStatus, BadgeKind> = {
  generating: "progress",
  ready: "done",
  partial: "review",
  failed: "rework",
};

export function KitScreen({ kitId }: { kitId: string }) {
  const { t } = useLang();
  const routes = useRoutes();
  const { Shell } = useChrome();
  const state = useKit(kitId);
  const { kit, error, reload, pollFailing } = state;

  if (!kit && error) {
    const notFound = error.status === 404;
    return (
      <Shell>
        <div className="page section">
          <div className="card">
            {notFound ? (
              <Empty
                title={t.laKitNotFound}
                text={t.laKitNotFoundText}
                action={<LinkButton href={routes.lessons}>{t.laMyLessons}</LinkButton>}
              />
            ) : (
              <Empty
                title={t.loadError}
                text={t.loadErrorText}
                action={
                  <Button variant="secondary" onClick={reload}>
                    {t.retry}
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </Shell>
    );
  }

  if (!kit) {
    return (
      <Shell>
        <div className="page section stack g16">
          <Skeleton w={120} h={32} r={10} />
          <div className="card card-pad stack g12">
            <Skeleton w="70%" h={28} />
            <Skeleton w="100%" h={16} />
            <Skeleton w="55%" h={16} />
          </div>
          <Skeleton w="100%" h={44} r={10} />
          <Skeleton w="100%" h={160} r={16} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="page section stack g20" style={{ paddingTop: 16 }}>
        <div>
          <LinkButton href={routes.lessons} variant="ghost" size="sm" icon={<IconArrowLeft size={16} />}>
            {t.laMyLessons}
          </LinkButton>
        </div>
        <KitHeader kit={kit} />
        {/* Ожидание — строкой над материалами, а не экраном вместо них:
            готовое уже можно читать и править, пока остальное пишется */}
        {kit.status === "generating" && (
          <Note kind={pollFailing ? "warning" : "info"} icon={pollFailing ? undefined : <span className="spinner" />}>
            <span className="small">
              {pollFailing ? t.laKitPollError : `${t.laKitWaiting} ${t.laLessonsMaterialsReady(readyCount(kit), kit.materials.length)}.`}
            </span>
          </Note>
        )}
        <KitMaterials kit={kit} onChanged={state.refresh} />
      </div>
    </Shell>
  );
}

function KitHeader({ kit }: { kit: LessonKit }) {
  const { t } = useLang();
  const routes = useRoutes();
  const docLang = contentLang(kit.lang);

  return (
    <header className="card card-pad stack g14">
      {/* «Открыть в чате» — справа от плашек, в одной строке: слева и так
          плотно (статус, класс, язык), а главное действие страницы видно
          в правом верхнем углу; не помещается — переносится под плашки */}
      <div className="row wrap g6" style={{ alignItems: "center" }}>
        <Badge kind={KIT_BADGE[kit.status]}>{t.laKitStatus[kit.status]}</Badge>
        <Badge kind="neutral">{t.laGrade(kit.grade)}</Badge>
        <Badge kind="new" icon={<IconGlobe size={13} />}>
          {t.laDocsLang[kit.lang]}
        </Badge>
        <div style={{ marginLeft: "auto" }}>
          <OpenInChatButton kitId={kit.id} chatId={kit.chat_id} />
        </div>
      </div>

      <div className="stack g4">
        <h1 className="h1" lang={docLang} style={{ margin: 0, overflowWrap: "anywhere" }}>
          {kit.topic}
        </h1>
        {/* Материал из банка написан по цели, без темы учителя (L7): тема
            приходит в документ шапкой и именем файла — это стоит знать */}
        <span className="caption muted-3">{t.laKitTopicInHeader}</span>
      </div>

      <div className="stack g4">
        <span className="caption muted-3" style={{ fontWeight: 700 }}>
          {t.laObjectiveChosen}
        </span>
        {/* Код и формулировка — дословно из справочника: их сверяет завуч */}
        <ObjectiveList objectives={kit.objectives} lang={kit.lang} />
      </div>

      <div className="stack g4 small">
        <span>
          <span className="muted">{t.laKitEngagementLabel}: </span>
          <strong>{t.laEngagement[kit.engagement_level]}</strong>
        </span>
        <span>
          <span className="muted">{t.laKitDifficultyLabel}: </span>
          <strong>{t.laDifficulty[kit.difficulty_level]}</strong>
        </span>
      </div>

      <div className="stack g6">
        <div>
          <LinkButton href={routes.newFrom(kit.id)} variant="secondary" icon={<IconCopy size={16} />}>
            {t.laKitCopy}
          </LinkButton>
        </div>
        <span className="caption muted-3 pretty">{t.laKitCopyHint}</span>
        <AccessUntil />
      </div>
    </header>
  );
}

function readyCount(kit: LessonKit): number {
  return kit.materials.filter((m) => m.status === "ready").length;
}
