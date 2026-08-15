"use client";

/**
 * Тест «/learn/:courseId/quiz/:id» — раздел 5.8 брифа.
 *
 * У теста два режима, их задаёт админ переключателем «Пересдаваемый»:
 * выключен — попытка одна, жёлтое предупреждение и модалка подтверждения;
 * включён — попыток сколько угодно, спокойная подпись, модалки нет.
 * Режим виден до старта, а не после провала.
 */

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { finalQuizQuestions, getCourse, getLesson, type Question } from "@lms/prototype/data";
import { useStore, type QuizResult } from "@lms/prototype";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import { ScoreRing } from "@/components/course/ScoreRing";
import { AttemptsHistory } from "@/components/course/Attempts";
import { Badge, Button, Empty, LinkButton, Note, Progress, Sheet } from "@lms/ui";
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

export default function QuizPage() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const router = useRouter();
  const { t, quizzes, attempts, quizRetakes, certs, saveQuiz, completeLesson } = useStore();

  const course = getCourse(courseId);
  const lesson = course ? getLesson(course, id) : undefined;

  /* Набор вопросов: для коротких тестов берём срез общего банка. */
  const questions: Question[] = finalQuizQuestions.slice(
    0,
    Math.min(finalQuizQuestions.length, lesson?.questions ?? 8),
  );
  const maxScore = questions.reduce((s, q) => s + q.points, 0);
  const limitSec = (lesson?.minutes ?? 30) * 60;
  const passScore = lesson?.passScore ?? 70;

  const retakable = !!lesson?.retakable;
  const existing = quizzes[id];
  const history = attempts[id] ?? [];
  /** Пересдачу открывает админ — только у непересдаваемых тестов */
  const retakeAllowed = quizRetakes.includes(id);
  /** После выдачи сертификата пересдача закрыта даже у пересдаваемого теста */
  const certIssued = !!course && certs.includes(course.id);

  const [phase, setPhase] = useState<"start" | "run">("start");
  const [confirm, setConfirm] = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [left, setLeft] = useState(limitSec);
  const startedAt = useRef<number>(0);

  const begin = () => {
    setPhase("run");
    setQi(0);
    setAnswers({});
    setLeft(limitSec);
    startedAt.current = Date.now();
  };

  const submit = useCallback(
    (timedOut = false) => {
      let score = 0;
      questions.forEach((q) => {
        const a = (answers[q.id] ?? []).slice().sort().join(",");
        const c = q.correct.slice().sort().join(",");
        if (a && a === c) score += q.points;
      });
      const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
      const spent = Math.max(1, Math.round((limitSec - left) / 60));
      const result: QuizResult = {
        score,
        maxScore,
        pct,
        passed: pct >= passScore,
        minutesSpent: timedOut ? Math.round(limitSec / 60) : spent,
        answers,
        timedOut,
        date: "сегодня",
      };
      saveQuiz(id, result);
      if (result.passed && course) completeLesson(course.id, id);
      router.push(`/learn/${courseId}/quiz/${id}/result`);
    },
    [answers, questions, maxScore, limitSec, left, passScore, saveQuiz, id, course, completeLesson, router, courseId],
  );

  /* Таймер */
  useEffect(() => {
    if (phase !== "run") return;
    if (left <= 0) {
      submit(true);
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left, submit]);

  if (!course || !lesson) {
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title="Тест" />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title="Тест не найден"
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

  /* ===== Состояние «тест уже пройден» ===== */
  const canRetakeNow = retakable && !certIssued;
  if (existing && phase === "start" && !retakeAllowed) {
    return (
      <>
        <BackHeader href={`/courses/${course.id}`} title={lesson.title} subtitle={course.title} />
        <main className="page section has-tabbar" style={{ paddingTop: 24 }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }} className="stack g20">
            <div
              className="card card-pad stack g16"
              style={{ alignItems: "center", textAlign: "center" }}
            >
              <ScoreRing pct={existing.pct} passed={existing.passed} />
              <div className="stack g4">
                <h1 className="h2">{existing.passed ? "Тест сдан" : "Тест не сдан"}</h1>
                <span className="small muted">
                  {existing.date} · {existing.score} из {existing.maxScore} баллов · проходной{" "}
                  {passScore}%
                </span>
              </div>

              <LinkButton href={`/learn/${courseId}/quiz/${id}/result`} block size="lg">
                Посмотреть разбор
              </LinkButton>

              {canRetakeNow ? (
                <div className="stack g6" style={{ width: "100%" }}>
                  <Button block variant="secondary" onClick={begin}>
                    Пройти ещё раз
                  </Button>
                  <span className="caption muted-3">Засчитывается последний результат</span>
                </div>
              ) : (
                <div className="stack g6" style={{ width: "100%" }}>
                  <Button block variant="secondary" disabled>
                    Начать тест
                  </Button>
                  <span className="caption muted-3">
                    {certIssued ? "Сертификат выдан — пересдача закрыта" : "Попытка использована"}
                  </span>
                </div>
              )}
            </div>

            {certIssued && (
              <Note kind="success">
                Курс завершён, сертификат выдан. Новая попытка уже ничего не изменит —
                остаётся разбор ответов.
              </Note>
            )}

            {!certIssued && !existing.passed && !retakable && (
              <Note kind="warning">
                Попытка использована. Если тест прервался по техническим причинам,
                обратитесь к администратору — он может открыть пересдачу.
              </Note>
            )}

            <AttemptsHistory attempts={history} retakable={retakable} />

            <LinkButton href={`/courses/${course.id}`} variant="secondary" block>
              Вернуться к курсу
            </LinkButton>
          </div>
        </main>
        <TabBar />
      </>
    );
  }

  /* ===== Стартовый экран ===== */
  if (phase === "start") {
    const lastPct = history.length ? history[history.length - 1].pct : null;

    return (
      <>
        <BackHeader href={`/courses/${course.id}`} title={lesson.title} subtitle={course.title} />
        <main className="page section has-sticky-cta" style={{ paddingTop: 24 }}>
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
              <h1 className="h1">{lesson.title}</h1>
              <p className="body muted">{course.title}</p>
              <Badge kind={retakable ? "neutral" : "progress"}>
                {retakable ? "Пересдаваемый тест" : "Одна попытка"}
              </Badge>
            </div>

            <div className="quiz-stats">
              {[
                { v: String(questions.length), l: "вопросов" },
                { v: `${lesson.minutes ?? 30} мин`, l: "лимит времени" },
                { v: `${passScore}%`, l: "проходной балл" },
              ].map((s) => (
                <div key={s.l} className="card card-pad stack g4" style={{ alignItems: "center" }}>
                  <strong style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{s.v}</strong>
                  <span className="caption muted">{s.l}</span>
                </div>
              ))}
            </div>

            {retakeAllowed && (
              <Note kind="info">
                Администратор разрешил пересдачу. Прошлый результат сохранится в истории.
              </Note>
            )}

            {/* Режим теста читается до старта, а не после провала */}
            {retakable ? (
              <Note kind="muted" icon={<IconInfo size={18} />}>
                <div className="stack g4">
                  <span className="small">
                    Попыток не ограничено, засчитывается последний результат.
                  </span>
                  {lastPct !== null && (
                    <strong className="small">Ваш текущий результат — {lastPct}%</strong>
                  )}
                </div>
              </Note>
            ) : (
              <Note kind="warning">
                <strong style={{ display: "block", marginBottom: 4 }}>У вас одна попытка</strong>
                Начав тест, вы не сможете пройти его заново. Убедитесь, что вас не отвлекут
                ближайшие {lesson.minutes ?? 30} минут.
              </Note>
            )}

            <Note kind="muted" icon={<IconClock size={18} />}>
              <span className="small">
                Таймер запустится сразу · ответы сохраняются автоматически
              </span>
            </Note>

            {history.length > 0 && <AttemptsHistory attempts={history} retakable={retakable} />}

            <div className="desktop-only">
              <Button
                block
                size="lg"
                onClick={() => (retakable ? begin() : setConfirm(true))}
              >
                {history.length > 0 ? "Пройти ещё раз" : "Начать тест"}
              </Button>
            </div>
          </div>
        </main>

        <div className="sticky-cta mobile-only">
          <div className="sticky-cta-inner">
            <Button block size="lg" onClick={() => (retakable ? begin() : setConfirm(true))}>
              {history.length > 0 ? "Пройти ещё раз" : "Начать тест"}
            </Button>
          </div>
        </div>

        {/* Модалка подтверждения — только там, где ошибку не исправить */}
        <Sheet
          open={confirm}
          onClose={() => setConfirm(false)}
          title="Начать тест? Попытка одна"
          footer={
            <div className="stack g8">
              <Button
                block
                size="lg"
                onClick={() => {
                  setConfirm(false);
                  begin();
                }}
              >
                Начать
              </Button>
              <Button block variant="secondary" onClick={() => setConfirm(false)}>
                Не сейчас
              </Button>
            </div>
          }
        >
          <Note kind="warning">
            Попытка одна. Таймер запустится сразу и не остановится, даже если закрыть вкладку.
          </Note>
        </Sheet>

        <TabBar />
        <style>{`
          .quiz-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        `}</style>
      </>
    );
  }

  /* ===== Прохождение ===== */
  const q = questions[qi];
  const selected = answers[q.id] ?? [];
  const answeredCount = questions.filter((x) => (answers[x.id] ?? []).length > 0).length;
  const unanswered = questions.findIndex((x) => (answers[x.id] ?? []).length === 0);
  const lowTime = left <= 120;

  const pick = (i: number) => {
    setAnswers((a) => {
      const cur = a[q.id] ?? [];
      if (q.type === "multi") {
        return { ...a, [q.id]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] };
      }
      return { ...a, [q.id]: [i] };
    });
  };

  return (
    <>
      <header className="appbar">
        <div className="page appbar-inner g12">
          <div className="grow stack g4" style={{ minWidth: 0 }}>
            <strong className="small">
              Вопрос {qi + 1} из {questions.length}
            </strong>
            <Progress value={((qi + 1) / questions.length) * 100} />
          </div>
          <span
            className="row g6 nowrap"
            style={{
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              color: lowTime ? "var(--danger)" : "var(--text)",
              background: lowTime ? "var(--danger-bg)" : "#f1f5f9",
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 15,
            }}
          >
            <IconClock size={17} />
            {fmtTime(left)}
          </span>
        </div>
      </header>

      <main className="has-sticky-cta">
        <div className="page section" style={{ paddingTop: 20 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }} className="stack g20">
            {lowTime && (
              <Note kind="danger">
                Осталось меньше двух минут. Ответы сохраняются автоматически — по истечении
                времени тест отправится сам.
              </Note>
            )}

            <div className="stack g8">
              <h1 className="h2 pretty">{q.text}</h1>
              {q.hint && <span className="small muted">{q.hint}</span>}
            </div>

            <div className="stack g10">
              {q.options.map((opt, i) => {
                const on = selected.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
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
                      boxShadow: on ? "0 0 0 3px rgba(76,111,255,.12)" : "var(--shadow)",
                      transition: "all .14s",
                    }}
                    aria-pressed={on}
                  >
                    <span
                      className={`check-box ${q.type === "multi" ? "" : "round"}`}
                      style={{
                        background: on ? "var(--primary)" : "#fff",
                        borderColor: on ? "var(--primary)" : "var(--border-strong)",
                        marginTop: 0,
                      }}
                    >
                      {on && <IconCheck size={14} />}
                    </span>
                    <span className="grow" style={{ fontSize: 16, lineHeight: "24px" }}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {q.type === "multi" && (
              <span className="caption muted-3">
                Зачёт только за полностью верный набор — частичных баллов нет
              </span>
            )}

            <div className="row center g6 caption muted-3">
              <IconCheckCircle size={14} />
              Ответы сохраняются автоматически
            </div>

            {/* Точки-навигация */}
            <div className="row wrap center g6">
              {questions.map((x, i) => {
                const ans = (answers[x.id] ?? []).length > 0;
                return (
                  <button
                    key={x.id}
                    onClick={() => setQi(i)}
                    aria-label={`Вопрос ${i + 1}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      border: i === qi ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: ans ? "var(--primary)" : "#fff",
                      color: ans ? "#fff" : "var(--text-3)",
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
          </div>
        </div>
      </main>

      <div className="sticky-cta no-tabbar">
        <div className="sticky-cta-inner row g10" style={{ maxWidth: 720 }}>
          <Button
            variant="secondary"
            disabled={qi === 0}
            onClick={() => setQi((i) => i - 1)}
            icon={<IconArrowLeft size={17} />}
          >
            {t.back}
          </Button>
          {qi < questions.length - 1 ? (
            <Button block onClick={() => setQi((i) => i + 1)} iconRight={<IconArrowRight size={17} />}>
              {t.next}
            </Button>
          ) : (
            <Button block onClick={() => setFinishConfirm(true)}>
              Завершить тест
            </Button>
          )}
        </div>
      </div>

      <Sheet
        open={finishConfirm}
        onClose={() => setFinishConfirm(false)}
        title="Завершить тест?"
        footer={
          <div className="stack g8">
            <Button block size="lg" onClick={() => submit(false)}>
              Завершить тест
            </Button>
            {unanswered >= 0 && (
              <Button
                block
                variant="secondary"
                onClick={() => {
                  setQi(unanswered);
                  setFinishConfirm(false);
                }}
              >
                Вернуться к вопросу {unanswered + 1}
              </Button>
            )}
          </div>
        }
      >
        <div className="stack g12">
          <div className="row between">
            <span className="small muted">Отвечено</span>
            <strong>
              {answeredCount} из {questions.length}
            </strong>
          </div>
          {unanswered >= 0 && (
            <Note kind="warning">Вопрос {unanswered + 1} остался без ответа.</Note>
          )}
          <Note kind="muted" icon={<IconAlert size={18} />}>
            <span className="small">После завершения изменить ответы будет нельзя.</span>
          </Note>
        </div>
      </Sheet>
    </>
  );
}
