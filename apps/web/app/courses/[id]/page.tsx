"use client";

/**
 * Страница курса «/courses/:id» — раздел 5.3 брифа.
 *
 * Главная кнопка проходит четыре состояния:
 * «Записаться» → «Заявка отправлена» → «Начать обучение» → «Продолжить».
 * Оплата идёт вне платформы: показываем только цену, платёжных полей нет.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { allLessons, getCourse, groupLangs, groupRating, groupVersions } from "@lms/prototype/data";
import { day, rating as fmtRating } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { PublicShell, TeacherShell } from "@/components/layout/Shell";
import { CertChecklist, currentLesson, lessonHref, Program } from "@/components/course/Program";
import { ReviewsBlock } from "@/components/course/CourseCard";
import { ContactAdmin, EnrollBadge, Price } from "@/components/course/CourseMeta";
import {
  Badge,
  Breadcrumbs,
  Button,
  Cover,
  Empty,
  LangBadge,
  LinkButton,
  Note,
  Progress,
} from "@lms/ui";
import {
  IconArrowLeft,
  IconBook,
  IconCalendar,
  IconCheck,
  IconClock,
  IconLayers,
  IconLock,
  IconPlay,
  IconStar,
  IconUsers,
} from "@lms/ui/icons";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    t,
    lang,
    authed,
    access,
    requestAccess,
    requestDays,
    completed,
    certs,
    toast,
    isStrict,
  } = useStore();

  const course = getCourse(id);

  if (!course) {
    const body = (
      <div className="page section">
        <div className="card">
          <Empty
            title="Курс не найден"
            text="Возможно, курс скрыт администратором или ссылка устарела."
            action={
              <LinkButton href="/courses" variant="secondary">
                В каталог
              </LinkButton>
            }
          />
        </div>
      </div>
    );
    return authed ? <TeacherShell>{body}</TeacherShell> : <PublicShell>{body}</PublicShell>;
  }

  const state = authed ? access(course.id) : "none";
  const granted = state === "granted";
  const requested = state === "requested";
  const done = completed[course.id] ?? [];
  const lessons = allLessons(course);
  const total = lessons.length || course.lessons;
  const pct = total ? Math.round((done.length / total) * 100) : 0;
  const next = currentLesson(course, done);
  const finished = total > 0 && done.length >= total;
  const hasCert = certs.includes(course.id);
  const langs = groupLangs(course);
  const versions = groupVersions(course);
  const { rating, count } = groupRating(course);
  const closed = course.status === "closed";
  const waitDays = requestDays(course.id) ?? 0;

  const handleEnroll = () => {
    if (!authed) {
      /* Не вошёл — сначала вход, после него заявка отправится сама */
      router.push("/login");
      return;
    }
    requestAccess(course.id);
    toast("Заявка отправлена — администратор свяжется с вами", "success");
  };

  /* Главное действие — одно на весь экран */
  const cta = granted ? (
    finished ? (
      hasCert ? (
        <LinkButton href="/certificates" block size="lg" variant="success">
          Открыть сертификат
        </LinkButton>
      ) : (
        <LinkButton href={`/courses/${course.id}/complete`} block size="lg" variant="success">
          Завершить курс и получить сертификат
        </LinkButton>
      )
    ) : next ? (
      <LinkButton href={lessonHref(course.id, next)} block size="lg" icon={<IconPlay size={17} />}>
        {done.length === 0 ? "Начать обучение" : t.continueShort}
      </LinkButton>
    ) : null
  ) : requested ? (
    <div className="stack g8">
      <Button block size="lg" disabled>
        {t.requested}
      </Button>
      <span className="caption muted pretty" style={{ textAlign: "center" }}>
        {t.requestedHint}
      </span>
    </div>
  ) : closed ? (
    <div className="stack g8">
      <Button block size="lg" disabled>
        {t.setClosed}
      </Button>
      <span className="caption muted pretty" style={{ textAlign: "center" }}>
        Напишите администратору, если хотите попасть в следующий поток
      </span>
    </div>
  ) : (
    <Button block size="lg" onClick={handleEnroll}>
      {authed ? t.enroll : "Войти и записаться"}
    </Button>
  );

  /* Цена и статус набора — рядом с главной кнопкой */
  const priceBlock = (
    <div className="stack g8">
      <div className="row between wrap g10">
        <Price course={course} size="lg" />
        <EnrollBadge course={course} />
      </div>
      {course.status === "planned" && course.startsAt && (
        <span className="small muted row g6">
          <IconCalendar size={16} />
          Обучение начнётся {day(course.startsAt, lang)}, заявку можно оставить сейчас
        </span>
      )}
    </div>
  );

  const content = (
    <>
      <div className="page section stack g24" style={{ paddingTop: 16 }}>
        <div className="row between g12">
          <Breadcrumbs
            items={[{ label: "Каталог", href: "/courses" }, { label: course.category }]}
          />
          <Link href="/courses" className="btn btn-ghost btn-sm mobile-only">
            <IconArrowLeft size={16} />
            Каталог
          </Link>
        </div>

        <div className="course-layout">
          {/* ===== Левая колонка ===== */}
          <div className="stack g32" style={{ minWidth: 0 }}>
            <header className="stack g14">
              <div className="course-hero-cover">
                <Cover tone={course.cover}>
                  <div className="cover-badges">
                    <LangBadge langs={langs} />
                    <div className="row g6">
                      {course.isNew && <Badge kind="new">{t.stNew}</Badge>}
                      {granted && !finished && <Badge kind="progress">{t.stProgress}</Badge>}
                      {requested && <Badge kind="review">{t.stWaiting}</Badge>}
                      {finished && (
                        <Badge kind="done" icon={<IconCheck size={13} />}>
                          {t.stDone}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Cover>
              </div>

              <span className="caption" style={{ color: "var(--primary)" }}>
                {course.category}
              </span>
              <h1 className="h1 pretty">{course.title}</h1>

              {/* Языковые версии — два самостоятельных курса с общим groupId */}
              {versions.length > 1 ? (
                <div className="row wrap g8">
                  {versions.map((v) => (
                    <Link
                      key={v.id}
                      href={`/courses/${v.id}`}
                      className="chip"
                      data-active={v.id === course.id || undefined}
                    >
                      {v.lang === "ru" ? "Русская версия" : "Қазақша нұсқасы"}
                    </Link>
                  ))}
                </div>
              ) : (
                !langs.includes(lang) && (
                  <span className="small muted-3">
                    {course.lang === "kz" ? t.onlyKz : t.onlyRu}
                  </span>
                )
              )}

              <p className="body muted pretty">{course.short}</p>

              <div className="row wrap g10 small">
                <span className="row g4" style={{ color: "#b45309", fontWeight: 700 }}>
                  <IconStar size={16} filled strokeWidth={1.2} />
                  {fmtRating(rating)}
                </span>
                <span className="muted-3">({count} отзывов)</span>
                <span className="dot-sep">·</span>
                <span className="muted row g6">
                  <IconUsers size={16} />
                  {t.students(course.students)}
                </span>
              </div>

              {granted && (
                <div className="stack g8" style={{ marginTop: 4 }}>
                  <div className="row between small">
                    <span className="muted">
                      Пройдено {done.length} из {total} уроков
                    </span>
                    <strong style={{ color: finished ? "var(--success)" : "var(--primary)" }}>
                      {pct}%
                    </strong>
                  </div>
                  <Progress value={pct} thick />
                </div>
              )}
            </header>

            {/* Цена и статус — на мобильном сразу под шапкой, на десктопе в боковой карточке */}
            <div className="card card-pad stack g14 price-inline">
              {priceBlock}
              {requested && (
                <Note kind="info">
                  {t.sentAgo(waitDays)}. {t.requestedHint}
                </Note>
              )}
              <hr className="divider" />
              <span className="caption muted">Оплата принимается вне платформы</span>
              <ContactAdmin />
            </div>

            {/* Метаданные */}
            <div className="meta-grid">
              {[
                { icon: IconLayers, label: t.modules(course.modules) },
                { icon: IconBook, label: t.lessons(course.lessons) },
                { icon: IconClock, label: t.hours(course.hours) },
                { icon: IconCalendar, label: course.weeks },
              ].map((m, i) => {
                const Icon = m.icon;
                return (
                  <div key={i} className="card card-pad row g10" style={{ padding: 14 }}>
                    <span style={{ color: "var(--primary)" }}>
                      <Icon size={20} />
                    </span>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Чек-лист сертификата — на мобильном здесь, на десктопе в боковой карточке */}
            <div className="cert-inline">
              <CertChecklist course={course} live={granted} />
            </div>

            {/* Полное описание */}
            <section className="stack g10">
              <h2 className="h2">О курсе</h2>
              <p className="body muted pretty">{course.full}</p>
            </section>

            {/* Программа */}
            <section className="stack g16">
              <div className="row between wrap g12">
                <h2 className="h2">{t.secProgram}</h2>
                {granted && (
                  <span className="small muted">
                    {done.length} из {total} пройдено
                  </span>
                )}
              </div>
              <Program course={course} locked={!granted} strict={isStrict(course.id)} />
            </section>

            {/* Отзывы */}
            {course.reviews && <ReviewsBlock course={course} />}
          </div>

          {/* ===== Липкая карточка записи — десктоп ===== */}
          <aside className="course-side">
            <div className="card card-pad stack g16" style={{ position: "sticky", top: 88 }}>
              <Cover
                tone={course.cover}
                glyph={false}
                style={{ borderRadius: 12, height: 110, aspectRatio: "auto" }}
              />
              {priceBlock}

              {granted ? (
                <div className="stack g8">
                  <div className="row between small">
                    <span className="muted">Ваш прогресс</span>
                    <strong style={{ color: "var(--primary)" }}>{pct}%</strong>
                  </div>
                  <Progress value={pct} thick />
                  {next && <span className="caption muted-3 pretty">Следующий: {next.title}</span>}
                </div>
              ) : requested ? (
                <span className="caption muted pretty">{t.sentAgo(waitDays)}</span>
              ) : (
                <span className="small muted pretty">
                  Нажмите «Записаться» — заявка уйдёт администратору. Имя и телефон
                  возьмём из профиля, заполнять ничего не нужно.
                </span>
              )}

              {cta}

              <hr className="divider" />
              <span className="caption muted" style={{ textAlign: "center" }}>
                Оплата принимается вне платформы
              </span>
              <ContactAdmin />
              <hr className="divider" />
              <CertChecklist course={course} live={granted} />
            </div>
          </aside>
        </div>
      </div>

      {/* Липкая кнопка на мобильном: главное действие + текстовая ссылка на админа */}
      {cta && (
        <div className={`sticky-cta mobile-only ${authed ? "" : "no-tabbar"}`}>
          <div className="sticky-cta-inner stack g4">
            {cta}
            {!granted && <ContactAdmin variant="link" />}
          </div>
        </div>
      )}

      <style>{`
        .course-layout { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: start; }
        .course-side { display: none; }
        .course-hero-cover .cover { border-radius: 14px; }
        @media (min-width: 1024px) {
          .course-layout { grid-template-columns: minmax(0, 1fr) 340px; gap: 40px; }
          .course-side { display: block; }
          .cert-inline, .price-inline { display: none; }
        }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 640px) { .meta-grid { grid-template-columns: repeat(4, 1fr); } }
      `}</style>
    </>
  );

  return authed ? (
    <TeacherShell hasStickyCta>{content}</TeacherShell>
  ) : (
    <PublicShell hasStickyCta>{content}</PublicShell>
  );
}
