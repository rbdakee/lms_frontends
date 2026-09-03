"use client";

/**
 * Участники курса для методиста — вкладка карточки курса.
 *
 * Проверка работ идёт от курса, а не от общего списка учителей: сначала
 * видно, из чего курс состоит (уроки, тесты, задания), потом — кто на каком
 * этапе и что уже сдал. Отсюда же открывается конкретная работа.
 *
 * Таблица построена как ведомость: строка — учитель, столбец — контрольная
 * точка курса. Названия тестов и заданий стоят в шапке один раз, а в ячейках
 * только результат. Иначе в каждой строке повторялись бы одни и те же
 * «Практическое задание: свой тест» — читать такую таблицу невозможно.
 */

import Link from "next/link";
import { useState } from "react";
import {
  courseParticipants,
  courseReviewSummary,
  getTeacher,
  type Course,
  type Participant,
  type TaskState,
} from "@lms/prototype/data";
import { plural } from "@lms/ui/i18n";
import { Avatar, Empty, Progress } from "@lms/ui";
import { IconCheckCircle, IconChevronRight, IconUsers } from "@lms/ui/icons";

type Filter = "all" | "waiting" | "rework" | "finished";

const FILTERS: [Filter, string][] = [
  ["all", "Все"],
  ["waiting", "Ждут проверки"],
  ["rework", "На доработке"],
  ["finished", "Завершили"],
];

/** Цвет и короткая подпись статуса задания — одна для таблицы и легенды */
const TASK_STYLE: Record<TaskState, { color: string; bg: string; short: string }> = {
  Принято: { color: "var(--success)", bg: "var(--success-bg)", short: "Принято" },
  "На проверке": { color: "var(--warning)", bg: "var(--warning-bg)", short: "Ждёт" },
  Доработка: { color: "var(--danger)", bg: "var(--danger-bg)", short: "Доработка" },
  "Не сдано": { color: "var(--text-3)", bg: "var(--surface-muted)", short: "—" },
};

/** «Тест модуля 2» → «М2», «Итоговый тест» → «Итог» */
const shortQuiz = (title: string) => {
  const m = title.match(/\d+/);
  return m ? `М${m[0]}` : "Итог";
};

const hasWaiting = (p: Participant) => p.tasks.some((t) => t.state === "На проверке");
const hasRework = (p: Participant) => p.tasks.some((t) => t.state === "Доработка");

