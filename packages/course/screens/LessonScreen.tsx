"use client";

/**
 * Экран урока «/learn/:courseId/:lessonId» — раздел 5.7 брифа, главный экран
 * продукта. Десктоп: контент ~70% + липкая программа справа. Мобильный: видео
 * сверху, программа — в шторке по кнопке.
 *
 * Данные — два параллельных запроса: `GET /lessons/{id}` (заголовок, содержимое,
 * материалы, отметка о прохождении) и `GET /courses/{id}/program` (сквозной
 * номер «Урок N из M», соседи «предыдущий/следующий» и сайдбар). Оба требуют
 * входа и действующего доступа к курсу, поэтому отказов четыре и все разные:
 * 401 — на `/login`, 403 — «доступ к курсу закрыт», 404/422 — «урок не найден»
 * (как на странице курса), сеть — «Повторить».
 *
 * Ссылку на видео экран не запрашивает: за ней ходит сам плеер
 * (`GET /lessons/{id}/playback`) — доступ проверяется на каждый её выпуск.
 *
 * Вопросы под уроком — своя секция со своими тремя состояниями
 * (`GET/POST /lessons/{id}/questions`), она грузится отдельно от урока.
 */

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type FileLink,
  type Lesson,
  type LessonComplete,
  type LessonFile,
  type Program,
  type ProgramStatusItem,
  type QuestionsPage,
  type ThreadQuestion,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useChrome, useRoutes } from "../host";
import { continueHref, CourseProgram } from "../components/CourseProgram";
import { VideoPlayer } from "../components/VideoPlayer";
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Empty,
  FileRow,
  fileType,
  LinkButton,
  Progress,
  Sheet,
  Skeleton,
} from "@lms/ui";
import { dayTime, fileSize } from "@lms/ui/i18n";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCheckCircle,
  IconDownload,
  IconLayers,
  IconLock,
  IconMessage,
} from "@lms/ui/icons";

/**
 * Содержимое урока. `body` — JSON как он лежит в базе, и до сессии 7 (редактор
 * урока) это `{ html }` из нашей же админки — поэтому вставляем как HTML.
 * Форма не финальная: когда она изменится, править нужно только это место.
 */
