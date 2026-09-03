"use client";

/**
 * Тест «/learn/:courseId/quiz/:id» — раздел 5.8 брифа.
 *
 * Один запрос `GET /quizzes/{id}` отдаёт и правила теста, и состояние
 * (`state.status`), из которого экран выбирает, что рисовать: стартовую
 * карточку, прохождение или результат. Вопросы приходят только внутри
 * активной попытки, правильных ответов в них нет — балл на клиенте
 * не считается нигде.
 *
 * Время считает сервер: `remaining_sec` — точка отсчёта, таймер на экране
 * только показывает остаток и на нуле сам зовёт `finish`. Каждый выбор
 * варианта уходит отдельным `POST .../answers`: попытка бывает единственной,
 * терять ответы недопустимо. Поэтому же перезагрузка страницы не ломает
 * прохождение — `in_progress` возвращает попытку с сохранёнными ответами.
 */

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AnswerIn,
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
  type QuizResult,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useChrome, useRoutes } from "../host";
import { ScoreRing } from "../components/ScoreRing";
import { AttemptsHistory } from "../components/Attempts";
import {
  Badge,
  Button,
  Empty,
  LinkButton,
  Note,
  Progress,
  Sheet,
  Skeleton,
} from "@lms/ui";
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconInfo,
  IconQuiz,
} from "@lms/ui/icons";

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Экран без содержимого: не найдено, доступ закрыт, ошибка сети. */
function QuizState({
  courseId,
  title,
  text,
  action,
}: {
  courseId: string;
  title: string;
  text?: string;
  action: React.ReactNode;
}) {
  const { t } = useLang();
  const routes = useRoutes();
  const { BackHeader, TabBar } = useChrome();
  return (
    <>
      <BackHeader href={routes.course(courseId)} title={t.quiz} />
      <main className="page section has-tabbar">
        <div className="card">
          <Empty title={title} text={text} action={action} />
        </div>
      </main>
      <TabBar />
    </>
  );
}

function QuizSkeleton({ courseId, title }: { courseId: string; title: string }) {
  const routes = useRoutes();
  const { BackHeader, TabBar } = useChrome();
  return (
    <>
      <BackHeader href={routes.course(courseId)} title={title} />
      <main className="page section has-tabbar stack g20" style={{ paddingTop: 24 }}>
        <Skeleton w="60%" h={28} />
        <Skeleton h={92} r={14} />
        <Skeleton h={120} r={14} />
        <Skeleton h={48} r={12} />
      </main>
      <TabBar />
    </>
  );
}

