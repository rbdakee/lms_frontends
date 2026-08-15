"use client";

import Link from "next/link";
import { useStore } from "@lms/prototype";
import { rating as fmtRating } from "@lms/ui/i18n";
import { allLessons, groupLangs, groupRating, type Course } from "@lms/prototype/data";
import { Badge, Cover, LangBadge, Progress, Stars } from "@lms/ui";
import { ContactAdmin, EnrollBadge, Price } from "@/components/course/CourseMeta";
import { IconCheck, IconClock, IconPlay, IconStar } from "@lms/ui/icons";

/** Доля пройденного курса в процентах. */
export function useCourseProgress(course: Course) {
  const { completed } = useStore();
  const done = completed[course.id] ?? [];
  const total = course.modulesList ? allLessons(course).length : course.lessons;
  const pct = total ? Math.round((done.length / total) * 100) : 0;
  return { doneCount: done.length, total, pct };
}

/* ============ Карточка каталога ============ */

/**
 * Одна карточка на языковую группу: русская и казахская версии связаны
 * общим groupId. Цена, дата старта и статус набора — открываемой версии.
 */
export function CourseCard({ course, showState }: { course: Course; showState?: boolean }) {
  const { t, lang, access } = useStore();
  const langs = groupLangs(course);
  const { rating, count } = groupRating(course);
  const state = access(course.id);
  /* Версии на языке интерфейса нет — честно предупреждаем прямо в карточке */
  const otherLangOnly = !langs.includes(lang);

  return (
    <Link href={`/courses/${course.id}`} className="card card-link" style={{ overflow: "hidden" }}>
      <Cover tone={course.cover}>
        <div className="cover-badges">
          <LangBadge langs={langs} />
          <div className="row g6">
            {course.isNew && <Badge kind="new">{t.stNew}</Badge>}
            {showState && state === "granted" && (
              <Badge kind="done" icon={<IconCheck size={13} />}>
                {t.stEnrolled}
              </Badge>
            )}
            {showState && state === "requested" && <Badge kind="review">{t.stWaiting}</Badge>}
          </div>
        </div>
      </Cover>

      <div className="stack g8 card-pad">
        <span className="caption" style={{ color: "var(--primary)" }}>
          {course.category}
        </span>
        <h3 className="h3 pretty">{course.title}</h3>
        {otherLangOnly && (
          <span className="caption muted-3">{course.lang === "kz" ? t.onlyKz : t.onlyRu}</span>
        )}

        <div className="row wrap g8 small muted">
          <span>{t.lessons(course.lessons)}</span>
          <span className="dot-sep">·</span>
          <span>{t.hours(course.hours)}</span>
          <span className="dot-sep">·</span>
          <span className="row g4" style={{ color: "#b45309", fontWeight: 700 }}>
            <IconStar size={14} filled strokeWidth={1.2} />
            {fmtRating(rating)}
          </span>
          <span className="muted-3">({count})</span>
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

export function MyCourseCard({ course }: { course: Course }) {
  const { t, certs } = useStore();
  const { doneCount, total, pct } = useCourseProgress(course);
  const finished = pct >= 100;
  const hasCert = certs.includes(course.id);

  return (
    <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Link href={`/courses/${course.id}`}>
        <Cover tone={course.cover}>
          <div className="cover-badges">
            <LangBadge langs={[course.lang]} />
            {finished ? (
              <Badge kind="done" icon={<IconCheck size={13} />}>
                {t.stDone}
              </Badge>
            ) : (
              <Badge kind="progress">{t.stProgress}</Badge>
            )}
          </div>
        </Cover>
      </Link>

      <div className="stack g10 card-pad grow">
        <Link href={`/courses/${course.id}`} className="stack g6">
          <span className="caption" style={{ color: "var(--primary)" }}>
            {course.category}
          </span>
          <h3 className="h3 pretty">{course.title}</h3>
        </Link>

        <div className="stack g6" style={{ marginTop: "auto" }}>
          <div className="row between small">
            <span className="muted">{t.ofLessons(doneCount, total)}</span>
            <strong style={{ color: finished ? "var(--success)" : "var(--primary)" }}>
              {pct}%
            </strong>
          </div>
          <Progress value={pct} />
        </div>

        {finished && hasCert ? (
          <Link href="/certificates" className="btn btn-secondary btn-block">
            Открыть сертификат
          </Link>
        ) : finished ? (
          <Link href={`/courses/${course.id}/complete`} className="btn btn-success btn-block">
            Завершить курс
          </Link>
        ) : (
          <Link href={`/courses/${course.id}`} className="btn btn-primary btn-block">
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
 */
export function PendingCourseCard({ course, days }: { course: Course; days: number }) {
  const { t } = useStore();
  return (
    <div className="card card-pad stack g12">
      <div className="row g12" style={{ alignItems: "flex-start" }}>
        <Link href={`/courses/${course.id}`} style={{ flexShrink: 0 }}>
          <Cover
            tone={course.cover}
            glyph={false}
            style={{ width: 72, height: 54, aspectRatio: "auto", borderRadius: 10 }}
          />
        </Link>
        <div className="grow stack g6" style={{ minWidth: 0 }}>
          <Link href={`/courses/${course.id}`}>
            <strong className="small pretty">{course.title}</strong>
          </Link>
          <div className="row wrap g8">
            <Badge kind="review" icon={<IconClock size={13} />}>
              {t.stWaiting}
            </Badge>
            <Price course={course} size="sm" />
          </div>
          <span className="caption muted-3">{t.sentAgo(days)}</span>
        </div>
      </div>
      <span className="caption muted pretty">{t.requestedHint}</span>
      <ContactAdmin />
    </div>
  );
}

/* ============ Компактная строка курса («Новые курсы») ============ */

export function CourseRow({ course }: { course: Course }) {
  const { t } = useStore();
  return (
    <Link href={`/courses/${course.id}`} className="card card-link card-pad row g12">
      <Cover
        tone={course.cover}
        glyph={false}
        style={{ width: 72, height: 54, aspectRatio: "auto", borderRadius: 10, flexShrink: 0 }}
      />
      <div className="grow stack g4" style={{ minWidth: 0 }}>
        <h3 className="h3 clamp-2" style={{ fontSize: 15, lineHeight: "20px" }}>
          {course.title}
        </h3>
        <div className="row wrap g6 caption muted">
          <span>{t.lessons(course.lessons)}</span>
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

/**
 * Премодерации нет — отзыв виден сразу, админ убирает лишнее постфактум.
 * От одного человека отзывов может быть несколько, у каждого своя дата;
 * на отзыв админ отвечает тем же тредом, что и в вопросах.
 */
export function ReviewsBlock({ course }: { course: Course }) {
  const { t, hiddenReviews } = useStore();
  const reviews = (course.reviews ?? []).filter((r) => !hiddenReviews.includes(r.id));
  const { rating, count } = groupRating(course);
  const dist = [
    { stars: 5, pct: 78 },
    { stars: 4, pct: 16 },
    { stars: 3, pct: 4 },
    { stars: 2, pct: 1 },
    { stars: 1, pct: 1 },
  ];

  return (
    <section className="stack g16">
      <h2 className="h2">{t.secReviews}</h2>
      <div className="card card-pad row g24 wrap">
        <div className="stack g6" style={{ alignItems: "center", minWidth: 120 }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em" }}>
            {fmtRating(rating)}
          </div>
          <Stars value={rating} size={16} />
          <span className="caption muted-3">{count} отзывов</span>
        </div>
        <div className="stack g6 grow" style={{ minWidth: 200 }}>
          {dist.map((d) => (
            <div key={d.stars} className="row g10">
              <span className="caption muted" style={{ width: 12 }}>
                {d.stars}
              </span>
              <div className="progress grow" style={{ height: 8 }}>
                <div
                  className="progress-bar"
                  style={{ width: `${d.pct}%`, background: "#f59e0b" }}
                />
              </div>
              <span className="caption muted-3" style={{ width: 34, textAlign: "right" }}>
                {d.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="stack g12">
          {reviews.map((r) => (
            <div key={r.id} className="card card-pad stack g10">
              <div className="row g10">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="h3" style={{ fontSize: 15 }}>
                    {r.author}
                  </div>
                  <div className="caption muted-3">{r.school}</div>
                </div>
                <div className="stack g4" style={{ alignItems: "flex-end" }}>
                  <Stars value={r.rating} />
                  <span className="caption muted-3 nowrap">{r.date}</span>
                </div>
              </div>
              <p className="small pretty">{r.text}</p>

              {r.reply && (
                <div
                  className="stack g6"
                  style={{ borderLeft: "3px solid var(--primary)", paddingLeft: 12, marginLeft: 4 }}
                >
                  <div className="row g8">
                    <strong className="caption" style={{ color: "var(--primary)" }}>
                      Ответ администратора
                    </strong>
                    <span className="caption muted-3">{r.reply.date}</span>
                  </div>
                  <p className="small pretty">{r.reply.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
