"use client";

/**
 * Плеер урока «/learn/:courseId/:lessonId» — раздел 5.7 брифа, главный экран продукта.
 * Десктоп: контент ~70% + липкая программа справа. Мобильный: видео сверху,
 * программа — в шторке по кнопке.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  allLessons,
  getCourse,
  getLesson,
  lessonMaterials,
  lessonThreads,
  moduleOfLesson,
  type LessonThread,
  type ThreadReply,
} from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import { Program, lessonHref } from "@/components/course/Program";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Empty,
  FileRow,
  LinkButton,
  Note,
  Progress,
  Sheet,
} from "@lms/ui";
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

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const {
    t,
    completed,
    completeLesson,
    toast,
    initials,
    fullName,
    isEnrolled,
    isStrict,
    addReply,
    repliesFor,
  } = useStore();

  const [watched, setWatched] = useState(0);
  const [programOpen, setProgramOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<{ id: string; text: string }[]>([]);
  /** Состояния плеера, которые иначе не поймать руками */
  const [playerState, setPlayerState] = useState<"ok" | "stalled" | "error">("ok");

  const course = getCourse(courseId);
  const lesson = course ? getLesson(course, lessonId) : undefined;

  if (!course || !lesson) {
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title="Урок" />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title="Урок не найден"
              text="Возможно, урок удалён или ссылка устарела."
              action={
                <LinkButton href={`/courses/${courseId}`} variant="secondary">
                  К программе курса
                </LinkButton>
              }
            />
          </div>
        </main>
        <TabBar />
      </>
    );
  }

  const lessons = allLessons(course);
  const done = completed[course.id] ?? [];
  const isDone = done.includes(lesson.id);
  const mod = moduleOfLesson(course, lesson.id);
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? lessons[idx - 1] : undefined;
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : undefined;
  const strict = isStrict(course.id);
  const nextLocked = !!next && !isDone && strict;
  const enrolled = isEnrolled(course.id);

  const markDone = () => {
    completeLesson(course.id, lesson.id);
    toast("Урок отмечен как пройденный", "success");
  };

  const goNext = () => {
    if (!next) {
      router.push(`/courses/${course.id}`);
      return;
    }
    if (nextLocked) {
      toast("Завершите текущий урок, чтобы открыть следующий");
      return;
    }
    router.push(lessonHref(course.id, next));
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

  const progressPct = Math.round((done.length / lessons.length) * 100);

  return (
    <>
      <BackHeader
        href={`/courses/${course.id}`}
        title={lesson.title}
        subtitle={`${t.lessonOf(lesson.n, lessons.length)} · ${mod?.title ?? ""}`}
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
        {lesson.kind === "video" && (
          <div className="player-wrap">
            <div className="player-inner">
              <VideoPlayer
                title={lesson.title}
                lessonLabel={t.lessonOf(lesson.n, lessons.length)}
                durationLabel={lesson.duration}
                resumeAt={isDone ? 0 : 272}
                onProgress={setWatched}
                stalled={playerState === "stalled"}
                error={playerState === "error"}
                onRetry={() => {
                  setPlayerState("ok");
                  toast("Ссылка обновлена — продолжаем с того же места", "success");
                }}
              />
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
                    { label: course.title, href: `/courses/${course.id}` },
                    { label: mod?.title ?? "" },
                  ]}
                />
                <div className="row between wrap g12">
                  <h1 className="h1 pretty">{lesson.title}</h1>
                  {isDone ? (
                    <Badge kind="done" icon={<IconCheck size={13} />}>
                      {t.lessonDone}
                    </Badge>
                  ) : (
                    <Badge kind="neutral">{t.lessonOf(lesson.n, lessons.length)}</Badge>
                  )}
                </div>
              </header>

              {!enrolled && (
                <Note kind="warning">
                  Доступ к курсу ещё не открыт — прогресс не сохранится.{" "}
                  <Link href={`/courses/${course.id}`} style={{ fontWeight: 700 }}>
                    Оставить заявку
                  </Link>
                </Note>
              )}

              {/* Прототипные переключатели состояний плеера */}
              {lesson.kind === "video" && (
                <div className="row wrap g8 caption muted-3">
                  <span>Состояния плеера для проверки:</span>
                  <button
                    className="chip"
                    data-active={playerState === "stalled" || undefined}
                    onClick={() => setPlayerState(playerState === "stalled" ? "ok" : "stalled")}
                  >
                    Не удалось продолжить
                  </button>
                  <button
                    className="chip"
                    data-active={playerState === "error" || undefined}
                    onClick={() => setPlayerState(playerState === "error" ? "ok" : "error")}
                  >
                    Видео недоступно
                  </button>
                </div>
              )}

              {/* Текст урока */}
              <article className="lesson-text stack g16">
                <p>
                  Google Формы позволяют собрать проверочный тест за несколько минут.
                  В этом уроке создадим тест из пяти вопросов с автоматической проверкой
                  и посмотрим, как ученики видят его на телефоне.
                </p>

                <h2 className="h2">Ключевые шаги</h2>
                <ol className="stack g8" style={{ paddingLeft: 22 }}>
                  <li>Создать форму и включить режим теста</li>
                  <li>Добавить вопросы и отметить правильные ответы</li>
                  <li>Назначить баллы за каждый вопрос</li>
                  <li>Отправить ссылку в Google Класс</li>
                </ol>

                <blockquote className="note note-info" style={{ fontSize: 15 }}>
                  <div>
                    <strong>Совет:</strong> делайте первый вопрос простым — это снижает
                    тревожность и настраивает класс на работу.
                  </div>
                </blockquote>

                <p>
                  Если ученики заходят без Google-аккаунта, в настройках формы нужно
                  отключить «Требовать вход в аккаунт». Иначе часть класса не сможет
                  открыть тест с домашнего устройства.
                </p>
              </article>

              {/* Материалы */}
              <section className="stack g12">
                <h2 className="h2">{t.secMaterials}</h2>
                <div className="stack g8">
                  {lessonMaterials.map((f) => (
                    <FileRow
                      key={f.name}
                      type={f.type}
                      name={f.name}
                      size={f.size}
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<IconDownload size={16} />}
                          onClick={() => toast(`Файл «${f.name}» скачивается`, "success")}
                        >
                          <span className="download-label">{t.download}</span>
                        </Button>
                      }
                    />
                  ))}
                </div>
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
                  <div className="stack g8">
                    <Button block size="lg" onClick={markDone} icon={<IconCheck size={18} />}>
                      {t.markDone}
                    </Button>
                    {lesson.kind === "video" && watched > 0 && (
                      <div className="row g10">
                        <Progress value={watched * 100} />
                        <span className="caption muted-3 nowrap">
                          просмотрено {Math.round(watched * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="row g10 nav-row">
                  <Button
                    variant="secondary"
                    block
                    disabled={!prev}
                    onClick={() => prev && router.push(lessonHref(course.id, prev))}
                    icon={<IconArrowLeft size={17} />}
                  >
                    Предыдущий урок
                  </Button>
                  <Button
                    variant={isDone ? "primary" : "secondary"}
                    block
                    onClick={goNext}
                    iconRight={<IconArrowRight size={17} />}
                  >
                    {next ? "Следующий урок" : "К программе курса"}
                  </Button>
                </div>
                {nextLocked && (
                  <span className="caption muted-3 row g6">
                    <IconLock size={14} />
                    Завершите текущий урок, чтобы открыть следующий
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
                    <span className="caption muted">
                      {done.length} из {lessons.length}
                    </span>
                  </div>
                  <Progress value={progressPct} />
                </div>
                <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
                  <Program course={course} activeLessonId={lesson.id} strict={strict} compact />
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
            <span className="small muted">Пройдено уроков</span>
            <strong className="small">
              {done.length} из {lessons.length}
            </strong>
          </div>
          <Progress value={progressPct} />
          <Program
            course={course}
            activeLessonId={lesson.id}
            strict={strict}
            compact
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
