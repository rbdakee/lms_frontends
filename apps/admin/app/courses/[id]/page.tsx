"use client";

/**
 * Карточка курса «/courses/:id» — рабочий экран методиста.
 *
 * Здесь всё про людей на курсе: общая картина, участники с их этапом и
 * работами, отзывы и вопросы. Правка содержимого курса живёт отдельно,
 * в `/courses/:id/edit`, — иначе редактор контента стоял бы в одном
 * ряду с проверкой работ, хотя это задачи разных ролей и разной частоты.
 */

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  adminCourses,
  adminQuestions,
  adminReviews,
  courseReviewSummary,
  getCourse,
  groupLangs,
  groupVersions,
} from "@lms/prototype/data";
import { day, plural, price as fmtPrice } from "@lms/ui/i18n";
import { useModeration, useStore } from "@lms/prototype";
import { COURSE_STATUS_LABEL } from "@/components/admin/courseStatus";
import { AdminShell } from "@/components/layout/AdminShell";
import { CourseParticipants } from "@/components/admin/CourseParticipants";
import { QuestionCard, ReviewCard } from "@/components/admin/Moderation";
import { Badge, Cover, Empty, LinkButton, Note, Progress, StatusBadge } from "@lms/ui";
import {
  IconChevronRight,
  IconEdit,
  IconEye,
  IconMessage,
  IconStar,
} from "@lms/ui/icons";

