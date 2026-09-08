"use client";

/**
 * Кабинет учителя второй площадки — «/my». Главное действие здесь одно:
 * продолжить начатый курс.
 *
 * Собран из двух запросов и только из них. `GET /me/courses` — карточки с готовыми
 * `done_count`/`total_count`/`progress_percent`/`next_lesson` и заявки в `leads`;
 * `GET /courses` — блок «Новые курсы». Прогресс, счётчики и следующий урок считает
 * сервер, на клиенте не пересчитывается ничего. Карточки курса — общие компоненты
 * `@lms/course`: они одни на обе площадки, своей копии у второй быть не должно,
 * и различие делается тем, что вокруг них.
 *
 * Блока сертификатов здесь нет, хотя данные для него уже приехали: перед выкатом
 * второй площадки делается раскладка, а не новые возможности. Сертификаты живут
 * на своём экране «/certificates», куда ведёт таб-панель.
 *
 * Чем раскладка отличается от кабинета первой площадки и почему:
 *
 * - **Две колонки вместо одной.** Слева учёба — «Продолжить» и свои курсы, справа
 *   узкая полоса второстепенного: заявки и новые курсы. У первой площадки всё это
 *   стоит одной лентой сверху вниз, и до заявки, по которой человек ждёт доступ,
 *   надо проскроллить мимо всех карточек. Полоса отделена каймой, а не заливкой:
 *   фон у темы белый, и отделяют здесь кайма, тень и воздух.
 * - **Сетка вместо горизонтальной ленты.** Лента первой площадки на телефоне
 *   прячет половину карточки за краем экрана; здесь карточки лежат сеткой, которая
 *   на телефоне становится одной колонкой — видно все и целиком.
 * - **Две честные секции вместо переключателя «В процессе / Пройденные».** Список
 *   вертикальный, обе секции помещаются друг под другом, и прятать одну за вкладку
 *   незачем: пустая просто не рисуется.
 * - **«Продолжить» — обложка справа, процент крупной цифрой у полосы.** У первой
 *   площадки обложка слева, а процент — мелкой подписью над полосой.
 */

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
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
import { IconArrowRight, IconCatalog, IconCheckCircle, IconPlay } from "@lms/ui/icons";

function isFinished(c: MyCourse): boolean {
  return c.completed_at !== null || (c.total_count > 0 && c.done_count >= c.total_count);
}

export default function MyPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const { me, status } = useMe();

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

  /* Каталог грузится вторым запросом, и колонок на экране две: без места,
     занятого заранее, страница прыгала бы с одной колонки на две в момент
     ответа. Поэтому на время загрузки полоса стоит со скелетоном строк. */
  const freshLoading = fresh.length === 0 && catalog.loading;
  const hasRail = pending.length > 0 || fresh.length > 0 || freshLoading;

  return (
    <TeacherShell>
      <div className="page section stack g24" style={{ paddingTop: 20 }}>
        <header className="stack g16">
          <h1 className="h1">{t.greeting(me.first_name || t.myTeacherFallback)}</h1>
          <hr className="divider" />
        </header>

        <Desk
          rail={
            hasRail ? (
              <>
                {/* ===== Ожидают подтверждения ===== */}
                {pending.length > 0 && (
                  <section className="stack g12">
                    <h2 className="h3">{t.secPending}</h2>
                    {pending.map((l) => (
                      <PendingCourseCard key={l.id} lead={l} />
                    ))}
                  </section>
                )}

                {/* ===== Новые курсы ===== */}
                {(fresh.length > 0 || freshLoading) && (
                  <section className="stack g12">
                    <h2 className="h3">{t.secNewCourses}</h2>
                    {freshLoading ? (
                      <>
                        <RowSkeleton />
                        <RowSkeleton />
                      </>
                    ) : (
                      <>
                        {fresh.map((c) => (
                          <CourseRow key={c.id} course={c} />
                        ))}
                        <LinkButton
                          href="/courses"
                          variant="ghost"
                          block
                          iconRight={<IconArrowRight size={16} />}
                        >
                          {t.viewAll}
                        </LinkButton>
                      </>
                    )}
                  </section>
                )}
              </>
            ) : undefined
          }
        >
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
          ) : /* Незавершённые есть, но все уведены с площадки — «всё пройдено» неправда */
          inProgress.length === 0 && myCourses.length > 0 ? (
            <div className="card card-pad row between g16 wrap">
              <div className="row g12">
                <span style={{ color: "var(--success)", display: "flex" }}>
                  <IconCheckCircle size={22} />
                </span>
                <div className="stack g4">
                  <strong>{t.myAllDoneTitle}</strong>
                  <span className="small muted">{t.myAllDoneText}</span>
                </div>
              </div>
              <LinkButton href="/courses" variant="secondary">
                {t.openCatalog}
              </LinkButton>
            </div>
          ) : null}

          {/* ===== Мои курсы: две секции, без переключателя ===== */}
          {myCourses.length > 0 && (
            <section className="stack g24">
              <h2 className="h2">{t.secMyCourses}</h2>
              {inProgress.length > 0 && (
                <CourseGroup title={t.myTabProgress} courses={inProgress} />
              )}
              {finished.length > 0 && <CourseGroup title={t.myTabDone} courses={finished} />}
            </section>
          )}
        </Desk>
      </div>
    </TeacherShell>
  );
}

/* ============ Рабочая область: колонка учёбы и боковая полоса ============ */

