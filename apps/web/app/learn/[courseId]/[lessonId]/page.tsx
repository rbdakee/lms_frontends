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
 * Вопросы под уроком остаются на прототипе: их API появится своей сессией.
 */

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type FileLink,
  type Lesson,
  type LessonComplete,
  type LessonFile,
  type Program,
  type ProgramStatusItem,
} from "@lms/api";
import { lessonThreads, type LessonThread, type ThreadReply } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import { continueHref, CourseProgram } from "@/components/course/CourseProgram";
import { VideoPlayer } from "@/components/player/VideoPlayer";
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
import { fileSize } from "@lms/ui/i18n";
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
  const { t } = useStore();
  return (
    <>
      <BackHeader href={`/courses/${courseId}`} title={t.lesson} />
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
  return (
    <>
      <BackHeader href={`/courses/${courseId}`} title={title} />
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

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { t, toast, initials, fullName, addReply, repliesFor } = useStore();

  const [programOpen, setProgramOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<{ id: string; text: string }[]>([]);
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
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
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
            <LinkButton href={`/courses/${courseId}`} variant="secondary">
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
            <LinkButton href={`/courses/${courseId}`} variant="secondary">
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
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
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
    router.push(continueHref(courseId, next));
  };

  const submitQuestion = () => {
    if (!question.trim()) return;
    setAsked((a) => [{ id: `own-${a.length + 1}`, text: question.trim() }, ...a]);
    setQuestion("");
    toast("Вопрос отправлен — ответит администратор или коллега", "success");
  };

  /** Ответить в тред может админ и любой учитель с доступом к курсу */
  const sendReply = (threadId: string, text: string) => {
    addReply(threadId, {
      id: `${threadId}-r${Date.now()}`,
      author: fullName || "Вы",
      initials,
      role: "teacher",
      date: "только что",
      text,
    });
    toast("Ответ добавлен — его увидят все, кто откроет этот урок", "success");
  };

  return (
    <>
      <BackHeader
        href={`/courses/${courseId}`}
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
                    { label: t.secProgram, href: `/courses/${courseId}` },
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
                    onClick={() => prev && router.push(continueHref(courseId, prev))}
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
              <section className="stack g16">
                <h2 className="h2">{t.secQuestions}</h2>

                <div className="card card-pad stack g10">
                  <textarea
                    className="input"
                    placeholder="Задайте вопрос по этому уроку — ответит администратор или коллега"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    style={{ minHeight: 88 }}
                    aria-label="Ваш вопрос"
                  />
                  <div className="row between g10">
                    <span className="caption muted-3">Отвечаем в рабочие дни</span>
                    <Button size="sm" onClick={submitQuestion} disabled={!question.trim()}>
                      {t.send}
                    </Button>
                  </div>
                </div>

                <div className="stack g12">
                  {asked.map((q) => (
                    <div key={q.id} className="card card-pad stack g10">
                      <div className="row g10">
                        <Avatar initials={initials} size={36} />
                        <div className="grow">
                          <strong className="small">Вы</strong>
                          <div className="caption muted-3">только что</div>
                        </div>
                        <Badge kind="review">Ожидает ответа</Badge>
                      </div>
                      <p className="small pretty">{q.text}</p>
                    </div>
                  ))}

                  {lessonThreads.map((thread) => (
                    <QuestionThread
                      key={thread.id}
                      thread={thread}
                      replies={repliesFor(thread.id, thread.replies)}
                      onReply={(text) => sendReply(thread.id, text)}
                    />
                  ))}

                  {lessonThreads.length === 0 && asked.length === 0 && (
                    <div className="card">
                      <Empty
                        icon={<IconMessage size={34} />}
                        title="Пока вопросов нет"
                        text="Задайте первый — ответит администратор или коллега с этого курса"
                      />
                    </div>
                  )}
                </div>
              </section>
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
        .player-wrap { background: #0b1220; }
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

/* ============ Тред вопроса ============ */

/**
 * Под вопросом сколько угодно ответов, у каждого автор и дата.
 * Отвечать может админ и любой учитель с доступом к курсу.
 * Вложенности второго уровня и лайков нет — именно они превращают
 * вопросы под уроком в форум с модерацией.
 */
function QuestionThread({
  thread,
  replies,
  onReply,
}: {
  thread: LessonThread;
  replies: ThreadReply[];
  onReply: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="card card-pad stack g12">
      <div className="row g10">
        <Avatar initials={thread.initials} size={36} tone="neutral" />
        <div className="grow" style={{ minWidth: 0 }}>
          <strong className="small">{thread.author}</strong>
          <div className="caption muted-3">{thread.date}</div>
        </div>
        {replies.length === 0 && <Badge kind="review">Ожидает ответа</Badge>}
      </div>

      <p className="small pretty">{thread.text}</p>

      {replies.length > 0 && (
        <div className="stack g12" style={{ borderLeft: "3px solid var(--border)", paddingLeft: 12, marginLeft: 4 }}>
          {replies.map((r) => (
            <div key={r.id} className="stack g4">
              <div className="row g8 wrap">
                <strong
                  className="caption"
                  style={{ color: r.role === "admin" ? "var(--primary)" : "var(--text)" }}
                >
                  {r.author}
                </strong>
                {r.role === "admin" && <Badge kind="new">Администратор</Badge>}
                <span className="caption muted-3">{r.date}</span>
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
            placeholder="Ваш ответ увидят все, кто откроет этот урок"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row g8">
            <Button
              size="sm"
              disabled={!draft.trim()}
              onClick={() => {
                onReply(draft.trim());
                setDraft("");
                setOpen(false);
              }}
            >
              Отправить ответ
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="row">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            Ответить
          </Button>
        </div>
      )}
    </div>
  );
}
