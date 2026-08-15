"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@lms/prototype";
import { allLessons, type Course, type Lesson } from "@lms/prototype/data";
import { Accordion, Badge, Progress } from "@lms/ui";
import {
  IconCheck,
  IconEdit,
  IconLock,
  IconPlay,
  IconQuiz,
  IconText,
  IconVideo,
} from "@lms/ui/icons";

/** Ссылка на экран урока в зависимости от его типа. */
export function lessonHref(courseId: string, l: Lesson) {
  if (l.kind === "quiz") return `/learn/${courseId}/quiz/${l.id}`;
  if (l.kind === "task") return `/learn/${courseId}/task/${l.id}`;
  return `/learn/${courseId}/${l.id}`;
}

function LessonTypeIcon({ kind }: { kind: Lesson["kind"] }) {
  const map = {
    video: <IconVideo size={18} />,
    text: <IconText size={18} />,
    quiz: <IconQuiz size={18} />,
    task: <IconEdit size={18} />,
  };
  return map[kind];
}

/** Первый непройденный урок — «текущий». */
export function currentLesson(course: Course, done: string[]): Lesson | undefined {
  return allLessons(course).find((l) => !done.includes(l.id));
}

interface ProgramProps {
  course: Course;
  /** До записи уроки видны, но не кликабельны. */
  locked?: boolean;
  /** Строгий последовательный порядок. */
  strict?: boolean;
  activeLessonId?: string;
  /** Компактный вид для боковой панели плеера. */
  compact?: boolean;
  onNavigate?: () => void;
}

export function Program({
  course,
  locked,
  strict,
  activeLessonId,
  compact,
  onNavigate,
}: ProgramProps) {
  const router = useRouter();
  const { completed, tasks, quizzes, toast, t } = useStore();
  const done = completed[course.id] ?? [];
  const modules = course.modulesList ?? [];
  const current = currentLesson(course, done);

  const [open, setOpen] = useState<string[]>(() => {
    if (!modules.length) return [];
    const activeModule = modules.find((m) =>
      m.lessons.some((l) => l.id === (activeLessonId ?? current?.id)),
    );
    return [activeModule?.id ?? modules[0].id];
  });

  const toggle = (id: string) =>
    setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  if (!modules.length) {
    return (
      <div className="card card-pad small muted">
        Программа этого курса заполняется — демо-контент подготовлен для курса
        «Цифровая грамотность педагога».
      </div>
    );
  }

  const handleClick = (l: Lesson, isLocked: boolean) => {
    if (locked) {
      toast(t.lockedLesson);
      return;
    }
    if (isLocked) {
      toast(`Сначала завершите урок «${current?.title ?? ""}»`);
      return;
    }
    onNavigate?.();
    router.push(lessonHref(course.id, l));
  };

  return (
    <div className={compact ? "stack g8" : "stack g10"}>
      {modules.map((m) => {
        const mDone = m.lessons.filter((l) => done.includes(l.id)).length;
        const isOpen = open.includes(m.id);
        return (
          <Accordion
            key={m.id}
            open={isOpen}
            onToggle={() => toggle(m.id)}
            head={
              <div className="stack g6">
                <div
                  className="h3"
                  style={{ fontSize: compact ? 14 : 16, lineHeight: "20px" }}
                >
                  {m.title}
                </div>
                <div className="row g8">
                  <span className="caption muted">
                    {mDone === m.lessons.length ? (
                      <span style={{ color: "var(--success)", fontWeight: 700 }}>
                        {m.lessons.length} из {m.lessons.length} — пройден
                      </span>
                    ) : mDone > 0 ? (
                      `${mDone} из ${m.lessons.length} уроков`
                    ) : (
                      t.lessons(m.lessons.length)
                    )}
                  </span>
                </div>
              </div>
            }
          >
            <div>
              {m.lessons.map((l) => {
                const isDone = done.includes(l.id);
                const isCurrent = activeLessonId ? l.id === activeLessonId : current?.id === l.id;
                const isLocked =
                  !locked && strict && !isDone && !isCurrent && current
                    ? l.n > current.n
                    : false;

                const taskStatus = tasks[l.id];
                const quiz = quizzes[l.id];

                let meta = l.duration;
                if (l.kind === "task" && taskStatus && taskStatus !== "none") {
                  meta =
                    taskStatus === "review"
                      ? "на проверке"
                      : taskStatus === "accepted"
                        ? "зачтено"
                        : "на доработку";
                } else if (l.kind === "quiz" && quiz) {
                  meta = `${quiz.pct}% · ${quiz.passed ? "сдано" : "не сдано"}`;
                } else if (isCurrent && !locked) {
                  meta = `${l.duration} · вы здесь`;
                } else if (isLocked) {
                  meta = "откроется после текущего урока";
                }
                /* До выдачи доступа уроки видны названиями, но с замком */
                if (locked) meta = `${l.duration} · ${t.lockedLesson.toLowerCase()}`;

                return (
                  <button
                    key={l.id}
                    className="lesson-row"
                    data-locked={isLocked || locked || undefined}
                    data-current={isCurrent && !locked ? true : undefined}
                    onClick={() => handleClick(l, isLocked)}
                  >
                    <span
                      className={`lesson-icon ${
                        isDone ? "done" : isCurrent && !locked ? "current" : isLocked ? "locked" : ""
                      }`}
                    >
                      {locked ? (
                        <IconLock size={16} />
                      ) : isDone ? (
                        <IconCheck size={17} />
                      ) : isLocked ? (
                        <IconLock size={16} />
                      ) : isCurrent && !locked ? (
                        <IconPlay size={15} />
                      ) : (
                        <LessonTypeIcon kind={l.kind} />
                      )}
                    </span>

                    <span className="grow stack g4" style={{ minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: compact ? 14 : 15,
                          fontWeight: isCurrent ? 700 : 600,
                          lineHeight: "20px",
                        }}
                        className="pretty"
                      >
                        {l.title}
                      </span>
                      <span className="caption muted-3">{meta}</span>
                    </span>

                    {l.kind === "task" && taskStatus === "rework" && (
                      <Badge kind="rework">Доработать</Badge>
                    )}
                    {l.kind === "task" && taskStatus === "review" && (
                      <Badge kind="review">Проверка</Badge>
                    )}
                    {l.final && !quiz && <Badge kind="new">Итоговый</Badge>}
                  </button>
                );
              })}
            </div>
          </Accordion>
        );
      })}

      {locked && (
        <div className="note note-muted" style={{ justifyContent: "center" }}>
          <IconLock size={18} />
          <div>{t.lockedLesson}</div>
        </div>
      )}
    </div>
  );
}