/**
 * Кадр кабинета. Отдельным компонентом — потому что тот же кадр нужен скелетону:
 * иначе страница после загрузки переезжала бы из одной колонки в две.
 *
 * Полосы нет вовсе, когда нечего в неё положить: пустая колонка в 336 px
 * ужимала бы карточки курсов ни за чем.
 */
function Desk({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  return (
    <div className={rail ? "p2-desk has-rail" : "p2-desk"}>
      <div className="stack g32" style={{ minWidth: 0 }}>
        {children}
      </div>
      {rail && <aside className="stack g32 p2-rail">{rail}</aside>}

      <style>{`
        .p2-desk { display: grid; gap: 28px; }
        /* Сетка карточек вместо ленты: auto-fill, а не auto-fit — при одном
           курсе карточка остаётся карточкой, а не растягивается на всю колонку */
        .p2-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(258px, 1fr));
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .p2-desk.has-rail {
            grid-template-columns: minmax(0, 1fr) 336px;
            gap: 40px;
          }
          /* Полосу отделяет кайма: фон страницы и карточек одинаково белый,
             и заливка второстепенного блока читалась бы как ошибка темы.
             Колонка тянется во всю высоту рабочей области — иначе линия
             обрывалась бы на середине экрана и читалась бы как недогруз */
          .p2-rail { border-left: 1px solid var(--border); padding-left: 32px; }
          .p2-cards { gap: 20px; }
        }
      `}</style>
    </div>
  );
}

/* ============ Секция «Мои курсы» ============ */

/** Заголовок со счётчиком и сетка карточек — одинаково у «в процессе» и «пройденных». */
function CourseGroup({ title, courses }: { title: string; courses: MyCourse[] }) {
  return (
    <section className="stack g12">
      <div className="row g8">
        <h3 className="h3">{title}</h3>
        <span className="small muted-3">{courses.length}</span>
      </div>
      <div className="p2-cards">
        {courses.map((c) => (
          <MyCourseCard key={c.id} course={c} />
        ))}
      </div>
    </section>
  );
}

/* ============ Блок «Продолжить обучение» ============ */

/**
 * Прогресс и следующий урок приходят готовыми. Кнопка ведёт прямо в урок,
 * а тест и задание — через страницу курса: это решает `continueHref`.
 */
function ContinueBlock({ course }: { course: MyCourse }) {
  const { t } = useLang();
  const routes = useRoutes();
  const dictionaries = useDictionaries();

  return (
    <section className="card p2-continue">
      <Link href={`/courses/${course.id}`} className="p2-continue-cover">
        <Cover tone="cover-c1" src={course.cover} />
      </Link>

      <div className="stack g16 card-pad grow">
        <span className="row g6 caption p2-continue-label">
          <IconPlay size={13} />
          {t.continue}
        </span>

        <div className="stack g6">
          <span className="caption muted-3">
            {categoryTitle(dictionaries.data?.categories, course.category_id)}
          </span>
          <Link href={`/courses/${course.id}`}>
            <h2 className="h2 pretty">{course.title}</h2>
          </Link>
          {course.next_lesson && (
            <span className="small muted pretty">
              {t.crsNextItem(course.next_lesson.title)}
            </span>
          )}
        </div>

        <div className="row g16" style={{ marginTop: "auto" }}>
          <strong className="h2 nowrap" style={{ color: "var(--primary)" }}>
            {course.progress_percent}%
          </strong>
          <div className="grow stack g6" style={{ minWidth: 0 }}>
            <Progress value={course.progress_percent} thick />
            <span className="small muted">
              {t.ofLessons(course.done_count, course.total_count)}
            </span>
          </div>
        </div>

        <div className="p2-continue-cta">
          <LinkButton href={continueHref(routes, course.id, course.next_lesson)} size="lg" block>
            {t.continueShort}
          </LinkButton>
        </div>
      </div>

      <style>{`
        /* Обложка справа, а не слева, как у первой площадки: на белом фоне это
           единственное цветное пятно кабинета, и слева оно перебивало бы
           название курса. На телефоне она уходит наверх полосой 21:9 —
           при 16:9 кнопка «Продолжить» не помещалась на первый экран. */
        /* Имя своё, а не «hero»: на лендинге этой же площадки класс с таким
           именем уже занят под первый экран, и одинаковые имена в двух
           локальных блоках читались бы как один стиль. */
        .p2-continue { display: flex; flex-direction: column; overflow: hidden; }
        .p2-continue-cover { display: block; }
        .p2-continue-cover .cover { aspect-ratio: 21 / 9; }
        .p2-continue-label { text-transform: uppercase; letter-spacing: 0.08em; color: var(--primary); }
        @media (min-width: 720px) {
          .p2-continue { flex-direction: row; align-items: stretch; }
          .p2-continue-cover { order: 2; width: 38%; max-width: 300px; flex-shrink: 0; }
          .p2-continue-cover .cover { height: 100%; aspect-ratio: auto; }
          /* Кнопка во всю ширину нужна только на телефоне */
          .p2-continue-cta .btn { width: auto; }
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
        <div className="stack g16">
          <Skeleton w={240} h={32} />
          <hr className="divider" />
        </div>

        <Desk
          rail={
            <div className="stack g12">
              <RowSkeleton />
              <RowSkeleton />
            </div>
          }
        >
          <div className="card card-pad stack g16">
            <Skeleton h={150} r={14} />
            <Skeleton w="65%" h={22} />
            <Skeleton w="40%" h={14} />
            <Skeleton h={46} r={12} />
          </div>
          <div className="p2-cards">
            <CourseCardSkeleton />
            <CourseCardSkeleton />
          </div>
        </Desk>
      </div>
    </TeacherShell>
  );
}
