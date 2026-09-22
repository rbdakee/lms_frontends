"use client";

/**
 * Карточка комплекта в «Моих уроках».
 *
 * Кликается карточка целиком, кроме нижней полосы, — это переход к комплекту;
 * «Копия» стоит в полосе отдельной кнопкой, а не внутри ссылки: вложенная в `<a>` кнопка — невалидная
 * разметка, и читалка экрана озвучивает её как часть ссылки.
 */

import Link from "next/link";
import type { LessonKitStatus, LessonMaterialStatus } from "@lms/api";
import { Badge, LinkButton, Skeleton, type BadgeKind } from "@lms/ui";
import { dayMonth } from "@lms/ui/i18n";
import { IconCheck, IconCopy, IconGlobe } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import type { LessonKitListItem } from "../../api";
import { useRoutes } from "../../host";
import { KIND_ORDER, contentLang, kindTitle } from "../../labels";

const KIT_BADGE: Record<LessonKitStatus, BadgeKind> = {
  generating: "progress",
  ready: "done",
  partial: "review",
  failed: "rework",
};

const MATERIAL_BADGE: Record<LessonMaterialStatus, BadgeKind> = {
  queued: "neutral",
  generating: "neutral",
  ready: "accepted",
  failed: "rework",
};

export function LessonCard({ item }: { item: LessonKitListItem }) {
  const { t, lang } = useLang();
  const routes = useRoutes();
  /* Тема и цель — на языке обучения комплекта, а не интерфейса */
  const docLang = contentLang(item.lang);
  const materials = [...item.materials].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );
  const ready = materials.filter((m) => m.status === "ready").length;

  return (
    <article className="card card-link" style={{ overflow: "hidden" }}>
      <Link href={routes.kit(item.id)} className="stack g10 card-pad">
        <div className="row wrap g6">
          <Badge kind={KIT_BADGE[item.status]}>{t.laKitStatus[item.status]}</Badge>
          {/* Язык документов заметнее остального: учитель с русским интерфейсом
              ведёт казахский класс, и перепутать комплекты здесь проще всего */}
          <Badge kind="new" icon={<IconGlobe size={13} />}>
            {t.laDocsLang[item.lang]}
          </Badge>
          <Badge>{t.laGrade(item.grade)}</Badge>
        </div>

        <h2 className="h3 pretty" lang={docLang} style={{ overflowWrap: "anywhere" }}>
          {item.topic}
        </h2>

        <p className="small muted clamp-2" lang={docLang}>
          <span className="mono" style={{ fontWeight: 700, color: "var(--text-2)" }}>
            {item.objective.code}
          </span>{" "}
          {item.objective.text}
        </p>

        {materials.length > 0 && (
          <div className="stack g6">
            <span className="caption muted-3">
              {t.laLessonsMaterialsReady(ready, materials.length)}
            </span>
            <ul className="row wrap g6" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {materials.map((m) => (
                <li key={m.id} title={t.laMaterialStatus[m.status]}>
                  <Badge
                    kind={MATERIAL_BADGE[m.status]}
                    icon={m.status === "ready" ? <IconCheck size={12} /> : undefined}
                  >
                    {kindTitle(t, m.kind)}
                    {/* Цвет — не единственный признак: статус слышит и читалка */}
                    <span className="sr-only">: {t.laMaterialStatus[m.status]}</span>
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Link>

      <div
        className="row between wrap g8"
        style={{ padding: "10px 16px", borderTop: "1px solid var(--line-soft)" }}
      >
        <span className="caption muted-3">{t.laLessonsCreated(dayMonth(item.created_at, lang))}</span>
        <LinkButton
          href={routes.newFrom(item.id)}
          variant="secondary"
          size="sm"
          icon={<IconCopy size={16} />}
        >
          {t.laLessonsCopy}
        </LinkButton>
      </div>
    </article>
  );
}

export function LessonCardSkeleton() {
  return (
    <div className="card">
      <div className="stack g10 card-pad">
        <div className="row g6">
          <Skeleton w={72} h={24} r={999} />
          <Skeleton w={150} h={24} r={999} />
        </div>
        <Skeleton w="70%" h={20} />
        <Skeleton w="95%" h={13} />
        <Skeleton w="60%" h={13} />
        <div className="row g6">
          <Skeleton w={64} h={24} r={999} />
          <Skeleton w={96} h={24} r={999} />
          <Skeleton w={72} h={24} r={999} />
        </div>
      </div>
    </div>
  );
}
