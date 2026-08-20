"use client";

/**
 * Страница курса «/courses/:id» — раздел 5.3 брифа.
 *
 * Данные — `GET /courses/{id}`, кнопка — по `access.state`:
 * `none` → «Записаться» (`POST /courses/{id}/lead`, тело пустое — контакты
 * сервер берёт из профиля); `requested` → «Заявка отправлена» и «ждёт N дней»;
 * `granted` → прогресс. Оплата идёт вне платформы: только цена, платёжных
 * полей нет.
 *
 * Гость, нажавший «Записаться», уходит на `/login?next=…&lead=1` — после
 * входа возвращается сюда и заявка отправляется сама.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  categoryTitle,
  isApiError,
  useDictionaries,
  useLoad,
  useMe,
  type Completion,
  type CoursePage,
  type Lead,
} from "@lms/api";
import { day, rating as fmtRating, type UiLang } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { PublicShell, TeacherShell } from "@/components/layout/Shell";
import {
  continueHref,
  CourseCertChecklist,
  CourseProgram,
} from "@/components/course/CourseProgram";
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
  Skeleton,
} from "@lms/ui";
import {
  IconArrowLeft,
  IconBook,
  IconCalendar,
  IconCheck,
  IconClock,
  IconLayers,
  IconStar,
  IconUsers,
} from "@lms/ui/icons";

export default function CoursePageScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, toast } = useStore();
  const { me, status } = useMe();
  const dictionaries = useDictionaries();
  const authed = Boolean(me);

  const course = useLoad(
    () => api<CoursePage>(`/courses/${encodeURIComponent(id)}`),
    /* Пока /me не отвечен, куки может не быть смысла ждать не надо: access
       для гостя и так none; после входа перезапрашиваем ради access */
    [id, me?.id],
  );
  /* Чек-лист сертификата — отдельный публичный запрос: он нужен и гостю
     (список требований), и учителю с доступом (живые счётчики) */
  const completion = useLoad<Completion>(
    () => api<Completion>(`/courses/${encodeURIComponent(id)}/completion`),
    [id, me?.id],
  );
  const [enrolling, setEnrolling] = useState(false);
  /* Автоотправка заявки после возвращения из /login — один раз за загрузку */
  const autoLead = useRef(false);

  const enroll = async () => {
    if (!me) {
      router.push(`/login?next=${encodeURIComponent(`/courses/${id}?lead=1`)}`);
      return;
    }
    if (enrolling) return;
    setEnrolling(true);
    try {
      const lead = await api<Lead>(`/courses/${encodeURIComponent(id)}/lead`, {
        method: "POST",
      });
      course.setData((c) =>
        c ? { ...c, access: { state: "requested", waiting_days: lead.waiting_days } } : c,
      );
      toast("Заявка отправлена — администратор свяжется с вами", "success");
    } catch (e) {
      if (isApiError(e, "unauthorized")) {
        router.push(`/login?next=${encodeURIComponent(`/courses/${id}?lead=1`)}`);
      } else if (isApiError(e)) {
        /* already_enrolled и enrollment_closed показываем текстом сервера */
        toast(e.message, e.code === "already_enrolled" ? "info" : "error");
        course.reload();
      } else {
        toast("Не удалось отправить заявку — попробуйте ещё раз", "error");
      }
    } finally {
      setEnrolling(false);
    }
  };

  useEffect(() => {
    if (autoLead.current || !me || !course.data) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("lead") !== "1") return;
    autoLead.current = true;
    /* Убираем параметр, чтобы обновление страницы не слало заявку заново */
    params.delete("lead");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    if (course.data.access.state === "none") void enroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, course.data]);

  const Shell = authed ? TeacherShell : PublicShell;

  /* Пока не знаем, гость это или учитель, каркас не выбираем — иначе шапка мигает */
  if (course.loading || status === "loading") {
    return (
      <Shell>
        <div className="page section stack g20" style={{ paddingTop: 16 }}>
          <Skeleton w={260} h={16} />
          <Skeleton h={220} r={14} />
          <Skeleton w="70%" h={28} />
          <Skeleton w="40%" h={16} />
          <Skeleton h={120} r={14} />
        </div>
      </Shell>
    );
  }

  if (course.error) {
    const notFound = course.error.status === 404 || course.error.status === 422;
    return (
      <Shell>
        <div className="page section">
          <div className="card">
            <Empty
              title={notFound ? "Курс не найден" : t.loadError}
              text={
                notFound
                  ? "Возможно, курс скрыт администратором или ссылка устарела."
                  : t.loadErrorText
              }
              action={
                notFound ? (
                  <LinkButton href="/courses" variant="secondary">
                    В каталог
                  </LinkButton>
                ) : (
                  <Button variant="secondary" onClick={course.reload}>
                    {t.retry}
                  </Button>
                )
              }
            />
          </div>
        </div>
      </Shell>
    );
  }

  const c = course.data!;
  const access = c.access;
  const granted = access.state === "granted";
  const requested = access.state === "requested";
  const closed = c.status === "closed";
  const langs = c.versions.map((v) => v.lang) as UiLang[];
  const category = categoryTitle(dictionaries.data?.categories, c.category_id);
  const finished =
    granted && access.total_count > 0 && access.done_count >= access.total_count;
  const next = access.state === "granted" ? access.next_lesson : null;

  /* Главное действие — одно на весь экран. С выданным доступом это «Продолжить
     обучение» по `next_lesson`; всё пройдено (`next_lesson: null`) — кнопки
     нет, звать больше некуда. */
  const cta = granted ? (
    next && (
      <LinkButton block size="lg" href={continueHref(c.id, next)}>
        {t.continue}
      </LinkButton>
    )
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
    <Button block size="lg" loading={enrolling} onClick={enroll}>
      {authed ? t.enroll : "Войти и записаться"}
    </Button>
  );

  /* Цена и статус набора — рядом с главной кнопкой */
  const priceBlock = (
    <div className="stack g8">
      <div className="row between wrap g10">
        <Price course={c} size="lg" />
        <EnrollBadge course={c} />
      </div>
      {c.status === "planned" && c.starts_at && (
        <span className="small muted row g6">
          <IconCalendar size={16} />
          Обучение начнётся {day(c.starts_at, lang)}, заявку можно оставить сейчас
        </span>
      )}
    </div>
  );

  const progressBlock = granted && (
    <div className="stack g8">
      <div className="row between small">
        {/* Счётчики — по всем элементам программы (уроки, тесты, задания),
            поэтому без слова «уроков»: их в M больше, чем уроков на карточке */}
        <span className="muted">
          Пройдено {access.done_count} из {access.total_count}
        </span>
        <strong style={{ color: finished ? "var(--success)" : "var(--primary)" }}>
          {access.progress_percent}%
        </strong>
      </div>
      <Progress value={access.progress_percent} thick />
      {access.next_lesson && (
        <span className="caption muted-3 pretty">Следующий: {access.next_lesson.title}</span>
      )}
    </div>
  );

  const content = (
    <>
      <div className="page section stack g24" style={{ paddingTop: 16 }}>
        <div className="row between g12">
          {/* В крошке — название курса, а не категория: категория стоит
              синей подписью над заголовком, и в крошке она читалась как
              «я пришёл из раздела Оценивание», которым человек не шёл */}
          <Breadcrumbs items={[{ label: "Каталог", href: "/courses" }, { label: c.title }]} />
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
                <Cover tone="cover-c1" src={c.cover}>
                  <div className="cover-badges">
                    <LangBadge langs={langs.length ? langs : [c.lang as UiLang]} />
                    <div className="row g6">
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
                {category}
              </span>
              <h1 className="h1 pretty">{c.title}</h1>

              {/* Языковые версии — самостоятельные курсы с общим group_id */}
              {c.versions.length > 1 ? (
                <div className="row wrap g8">
                  {c.versions.map((v) => (
                    <Link
                      key={v.id}
                      href={`/courses/${v.id}`}
                      className="chip"
                      data-active={v.id === c.id || undefined}
                    >
                      {v.lang === "ru" ? "Русская версия" : "Қазақша нұсқасы"}
                    </Link>
                  ))}
                </div>
              ) : (
                !langs.includes(lang) && (
                  <span className="small muted-3">{c.lang === "kz" ? t.onlyKz : t.onlyRu}</span>
                )
              )}

              <p className="body muted pretty">{c.short}</p>

              <div className="row wrap g10 small">
                {c.rating === null ? (
                  <span className="muted-3">{t.noReviews}</span>
                ) : (
                  <>
                    <span className="row g4" style={{ color: "#b45309", fontWeight: 700 }}>
                      <IconStar size={16} filled strokeWidth={1.2} />
                      {fmtRating(c.rating)}
                    </span>
                    <span className="muted-3">({c.reviews_count})</span>
                  </>
                )}
                <span className="dot-sep">·</span>
                <span className="muted row g6">
                  <IconUsers size={16} />
                  {t.students(c.students_count)}
                </span>
              </div>

              {granted && <div style={{ marginTop: 4 }}>{progressBlock}</div>}
            </header>

            {/* Цена и статус — на мобильном сразу под шапкой, на десктопе в боковой карточке */}
            <div className="card card-pad stack g14 price-inline">
              {priceBlock}
              {requested && (
                <Note kind="info">
                  {t.sentAgo(access.state === "requested" ? access.waiting_days : 0)}.{" "}
                  {t.requestedHint}
                </Note>
              )}
              <hr className="divider" />
              <span className="caption muted">Оплата принимается вне платформы</span>
              <ContactAdmin />
            </div>

            {/* Метаданные */}
            <div className="meta-grid">
              {[
                c.program.length > 0 && { icon: IconLayers, label: t.modules(c.program.length) },
                { icon: IconBook, label: t.lessons(c.lessons_count) },
                { icon: IconClock, label: t.hours(c.hours) },
                c.duration_text && { icon: IconCalendar, label: c.duration_text },
              ]
                .filter((m): m is { icon: typeof IconBook; label: string } => Boolean(m))
                .map((m, i) => {
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
              <CourseCertChecklist
                course={c}
                completion={completion.data}
                loading={completion.loading}
                onRetry={completion.reload}
              />
            </div>

            {/* Полное описание */}
            {c.full && (
              <section className="stack g10">
                <h2 className="h2">О курсе</h2>
                <p className="body muted pretty">{c.full}</p>
              </section>
            )}

            {/* Программа */}
            <section className="stack g16">
              <div className="row between wrap g12">
                <h2 className="h2">{t.secProgram}</h2>
                {granted && (
                  <span className="small muted">
                    {access.done_count} из {access.total_count} пройдено
                  </span>
                )}
              </div>
              {/* С выданным доступом уроки отсюда открываются в плеере;
                  тесты и задания — с сессии 5 */}
              <CourseProgram program={c.program} locked={!granted} courseId={c.id} />
            </section>

            {/* Отзывы */}
            <ReviewsBlock course_id={c.id} />
          </div>

          {/* ===== Липкая карточка записи — десктоп ===== */}
          <aside className="course-side">
            <div className="card card-pad stack g16" style={{ position: "sticky", top: 88 }}>
              <Cover
                tone="cover-c1"
                src={c.cover}
                glyph={false}
                style={{ borderRadius: 12, height: 110, aspectRatio: "auto" }}
              />
              {priceBlock}

              {granted ? (
                progressBlock
              ) : requested ? (
                <span className="caption muted pretty">
                  {t.sentAgo(access.state === "requested" ? access.waiting_days : 0)}
                </span>
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
              <CourseCertChecklist
                course={c}
                completion={completion.data}
                loading={completion.loading}
                onRetry={completion.reload}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Липкая кнопка на мобильном: главное действие + текстовая ссылка на админа */}
      {cta && (
        <div className={`sticky-cta mobile-only ${authed ? "" : "no-tabbar"}`}>
          <div className="sticky-cta-inner stack g4">
            {cta}
            <ContactAdmin variant="link" />
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

  return <Shell hasStickyCta={Boolean(cta)}>{content}</Shell>;
}