function LessonBody({ body }: { body: Lesson["body"] }) {
  const html = typeof body?.html === "string" ? body.html : null;
  if (!html) return null;
  return (
    <article className="lesson-text stack g16" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** Экран без содержимого: не найдено, доступ закрыт, ошибка сети. */
function LessonState({
  courseId,
  title,
  text,
  action,
}: {
  courseId: string;
  title: string;
  text: string;
  action: React.ReactNode;
}) {
  const { t } = useLang();
  const routes = useRoutes();
  const { BackHeader, TabBar } = useChrome();
  return (
    <>
      <BackHeader href={routes.course(courseId)} title={t.lesson} />
      <main className="page section has-tabbar">
        <div className="card">
          <Empty title={title} text={text} action={action} />
        </div>
      </main>
      <TabBar />
    </>
  );
}

function LessonSkeleton({ courseId, title }: { courseId: string; title: string }) {
  const routes = useRoutes();
  const { BackHeader, TabBar } = useChrome();
  return (
    <>
      <BackHeader href={routes.course(courseId)} title={title} />
      <main className="page section has-tabbar stack g20" style={{ paddingTop: 16 }}>
        <Skeleton h={200} r={14} />
        <Skeleton w="70%" h={28} />
        <Skeleton w="40%" h={16} />
        <Skeleton h={120} r={14} />
      </main>
      <TabBar />
    </>
  );
}

export function LessonScreen({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const routes = useRoutes();
  const { BackHeader, TabBar } = useChrome();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const toast = useToast();

  const [programOpen, setProgramOpen] = useState(false);
  /** Ответ `POST /lessons/{id}/complete` — прогресс на экране без перезапроса */
  const [marked, setMarked] = useState<LessonComplete | null>(null);
  const [marking, setMarking] = useState(false);
  /** id файла, за ссылкой на который сейчас идём */
  const [downloading, setDownloading] = useState<number | null>(null);

  /* id в маршруте — серверные. Нечисловой отдаётся тем же «не найдено»,
     что и несуществующий: сервер отвечает 404 или 422, разбирать на клиенте
     нечего (так же ведёт себя страница курса). */
  const lesson = useLoad(
    () => api<Lesson>(`/lessons/${encodeURIComponent(lessonId)}`),
    [lessonId],
  );
  const program = useLoad(
    () => api<Program>(`/courses/${encodeURIComponent(courseId)}/program`),
    [courseId],
  );

  /* Открыли соседний урок — прогресс из прошлого ответа больше не про него */
  useEffect(() => setMarked(null), [lessonId]);

  const fail = lesson.error ?? program.error;

  useEffect(() => {
    if (fail?.code === "unauthorized") {
      router.replace(routes.login(pathname));
    }
  }, [fail, pathname, router]);

  const retry = () => {
    lesson.reload();
    program.reload();
  };

  if (fail?.code === "unauthorized") {
    return <LessonSkeleton courseId={courseId} title={t.lesson} />;
  }

  /* Ошибку показываем, только когда показывать больше нечего: перезапрос
     программы после отметки не должен сносить открытый урок */
  if (fail && (!lesson.data || !program.data)) {
    if (fail.code === "forbidden") {
      return (
        <LessonState
          courseId={courseId}
          title={t.accessClosedTitle}
          text={t.accessClosedText}
          action={
            <LinkButton href={routes.course(courseId)} variant="secondary">
              {t.toCourse}
            </LinkButton>
          }
        />
      );
    }
    if (fail.status === 404 || fail.status === 422) {
      return (
        <LessonState
          courseId={courseId}
          title={t.lessonNotFound}
          text={t.lessonNotFoundText}
          action={
            <LinkButton href={routes.course(courseId)} variant="secondary">
              {t.toCourse}
            </LinkButton>
          }
        />
      );
    }
    return (
      <LessonState
        courseId={courseId}
        title={t.loadError}
        text={t.loadErrorText}
        action={
          <Button variant="secondary" onClick={retry}>
            {t.retry}
          </Button>
        }
      />
    );
  }

  if (!lesson.data || !program.data) {
    return <LessonSkeleton courseId={courseId} title={t.lesson} />;
  }

  const l = lesson.data;
  const modules = program.data.program;
  /* Сквозной порядок: модули по порядку, внутри модуля — элементы по порядку.
     «Урок N из M» и соседи считаются по всем элементам, как и прогресс курса
     на сервере, — иначе два экрана одного курса покажут разные числа. */
  const items = modules.flatMap((m) => m.items);
  const idx = items.findIndex(
    (i) => (i.kind === "video" || i.kind === "text") && i.id === l.id,
  );
  const number = idx >= 0 ? idx + 1 : null;
  const prev = idx > 0 ? items[idx - 1] : undefined;
  const next = idx >= 0 && idx < items.length - 1 ? items[idx + 1] : undefined;
  const mod = modules.find((m) => m.id === l.module_id);
  const lessonLabel = number ? t.lessonOf(number, items.length) : t.lesson;

  const isDone = marked?.is_completed ?? l.is_completed;
  const doneCount = marked?.done_count ?? items.filter((i) => i.status === "done").length;
  const totalCount = marked?.total_count ?? items.length;
  const percent =
    marked?.progress_percent ??
    (totalCount ? Math.round((doneCount / totalCount) * 100) : 0);

  const markDone = async () => {
    if (marking || isDone) return;
    setMarking(true);
    try {
      const res = await api<LessonComplete>(
        `/lessons/${encodeURIComponent(lessonId)}/complete`,
        { method: "POST" },
      );
      setMarked(res);
      toast(t.lessonMarkedDone, "success");
      /* Программу перезапрашиваем всегда: статусы элементов (галочка этого
         урока, снятые замки строгого порядка) считает сервер, а тянуть ради
         `strict_order` ещё и `GET /courses/{id}` — это лишний запрос на каждый
         вход в урок против одного на клик. Экран его не ждёт: «N из M»
         и процент уже перерисованы ответом POST. */
      program.reload();
    } catch (e) {
      if (isApiError(e, "unauthorized")) {
        router.replace(routes.login(pathname));
      } else if (isApiError(e) && e.status > 0) {
        /* 403 и 404 объясняет текст сервера */
        toast(e.message, "error");
      } else {
        toast(t.markDoneError, "error");
      }
    } finally {
      setMarking(false);
    }
  };

  /* Ссылка на файл подписана и живёт 15 минут — открываем её, скачивает браузер */
  const download = async (f: LessonFile) => {
    if (downloading !== null) return;
    setDownloading(f.id);
    try {
      const link = await api<FileLink>(`/files/${f.id}`);
      const opened = window.open(link.url, "_blank", "noopener");
      /* Ссылку просим после await — блокировщик мог не пустить новое окно */
      if (!opened) window.location.href = link.url;
    } catch (e) {
      toast(isApiError(e) && e.status > 0 ? e.message : t.fileLinkError, "error");
    } finally {
      setDownloading(null);
    }
  };

  /* Сосед бывает уроком, тестом или заданием — у каждого свой экран,
     и подпись кнопки говорит, куда именно ведёт «Далее» */
  const navLabel = (i?: ProgramStatusItem, fallback = t.nextLesson) =>
    i?.kind === "quiz" ? t.nextQuiz : i?.kind === "task" ? t.nextTask : fallback;

  const goNext = () => {
    if (next?.status === "locked") {
      toast(t.lockedNext);
      return;
    }
    router.push(continueHref(routes, courseId, next));
  };

  return (
    <>
      <BackHeader
        href={routes.course(courseId)}
        title={l.title}
        subtitle={mod ? `${lessonLabel} · ${mod.title}` : lessonLabel}
        right={
          <button
            className="btn btn-secondary btn-sm program-btn"
            onClick={() => setProgramOpen(true)}
          >
            <IconLayers size={16} />
            Программа
          </button>
        }
      />

      <main className="has-tabbar">
        {/* Видео — на мобильном во всю ширину, без полей */}
        {l.kind === "video" && (
          <div className="player-wrap">
            <div className="player-inner">
              <VideoPlayer lessonId={l.id} title={l.title} />
            </div>
          </div>
        )}

        <div className="page section stack g24" style={{ paddingTop: 16 }}>
          <div className="lesson-layout">
            <div className="stack g32" style={{ minWidth: 0 }}>
              {/* Заголовок */}
              <header className="stack g10">
                <Breadcrumbs
                  items={[
                    { label: t.secProgram, href: routes.course(courseId) },
                    { label: mod?.title ?? "" },
                  ]}
                />
                <div className="row between wrap g12">
                  <h1 className="h1 pretty">{l.title}</h1>
                  {isDone ? (
                    <Badge kind="done" icon={<IconCheck size={13} />}>
                      {t.lessonDone}
                    </Badge>
                  ) : (
                    <Badge kind="neutral">{lessonLabel}</Badge>
                  )}
                </div>
              </header>

              {/* Текст урока */}
              <LessonBody body={l.body} />

              {/* Материалы */}
              <section className="stack g12">
                <h2 className="h2">{t.secMaterials}</h2>
                {l.files.length === 0 ? (
                  <div className="card">
                    <Empty
                      icon={<IconDownload size={34} />}
                      title={t.materialsEmptyTitle}
                      text={t.materialsEmptyText}
                    />
                  </div>
                ) : (
                  <div className="stack g8">
                    {l.files.map((f) => (
                      <FileRow
                        key={f.id}
                        type={fileType(f.mime)}
                        name={f.name}
                        size={fileSize(f.size_bytes)}
                        action={
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={downloading === f.id}
                            icon={<IconDownload size={16} />}
                            onClick={() => download(f)}
                          >
                            <span className="download-label">{t.download}</span>
                          </Button>
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Кнопка зачёта */}
              <section className="stack g10">
                {isDone ? (
                  <div className="note note-success" style={{ padding: "14px 16px" }}>
                    <IconCheckCircle size={20} />
                    <div className="grow">
                      <strong>{t.lessonDone}</strong>
                    </div>
                  </div>
                ) : (
                  /* Урок отмечает пройденным сам учитель. Автоотметки по просмотру нет:
                     это самая частая запись во всей системе ради подписи на кнопке */
                  <Button
                    block
                    size="lg"
                    loading={marking}
                    onClick={markDone}
                    icon={<IconCheck size={18} />}
                  >
                    {t.markDone}
                  </Button>
                )}

                <div className="row g10 nav-row">
                  <Button
                    variant="secondary"
                    block
                    disabled={!prev}
                    onClick={() => prev && router.push(continueHref(routes, courseId, prev))}
                    icon={<IconArrowLeft size={17} />}
                  >
                    {navLabel(prev, t.prevLesson)}
                  </Button>
                  <Button
                    variant={isDone ? "primary" : "secondary"}
                    block
                    onClick={goNext}
                    iconRight={<IconArrowRight size={17} />}
                  >
                    {next ? navLabel(next) : t.toProgram}
                  </Button>
                </div>
                {next?.status === "locked" && (
                  <span className="caption muted-3 row g6">
                    <IconLock size={14} />
                    {t.lockedNext}
                  </span>
                )}
              </section>

              {/* Вопросы под уроком */}
              <QuestionsSection lessonId={lessonId} />
            </div>

            {/* ===== Панель программы — десктоп ===== */}
            <aside className="lesson-side">
              <div className="stack g12" style={{ position: "sticky", top: 88 }}>
                <div className="card card-pad stack g8">
                  <div className="row between">
                    <strong className="small">{t.secProgram}</strong>
                    <span className="caption muted">{t.ofTotal(doneCount, totalCount)}</span>
                  </div>
                  <Progress value={percent} />
                </div>
                <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
                  <CourseProgram program={modules} courseId={courseId} activeItemId={l.id} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Шторка программы — мобильный */}
      <Sheet open={programOpen} onClose={() => setProgramOpen(false)} title={t.secProgram}>
        <div className="stack g12">
          <div className="row between">
            <span className="small muted">{t.progressDone}</span>
            <strong className="small">{t.ofTotal(doneCount, totalCount)}</strong>
          </div>
          <Progress value={percent} />
          <CourseProgram
            program={modules}
            courseId={courseId}
            activeItemId={l.id}
            onNavigate={() => setProgramOpen(false)}
          />
        </div>
      </Sheet>

      <TabBar />

      <style>{`
        .player-wrap { background: var(--player-bg); }
        .player-inner { max-width: var(--max-w); margin: 0 auto; }
        .lesson-layout { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: start; }
        .lesson-side { display: none; }
        .lesson-text { font-size: 17px; line-height: 28px; }
        .lesson-text h2 { margin-top: 8px; }
        .nav-row { flex-direction: column; }
        @media (min-width: 560px) { .nav-row { flex-direction: row; } }
        @media (min-width: 768px) {
          .player-inner { padding: 20px 24px 0; }
        }
        @media (min-width: 1024px) {
          .lesson-layout { grid-template-columns: minmax(0, 1fr) 340px; gap: 36px; }
          .lesson-side { display: block; }
          .program-btn { display: none; }
        }
        @media (max-width: 420px) {
          .download-label { display: none; }
        }
      `}</style>
    </>
  );
}

/* ============ Вопросы под уроком ============ */

const QUESTIONS_PER_PAGE = 20;
/** Длиннее 2000 символов сервер отдаёт 422 — не даём набрать заведомо лишнее. */
const TEXT_MAX = 2000;

/**
 * Секция вопросов: `GET /lessons/{id}/questions` со своей загрузкой, своей
 * ошибкой сети и своим пустым состоянием — урок при этом уже показан.
 *
 * Тред ровно в два уровня: вопрос и плоский список ответов. Признак «ждёт
 * ответа» — пустой `replies`, отдельного статуса у вопроса нет.
 */
function QuestionsSection({ lessonId }: { lessonId: string }) {
  const { t } = useLang();
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  /* Догруженные страницы: «Показать ещё» не перечитывает первую */
  const [more, setMore] = useState<ThreadQuestion[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const feed = useLoad(
    () =>
      api<QuestionsPage>(
        `/lessons/${encodeURIComponent(lessonId)}/questions${qs({
          page: 1,
          per_page: QUESTIONS_PER_PAGE,
        })}`,
      ),
    [lessonId],
  );

  /** Отказы у отправки одинаковые и у вопроса, и у ответа в треде. */
  const sendError = (e: unknown) => {
    if (isApiError(e, "rate_limited")) toast(t.qTooOften(e.retryAfterSec), "error");
    else if (isApiError(e) && e.status > 0) toast(e.message, "error");
    else toast(t.qSendError, "error");
  };

  const ask = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const created = await api<ThreadQuestion>(
        `/lessons/${encodeURIComponent(lessonId)}/questions`,
        { method: "POST", json: { text: body, parent_id: null } },
      );
      /* Свежие сверху — ровно как отдаёт сервер */
      feed.setData((d) => (d ? { ...d, items: [created, ...d.items], total: d.total + 1 } : d));
      setText("");
      toast(t.qSent, "success");
    } catch (e) {
      sendError(e);
    } finally {
      setSending(false);
    }
  };

  const reply = async (parentId: number, body: string) => {
    const created = await api<ThreadQuestion>(
      `/lessons/${encodeURIComponent(lessonId)}/questions`,
      { method: "POST", json: { text: body, parent_id: parentId } },
    );
    const add = (list: ThreadQuestion[]) =>
      list.map((q) => (q.id === parentId ? { ...q, replies: [...q.replies, created] } : q));
    feed.setData((d) => (d ? { ...d, items: add(d.items) } : d));
    setMore(add);
    toast(t.qReplySent, "success");
  };

  const questions = [...(feed.data?.items ?? []), ...more];
  const hasMore = feed.data ? questions.length < feed.data.total : false;

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await api<QuestionsPage>(
        `/lessons/${encodeURIComponent(lessonId)}/questions${qs({
          page: Math.floor((questions.length || 0) / QUESTIONS_PER_PAGE) + 1,
          per_page: QUESTIONS_PER_PAGE,
        })}`,
      );
      setMore((m) => [...m, ...next.items]);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="stack g16">
      <h2 className="h2">{t.secQuestions}</h2>

      <div className="card card-pad stack g10">
        <textarea
          className="input"
          placeholder={t.qAskPlaceholder}
          value={text}
          maxLength={TEXT_MAX}
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: 88 }}
          aria-label={t.secQuestions}
        />
        <div className="row between g10">
          <span className="caption muted-3">{t.qAskHint}</span>
          <Button size="sm" loading={sending} onClick={ask} disabled={!text.trim()}>
            {t.send}
          </Button>
        </div>
      </div>

      {feed.loading ? (
        <div className="stack g12">
          <div className="card card-pad stack g8">
            <Skeleton w="40%" h={14} />
            <Skeleton w="90%" h={14} />
          </div>
          <div className="card card-pad stack g8">
            <Skeleton w="35%" h={14} />
            <Skeleton w="80%" h={14} />
          </div>
        </div>
      ) : feed.error ? (
        <div className="card card-pad row between g10">
          <span className="small muted">{t.loadError}</span>
          <Button variant="secondary" size="sm" onClick={feed.reload}>
            {t.retry}
          </Button>
        </div>
      ) : questions.length === 0 ? (
        <div className="card">
          <Empty icon={<IconMessage size={34} />} title={t.qEmptyTitle} text={t.qEmptyText} />
        </div>
      ) : (
        <div className="stack g12">
          {questions.map((q) => (
            <QuestionThread key={q.id} question={q} onReply={reply} onError={sendError} />
          ))}
          {hasMore && (
            <Button variant="secondary" block loading={loadingMore} onClick={loadMore}>
              {t.showMore}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** Инициалы для аватара считает фронт — сервер отдаёт только ФИО. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** У админа профиль может быть не заполнен — пустой подписи на экране не место. */
function authorName(a: { author_name: string; author_is_admin: boolean }, admin: string): string {
  return a.author_name || (a.author_is_admin ? admin : "");
}

/**
 * Тред вопроса. Отвечать может админ и любой учитель с доступом к курсу —
 * «часто коллега отвечает быстрее». Вложенности второго уровня и лайков нет:
 * именно они превращают вопросы под уроком в форум с модерацией.
 */
function QuestionThread({
  question,
  onReply,
  onError,
}: {
  question: ThreadQuestion;
  onReply: (parentId: number, text: string) => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onReply(question.id, body);
      setDraft("");
      setOpen(false);
    } catch (e) {
      onError(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card card-pad stack g12">
      <div className="row g10">
        <Avatar initials={initialsOf(authorName(question, t.qAdmin))} size={36} tone="neutral" />
        <div className="grow" style={{ minWidth: 0 }}>
          <strong className="small">{authorName(question, t.qAdmin)}</strong>
          <div className="caption muted-3">{dayTime(question.created_at, lang)}</div>
        </div>
        {/* Ждёт ответа — это пустой `replies`, отдельного статуса нет */}
        {question.replies.length === 0 && <Badge kind="review">{t.qWaiting}</Badge>}
      </div>

      <p className="small pretty">{question.text}</p>

      {question.replies.length > 0 && (
        <div
          className="stack g12"
          style={{ borderLeft: "3px solid var(--border)", paddingLeft: 12, marginLeft: 4 }}
        >
          {question.replies.map((r) => (
            <div key={r.id} className="stack g4">
              <div className="row g8 wrap">
                <strong
                  className="caption"
                  style={{ color: r.author_is_admin ? "var(--primary)" : "var(--text)" }}
                >
                  {authorName(r, t.qAdmin)}
                </strong>
                {r.author_is_admin && <Badge kind="new">{t.qAdmin}</Badge>}
                <span className="caption muted-3">{dayTime(r.created_at, lang)}</span>
              </div>
              <p className="small pretty">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div className="stack g8">
          <textarea
            className="input"
            style={{ minHeight: 72 }}
            placeholder={t.qAnswerPlaceholder}
            value={draft}
            maxLength={TEXT_MAX}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row g8">
            <Button size="sm" loading={sending} disabled={!draft.trim()} onClick={send}>
              {t.qSendAnswer}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="row">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            {t.reply}
          </Button>
        </div>
      )}
    </div>
  );
}
