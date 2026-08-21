"use client";

import Link from "next/link";
import { useState } from "react";
import {
  api,
  categoryTitle,
  qs,
  useDictionaries,
  useLoad,
  type CatalogCourse,
  type CatalogGroup,
  type MyCourse,
  type MyLead,
  type Review,
  type ReviewsPage,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useRoutes } from "../host";
import { dayYear, rating as fmtRating, type UiLang } from "@lms/ui/i18n";
import { Badge, Button, Cover, LangBadge, Progress, Stars } from "@lms/ui";
import { ContactAdmin, EnrollBadge, Price } from "./CourseMeta";
import { continueHref } from "./CourseProgram";
import { IconCheck, IconClock, IconLock, IconPlay, IconStar } from "@lms/ui/icons";

/** Версия языковой группы под язык интерфейса; своей нет — первая (ru первой). */
export function pickVersion(group: CatalogGroup, lang: UiLang): CatalogCourse {
  return group.versions.find((v) => v.lang === lang) ?? group.versions[0];
}

/** Состояние доступа для бейджа на карточке — считается из `GET /me/courses`. */
export type AccessState = "none" | "requested" | "granted";

/**
 * Курс, уведённый админом с платформы. Для площадки `draft` и `hidden`
 * одинаковы: страница курса, уроки, тесты и задания отвечают «не найден».
 * Доступ, прогресс и выданный сертификат при этом целы, поэтому карточка
 * из «Моих курсов» не пропадает — просто никуда не ведёт.
 * В каталоге таких курсов не бывает, там проверять нечего.
 */
export function isUnavailable(course: { status: string }): boolean {
  return course.status === "draft" || course.status === "hidden";
}

/* ============ Карточка каталога ============ */

/**
 * Одна карточка на языковую группу: русская и казахская версии связаны
 * общим `group_id`, группировку делает сервер. Цена, дата старта и статус
 * набора — открываемой версии; рейтинг и число отзывов — по всей группе.
 */
export function CourseCard({
  group,
  access = "none",
}: {
  group: CatalogGroup;
  access?: AccessState;
}) {
  const { t, lang } = useLang();
  const routes = useRoutes();
  const dictionaries = useDictionaries();
  const course = pickVersion(group, lang);
  const langs = group.langs as UiLang[];
  /* Версии на языке интерфейса нет — честно предупреждаем прямо в карточке */
  const otherLangOnly = !langs.includes(lang);

  return (
    <Link href={routes.course(course.id)} className="card card-link" style={{ overflow: "hidden" }}>
      <Cover tone="cover-c1" src={course.cover}>
        <div className="cover-badges">
          <LangBadge langs={langs} />
          <div className="row g6">
            {access === "granted" && (
              <Badge kind="done" icon={<IconCheck size={13} />}>
                {t.stEnrolled}
              </Badge>
            )}
            {access === "requested" && <Badge kind="review">{t.stWaiting}</Badge>}
          </div>
        </div>
      </Cover>

      <div className="stack g8 card-pad">
        <span className="caption" style={{ color: "var(--primary)" }}>
          {categoryTitle(dictionaries.data?.categories, course.category_id)}
        </span>
        <h3 className="h3 pretty">{course.title}</h3>
        {otherLangOnly && (
          <span className="caption muted-3">{course.lang === "kz" ? t.onlyKz : t.onlyRu}</span>
        )}

        <div className="row wrap g8 small muted">
          <span>{t.lessons(course.lessons_count)}</span>
          <span className="dot-sep">·</span>
          <span>{t.hours(course.hours)}</span>
          <span className="dot-sep">·</span>
          {group.rating === null ? (
            <span className="muted-3">{t.noReviews}</span>
          ) : (
            <>
              <span className="row g4" style={{ color: "#b45309", fontWeight: 700 }}>
                <IconStar size={14} filled strokeWidth={1.2} />
                {fmtRating(group.rating)}
              </span>
              <span className="muted-3">({group.reviews_count})</span>
            </>
          )}
        </div>

        {/* Цена и статус набора видны прямо в карточке */}
        <div className="row between wrap g8" style={{ marginTop: 2 }}>
          <Price course={course} />
          <EnrollBadge course={course} />
        </div>
      </div>
    </Link>
  );
}

/* ============ Карточка «Мои курсы» с прогрессом ============ */

