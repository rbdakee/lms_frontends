"use client";

/** Главная учителя «/my» — раздел 5.6 брифа. Одно главное действие: продолжить курс. */

import Link from "next/link";
import { useState } from "react";
import { allLessons, catalogCourses, getCourse, type Course } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { TeacherShell } from "@/components/layout/Shell";
import {
  CourseRow,
  MyCourseCard,
  PendingCourseCard,
  useCourseProgress,
} from "@/components/course/CourseCard";
import { currentLesson, lessonHref } from "@/components/course/Program";
import {
  Cover,
  CourseCardSkeleton,
  Empty,
  LinkButton,
  Progress,
  RowSkeleton,
  Skeleton,
} from "@lms/ui";
import {
  IconAlert,
  IconArrowRight,
  IconCatalog,
  IconChevronRight,
  IconMail,
  IconPlay,
} from "@lms/ui/icons";

export default function MyPage() {
  const { t, ready, enrolled, requests, completed, tasks, profile, certs } = useStore();
  const [tab, setTab] = useState<"progress" | "done">("progress");

  const myCourses = enrolled.map((id) => getCourse(id)).filter(Boolean) as Course[];

  /** Курсы с отправленной заявкой — доступа ещё нет */
  const pending = Object.entries(requests)
    .map(([id, days]) => ({ course: getCourse(id), days }))
    .filter((p): p is { course: Course; days: number } => Boolean(p.course));

  const isFinished = (c: Course) => {
    const total = allLessons(c).length || c.lessons;
    return total > 0 && (completed[c.id] ?? []).length >= total;
  };

  const inProgress = myCourses.filter((c) => !isFinished(c));
  const finished = myCourses.filter(isFinished);

  /** Курс для блока «Продолжить обучение» — самый продвинутый незавершённый. */
  const primary = inProgress
    .slice()
    .sort((a, b) => (completed[b.id]?.length ?? 0) - (completed[a.id]?.length ?? 0))[0];

  const attention = [
    ...Object.entries(tasks)
      .filter(([, s]) => s === "rework")
      .map(([id]) => ({
        kind: "rework" as const,
        id,
        title: "Задание «План цифрового урока» — на доработку",
        text: "Посмотрите комментарий администратора",
        href: `/learn/digital-literacy/task/${id}`,
      })),
    {
      kind: "answer" as const,
      id: "answer",
      title: "Ответ на ваш вопрос",
      text: "Урок 6 · Создание теста за 10 минут",
      href: "/learn/digital-literacy/l6",
    },
  ];

  /** Свежие курсы каталога без доступа — никаких рекомендательных алгоритмов */
  const fresh = catalogCourses
    .filter((c) => !enrolled.includes(c.id) && !(c.id in requests) && c.status !== "closed")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const nothingYet = myCourses.length === 0 && pending.length === 0;

  if (!ready) return <LoadingSkeleton />;

  return (
    <TeacherShell>
      <div className="page section stack g32" style={{ paddingTop: 20 }}>
        <h1 className="h1">{t.greeting(profile.firstName || "учитель")}</h1>

        {/* ===== Продолжить обучение ===== */}
        {primary ? (
          <ContinueBlock course={primary} />
        ) : nothingYet ? (
          <div className="card">
            <Empty
              icon={<IconCatalog size={38} />}
              title={t.emptyCoursesTitle}
              text={t.emptyCoursesText}
              action={
                <LinkButton href="/courses" size="lg">
                  {t.openCatalog}
                </LinkButton>
              }
            />
          </div>
        ) : myCourses.length > 0 ? (
          <div className="card card-pad row between g12 wrap">
            <div className="stack g4">
              <strong>Все начатые курсы пройдены</strong>
              <span className="small muted">
                Заберите сертификаты или выберите следующий курс
              </span>
            </div>
            <LinkButton href="/courses" variant="secondary">
              {t.openCatalog}
            </LinkButton>
          </div>
        ) : null}

        {/* ===== Мои курсы ===== */}
        {myCourses.length > 0 && (
          <section className="stack g16">
            <div className="row between wrap g12">
              <h2 className="h2">{t.secMyCourses}</h2>
              <div className="segmented">
                <button data-active={tab === "progress"} onClick={() => setTab("progress")}>
                  В процессе · {inProgress.length}
                </button>
                <button data-active={tab === "done"} onClick={() => setTab("done")}>
                  Пройденные · {finished.length}
                </button>
              </div>
            </div>

            {(tab === "progress" ? inProgress : finished).length === 0 ? (
              <div className="card">
                <Empty
                  title={
                    tab === "progress" ? "Нет курсов в процессе" : "Пока нет пройденных курсов"
                  }
                  text={
                    tab === "progress"
                      ? "Все начатые курсы завершены — выберите новый в каталоге"
                      : "Завершите курс, чтобы он появился здесь вместе с сертификатом"
                  }
                  action={
                    <LinkButton href="/courses" variant="secondary">
                      {t.openCatalog}
                    </LinkButton>
                  }
                />
              </div>
            ) : (
              <div className="hscroll">
                {(tab === "progress" ? inProgress : finished).map((c) => (
                  <MyCourseCard key={c.id} course={c} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===== Ожидают подтверждения ===== */}
        {pending.length > 0 && (
          <section className="stack g12">
            <h2 className="h2">{t.secPending}</h2>
            <div className="stack g12 pending-list">
              {pending.map((p) => (
                <PendingCourseCard key={p.course.id} course={p.course} days={p.days} />
              ))}
            </div>
          </section>
        )}

        {/* ===== Требует внимания ===== */}
        {myCourses.length > 0 && attention.length > 0 && (
          <section className="stack g12">
            <h2 className="h2">{t.secAttention}</h2>
            <div className="stack g10">
              {attention.map((a) => (
                <Link key={a.id} href={a.href} className="card card-link card-pad row g12">
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: a.kind === "rework" ? "var(--danger-bg)" : "var(--primary-bg)",
                      color: a.kind === "rework" ? "var(--danger)" : "var(--primary)",
                    }}
                  >
                    {a.kind === "rework" ? <IconAlert size={20} /> : <IconMail size={20} />}
                  </span>
                  <span className="grow stack g4" style={{ minWidth: 0 }}>
                    <strong className="small pretty">{a.title}</strong>
                    <span className="caption muted-3">{a.text}</span>
                  </span>
                  <IconChevronRight size={18} className="muted-3" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== Новые курсы ===== */}
        {fresh.length > 0 && (
          <section className="stack g16">
            <div className="row between wrap g12">
              <h2 className="h2">{t.secNewCourses}</h2>
              <Link href="/courses" className="btn btn-ghost btn-sm">
                {t.viewAll}
                <IconArrowRight size={16} />
              </Link>
            </div>
            <div className="stack g10 rec-list">
              {fresh.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </div>
          </section>
        )}

        {/* ===== Сертификаты ===== */}
        {certs.length > 0 && (
          <Link href="/certificates" className="card card-link card-pad row between g12">
            <span className="stack g4">
              <strong className="small">
                У вас {certs.length}{" "}
                {certs.length === 1 ? "сертификат" : certs.length < 5 ? "сертификата" : "сертификатов"}
              </strong>
              <span className="caption muted-3">Скачать PDF или скопировать ссылку проверки</span>
            </span>
            <IconChevronRight size={18} className="muted-3" />
          </Link>
        )}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .rec-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .pending-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
      `}</style>
    </TeacherShell>
  );
}

/* ============ Блок «Продолжить обучение» ============ */

function ContinueBlock({ course }: { course: Course }) {
  const { t, completed } = useStore();
  const { doneCount, total, pct } = useCourseProgress(course);
  const done = completed[course.id] ?? [];
  const next = currentLesson(course, done);

  return (
    <section className="stack g12">
      <h2 className="h2">{t.continue}</h2>
      <div className="card continue-card">
        <Link href={`/courses/${course.id}`} className="continue-cover">
          <Cover tone={course.cover} />
        </Link>
        <div className="stack g16 card-pad grow">
          <div className="stack g6">
            <span className="caption" style={{ color: "var(--primary)" }}>
              {course.category}
            </span>
            <Link href={`/courses/${course.id}`}>
              <h3 className="h2 pretty" style={{ fontSize: 20 }}>
                {course.title}
              </h3>
            </Link>
            {next && (
              <span className="small muted pretty">
                {t.lessonOf(next.n, total)} · {next.title}
              </span>
            )}
          </div>

          <div className="stack g6">
            <div className="row between small">
              <span className="muted">{t.ofLessons(doneCount, total)}</span>
              <strong style={{ color: "var(--primary)" }}>{pct}%</strong>
            </div>
            <Progress value={pct} thick />
          </div>

          {next ? (
            <LinkButton
              href={lessonHref(course.id, next)}
              size="lg"
              block
              icon={<IconPlay size={17} />}
            >
              {next.kind === "quiz"
                ? "Перейти к тесту"
                : next.kind === "task"
                  ? "Перейти к заданию"
                  : "Продолжить урок"}
            </LinkButton>
          ) : (
            <LinkButton href={`/courses/${course.id}/complete`} size="lg" block variant="success">
              Завершить курс
            </LinkButton>
          )}
        </div>
      </div>

      <style>{`
        .continue-card { display: flex; flex-direction: column; overflow: hidden; }
        .continue-cover { display: block; }
        @media (min-width: 720px) {
          .continue-card { flex-direction: row; align-items: stretch; }
          .continue-cover { width: 300px; flex-shrink: 0; }
          .continue-cover .cover { height: 100%; aspect-ratio: auto; }
        }
      `}</style>
    </section>
  );
}

/* ============ Скелетон загрузки ============ */

function LoadingSkeleton() {
  return (
    <TeacherShell>
      <div className="page section stack g24" style={{ paddingTop: 20 }}>
        <Skeleton w={220} h={30} />
        <div className="card card-pad stack g12">
          <Skeleton h={140} r={12} />
          <Skeleton w="70%" h={20} />
          <Skeleton w="45%" h={14} />
          <Skeleton h={48} r={10} />
        </div>
        <div className="stack g10">
          <RowSkeleton />
          <RowSkeleton />
        </div>
        <div className="grid-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </div>
    </TeacherShell>
  );
}
