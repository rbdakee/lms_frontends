"use client";

/**
 * Главная учителя «/my» — раздел 5.6 брифа. Одно главное действие: продолжить курс.
 *
 * Данные — `GET /me/courses`: карточки с готовыми `done_count`/`total_count`/
 * `progress_percent`/`next_lesson` (клиентского расчёта прогресса больше нет)
 * и блок «Ожидают подтверждения» из `leads`. «Новые курсы» — из `GET /courses`.
 *
 * Блоки «Требует внимания» (задания, ответы) и «Сертификаты» вернутся
 * с сессиями 5–6 — их данные ещё живут только в прототипе уроков.
 */

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  categoryTitle,
  useDictionaries,
  useLoad,
  useMe,
  type CatalogOut,
  type MyCourse,
  type MyCourses,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useRoutes } from "@lms/course/host";
import { TeacherShell } from "@/components/layout/Shell";
import {
  CourseRow,
  MyCourseCard,
  PendingCourseCard,
  continueHref,
  isUnavailable,
  pickVersion,
} from "@lms/course";
import {
  Cover,
  CourseCardSkeleton,
  Button,
  Empty,
  LinkButton,
  Progress,
  RowSkeleton,
  Skeleton,
} from "@lms/ui";
import { useState } from "react";
import { IconArrowRight, IconCatalog } from "@lms/ui/icons";

function isFinished(c: MyCourse): boolean {
  return c.completed_at !== null || (c.total_count > 0 && c.done_count >= c.total_count);
}

export default function MyPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const { me, status } = useMe();
  const [tab, setTab] = useState<"progress" | "done">("progress");

  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  const mine = useLoad<MyCourses | null>(
    () => (me ? api<MyCourses>("/me/courses") : Promise.resolve(null)),
    [me?.id],
  );
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);

  if (!me || mine.loading) return <LoadingSkeleton />;

  if (mine.error) {
    return (
      <TeacherShell>
        <div className="page section" style={{ paddingTop: 20 }}>
          <div className="card">
            <Empty
              title={t.loadError}
              text={t.loadErrorText}
              action={
                <Button variant="secondary" onClick={mine.reload}>
                  {t.retry}
                </Button>
              }
            />
          </div>
        </div>
      </TeacherShell>
    );
  }

  const myCourses = mine.data?.items ?? [];
  const pending = mine.data?.leads ?? [];

  const inProgress = myCourses.filter((c) => !isFinished(c));
  const finished = myCourses.filter(isFinished);

  /**
   * Курс для блока «Продолжить обучение» — самый продвинутый незавершённый.
   * Уведённые с платформы курсы сюда не берём: кнопка «Продолжить» привела бы
   * в «Курс не найден». Из списка ниже они при этом не пропадают.
   */
  const primary = inProgress
    .filter((c) => !isUnavailable(c))
    .sort((a, b) => b.progress_percent - a.progress_percent)[0];

  /** Свежие курсы каталога без доступа и заявки — никаких рекомендаций */
  const knownIds = new Set([
    ...myCourses.map((c) => c.id),
    ...pending.map((l) => l.course.id),
  ]);
  const fresh = (catalog.data?.items ?? [])
    .filter((g) => !g.versions.some((v) => knownIds.has(v.id)))
    .map((g) => pickVersion(g, lang))
    .filter((v) => v.status !== "closed")
    .slice(0, 3);

  const nothingYet = myCourses.length === 0 && pending.length === 0;

  return (
    <TeacherShell>
      <div className="page section stack g32" style={{ paddingTop: 20 }}>
        <h1 className="h1">{t.greeting(me.first_name || t.myTeacherFallback)}</h1>

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
        ) : /* Незавершённые есть, но все уведены с платформы — «всё пройдено» было бы неправдой */
        inProgress.length === 0 && myCourses.length > 0 ? (
          <div className="card card-pad row between g12 wrap">
            <div className="stack g4">
              <strong>{t.myAllDoneTitle}</strong>
              <span className="small muted">{t.myAllDoneText}</span>
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
                  {t.myTabProgress} · {inProgress.length}
                </button>
                <button data-active={tab === "done"} onClick={() => setTab("done")}>
                  {t.myTabDone} · {finished.length}
                </button>
              </div>
            </div>

            {(tab === "progress" ? inProgress : finished).length === 0 ? (
              <div className="card">
                <Empty
                  title={tab === "progress" ? t.myEmptyProgressTitle : t.myEmptyDoneTitle}
                  text={tab === "progress" ? t.myEmptyProgressText : t.myEmptyDoneText}
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
              {pending.map((l) => (
                <PendingCourseCard key={l.id} lead={l} />
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

/**
 * Прогресс и следующий урок приходят готовыми. Кнопка ведёт прямо в урок —
 * кроме случая, когда следующий шаг тест или задание: их экраны на прототипе
 * до сессии 5, туда ведём через страницу курса.
 */
function ContinueBlock({ course }: { course: MyCourse }) {
  const { t } = useLang();
  const routes = useRoutes();
  const dictionaries = useDictionaries();

  return (
    <section className="stack g12">
      <h2 className="h2">{t.continue}</h2>
      <div className="card continue-card">
        <Link href={`/courses/${course.id}`} className="continue-cover">
          <Cover tone="cover-c1" src={course.cover} />
        </Link>
        <div className="stack g16 card-pad grow">
          <div className="stack g6">
            <span className="caption" style={{ color: "var(--primary)" }}>
              {categoryTitle(dictionaries.data?.categories, course.category_id)}
            </span>
            <Link href={`/courses/${course.id}`}>
              <h3 className="h2 pretty" style={{ fontSize: 20 }}>
                {course.title}
              </h3>
            </Link>
            {course.next_lesson && (
              <span className="small muted pretty">
                {t.crsNextItem(course.next_lesson.title)}
              </span>
            )}
          </div>

          <div className="stack g6">
            <div className="row between small">
              <span className="muted">{t.ofLessons(course.done_count, course.total_count)}</span>
              <strong style={{ color: "var(--primary)" }}>{course.progress_percent}%</strong>
            </div>
            <Progress value={course.progress_percent} thick />
          </div>

          <LinkButton href={continueHref(routes, course.id, course.next_lesson)} size="lg" block>
            {t.continueShort}
          </LinkButton>
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
