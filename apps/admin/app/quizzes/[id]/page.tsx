"use client";

/**
 * Редактор теста «/quizzes/:id» — раздел 5.19 брифа.
 *
 * Главный переключатель — «Пересдаваемый», выключен по умолчанию:
 *  - выключен: одна попытка, пересдачу открывает админ вручную в карточке учителя;
 *  - включён: попыток сколько угодно, засчитывается последний результат.
 * Подсказка под переключателем меняется вместе с ним.
 */

import { useParams } from "next/navigation";
import { useState } from "react";
import { courses, DEMO_COURSE_ID, finalQuizQuestions, getCourse, getLesson } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { Breadcrumbs, Button, Note } from "@lms/ui";
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconDrag,
  IconInfo,
  IconPlus,
} from "@lms/ui/icons";

export default function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { toast, findDraft, updateDraft } = useStore();
  /* Тест, только что добавленный в программе, лежит в состоянии прототипа */
  const draft = findDraft(id);
  /* Тест открывают из программы любого курса — ищем, кому он принадлежит */
  const course = draft
    ? (getCourse(draft.courseId) ?? getCourse(DEMO_COURSE_ID)!)
    : (courses.find((c) => getLesson(c, id)) ?? getCourse(DEMO_COURSE_ID)!);
  const lesson = getLesson(course, id);

  const [name, setName] = useState(draft?.title ?? lesson?.title ?? "Итоговый тест");
  const [type, setType] = useState<"final" | "module">(lesson?.final ? "final" : "module");
  const [pass, setPass] = useState(String(lesson?.passScore ?? 70));
  const [timer, setTimer] = useState(!draft);
  const [minutes, setMinutes] = useState(String(lesson?.minutes ?? 30));
  const [timeMin, setTimeMin] = useState(String(draft?.timeMin ?? lesson?.timeMin ?? 15));
  const [shuffle, setShuffle] = useState(true);
  const [showReview, setShowReview] = useState(true);
  /* По умолчанию выключен — так решено в 5.19 */
  const [retakable, setRetakable] = useState(Boolean(lesson?.retakable));
  /* Новый тест начинается с нуля вопросов */
  const [questions, setQuestions] = useState<typeof finalQuizQuestions>(
    draft ? [] : finalQuizQuestions.slice(0, 3),
  );

  const typeLabel = { single: "Один правильный", multi: "Несколько правильных", bool: "Верно-Неверно" };

  return (
    <AdminShell
      title={name || "Редактор теста"}
      subtitle={course.title}
      actions={
        <Button
          size="sm"
          onClick={() => {
            if (draft) updateDraft(id, { title: name, timeMin: Number(timeMin) || 0 });
            toast("Тест сохранён", "success");
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
            { label: "Тест" },
          ]}
        />

        {/* Настройки */}
        <div className="card card-pad stack g16">
          <h2 className="h3">Настройки теста</h2>

          <div className="field">
            <label className="label">Название</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="q-row">
            <div className="field">
              <label className="label">Тип</label>
              <div className="segmented" style={{ width: "100%" }}>
                <button
                  data-active={type === "final"}
                  onClick={() => setType("final")}
                  style={{ flex: 1 }}
                >
                  Итоговый
                </button>
                <button
                  data-active={type === "module"}
                  onClick={() => setType("module")}
                  style={{ flex: 1 }}
                >
                  Тест модуля
                </button>
              </div>
            </div>
            <div className="field">
              <label className="label">Проходной балл, %</label>
              <input
                className="input"
                inputMode="numeric"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>
          </div>

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

          <hr className="divider" />

          {/* ===== Главный переключатель ===== */}
          <div className="stack g8">
            <div className="row between g12" style={{ minHeight: 44 }}>
              <div className="stack g2 grow">
                <span className="small" style={{ fontWeight: 700 }}>
                  Пересдаваемый
                </span>
                <span className="caption muted-3">
                  {retakable
                    ? "Попыток сколько угодно, засчитывается последний результат"
                    : "Одна попытка"}
                </span>
              </div>
              <button
                className="switch"
                data-on={retakable}
                onClick={() => setRetakable((v) => !v)}
                aria-pressed={retakable}
                aria-label="Пересдаваемый"
              />
            </div>
            {/* Подсказка меняется вместе с переключателем */}
            <span className="caption muted-3 pretty">
              {retakable
                ? "Разбор ответов лучше выключить или показывать только после успешной сдачи — иначе вторая попытка сдаётся по памяти. И включите перемешивание вопросов."
                : "У учителя одна попытка. Пересдачу можно разрешить вручную в карточке учителя."}
            </span>
          </div>

          <hr className="divider" />

          <div className="stack g4">
            <div className="row between g12" style={{ minHeight: 44 }}>
              <div className="stack g2 grow">
                <span className="small" style={{ fontWeight: 600 }}>
                  Таймер
                </span>
                <span className="caption muted-3">Ограничение времени на весь тест</span>
              </div>
              <div className="row g8">
                {timer && (
                  <div className="row g6 nowrap">
                    <input
                      className="input"
                      style={{ width: 68, height: 40, textAlign: "center" }}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      inputMode="numeric"
                      aria-label="Минут"
                    />
                    <span className="small muted">мин</span>
                  </div>
                )}
                <button
                  className="switch"
                  data-on={timer}
                  onClick={() => setTimer((v) => !v)}
                  aria-pressed={timer}
                  aria-label="Таймер"
                />
              </div>
            </div>

            <div className="row between g12" style={{ minHeight: 44 }}>
              <div className="stack g2 grow">
                <span className="small" style={{ fontWeight: 600 }}>
                  Перемешивать вопросы
                </span>
                <span className="caption muted-3">Каждый учитель видит свой порядок</span>
              </div>
              <button
                className="switch"
                data-on={shuffle}
                onClick={() => setShuffle((v) => !v)}
                aria-pressed={shuffle}
                aria-label="Перемешивать вопросы"
              />
            </div>

            <div className="row between g12" style={{ minHeight: 44 }}>
              <div className="stack g2 grow">
                <span className="small" style={{ fontWeight: 600 }}>
                  Показывать разбор после сдачи
                </span>
                <span className="caption muted-3">Свой ответ, правильный и пояснение</span>
              </div>
              <button
                className="switch"
                data-on={showReview}
                onClick={() => setShowReview((v) => !v)}
                aria-pressed={showReview}
                aria-label="Разбор после сдачи"
              />
            </div>
          </div>

          {retakable && showReview && (
            <Note kind="warning" icon={<IconInfo size={18} />}>
              <span className="small">
                Тест пересдаваемый, а разбор ответов включён — вторая попытка сдастся
                по памяти. Выключите разбор или включите перемешивание вопросов.
              </span>
            </Note>
          )}
        </div>

        {/* Вопросы */}
        <div className="stack g12">
          {questions.length === 0 && (
            <div className="card card-pad stack g6" style={{ textAlign: "center" }}>
              <strong className="small">Вопросов пока нет</strong>
              <span className="caption muted-3">
                Добавьте первый вопрос — тип, варианты и пояснение задаются прямо в нём.
              </span>
            </div>
          )}
          {questions.map((q, i) => (
            <div key={q.id} className="card" style={{ overflow: "hidden" }}>
              <div
                className="row g10 wrap"
                style={{
                  padding: "10px 14px",
                  background: "#fbfcfe",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span className="muted-3" style={{ cursor: "grab" }}>
                  <IconDrag size={17} />
                </span>
                <span className="caption muted" style={{ letterSpacing: "0.06em" }}>
                  ВОПРОС {i + 1}
                </span>
                <select className="input" style={{ height: 34, width: "auto", fontSize: 13 }} defaultValue={q.type}>
                  <option value="single">{typeLabel.single}</option>
                  <option value="multi">{typeLabel.multi}</option>
                  <option value="bool">{typeLabel.bool}</option>
                </select>
                <div className="grow" />
                <div className="row g6 nowrap">
                  <span className="caption muted">Баллы</span>
                  <input
                    className="input"
                    style={{ width: 56, height: 34, textAlign: "center", fontSize: 13 }}
                    defaultValue={q.points}
                    inputMode="numeric"
                    aria-label="Баллы за вопрос"
                  />
                </div>
                <button className="btn btn-icon" style={{ minHeight: 32, width: 32 }} aria-label="Дублировать">
                  <IconCopy size={16} />
                </button>
                <button
                  className="btn btn-icon"
                  style={{ minHeight: 32, width: 32 }}
                  onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                  aria-label="Удалить вопрос"
                >
                  <IconClose size={17} />
                </button>
              </div>

              <div className="card-pad stack g12">
                <textarea
                  className="input"
                  style={{ minHeight: 68 }}
                  defaultValue={q.text}
                  placeholder="Текст вопроса"
                />

                <div className="stack g8">
                  {q.options.map((opt, oi) => {
                    const correct = q.correct.includes(oi);
                    return (
                      <div key={oi} className="row g10">
                        <span
                          className={`check-box ${q.type === "multi" ? "" : "round"}`}
                          style={{
                            marginTop: 0,
                            background: correct ? "var(--success)" : "#fff",
                            borderColor: correct ? "var(--success)" : "var(--border-strong)",
                            cursor: "pointer",
                          }}
                        >
                          {correct && <IconCheck size={13} />}
                        </span>
                        <input className="input" style={{ height: 44 }} defaultValue={opt} />
                        <button
                          className="btn btn-icon"
                          style={{ minHeight: 40, width: 40 }}
                          aria-label="Удалить вариант"
                        >
                          <IconClose size={16} />
                        </button>
                      </div>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconPlus size={15} />}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Вариант
                  </Button>
                  {q.type === "multi" && (
                    <span className="caption muted-3 pretty">
                      Зачёт только за полностью верный набор — частичных баллов нет.
                    </span>
                  )}
                </div>

                <div className="field">
                  <label className="label">
                    Пояснение к ответу{" "}
                    <span className="label-optional">· показывается в разборе</span>
                  </label>
                  <textarea
                    className="input"
                    style={{ minHeight: 60 }}
                    defaultValue={q.explanation}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          block
          icon={<IconPlus size={17} />}
          onClick={() => {
            setQuestions((qs) => [
              ...qs,
              {
                ...finalQuizQuestions[qs.length % finalQuizQuestions.length],
                id: `new-${Date.now()}`,
              },
            ]);
          }}
        >
          Добавить вопрос
        </Button>

        <span className="caption muted-3">
          Всего {questions.length} вопросов · максимум{" "}
          {questions.reduce((s, q) => s + q.points, 0)} баллов
        </span>
      </div>

      <style>{`
        .q-row { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .q-row { grid-template-columns: 1.4fr 1fr; } }
      `}</style>
    </AdminShell>
  );
}