export function CourseParticipants({ course }: { course: Course }) {
  const [filter, setFilter] = useState<Filter>("all");
  const all = courseParticipants(course.id);
  const summary = courseReviewSummary(course.id);

  const list = all.filter((p) => {
    if (filter === "waiting") return hasWaiting(p);
    if (filter === "rework") return hasRework(p);
    if (filter === "finished") return p.finished;
    return true;
  });

  const count = (f: Filter) =>
    f === "all"
      ? all.length
      : f === "waiting"
        ? all.filter(hasWaiting).length
        : f === "rework"
          ? all.filter(hasRework).length
          : all.filter((p) => p.finished).length;

  if (all.length === 0) {
    return (
      <div className="card">
        <Empty
          icon={<IconUsers size={38} />}
          title="На курс ещё никто не записался"
          text="Как только появятся участники, здесь будет виден их прогресс и сданные работы."
        />
      </div>
    );
  }

  /** Контрольные точки курса — одинаковы для всех участников */
  const quizNames = all[0].quizzes.map((q) => q.lesson);
  const taskNames = all[0].tasks.map((t) => t.lesson);

  return (
    <div className="stack g20">
      {/* Из чего состоит курс и что в нём ждёт проверки */}
      <div className="participants-summary">
        <SummaryTile
          label="Участников"
          value={String(summary.participants)}
          hint={`${summary.finished} завершили курс`}
        />
        <SummaryTile
          label="Уроков в курсе"
          value={String(course.lessons)}
          hint={`${course.modules} ${plural(course.modules, "модуль", "модуля", "модулей")}`}
        />
        <SummaryTile
          label="Тестов"
          value={String(summary.quizzes)}
          hint={`порог ${course.passScore}%`}
        />
        <SummaryTile label="Заданий" value={String(summary.tasks)} hint="проверяет методист" />
        <SummaryTile
          label="Ждут проверки"
          value={String(summary.waiting)}
          hint={
            summary.longWait > 0
              ? `${summary.longWait} ${plural(summary.longWait, "ждёт", "ждут", "ждут")} дольше трёх дней`
              : "никто не ждёт дольше трёх дней"
          }
          alarm={summary.longWait > 0}
        />
      </div>

      <div className="tabs">
        {FILTERS.map(([v, label]) => (
          <button key={v} data-active={filter === v} onClick={() => setFilter(v)}>
            {label} · {count(v)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card">
          <Empty
            icon={<IconCheckCircle size={38} />}
            title="Здесь пусто"
            text="По этому фильтру участников нет — попробуйте другой."
          />
        </div>
      ) : (
        <>
          {/* Ведомость — десктоп */}
          <div className="table-wrap">
            <table className="table gradebook">
              <thead>
                <tr>
                  <th rowSpan={2}>Учитель</th>
                  <th rowSpan={2} style={{ minWidth: 180 }}>
                    Прогресс
                  </th>
                  <th colSpan={quizNames.length} className="group-head">
                    Тесты
                  </th>
                  <th colSpan={taskNames.length} className="group-head">
                    Задания
                  </th>
                  <th rowSpan={2} />
                </tr>
                <tr>
                  {quizNames.map((name, i) => (
                    <th
                      key={name}
                      className={`mark-head${i === 0 ? " group-start" : ""}`}
                      title={name}
                    >
                      {shortQuiz(name)}
                    </th>
                  ))}
                  {taskNames.map((name, i) => (
                    <th
                      key={name}
                      className={`mark-head${i === 0 ? " group-start" : ""}`}
                      title={name}
                    >
                      №{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const teacher = getTeacher(p.teacherId);
                  const waiting = p.tasks.find((t) => t.state === "На проверке");
                  const pct = Math.round((p.lessonsDone / course.lessons) * 100);
                  return (
                    <tr key={p.teacherId} data-attention={waiting ? "" : undefined}>
                      <td>
                        <Link href={`/teachers/${p.teacherId}`} className="row g10">
                          <Avatar initials={teacher?.initials ?? "??"} size={32} tone="neutral" />
                          <span className="stack g2" style={{ minWidth: 0 }}>
                            <span className="small nowrap" style={{ fontWeight: 600 }}>
                              {teacher?.name}
                            </span>
                            <span className="caption muted-3 nowrap">{teacher?.school}</span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <div className="stack g4">
                          <Progress value={pct} />
                          <span className="caption muted-3 nowrap">
                            {p.lessonsDone}/{course.lessons} · {pct}%
                          </span>
                        </div>
                      </td>

                      {p.quizzes.map((q, i) => (
                        <td key={q.lesson} className={`mark${i === 0 ? " group-start" : ""}`}>
                          <QuizMark score={q.score} passScore={course.passScore} />
                        </td>
                      ))}

                      {p.tasks.map((t, i) => (
                        <td key={t.lesson} className={`mark${i === 0 ? " group-start" : ""}`}>
                          <TaskMark state={t.state} />
                        </td>
                      ))}

                      <td style={{ width: 120 }}>
                        {waiting?.submissionId ? (
                          <Link
                            href={`/submissions/${waiting.submissionId}`}
                            className="btn btn-primary btn-sm"
                          >
                            Проверить
                          </Link>
                        ) : (
                          <Link
                            href={`/teachers/${p.teacherId}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Карточка
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Расшифровка колонок и цветов — вместо подписей в каждой ячейке */}
          <Legend quizNames={quizNames} taskNames={taskNames} />

          {/* Карточки — мобильный */}
          <div className="table-mobile-cards">
            {list.map((p) => {
              const teacher = getTeacher(p.teacherId);
              const waiting = p.tasks.find((t) => t.state === "На проверке");
              const pct = Math.round((p.lessonsDone / course.lessons) * 100);
              return (
                <div key={p.teacherId} className="card card-pad stack g12">
                  <div className="row g10">
                    <Avatar initials={teacher?.initials ?? "??"} size={38} tone="neutral" />
                    <div className="grow stack g2" style={{ minWidth: 0 }}>
                      <span className="small" style={{ fontWeight: 700 }}>
                        {teacher?.name}
                      </span>
                      <span className="caption muted-3">{teacher?.school}</span>
                    </div>
                  </div>

                  <div className="stack g6">
                    <span className="caption muted-3 pretty">{p.currentLesson}</span>
                    <Progress value={pct} />
                    <span className="caption muted-3">
                      {p.lessonsDone} из {course.lessons} уроков · {pct}%
                    </span>
                  </div>

                  <div className="marks-mobile">
                    <div className="stack g6">
                      <span className="caption muted">Тесты</span>
                      <div className="row g6 wrap">
                        {p.quizzes.map((q) => (
                          <span key={q.lesson} className="mark-chip" title={q.lesson}>
                            <span className="caption muted-3">{shortQuiz(q.lesson)}</span>
                            <QuizMark score={q.score} passScore={course.passScore} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="stack g6">
                      <span className="caption muted">Задания</span>
                      <div className="row g6 wrap">
                        {p.tasks.map((t, i) => (
                          <span key={t.lesson} className="mark-chip" title={t.lesson}>
                            <span className="caption muted-3">№{i + 1}</span>
                            <TaskMark state={t.state} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={
                      waiting?.submissionId
                        ? `/submissions/${waiting.submissionId}`
                        : `/teachers/${p.teacherId}`
                    }
                    className={`btn btn-block ${waiting ? "btn-primary" : "btn-secondary"}`}
                  >
                    {waiting ? "Проверить работу" : "Карточка учителя"}
                    <IconChevronRight size={16} />
                  </Link>
                </div>
              );
            })}
            <Legend quizNames={quizNames} taskNames={taskNames} />
          </div>
        </>
      )}

      <style>{`
        .participants-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (min-width: 720px) { .participants-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 1100px) { .participants-summary { grid-template-columns: repeat(5, minmax(0, 1fr)); } }

        /* Ведомость: узкие колонки результатов, всё остальное — по содержимому */
        .gradebook th.group-head {
          text-align: center;
          border-left: 1px solid var(--border);
        }
        .gradebook th.mark-head {
          text-align: center;
          width: 62px;
          font-size: 11.5px;
          letter-spacing: 0.02em;
          cursor: help;
        }
        /* Тонкая линия отделяет тесты от заданий — иначе колонки сливаются */
        .gradebook .group-start { border-left: 1px solid var(--border); }
        .gradebook td.mark { text-align: center; vertical-align: middle; padding-left: 6px; padding-right: 6px; }
        .gradebook tbody tr[data-attention] { background: var(--admin-row-attention); }
        .gradebook tbody tr:hover { background: var(--bg); }

        .marks-mobile { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 460px) { .marks-mobile { grid-template-columns: 1fr 1fr; } }
        .mark-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--card);
        }
      `}</style>
    </div>
  );
}

/* ============ Ячейки ============ */

/** Балл теста: зелёный — сдан, красный — ниже порога, тире — не сдавали */
function QuizMark({ score, passScore }: { score: number | null; passScore: number }) {
  if (score === null) return <span className="muted-3">—</span>;
  const ok = score >= passScore;
  return (
    <span
      className="mono"
      style={{
        fontWeight: 700,
        fontSize: 13,
        color: ok ? "var(--success)" : "var(--danger)",
      }}
    >
      {score}
    </span>
  );
}

/** Статус задания — точкой: подпись повторялась бы в каждой строке */
function TaskMark({ state }: { state: TaskState }) {
  const s = TASK_STYLE[state];
  if (state === "Не сдано") {
    return (
      <span className="muted-3" title={state}>
        —
      </span>
    );
  }
  return (
    <span
      title={state}
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 999,
        background: s.color,
        boxShadow: `0 0 0 3px ${s.bg}`,
      }}
    />
  );
}

/* ============ Расшифровка ============ */

function Legend({ quizNames, taskNames }: { quizNames: string[]; taskNames: string[] }) {
  return (
    <div className="card card-pad stack g12">
      <div className="legend-grid">
        <div className="stack g6">
          <span className="caption muted">Тесты · балл в процентах</span>
          {quizNames.map((name) => (
            <span key={name} className="caption muted-3">
              <strong className="mono" style={{ color: "var(--text-2)" }}>
                {shortQuiz(name)}
              </strong>{" "}
              — {name}
            </span>
          ))}
        </div>
        <div className="stack g6">
          <span className="caption muted">Задания</span>
          {taskNames.map((name, i) => (
            <span key={name} className="caption muted-3 pretty">
              <strong className="mono" style={{ color: "var(--text-2)" }}>
                №{i + 1}
              </strong>{" "}
              — {name}
            </span>
          ))}
        </div>
        <div className="stack g6">
          <span className="caption muted">Обозначения</span>
          {(["Принято", "На проверке", "Доработка"] as TaskState[]).map((state) => (
            <span key={state} className="row g8 caption muted-3">
              <TaskMark state={state} />
              {state === "На проверке" ? "Ждёт методиста" : state}
            </span>
          ))}
          <span className="row g8 caption muted-3">
            <span className="muted-3" style={{ width: 12, textAlign: "center" }}>
              —
            </span>
            Не сдано
          </span>
        </div>
      </div>

      <style>{`
        .legend-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 720px) { .legend-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      `}</style>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  alarm,
}: {
  label: string;
  value: string;
  hint: string;
  alarm?: boolean;
}) {
  return (
    <div className="card card-pad stack g4">
      <span className="caption muted">{label}</span>
      <strong
        style={{ fontSize: 24, letterSpacing: "-0.02em", color: alarm ? "var(--danger)" : undefined }}
      >
        {value}
      </strong>
      <span className="caption muted-3">{hint}</span>
    </div>
  );
}