export function QuizScreen({ courseId, quizId: id }: { courseId: string; quizId: string }) {
  const routes = useRoutes();
  const { BackHeader, TabBar } = useChrome();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const toast = useToast();

  const quiz = useLoad(() => api<Quiz>(`/quizzes/${encodeURIComponent(id)}`), [id]);

  /** Активная попытка: из `state.in_progress` или из ответа «Начать тест» */
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [qi, setQi] = useState(0);
  /** Остаток по таймеру; `null` — у теста нет лимита времени */
  const [left, setLeft] = useState<number | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /** Момент, когда истекает серверное время: тик считаем от него, а не суммой */
  const deadline = useRef<number | null>(null);
  /** `finish` зовётся один раз — и по кнопке, и по нулю на таймере */
  const finishSent = useRef(false);

  const toLogin = useCallback(
    () => router.replace(routes.login(pathname)),
    [pathname, router],
  );

  const openAttempt = useCallback((a: QuizAttempt) => {
    const saved: Record<number, number[]> = {};
    for (const ans of a.answers) saved[ans.question_id] = ans.option_ids;
    setAttempt(a);
    setAnswers(saved);
    setQi(0);
    finishSent.current = false;
    deadline.current = a.remaining_sec === null ? null : Date.now() + a.remaining_sec * 1000;
    setLeft(a.remaining_sec);
  }, []);

  /* Незавершённая попытка главнее прочих состояний: вернулся на экран —
     тест продолжается с того же места и с тем же остатком времени */
  const state = quiz.data?.state;
  useEffect(() => {
    if (state?.status === "in_progress") openAttempt(state.attempt);
  }, [state, openAttempt]);

  const finish = useCallback(async () => {
    if (!attempt || finishSent.current) return;
    finishSent.current = true;
    setFinishing(true);
    try {
      await api<QuizResult>(`/quiz_attempts/${attempt.id}/finish`, { method: "POST" });
      router.push(routes.quizResult(courseId, id));
    } catch (e) {
      /* Не дошло — попытка всё ещё идёт, кнопку разблокируем */
      finishSent.current = false;
      if (isApiError(e, "unauthorized")) toLogin();
      else if (isApiError(e) && e.status > 0) toast(e.message, "error");
      else toast(t.finishQuizError, "error");
    } finally {
      setFinishing(false);
    }
  }, [attempt, courseId, id, router, t, toLogin, toast]);

  /* Таймер только показывает серверный остаток; на нуле тест сдаётся сам */
  useEffect(() => {
    if (!attempt || deadline.current === null) return;
    const tick = setInterval(() => {
      const sec = Math.max(0, Math.round((deadline.current! - Date.now()) / 1000));
      setLeft(sec);
      if (sec === 0) void finish();
    }, 1000);
    return () => clearInterval(tick);
  }, [attempt, finish]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const a = await api<QuizAttempt>(
        `/quizzes/${encodeURIComponent(id)}/quiz_attempts`,
        { method: "POST" },
      );
      openAttempt(a);
    } catch (e) {
      if (isApiError(e, "unauthorized")) toLogin();
      /* attempt_used, certificate_issued, quiz_empty — объясняет сервер */
      else if (isApiError(e) && e.status > 0) toast(e.message, "error");
      else toast(t.startQuizError, "error");
    } finally {
      setStarting(false);
    }
  };

  /** Ответ уходит на каждый выбор: единственную попытку переспросить негде */
  const saveAnswer = async (attemptId: number, body: AnswerIn) => {
    try {
      await api<void>(`/quiz_attempts/${attemptId}/answers`, { method: "POST", json: body });
    } catch (e) {
      if (isApiError(e, "time_expired")) {
        void finish();
      } else if (isApiError(e, "attempt_finished")) {
        router.replace(routes.quizResult(courseId, id));
      } else if (isApiError(e, "unauthorized")) {
        toLogin();
      } else {
        /* Выбор на экране остаётся — человек может нажать ещё раз */
        toast(isApiError(e) && e.status > 0 ? e.message : t.answerSaveError, "error");
      }
    }
  };

  const pick = (q: QuizQuestion, optionId: number) => {
    if (!attempt) return;
    const cur = answers[q.id] ?? [];
    /* Несколько вариантов только у multi; снятие последней галочки шлётся
       пустым списком — это и есть «ответ снят» */
    const next =
      q.type === "multi"
        ? cur.includes(optionId)
          ? cur.filter((x) => x !== optionId)
          : [...cur, optionId]
        : [optionId];
    setAnswers((a) => ({ ...a, [q.id]: next }));
    void saveAnswer(attempt.id, { question_id: q.id, option_ids: next });
  };

  useEffect(() => {
    if (quiz.error?.code === "unauthorized") toLogin();
  }, [quiz.error, toLogin]);

  if (quiz.error?.code === "unauthorized") {
    return <QuizSkeleton courseId={courseId} title={t.quiz} />;
  }

  if (quiz.error && !quiz.data) {
    if (quiz.error.code === "forbidden") {
      return (
        <QuizState
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
    if (quiz.error.status === 404 || quiz.error.status === 422) {
      return (
        <QuizState
          courseId={courseId}
          title={t.quizNotFound}
          text={t.quizNotFoundText}
          action={
            <LinkButton href={routes.course(courseId)} variant="secondary">
              {t.toCourse}
            </LinkButton>
          }
        />
      );
    }
    return (
      <QuizState
        courseId={courseId}
        title={t.loadError}
        text={t.loadErrorText}
        action={
          <Button variant="secondary" onClick={quiz.reload}>
            {t.retry}
          </Button>
        }
      />
    );
  }

  /* Попытку из `in_progress` подхватывает эффект — до него рисовать стартовую
     карточку нельзя: человек увидел бы «Начать тест» поверх идущей попытки */
  if (!quiz.data || (quiz.data.state.status === "in_progress" && !attempt)) {
    return <QuizSkeleton courseId={courseId} title={t.quiz} />;
  }

  const q = quiz.data;
  const limitLabel = q.time_limit_min ? t.minShort(q.time_limit_min) : t.noTimeLimit;

  /* ===== Прохождение ===== */
  if (attempt) {
    const question = attempt.questions[qi];
    const total = attempt.questions.length;
    const selected = question ? (answers[question.id] ?? []) : [];
    const answeredCount = attempt.questions.filter(
      (x) => (answers[x.id] ?? []).length > 0,
    ).length;
    const unanswered = attempt.questions.findIndex((x) => (answers[x.id] ?? []).length === 0);
    const lowTime = left !== null && left <= 120;

    /* Одни и те же кнопки в двух местах: липкая панель живёт только
       на мобильном (`.sticky-cta` скрыт с 1024px), десктопу — ряд в потоке */
    const navButtons = (
      <>
        <Button
          variant="secondary"
          disabled={qi === 0}
          onClick={() => setQi((i) => i - 1)}
          icon={<IconArrowLeft size={17} />}
        >
          {t.back}
        </Button>
        {qi < total - 1 ? (
          <Button
            block
            onClick={() => setQi((i) => i + 1)}
            iconRight={<IconArrowRight size={17} />}
          >
            {t.next}
          </Button>
        ) : (
          <Button block loading={finishing} onClick={() => setConfirmFinish(true)}>
            {t.finishQuiz}
          </Button>
        )}
      </>
    );

    /* Вопросов в попытке нет — сервер такую не отдаёт (это `quiz_empty`),
       но и падать на пустом массиве экран не должен */
    if (!question) {
      return (
        <QuizState
          courseId={courseId}
          title={t.loadError}
          text={t.loadErrorText}
          action={
            <Button variant="secondary" onClick={quiz.reload}>
              {t.retry}
            </Button>
          }
        />
      );
    }

    return (
      <>
        <header className="appbar">
          <div className="page appbar-inner g12">
            <div className="grow stack g4" style={{ minWidth: 0 }}>
              <strong className="small">{t.questionOf(qi + 1, total)}</strong>
              <Progress value={((qi + 1) / total) * 100} />
            </div>
            {left !== null && (
              <span
                className="row g6 nowrap"
                style={{
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  color: lowTime ? "var(--danger)" : "var(--text)",
                  background: lowTime ? "var(--danger-bg)" : "var(--surface-muted)",
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: 15,
                }}
              >
                <IconClock size={17} />
                {fmtTime(left)}
              </span>
            )}
          </div>
        </header>

        <main className="has-sticky-cta">
          <div className="page section" style={{ paddingTop: 20 }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }} className="stack g20">
              {lowTime && <Note kind="danger">{t.lowTimeNote}</Note>}

              <h1 className="h2 pretty">{question.text}</h1>

              <div className="stack g10">
                {question.options.map((opt) => {
                  const on = selected.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => pick(question, opt.id)}
                      className="card"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: 16,
                        minHeight: 60,
                        textAlign: "left",
                        cursor: "pointer",
                        borderColor: on ? "var(--primary)" : "var(--border)",
                        background: on ? "var(--primary-bg)" : "var(--card)",
                        boxShadow: on ? "var(--ring-primary-sm)" : "var(--shadow)",
                        transition: "all .14s",
                      }}
                      aria-pressed={on}
                    >
                      <span
                        className={`check-box ${question.type === "multi" ? "" : "round"}`}
                        style={{
                          background: on ? "var(--primary)" : "var(--card)",
                          borderColor: on ? "var(--primary)" : "var(--border-strong)",
                          marginTop: 0,
                        }}
                      >
                        {on && <IconCheck size={14} />}
                      </span>
                      <span className="grow" style={{ fontSize: 16, lineHeight: "24px" }}>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {question.type === "multi" && (
                <span className="caption muted-3">{t.multiHint}</span>
              )}

              <div className="row center g6 caption muted-3">
                <IconCheckCircle size={14} />
                {t.autosaveHint}
              </div>

              {/* Точки-навигация */}
              <div className="row wrap center g6">
                {attempt.questions.map((x, i) => {
                  const ans = (answers[x.id] ?? []).length > 0;
                  return (
                    <button
                      key={x.id}
                      onClick={() => setQi(i)}
                      aria-label={t.questionN(i + 1)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        border: i === qi ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: ans ? "var(--primary)" : "var(--card)",
                        color: ans ? "var(--text-on-fill)" : "var(--text-3)",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="desktop-only">
                <div className="row g10">{navButtons}</div>
              </div>
            </div>
          </div>
        </main>

        <div className="sticky-cta no-tabbar">
          <div className="sticky-cta-inner row g10" style={{ maxWidth: 720 }}>
            {navButtons}
          </div>
        </div>

        <Sheet
          open={confirmFinish}
          onClose={() => setConfirmFinish(false)}
          title={t.finishQuizTitle}
          footer={
            <div className="stack g8">
              <Button
                block
                size="lg"
                loading={finishing}
                onClick={() => {
                  setConfirmFinish(false);
                  void finish();
                }}
              >
                {t.finishQuiz}
              </Button>
              {unanswered >= 0 && (
                <Button
                  block
                  variant="secondary"
                  onClick={() => {
                    setQi(unanswered);
                    setConfirmFinish(false);
                  }}
                >
                  {t.backToQuestion(unanswered + 1)}
                </Button>
              )}
            </div>
          }
        >
          <div className="stack g12">
            <div className="row between">
              <span className="small muted">{t.answered}</span>
              <strong>{t.ofTotal(answeredCount, total)}</strong>
            </div>
            {unanswered >= 0 && <Note kind="warning">{t.unansweredNote(unanswered + 1)}</Note>}
            <Note kind="muted" icon={<IconAlert size={18} />}>
              <span className="small">{t.finishWarn}</span>
            </Note>
          </div>
        </Sheet>
      </>
    );
  }

  /* ===== Тест уже сдан: результат зачётной попытки ===== */
  if (q.state.status === "finished") {
    const r = q.state.result;
    return (
      <>
        <BackHeader href={routes.course(courseId)} title={q.title} subtitle={t.quiz} />
        <main className="page section has-tabbar" style={{ paddingTop: 24 }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }} className="stack g20">
            <div
              className="card card-pad stack g16"
              style={{ alignItems: "center", textAlign: "center" }}
            >
              <ScoreRing pct={r.score_percent} passed={r.passed} />
              <div className="stack g4">
                <h1 className="h2">{r.passed ? t.quizPassed : t.quizFailed}</h1>
                <span className="small muted">
                  {t.scoreOf(r.score, r.max_score)} · {t.passScore(r.pass_score)} ·{" "}
                  {t.minShort(r.minutes_spent)}
                </span>
              </div>

              {q.state.review_available && (
                <LinkButton href={routes.quizResult(courseId, id)} block size="lg">
                  {t.quizReview}
                </LinkButton>
              )}

              {q.state.can_retake ? (
                <div className="stack g6" style={{ width: "100%" }}>
                  <Button block variant="secondary" loading={starting} onClick={start}>
                    {t.retakeQuiz}
                  </Button>
                  <span className="caption muted-3">{t.countedLast}</span>
                </div>
              ) : (
                <span className="caption muted-3">
                  {q.retakable ? t.quizClosedByCert : t.attemptUsed}
                </span>
              )}
            </div>

            {r.timed_out && (
              <Note kind="warning" icon={<IconClock size={18} />}>
                {t.timedOutNote}
              </Note>
            )}

            <AttemptsHistory attempts={q.attempts} retakable={q.retakable} />

            <LinkButton href={routes.course(courseId)} variant="secondary" block>
              {t.toCourse}
            </LinkButton>
          </div>
        </main>
        <TabBar />
      </>
    );
  }

  /* ===== Стартовая карточка ===== */
  /* `not_started` — завершённых попыток нет вовсе, историю показывать нечего */
  const canStart = q.state.status === "not_started" && q.state.can_start;
  /* Ошибку не исправить — у непересдаваемого спрашиваем подтверждение */
  const onStartClick = () => (q.retakable ? void start() : setConfirmStart(true));

  return (
    <>
      <BackHeader href={routes.course(courseId)} title={q.title} subtitle={t.quiz} />
      <main
        className={canStart ? "page section has-sticky-cta" : "page section has-tabbar"}
        style={{ paddingTop: 24 }}
      >
        <div style={{ maxWidth: 620, margin: "0 auto" }} className="stack g20">
          <div className="stack g12" style={{ alignItems: "center", textAlign: "center" }}>
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "var(--primary-bg)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconQuiz size={32} />
            </span>
            <h1 className="h1">{q.title}</h1>
            <div className="row center wrap g8">
              <Badge kind={q.retakable ? "neutral" : "progress"}>
                {q.retakable ? t.retakableQuiz : t.oneAttempt}
              </Badge>
              {q.is_final && <Badge kind="new">{t.finalQuiz}</Badge>}
            </div>
          </div>

          <div className="quiz-stats">
            {[
              { v: String(q.questions_count), l: t.statQuestions },
              { v: limitLabel, l: t.statTimeLimit },
              { v: `${q.pass_score}%`, l: t.statPassScore },
            ].map((s) => (
              <div key={s.l} className="card card-pad stack g4" style={{ alignItems: "center" }}>
                <strong style={{ fontSize: 20, letterSpacing: "-0.02em" }}>{s.v}</strong>
                <span className="caption muted">{s.l}</span>
              </div>
            ))}
          </div>

          <span className="caption muted-3" style={{ textAlign: "center" }}>
            {t.maxScoreNote(q.max_score)}
          </span>

          {/* Режим теста читается до старта, а не после провала */}
          {q.retakable ? (
            <Note kind="muted" icon={<IconInfo size={18} />}>
              <span className="small">{t.retakableText}</span>
            </Note>
          ) : (
            <Note kind="warning">
              <strong style={{ display: "block", marginBottom: 4 }}>{t.oneAttemptTitle}</strong>
              {t.oneAttemptText}
            </Note>
          )}

          <Note kind="muted" icon={<IconClock size={18} />}>
            <span className="small">{q.time_limit_min ? t.timerNote : t.noTimerNote}</span>
          </Note>

          {!canStart && <Note kind="success">{t.quizClosedByCert}</Note>}

          {canStart && (
            <div className="desktop-only">
              <Button block size="lg" loading={starting} onClick={onStartClick}>
                {t.startQuiz}
              </Button>
            </div>
          )}
        </div>
      </main>

      {canStart && (
        <div className="sticky-cta mobile-only">
          <div className="sticky-cta-inner">
            <Button block size="lg" loading={starting} onClick={onStartClick}>
              {t.startQuiz}
            </Button>
          </div>
        </div>
      )}

      {/* Модалка подтверждения — только там, где ошибку не исправить */}
      <Sheet
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        title={t.confirmStartTitle}
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              loading={starting}
              onClick={() => {
                setConfirmStart(false);
                void start();
              }}
            >
              {t.startNow}
            </Button>
            <Button block variant="secondary" onClick={() => setConfirmStart(false)}>
              {t.notNow}
            </Button>
          </div>
        }
      >
        <Note kind="warning">{t.confirmStartText}</Note>
      </Sheet>

      <TabBar />
      <style>{`
        .quiz-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      `}</style>
    </>
  );
}
