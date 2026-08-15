"use client";

/**
 * Результат теста и разбор ответов — раздел 5.8 брифа.
 * Разбор показывается всегда: и при сдаче, и при провале. Кнопки «Пересдать» нет.
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { finalQuizQuestions, getCourse, getLesson } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import { Badge, Button, Empty, LinkButton, Note } from "@lms/ui";
import { ScoreRing } from "@/components/course/ScoreRing";
import { AttemptsHistory } from "@/components/course/Attempts";
import { IconAlert, IconCheck, IconClock, IconClose, IconMail } from "@lms/ui/icons";

export default function QuizResultPage() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const router = useRouter();
  const { quizzes, attempts, certs } = useStore();
  const [showReview, setShowReview] = useState(false);

  const course = getCourse(courseId);
  const lesson = course ? getLesson(course, id) : undefined;
  const result = quizzes[id];

  if (!course || !lesson || !result) {
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title="Результат теста" />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title="Результата пока нет"
              text="Сначала пройдите тест — результат появится здесь."
              action={
                <LinkButton href={`/learn/${courseId}/quiz/${id}`} variant="secondary">
                  К тесту
                </LinkButton>
              }
            />
          </div>
        </main>
        <TabBar />
      </>
    );
  }

  const questions = finalQuizQuestions.slice(
    0,
    Math.min(finalQuizQuestions.length, lesson.questions ?? 8),
  );
  const passScore = lesson.passScore ?? 70;
  const retakable = !!lesson.retakable;
  const history = attempts[id] ?? [];
  /** После выдачи сертификата пересдача закрыта даже у пересдаваемого теста */
  const certIssued = certs.includes(course.id);

  return (
    <>
      <BackHeader
        href={`/courses/${course.id}`}
        title={showReview ? "Разбор ответов" : "Результат теста"}
        subtitle={`${lesson.title} · ${course.title}`}
      />

      <main className="page section has-tabbar" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }} className="stack g20">
          {!showReview ? (
            <>
              <div
                className="card card-pad stack g20"
                style={{ alignItems: "center", textAlign: "center", padding: "32px 20px" }}
              >
                <ScoreRing pct={result.pct} passed={result.passed} />

                <div className="stack g6">
                  <h1 className="h1">{result.passed ? "Тест сдан" : "Тест не сдан"}</h1>
                  <span className="body muted">
                    {result.score} из {result.maxScore} баллов · проходной {passScore}%
                  </span>
                </div>

                <div className="result-stats">
                  {[
                    { v: `${result.score} / ${result.maxScore}`, l: "баллов" },
                    { v: `${passScore}%`, l: "проходной" },
                    { v: `${result.minutesSpent} мин`, l: `из ${lesson.minutes ?? 30}` },
                  ].map((s) => (
                    <div key={s.l} className="stack g4" style={{ alignItems: "center" }}>
                      <strong style={{ fontSize: 18 }}>{s.v}</strong>
                      <span className="caption muted-3">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.timedOut && (
                <Note kind="warning" icon={<IconClock size={18} />}>
                  Время истекло — ответы отправлены автоматически. Засчитаны все вопросы,
                  на которые вы успели ответить.
                </Note>
              )}

              {certIssued && (
                <Note kind="success">
                  Курс завершён, сертификат выдан — пересдача закрыта. Остаётся разбор ответов.
                </Note>
              )}

              {!certIssued && !result.passed && !retakable && (
                <Note kind="danger">
                  Попытка использована. Если тест прервался по техническим причинам,
                  обратитесь к администратору.
                </Note>
              )}

              {!certIssued && retakable && (
                <Note kind="muted">
                  <span className="small">Засчитывается последний результат</span>
                </Note>
              )}

              <div className="stack g10">
                <Button block size="lg" onClick={() => setShowReview(true)}>
                  Разбор ответов
                </Button>
                {retakable && !certIssued && (
                  <Button
                    block
                    variant="secondary"
                    onClick={() => router.push(`/learn/${courseId}/quiz/${id}`)}
                  >
                    Пройти ещё раз
                  </Button>
                )}
                <LinkButton href={`/courses/${course.id}`} block variant="secondary">
                  Вернуться к курсу
                </LinkButton>
                {!result.passed && !retakable && !certIssued && (
                  <a href="mailto:help@lms.kz" className="btn btn-ghost btn-block">
                    <IconMail size={17} />
                    Написать администратору
                  </a>
                )}
              </div>

              {/* История попыток — под результатом, зачётная помечена */}
              <AttemptsHistory attempts={history} retakable={retakable} />
            </>
          ) : (
            <>
              <div className="card card-pad row between g12">
                <div className="stack g4">
                  <strong>{lesson.title}</strong>
                  <span className="caption muted">
                    {result.score} из {result.maxScore} баллов · {result.pct}%
                  </span>
                </div>
                <Badge kind={result.passed ? "accepted" : "rework"}>
                  {result.passed ? "Сдано" : "Не сдано"}
                </Badge>
              </div>

              <div className="stack g16">
                {questions.map((q, i) => {
                  const given = result.answers[q.id] ?? [];
                  const correct =
                    given.slice().sort().join(",") === q.correct.slice().sort().join(",");
                  return (
                    <div
                      key={q.id}
                      className="card card-pad stack g12"
                      style={{
                        borderColor: correct ? "#bbf7d0" : "#fecaca",
                        borderWidth: 1.5,
                      }}
                    >
                      <div className="row between wrap g8">
                        <span className="caption muted-3">ВОПРОС {i + 1}</span>
                        <Badge kind={correct ? "accepted" : "rework"}>
                          {correct
                            ? `Верно · ${q.points} ${q.points === 1 ? "балл" : "балла"}`
                            : "Неверно · 0 баллов"}
                        </Badge>
                      </div>

                      <p className="body pretty" style={{ fontWeight: 600 }}>
                        {q.text}
                      </p>

                      <div className="stack g8">
                        {q.options.map((opt, oi) => {
                          const isGiven = given.includes(oi);
                          const isCorrect = q.correct.includes(oi);
                          if (!isGiven && !isCorrect) {
                            return (
                              <div key={oi} className="row g10 small muted" style={{ padding: "6px 0" }}>
                                <span
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    flexShrink: 0,
                                  }}
                                />
                                <span>{opt}</span>
                              </div>
                            );
                          }
                          const tone = isCorrect ? "var(--success)" : "var(--danger)";
                          const bg = isCorrect ? "var(--success-bg)" : "var(--danger-bg)";
                          return (
                            <div
                              key={oi}
                              className="row g10"
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: bg,
                                border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}`,
                              }}
                            >
                              <span style={{ color: tone, flexShrink: 0, marginTop: 1 }}>
                                {isCorrect ? <IconCheck size={17} /> : <IconClose size={17} />}
                              </span>
                              <span className="small grow">
                                {opt}
                                {isGiven && !isCorrect && (
                                  <span className="caption" style={{ color: tone, marginLeft: 6 }}>
                                    · ваш ответ
                                  </span>
                                )}
                                {isCorrect && !isGiven && (
                                  <span className="caption" style={{ color: tone, marginLeft: 6 }}>
                                    · правильный ответ
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="note note-muted">
                        <IconAlert size={17} />
                        <div className="small">
                          <strong>Пояснение: </strong>
                          {q.explanation}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="stack g10">
                <Button block variant="secondary" onClick={() => setShowReview(false)}>
                  К результату
                </Button>
                <LinkButton href={`/courses/${course.id}`} block>
                  Вернуться к курсу
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