/* ============ Чек-лист «Что нужно для сертификата» ============ */

export function CertChecklist({ course, live }: { course: Course; live?: boolean }) {
  const { completed, tasks, quizzes, t } = useStore();
  const done = completed[course.id] ?? [];
  const lessons = allLessons(course);

  const lessonTotal = lessons.length || course.lessons;
  const lessonDone = done.length;

  const taskLessons = lessons.filter((l) => l.kind === "task");
  const taskTotal = taskLessons.length || course.tasksCount;
  const taskDone = taskLessons.filter((l) => tasks[l.id] === "accepted").length;

  const finalQuiz = lessons.find((l) => l.final);
  const finalResult = finalQuiz ? quizzes[finalQuiz.id] : undefined;

  const items = [
    {
      label: `Пройти все ${lessonTotal} ${lessonTotal === 1 ? "урок" : "уроков"}`,
      value: live ? `${lessonDone} из ${lessonTotal}` : null,
      done: lessonDone >= lessonTotal,
      partial: lessonDone,
      total: lessonTotal,
    },
    {
      label: `Сдать все ${taskTotal} ${taskTotal === 1 ? "задание" : "задания"}`,
      value: live ? `${taskDone} из ${taskTotal}` : null,
      done: taskDone >= taskTotal,
      partial: taskDone,
      total: taskTotal,
    },
    {
      label: `Сдать итоговый тест — проходной балл ${course.passScore}%`,
      value: live ? (finalResult ? `${finalResult.pct}%` : "не начат") : null,
      done: !!finalResult?.passed,
      partial: finalResult ? 1 : 0,
      total: 1,
    },
  ];

  return (
    <div className="card card-pad stack g14" style={{ background: "#fbfcff" }}>
      <h3 className="h3">{t.secCertRequirements}</h3>
      <div className="stack g10">
        {items.map((it, i) => (
          <div key={i} className="row g10" style={{ alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
                fontSize: 11,
                fontWeight: 800,
                background: it.done
                  ? "var(--success)"
                  : it.partial > 0
                    ? "var(--primary-bg)"
                    : "#f1f5f9",
                color: it.done ? "#fff" : it.partial > 0 ? "var(--primary-pressed)" : "var(--text-3)",
                border: it.done ? "none" : "1px solid var(--border)",
              }}
            >
              {it.done ? <IconCheck size={14} /> : live && it.partial > 0 ? it.partial : ""}
            </span>
            <span className="grow small" style={{ lineHeight: "22px" }}>
              {it.label}
            </span>
            {it.value && (
              <span
                className="caption nowrap"
                style={{
                  color: it.done ? "var(--success)" : "var(--text-2)",
                  fontWeight: 700,
                  marginTop: 3,
                }}
              >
                {it.value}
              </span>
            )}
          </div>
        ))}
      </div>
      <hr className="divider" />
      <span className="caption muted">
        Сертификат на {course.hours} часов ·{" "}
        {course.lang === "kz" ? "на казахском языке" : "на русском языке"}
      </span>
    </div>
  );
}

/* ============ Толстый прогресс курса ============ */

export function CourseProgressBlock({ course }: { course: Course }) {
  const { completed } = useStore();
  const done = (completed[course.id] ?? []).length;
  const total = allLessons(course).length || course.lessons;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="stack g8">
      <div className="row between">
        <span className="small muted">
          Пройдено {done} из {total} уроков
        </span>
        <strong style={{ color: pct >= 100 ? "var(--success)" : "var(--primary)" }}>{pct}%</strong>
      </div>
      <Progress value={pct} thick />
    </div>
  );
}