type Tab = "overview" | "participants" | "reviews" | "questions";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { lang } = useStore();
  const { replyCount, isHidden } = useModeration();
  const course = getCourse(id);

  /** `?tab=participants` — из раздела проверки работ приходят сразу к людям */
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab | null) ?? "overview");

  if (!course) {
    return (
      <AdminShell title="Курс не найден">
        <div className="card">
          <Empty
            title="Курс не найден"
            action={
              <LinkButton href="/courses" variant="secondary">
                К списку курсов
              </LinkButton>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const summary = courseReviewSummary(course.id);
  const reviews = adminReviews.filter((r) => r.courseId === course.id && !isHidden(r.id));
  const questions = adminQuestions.filter((q) => q.courseId === course.id);
  const unanswered = questions.filter((q) => replyCount(q.id) === 0).length;

  const tabs: [Tab, string, number][] = [
    ["overview", "Обзор", 0],
    ["participants", "Участники и проверка", summary.waiting],
    ["reviews", "Отзывы", 0],
    ["questions", "Вопросы", unanswered],
  ];

  return (
    <AdminShell
      title={course.title}
      subtitle={`Карточка курса · ${fmtPrice(course.price, lang)}${
        course.startsAt ? ` · старт ${day(course.startsAt, lang)}` : ""
      }`}
      actions={
        <div className="row g8">
          <StatusBadge status={COURSE_STATUS_LABEL[course.status]} />
          <Link href={`/courses/${course.id}`} className="btn btn-ghost btn-sm">
            <IconEye size={16} />
            <span className="desktop-only">Как видит учитель</span>
          </Link>
          <Link href={`/courses/${course.id}/edit`} className="btn btn-secondary btn-sm">
            <IconEdit size={16} />
            Редактировать курс
          </Link>
        </div>
      }
    >
      <div className="stack g20">
        <div className="tabs">
          {tabs.map(([v, label, n]) => (
            <button key={v} data-active={tab === v} onClick={() => setTab(v)}>
              {label}
              {n > 0 && ` · ${n}`}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview course={course} summary={summary} />}
        {tab === "participants" && <CourseParticipants course={course} />}
        {tab === "reviews" && <Reviews items={reviews} />}
        {tab === "questions" && <Questions items={questions} />}
      </div>
    </AdminShell>
  );
}

/* ============ Обзор ============ */

function Overview({
  course,
  summary,
}: {
  course: NonNullable<ReturnType<typeof getCourse>>;
  summary: ReturnType<typeof courseReviewSummary>;
}) {
  const { lang } = useStore();
  const stats = adminCourses.find((c) => c.id === course.id);
  const donePct = stats && stats.enrolled ? Math.round((stats.finished / stats.enrolled) * 100) : 0;
  const other = groupVersions(course).find((c) => c.id !== course.id);

  return (
    <div className="course-overview">
      <div className="stack g16">
        <div className="card card-pad stack g14">
          <h2 className="h3">Общая информация</h2>
          <div className="info-grid">
            <Info label="Категория" value={course.category} />
            <Info
              label="Языки версии"
              value={groupLangs(course)
                .map((l) => (l === "ru" ? "РУС" : "ҚАЗ"))
                .join(" · ")}
            />
            <Info label="Цена" value={fmtPrice(course.price, lang)} />
            <Info label="Статус набора" value={COURSE_STATUS_LABEL[course.status]} />
            <Info
              label="Дата старта"
              value={course.startsAt ? day(course.startsAt, lang) : "не задана"}
            />
            <Info label="Объём" value={`${course.hours} академических часов`} />
            <Info label="Длительность" value={course.weeks} />
            <Info
              label="Состав"
              value={`${course.modules} ${plural(course.modules, "модуль", "модуля", "модулей")} · ${course.lessons} ${plural(course.lessons, "урок", "урока", "уроков")}`}
            />
            <Info
              label="Контроль"
              value={`${summary.quizzes} ${plural(summary.quizzes, "тест", "теста", "тестов")} · ${summary.tasks} ${plural(summary.tasks, "задание", "задания", "заданий")}`}
            />
            <Info label="Проходной балл" value={`${course.passScore}%`} />
            <Info label="Изменён" value={stats?.changed ?? "—"} />
          </div>
          <hr className="divider" />
          <p className="small muted pretty">{course.short}</p>
        </div>

        <div className="card card-pad stack g14">
          <h2 className="h3">Как идут учителя</h2>
          <div className="stack g10">
            <div className="row between small">
              <span className="muted">Завершили курс</span>
              <strong style={{ color: "var(--primary)" }}>{donePct}%</strong>
            </div>
            <Progress value={donePct} thick />
            <span className="caption muted-3">
              {stats?.finished ?? 0} из {stats?.enrolled ?? 0} получивших доступ
            </span>
          </div>

          <hr className="divider" />

          <div className="stat-row">
            <Stat value={summary.participants} label="в работе сейчас" />
            <Stat
              value={summary.waiting}
              label="работ ждут проверки"
              tone={summary.waiting ? "primary" : undefined}
            />
            <Stat
              value={summary.longWait}
              label="ждут дольше трёх дней"
              tone={summary.longWait ? "danger" : undefined}
            />
            <Stat
              value={summary.rework}
              label="на доработке"
              tone={summary.rework ? "warn" : undefined}
            />
          </div>

          {summary.waiting > 0 && (
            <Note kind="info">
              <span className="small">
                Есть работы без ответа методиста — они на вкладке «Участники и проверка».
              </span>
            </Note>
          )}
        </div>
      </div>

      <aside className="stack g16">
        <div className="card" style={{ overflow: "hidden" }}>
          <Cover tone={course.cover} glyph={false} style={{ height: 120 }} />
          <div className="card-pad stack g8">
            <span className="caption" style={{ color: "var(--primary)" }}>
              {course.category}
            </span>
            <strong className="pretty">{course.title}</strong>
            {other && (
              <Link href={`/courses/${other.id}`} className="caption pretty" style={{ color: "var(--primary)" }}>
                {other.lang === "kz" ? "Казахская версия" : "Русская версия"}: {other.title}
              </Link>
            )}
            <div className="row g8" style={{ marginTop: 4 }}>
              <Badge kind="accepted">★ {course.rating}</Badge>
              <span className="caption muted-3">{course.reviewsCount} отзывов</span>
            </div>
          </div>
        </div>

        <div className="card card-pad stack g10">
          <h3 className="small" style={{ fontWeight: 700 }}>
            Содержимое курса
          </h3>
          <p className="caption muted-3 pretty">
            Уроки, программа, условия сертификата и публикация редактируются на
            отдельном экране — чтобы правки контента не смешивались с проверкой работ.
          </p>
          <LinkButton href={`/courses/${course.id}/edit?tab=program`} variant="secondary" block>
            <IconEdit size={16} />
            Программа: уроки, тесты, задания
          </LinkButton>
          <LinkButton href={`/courses/${course.id}/edit`} variant="ghost" block>
            Открыть редактор целиком
          </LinkButton>
        </div>
      </aside>

      <style>{`
        .course-overview { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
        @media (min-width: 1100px) { .course-overview { grid-template-columns: minmax(0, 1.5fr) 320px; gap: 20px; } }
        .info-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 560px) { .info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 900px) { .info-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        .stat-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        @media (min-width: 640px) { .stat-row { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      `}</style>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack g2" style={{ minWidth: 0 }}>
      <span className="caption muted">{label}</span>
      <span className="small pretty" style={{ fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: "primary" | "danger" | "warn";
}) {
  const color =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warn"
        ? "var(--warning)"
        : tone === "primary"
          ? "var(--primary)"
          : "var(--text)";
  return (
    <div className="stack g2">
      <strong style={{ fontSize: 22, letterSpacing: "-0.02em", color }}>{value}</strong>
      <span className="caption muted-3 pretty">{label}</span>
    </div>
  );
}

/* ============ Отзывы курса ============ */

function Reviews({ items }: { items: typeof adminReviews }) {
  if (items.length === 0) {
    return (
      <div className="card">
        <Empty icon={<IconStar size={38} />} title="Отзывов по курсу пока нет" />
      </div>
    );
  }
  return (
    <div className="stack g14" style={{ maxWidth: 860 }}>
      <p className="small muted pretty">
        Премодерации нет: отзыв виден на странице курса сразу. Лишнее убирается
        постфактум кнопкой «Удалить», на отзыв можно ответить.
      </p>
      {items.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
      <Link
        href="/reviews"
        className="row g4 small"
        style={{ color: "var(--primary)", fontWeight: 700 }}
      >
        Все отзывы платформы
        <IconChevronRight size={15} />
      </Link>
    </div>
  );
}

/* ============ Вопросы по курсу ============ */

function Questions({ items }: { items: typeof adminQuestions }) {
  if (items.length === 0) {
    return (
      <div className="card">
        <Empty icon={<IconMessage size={38} />} title="Вопросов по курсу нет" />
      </div>
    );
  }
  return (
    <div className="stack g14" style={{ maxWidth: 860 }}>
      <p className="small muted pretty">
        Ответ увидит автор вопроса и все, кто откроет этот урок.
      </p>
      {items.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}
      <Link
        href="/questions"
        className="row g4 small"
        style={{ color: "var(--primary)", fontWeight: 700 }}
      >
        Все вопросы платформы
        <IconChevronRight size={15} />
      </Link>
    </div>
  );
}