/**
 * Прогресс приходит готовым из `GET /me/courses` — на клиенте ничего
 * не считаем. «Продолжить» ведёт в следующий урок по `next_lesson`,
 * тест и задание — через страницу курса (их экраны с сессии 5).
 */
export function MyCourseCard({ course }: { course: MyCourse }) {
  const { t } = useLang();
  const routes = useRoutes();
  const dictionaries = useDictionaries();
  const finished =
    course.completed_at !== null ||
    (course.total_count > 0 && course.done_count >= course.total_count);
  /* Курс уведён с платформы: карточка остаётся с прогрессом, но без ссылок —
     любая из них привела бы в «Курс не найден» */
  const unavailable = isUnavailable(course);

  const cover = (
    <Cover tone="cover-c1" src={course.cover}>
      <div className="cover-badges">
        <LangBadge langs={[course.lang as UiLang]} />
        {unavailable ? (
          <Badge kind="locked" icon={<IconLock size={12} />}>
            {t.stUnavailable}
          </Badge>
        ) : finished ? (
          <Badge kind="done" icon={<IconCheck size={13} />}>
            {t.stDone}
          </Badge>
        ) : (
          <Badge kind="progress">{t.stProgress}</Badge>
        )}
      </div>
    </Cover>
  );

  const heading = (
    <>
      <span className="caption" style={{ color: "var(--primary)" }}>
        {categoryTitle(dictionaries.data?.categories, course.category_id)}
      </span>
      <h3 className="h3 pretty">{course.title}</h3>
    </>
  );

  return (
    <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {unavailable ? cover : <Link href={routes.course(course.id)}>{cover}</Link>}

      <div className="stack g10 card-pad grow">
        {unavailable ? (
          <div className="stack g6">{heading}</div>
        ) : (
          <Link href={routes.course(course.id)} className="stack g6">
            {heading}
          </Link>
        )}

        <div className="stack g6" style={{ marginTop: "auto" }}>
          <div className="row between small">
            <span className="muted">{t.ofLessons(course.done_count, course.total_count)}</span>
            <strong style={{ color: finished ? "var(--success)" : "var(--primary)" }}>
              {course.progress_percent}%
            </strong>
          </div>
          <Progress value={course.progress_percent} />
        </div>

        {unavailable ? (
          <span className="caption muted pretty">{t.unavailableHint}</span>
        ) : (
          <Link
            href={continueHref(routes, course.id, course.next_lesson)}
            className="btn btn-primary btn-block"
          >
            <IconPlay size={16} />
            {t.continueShort}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ============ Карточка курса с отправленной заявкой ============ */

/**
 * Без этого блока после нажатия «Записаться» экран не меняется
 * и человек жмёт кнопку снова — раздел 5.6 брифа.
 * `waiting_days` считает сервер, цена — снимок на момент заявки.
 */
export function PendingCourseCard({ lead }: { lead: MyLead }) {
  const { t } = useLang();
  const routes = useRoutes();
  return (
    <div className="card card-pad stack g12">
      <div className="row g12" style={{ alignItems: "flex-start" }}>
        <Link href={routes.course(lead.course.id)} style={{ flexShrink: 0 }}>
          <Cover
            tone="cover-c1"
            src={lead.course.cover}
            glyph={false}
            style={{ width: 72, height: 54, aspectRatio: "auto", borderRadius: 10 }}
          />
        </Link>
        <div className="grow stack g6" style={{ minWidth: 0 }}>
          <Link href={routes.course(lead.course.id)}>
            <strong className="small pretty">{lead.course.title}</strong>
          </Link>
          <div className="row wrap g8">
            <Badge kind="review" icon={<IconClock size={13} />}>
              {t.stWaiting}
            </Badge>
            <Price course={lead.course} size="sm" />
          </div>
          <span className="caption muted-3">{t.sentAgo(lead.waiting_days)}</span>
        </div>
      </div>
      <span className="caption muted pretty">{t.requestedHint}</span>
      <ContactAdmin />
    </div>
  );
}

/* ============ Компактная строка курса («Новые курсы») ============ */

export function CourseRow({ course }: { course: CatalogCourse }) {
  const { t } = useLang();
  const routes = useRoutes();
  return (
    <Link href={routes.course(course.id)} className="card card-link card-pad row g12">
      <Cover
        tone="cover-c1"
        src={course.cover}
        glyph={false}
        style={{ width: 72, height: 54, aspectRatio: "auto", borderRadius: 10, flexShrink: 0 }}
      />
      <div className="grow stack g4" style={{ minWidth: 0 }}>
        <h3 className="h3 clamp-2" style={{ fontSize: 15, lineHeight: "20px" }}>
          {course.title}
        </h3>
        <div className="row wrap g6 caption muted">
          <span>{t.lessons(course.lessons_count)}</span>
          <span className="dot-sep">·</span>
          <span>{t.hours(course.hours)}</span>
        </div>
        <div className="row wrap g8">
          <Price course={course} size="sm" />
          <EnrollBadge course={course} />
        </div>
      </div>
    </Link>
  );
}

/* ============ Блок отзывов ============ */

const REVIEWS_PER_PAGE = 10;

/**
 * `GET /courses/{id}/reviews`: свежие сверху, гистограмма — из `breakdown`
 * (по последнему отзыву каждого автора). Премодерации нет — отзыв виден сразу.
 * `reply` — ответ админа объектом, если он отвечал; блок рисуется при непустом.
 */
export function ReviewsBlock({ course_id }: { course_id: number }) {
  const { t, lang } = useLang();
  const [more, setMore] = useState<Review[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const first = useLoad(
    () =>
      api<ReviewsPage>(
        `/courses/${course_id}/reviews${qs({ page: 1, per_page: REVIEWS_PER_PAGE })}`,
      ),
    [course_id],
  );

  if (first.loading) return null;
  if (first.error) {
    return (
      <section className="stack g16">
        <h2 className="h2">{t.secReviews}</h2>
        <div className="card card-pad row between g10">
          <span className="small muted">{t.loadError}</span>
          <Button variant="secondary" size="sm" onClick={first.reload}>
            {t.retry}
          </Button>
        </div>
      </section>
    );
  }

  const data = first.data!;
  const reviews = [...data.items, ...more];
  const hasMore = reviews.length < data.total;
  /* База процентов гистограммы — авторы, а не строки: как и сам рейтинг */
  const breakdownTotal = Object.values(data.breakdown).reduce((a, b) => a + b, 0);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await api<ReviewsPage>(
        `/courses/${course_id}/reviews${qs({
          page: Math.floor(reviews.length / REVIEWS_PER_PAGE) + 1,
          per_page: REVIEWS_PER_PAGE,
        })}`,
      );
      setMore((m) => [...m, ...next.items]);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="stack g16">
      <h2 className="h2">{t.secReviews}</h2>

      {data.total === 0 || data.rating === null ? (
        <div className="card card-pad small muted">{t.reviewsEmpty}</div>
      ) : (
        <div className="card card-pad row g24 wrap">
          <div className="stack g6" style={{ alignItems: "center", minWidth: 120 }}>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em" }}>
              {fmtRating(data.rating)}
            </div>
            <Stars value={data.rating} size={16} />
            <span className="caption muted-3">{data.total}</span>
          </div>
          <div className="stack g6 grow" style={{ minWidth: 200 }}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = data.breakdown[String(stars)] ?? 0;
              const pct = breakdownTotal ? Math.round((count / breakdownTotal) * 100) : 0;
              return (
                <div key={stars} className="row g10">
                  <span className="caption muted" style={{ width: 12 }}>
                    {stars}
                  </span>
                  <div className="progress grow" style={{ height: 8 }}>
                    <div
                      className="progress-bar"
                      style={{ width: `${pct}%`, background: "#f59e0b" }}
                    />
                  </div>
                  <span className="caption muted-3" style={{ width: 34, textAlign: "right" }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="stack g12">
          {reviews.map((r) => (
            <div key={r.id} className="card card-pad stack g10">
              <div className="row g10">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="h3" style={{ fontSize: 15 }}>
                    {r.author_name}
                  </div>
                  <div className="caption muted-3">
                    {[r.school, r.city].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="stack g4" style={{ alignItems: "flex-end" }}>
                  <Stars value={r.rating} />
                  <span className="caption muted-3 nowrap">{dayYear(r.created_at, lang)}</span>
                </div>
              </div>
              {r.text && <p className="small pretty">{r.text}</p>}

              {r.reply && (
                <div
                  className="stack g6"
                  style={{ borderLeft: "3px solid var(--primary)", paddingLeft: 12, marginLeft: 4 }}
                >
                  <strong className="caption" style={{ color: "var(--primary)" }}>
                    {t.reviewReply}
                  </strong>
                  <p className="small pretty">{r.reply.text}</p>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
              {t.showMore}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
