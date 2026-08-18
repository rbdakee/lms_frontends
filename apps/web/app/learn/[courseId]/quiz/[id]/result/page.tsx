"use client";

/**
 * Результат теста и разбор ответов — раздел 5.8 брифа.
 *
 * Экран читает то же `GET /quizzes/{id}`: результат — это `state.finished`,
 * и другого источника у него нет. Нет завершённых попыток — смотреть нечего,
 * уводим на прохождение. Разбор приходит отдельным запросом и только когда
 * сервер его разрешил (`review_available`): правильные ответы впервые выходят
 * наружу именно здесь, сверять с чем-то на клиенте нечего.
 */

import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  useLoad,
  type Quiz,
  type QuizReview,
  type QuizReviewQuestion,
} from "@lms/api";
import { useStore } from "@lms/prototype";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import { Badge, Button, Empty, LinkButton, Note, Skeleton } from "@lms/ui";
import { ScoreRing } from "@/components/course/ScoreRing";
import { AttemptsHistory } from "@/components/course/Attempts";
import { IconAlert, IconCheck, IconClock, IconClose } from "@lms/ui/icons";

export default function QuizResultPage() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useStore();
  const [showReview, setShowReview] = useState(false);

  const quiz = useLoad(() => api<Quiz>(`/quizzes/${encodeURIComponent(id)}`), [id]);

  const state = quiz.data?.state;
  const finished = state?.status === "finished" ? state : null;
  const attemptId = finished?.result.id ?? null;
  const canReview = finished?.review_available ?? false;

  /* Разбор просим сразу вместе с результатом: экран у них один, и кнопка
     «Разбор ответов» не должна ждать ещё один круг запросов. */
  const review = useLoad(
    () =>
      attemptId !== null && canReview
        ? api<QuizReview>(`/quiz_attempts/${attemptId}/review`)
        : Promise.resolve(null),
    [attemptId, canReview],
  );

  /* Сервер закрыл разбор — это не ошибка экрана: остаётся один результат */
  const reviewClosed = review.error?.code === "review_unavailable";

  const toLogin = useCallback(
    () => router.replace(`/login?next=${encodeURIComponent(pathname)}`),
    [pathname, router],
  );

  useEffect(() => {
    if (reviewClosed) setShowReview(false);
  }, [reviewClosed]);

  useEffect(() => {
    if (quiz.error?.code === "unauthorized") toLogin();
  }, [quiz.error, toLogin]);

  /* Завершённых попыток нет — результата тоже: показывать нечего, ведём
     на экран теста, где человек его начнёт или продолжит */
  useEffect(() => {
    if (quiz.data && !finished) {
      router.replace(`/learn/${courseId}/quiz/${id}`);
    }
  }, [quiz.data, finished, router, courseId, id]);

  if (quiz.error && !quiz.data && quiz.error.code !== "unauthorized") {
    const notFound = quiz.error.status === 404 || quiz.error.status === 422;
    const forbidden = quiz.error.code === "forbidden";
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title={t.quizResult} />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title={
                forbidden ? t.accessClosedTitle : notFound ? t.quizNotFound : t.loadError
              }
              text={
                forbidden
                  ? t.accessClosedText
                  : notFound
                    ? t.quizNotFoundText
                    : t.loadErrorText
              }
              action={
                forbidden || notFound ? (
                  <LinkButton href={`/courses/${courseId}`} variant="secondary">
                    {t.toCourse}
                  </LinkButton>
                ) : (
                  <Button variant="secondary" onClick={quiz.reload}>
                    {t.retry}
                  </Button>
                )
              }
            />
          </div>
        </main>
        <TabBar />
      </>
    );
  }

  if (!quiz.data || !finished) {
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title={t.quizResult} />
        <main className="page section has-tabbar stack g20" style={{ paddingTop: 24 }}>
          <Skeleton h={180} r={14} />
          <Skeleton h={96} r={14} />
          <Skeleton h={48} r={12} />
        </main>
        <TabBar />
      </>
    );
  }

  const q = quiz.data;
  const r = finished.result;

  return (
    <>
      <BackHeader
        href={`/courses/${courseId}`}
        title={showReview ? t.quizReview : t.quizResult}
        subtitle={q.title}
      />

      <main className="page section has-tabbar" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }} className="stack g20">
          {!showReview ? (
            <>
              <div
                className="card card-pad stack g20"
                style={{ alignItems: "center", textAlign: "center", padding: "32px 20px" }}
              >
                <ScoreRing pct={r.score_percent} passed={r.passed} />

                <div className="stack g6">
                  <h1 className="h1">{r.passed ? t.quizPassed : t.quizFailed}</h1>
                  <span className="body muted">
                    {t.scoreOf(r.score, r.max_score)} · {t.passScore(r.pass_score)}
                  </span>
                </div>

                <div className="result-stats">
                  {[
                    { v: `${r.score} / ${r.max_score}`, l: t.statPoints },
                    { v: `${r.pass_score}%`, l: t.statPassShort },
                    { v: t.minShort(r.minutes_spent), l: t.statSpent },
                  ].map((s) => (
                    <div key={s.l} className="stack g4" style={{ alignItems: "center" }}>
                      <strong style={{ fontSize: 18 }}>{s.v}</strong>
                      <span className="caption muted-3">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {r.timed_out && (
                <Note kind="warning" icon={<IconClock size={18} />}>
                  {t.timedOutNote}
                </Note>
              )}

              <div className="stack g10">
                {canReview && !reviewClosed && (
                  <Button block size="lg" onClick={() => setShowReview(true)}>
                    {t.quizReview}
                  </Button>
                )}
                {finished.can_retake && (
                  <LinkButton
                    href={`/learn/${courseId}/quiz/${id}`}
                    block
                    variant="secondary"
                  >
                    {t.retakeQuiz}
                  </LinkButton>
                )}
                <LinkButton href={`/courses/${courseId}`} block variant="secondary">
                  {t.toCourse}
                </LinkButton>
              </div>

              {/* История попыток — под результатом, зачётная помечена сервером */}
              <AttemptsHistory attempts={q.attempts} retakable={q.retakable} />
            </>
          ) : (
            <>
              <div className="card card-pad row between g12">
                <div className="stack g4">
                  <strong>{q.title}</strong>
                  <span className="caption muted">
                    {t.scoreOf(r.score, r.max_score)} · {r.score_percent}%
                  </span>
                </div>
                <Badge kind={r.passed ? "accepted" : "rework"}>
                  {r.passed ? t.quizPassed : t.quizFailed}
                </Badge>
              </div>

              {review.loading && <Skeleton h={220} r={14} />}

              {review.error && !reviewClosed && (
                <Note kind="muted">
                  <div className="stack g8">
                    <span className="small">{t.loadError}</span>
                    <div className="row">
                      <Button size="sm" variant="secondary" onClick={review.reload}>
                        {t.retry}
                      </Button>
                    </div>
                  </div>
                </Note>
              )}

              {review.data && (
                <div className="stack g16">
                  {review.data.questions.map((question, i) => (
                    <ReviewQuestion key={question.id} question={question} index={i} />
                  ))}
                </div>
              )}

              <div className="stack g10">
                <Button block variant="secondary" onClick={() => setShowReview(false)}>
                  {t.toResult}
                </Button>
                <LinkButton href={`/courses/${courseId}`} block>
                  {t.toCourse}
                </LinkButton>
              </div>
            </>
          )}
        </div>
      </main>

      <TabBar />

      <style>{`
        .result-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; width: 100%; padding-top: 16px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </>
  );
}

/**
 * Вопрос в разборе. Подсветка — комбинация двух серверных флагов:
 * `is_correct` (как надо было) и `is_chosen` (как ответил человек).
 * Балл за вопрос тоже серверный — `earned_points`.
 */
function ReviewQuestion({
  question,
  index,
}: {
  question: QuizReviewQuestion;
  index: number;
}) {
  const { t } = useStore();
  const right = question.earned_points === question.points && question.points > 0;

  return (
    <div
      className="card card-pad stack g12"
      style={{ borderColor: right ? "#bbf7d0" : "#fecaca", borderWidth: 1.5 }}
    >
      <div className="row between wrap g8">
        <span className="caption muted-3" style={{ textTransform: "uppercase" }}>
          {t.questionN(index + 1)}
        </span>
        <Badge kind={right ? "accepted" : "rework"}>
          {right ? t.correct : t.incorrect} · {t.points(question.earned_points)}
        </Badge>
      </div>

      <p className="body pretty" style={{ fontWeight: 600 }}>
        {question.text}
      </p>

      <div className="stack g8">
        {question.options.map((opt) => {
          if (!opt.is_chosen && !opt.is_correct) {
            return (
              <div key={opt.id} className="row g10 small muted" style={{ padding: "6px 0" }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                />
                <span>{opt.text}</span>
              </div>
            );
          }
          const tone = opt.is_correct ? "var(--success)" : "var(--danger)";
          return (
            <div
              key={opt.id}
              className="row g10"
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                background: opt.is_correct ? "var(--success-bg)" : "var(--danger-bg)",
                border: `1px solid ${opt.is_correct ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              <span style={{ color: tone, flexShrink: 0, marginTop: 1 }}>
                {opt.is_correct ? <IconCheck size={17} /> : <IconClose size={17} />}
              </span>
              <span className="small grow">
                {opt.text}
                {opt.is_chosen && !opt.is_correct && (
                  <span className="caption" style={{ color: tone, marginLeft: 6 }}>
                    · {t.yourAnswer}
                  </span>
                )}
                {opt.is_correct && !opt.is_chosen && (
                  <span className="caption" style={{ color: tone, marginLeft: 6 }}>
                    · {t.correctAnswer}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Пояснения у вопроса может не быть — блок тогда не рисуется */}
      {question.explanation && (
        <div className="note note-muted">
          <IconAlert size={17} />
          <div className="small">
            <strong>{t.explanation}</strong>
            {question.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
