"use client";

/**
 * Редактор задания «/tasks/:id» — раздел 5.20 брифа.
 *
 * Отдельных «типов заданий» нет — вид задания это методика, а не настройка.
 * Оценка только зачтено / на доработку, без баллов: балл за домашку потянул бы
 * за собой итоговую оценку курса, от которой сертификат всё равно не зависит.
 * Число отправок на доработку не ограничено — проверка ручная, ограничивать нечего.
 */

import { useParams } from "next/navigation";
import { useState } from "react";
import { courses, DEMO_COURSE_ID, getCourse, getLesson, moduleOfLesson } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { Breadcrumbs, Button, FileRow, Note } from "@lms/ui";
import {
  IconBold,
  IconCheck,
  IconClose,
  IconHeading,
  IconItalic,
  IconLink,
  IconList,
  IconPlus,
  IconQuote,
  IconTable,
} from "@lms/ui/icons";

type Format = "text" | "file" | "both";

const FILE_TYPES = ["PDF", "DOC / DOCX", "JPG / PNG", "XLS / XLSX", "PPT / PPTX"];

export default function TaskEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { toast, findDraft, updateDraft, modulesOf } = useStore();
  /* Задание, только что добавленное в программе, лежит в состоянии прототипа */
  const draft = findDraft(id);
  /* Задание открывают из программы любого курса — ищем, кому оно принадлежит */
  const course = draft
    ? (getCourse(draft.courseId) ?? getCourse(DEMO_COURSE_ID)!)
    : (courses.find((c) => getLesson(c, id)) ?? getCourse(DEMO_COURSE_ID)!);
  const lesson = getLesson(course, id);
  const mod = draft
    ? ((course.modulesList ?? []).find((m) => m.id === draft.moduleId) ??
      modulesOf(course.id).find((m) => m.id === draft.moduleId))
    : lesson
      ? moduleOfLesson(course, lesson.id)
      : undefined;

  const [title, setTitle] = useState(draft?.title ?? lesson?.title ?? "Практическое задание");
  const [format, setFormat] = useState<Format>("both");
  const [types, setTypes] = useState<string[]>(["PDF", "DOC / DOCX", "JPG / PNG"]);
  const [limit, setLimit] = useState("20");
  const [timeMin, setTimeMin] = useState(String(draft?.timeMin ?? lesson?.timeMin ?? 40));
  /* У нового задания условие и критерии пустые — их пишет админ */
  const [criteria, setCriteria] = useState(
    draft
      ? ""
      : "Тест собран в Google Формах, вопросов не меньше пяти, включён режим теста и проставлены баллы. В ответе — ссылка на форму и скриншот настроек.",
  );
  const [text, setText] = useState(
    draft
      ? ""
      : "Соберите проверочный тест по своему предмету в Google Формах: не меньше пяти вопросов, автоматическая проверка, доступ по ссылке без входа в аккаунт. Пришлите ссылку и скриншот настроек формы.",
  );

  const toggleType = (t: string) =>
    setTypes((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));

  return (
    <AdminShell
      title={title || "Редактор задания"}
      subtitle={`${course.title} · ${mod?.title ?? ""}`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            if (draft) updateDraft(id, { title, timeMin: Number(timeMin) || 0 });
            toast("Задание сохранено", "success");
          }}
        >
          Сохранить
        </Button>
      }
    >
      <div className="stack g16" style={{ maxWidth: 860 }}>
        <Breadcrumbs
          items={[
            { label: "Курсы", href: "/courses" },
            { label: course.title, href: `/courses/${course.id}` },
            { label: "Программа", href: `/courses/${course.id}/edit` },
            { label: "Задание" },
          ]}
        />

        <div className="card card-pad stack g14">
          <div className="field">
            <label className="label">Название задания</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Условие</label>
            <div
              className="row wrap g4"
              style={{ paddingBottom: 8, borderBottom: "1px solid var(--border)" }}
            >
              {[IconBold, IconItalic, IconHeading, IconList, IconQuote, IconLink, IconTable].map(
                (Icon, i) => (
                  <button
                    key={i}
                    className="btn btn-icon"
                    style={{ minHeight: 34, width: 34 }}
                    aria-label="Форматирование"
                  >
                    <Icon size={17} />
                  </button>
                ),
              )}
            </div>
            <textarea
              className="input"
              style={{ minHeight: 130, border: "none", padding: "10px 0", fontSize: 16 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Что учитель должен сделать и что прислать в ответ"
            />
          </div>

          <div className="field">
            <label className="label">
              Файл-шаблон <span className="label-optional">· необязательно</span>
            </label>
            {!draft && (
              <FileRow
                type="DOC"
                name="Шаблон вопросов.docx"
                size="0,1 МБ"
                action={
                  <button
                    className="btn btn-icon"
                    style={{ minHeight: 34, width: 34 }}
                    aria-label="Убрать шаблон"
                  >
                    <IconClose size={16} />
                  </button>
                }
              />
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<IconPlus size={15} />}
              style={{ alignSelf: "flex-start", marginTop: 8 }}
              onClick={() => toast("Открылся бы выбор файла")}
            >
              {draft ? "Загрузить шаблон" : "Заменить шаблон"}
            </Button>
          </div>
        </div>

        {/* ===== Сдача ===== */}
        <div className="card card-pad stack g16">
          <h2 className="h3">Как сдаётся</h2>

          <div className="field">
            <label className="label">Формат сдачи</label>
            <div className="segmented" style={{ width: "100%" }}>
              {(
                [
                  ["text", "Текст"],
                  ["file", "Файл"],
                  ["both", "Текст и файл"],
                ] as [Format, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  data-active={format === v}
                  onClick={() => setFormat(v)}
                  style={{ flex: 1 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {format !== "text" && (
            <>
              <div className="field">
                <label className="label">Разрешённые форматы файлов</label>
                <div className="stack g4">
                  {FILE_TYPES.map((t) => (
                    <label key={t} className="check">
                      <input
                        type="checkbox"
                        checked={types.includes(t)}
                        onChange={() => toggleType(t)}
                      />
                      <span className="check-box">
                        <IconCheck size={14} />
                      </span>
                      <span className="check-label">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="task-row">
                <div className="field">
                  <label className="label">Лимит размера, МБ</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                  />
                  <span className="hint">
                    Учителя грузят с телефона — фото урока легко весит больше 10 МБ.
                  </span>
                </div>
                <div className="field">
                  <label className="label">Требует времени, минут</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={timeMin}
                    onChange={(e) => setTimeMin(e.target.value)}
                  />
                  <span className="hint">Складывается в сумму по программе курса</span>
                </div>
              </div>
            </>
          )}

          {format === "text" && (
            <div className="field" style={{ maxWidth: 260 }}>
              <label className="label">Требует времени, минут</label>
              <input
                className="input"
                inputMode="numeric"
                value={timeMin}
                onChange={(e) => setTimeMin(e.target.value)}
              />
              <span className="hint">Складывается в сумму по программе курса</span>
            </div>
          )}
        </div>

        {/* ===== Оценка ===== */}
        <div className="card card-pad stack g14">
          <h2 className="h3">Оценка</h2>

          <div className="row wrap g8">
            <span className="badge badge-accepted">Зачтено</span>
            <span className="badge badge-rework">На доработку</span>
          </div>

          <Note kind="muted">
            <span className="small">
              Баллов за задание нет: балл потянул бы за собой итоговую оценку курса,
              от которой сертификат всё равно не зависит. Число отправок на доработку
              не ограничено — проверка ручная, ограничивать нечего.
            </span>
          </Note>

          <div className="field">
            <label className="label">
              Критерии оценки <span className="label-optional">· подсказка методисту</span>
            </label>
            <textarea
              className="input"
              style={{ minHeight: 100 }}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="По каким признакам работа принимается"
            />
            <span className="hint">
              Видны на экране проверки рядом с ответом учителя, чтобы не вспоминать
              условие каждый раз.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .task-row { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .task-row { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </AdminShell>
  );
}
