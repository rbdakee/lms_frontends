"use client";

/**
 * Задание «/learn/:courseId/task/:id» — раздел 5.9 брифа.
 * Форма сдачи и три статуса: на проверке, зачтено, на доработку с комментарием.
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { getCourse, getLesson, moduleOfLesson } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import {
  Badge,
  Breadcrumbs,
  Button,
  Empty,
  FileRow,
  LinkButton,
  Note,
  Progress,
} from "@lms/ui";
import {
  IconAlert,
  IconCheckCircle,
  IconClock,
  IconClose,
  IconDownload,
  IconUpload,
} from "@lms/ui/icons";

const ADMIN_COMMENTS = {
  accepted:
    "Отличный тест! Хорошие дистракторы во 2-м и 4-м вопросах, баллы расставлены логично. Зачтено.",
  rework:
    "В тесте только 3 вопроса из 5 требуемых. Добавьте ещё два и укажите баллы за каждый вопрос — после этого отправьте заново.",
};

export default function TaskPage() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const router = useRouter();
  const { t, tasks, setTask, completeLesson, toast } = useStore();

  const course = getCourse(courseId);
  const lesson = course ? getLesson(course, id) : undefined;
  const status = tasks[id] ?? "none";

  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  if (!course || !lesson) {
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title="Задание" />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title="Задание не найдено"
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

  const mod = moduleOfLesson(course, lesson.id);

  /** Имитация загрузки файла с процентом. */
  const addFile = () => {
    setUploading(1);
    const tick = setInterval(() => {
      setUploading((p) => {
        if (p >= 100) {
          clearInterval(tick);
          setFiles((f) => [
            ...f,
            { name: "скриншот_моего_теста.jpg", size: "2,4 МБ", type: "JPG" },
          ]);
          return 0;
        }
        return p + 12;
      });
    }, 120);
  };

  const submit = () => {
    setTask(id, "review");
    completeLesson(course.id, id);
    toast("Задание отправлено на проверку", "success");
  };

  const statusCard = () => {
    if (status === "review")
      return (
        <div className="card card-pad stack g14" style={{ borderColor: "#fde68a" }}>
          <div className="row between wrap g10">
            <div className="row g10">
              <span style={{ color: "var(--warning)" }}>
                <IconClock size={22} />
              </span>
              <strong>На проверке</strong>
            </div>
            <Badge kind="review">{t.stReview}</Badge>
          </div>
          <p className="small muted">
            Отправлено сегодня · обычно проверяем за 1–2 рабочих дня. Придёт уведомление
            в колокольчик.
          </p>
          {files.length > 0 && (
            <div className="stack g8">
              {files.map((f) => (
                <FileRow key={f.name} type={f.type} name={f.name} size={f.size} />
              ))}
            </div>
          )}
          <hr className="divider" />
          <div className="stack g8">
            <span className="caption muted-3">
              Прототип: смоделировать решение администратора, не заходя в админку
            </span>
            <div className="row g8 wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTask(id, "accepted");
                  toast("Работа зачтена администратором", "success");
                }}
              >
                Зачесть
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTask(id, "rework");
                  toast("Работа отправлена на доработку");
                }}
              >
                На доработку
              </Button>
            </div>
          </div>
        </div>
      );

    if (status === "accepted")
      return (
        <div className="card card-pad stack g14" style={{ borderColor: "#bbf7d0" }}>
          <div className="row between wrap g10">
            <div className="row g10">
              <span style={{ color: "var(--success)" }}>
                <IconCheckCircle size={22} />
              </span>
              <strong>Зачтено</strong>
            </div>
            <Badge kind="accepted">{t.stAccepted}</Badge>
          </div>
          <div className="stack g6">
            <span className="caption muted-3">Комментарий администратора · 14 мая</span>
            <p className="small pretty">{ADMIN_COMMENTS.accepted}</p>
          </div>
        </div>
      );

    if (status === "rework")
      return (
        <div className="card card-pad stack g14" style={{ borderColor: "#fecaca" }}>
          <div className="row between wrap g10">
            <div className="row g10">
              <span style={{ color: "var(--danger)" }}>
                <IconAlert size={22} />
              </span>
              <strong>На доработку</strong>
            </div>
            <Badge kind="rework">{t.stRework}</Badge>
          </div>
          <div className="stack g6">
            <span className="caption muted-3">Комментарий администратора · 13 мая</span>
            <p className="small pretty">{ADMIN_COMMENTS.rework}</p>
          </div>
          <Button
            block
            onClick={() => {
              setTask(id, "none");
              setFiles([]);
              setText("");
              toast("Можно отправить работу заново");
            }}
          >
            Отправить заново
          </Button>
        </div>
      );

    return null;
  };

  const canSubmit = text.trim().length > 0 || files.length > 0;

  return (
    <>
      <BackHeader
        href={`/courses/${course.id}`}
        title={lesson.title}
        subtitle={`${mod?.title ?? ""} · Урок ${lesson.n}`}
      />

      <main className={status === "none" ? "has-sticky-cta" : "has-tabbar"}>
        <div className="page section stack g24" style={{ paddingTop: 16 }}>
          <Breadcrumbs
            items={[
              { label: course.title, href: `/courses/${course.id}` },
              { label: mod?.title ?? "" },
            ]}
          />

          <div className="task-layout">
            {/* ===== Условие ===== */}
            <section className="stack g16" style={{ minWidth: 0 }}>
              <h1 className="h1 pretty">{lesson.title}</h1>

              <div className="card card-pad stack g14">
                <h2 className="h3">Условие</h2>
                <p className="body pretty">
                  Создайте тест из 5 вопросов в Google Формах по своему предмету. Включите
                  режим теста, назначьте баллы и приложите скриншот или ссылку на форму.
                </p>

                <div className="note note-muted">
                  <IconAlert size={17} />
                  <div className="small">
                    <strong>Критерии оценки: </strong>5 вопросов · включён режим теста ·
                    назначены баллы · хотя бы один вопрос с несколькими правильными ответами
                  </div>
                </div>

                <FileRow
                  type="DOC"
                  name="Шаблон-пример.docx"
                  size="0,1 МБ"
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconDownload size={16} />}
                      onClick={() => toast("Шаблон скачивается", "success")}
                    >
                      <span className="dl-label">{t.download}</span>
                    </Button>
                  }
                />
              </div>

              {/* История сдач */}
              {(status === "accepted" || status === "rework") && (
                <div className="card card-pad stack g10">
                  <h3 className="h3">История сдач</h3>
                  <div className="stack g8">
                    {status === "accepted" && (
                      <div className="row between small">
                        <span>Попытка 2 — зачтено</span>
                        <span className="muted-3">14 мая</span>
                      </div>
                    )}
                    <div className="row between small">
                      <span>Попытка 1 — на доработку</span>
                      <span className="muted-3">13 мая</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ===== Сдача ===== */}
            <section className="stack g16" style={{ minWidth: 0 }}>
              {status !== "none" ? (
                statusCard()
              ) : (
                <div className="card card-pad stack g16">
                  <h2 className="h3">Ваш ответ</h2>

                  <div className="field">
                    <label className="label" htmlFor="answer">
                      Комментарий <span className="label-optional">· необязательно</span>
                    </label>
                    <textarea
                      id="answer"
                      className="input"
                      placeholder="Например: ссылка на форму и что именно вы сделали"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>

                  {/* Загрузка файла */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      addFile();
                    }}
                    style={{
                      border: `1.5px dashed ${dragOver ? "var(--primary)" : "var(--border-strong)"}`,
                      borderRadius: 14,
                      padding: 24,
                      textAlign: "center",
                      background: dragOver ? "var(--primary-bg)" : "#fbfcfe",
                      transition: "all .14s",
                    }}
                  >
                    <div className="stack g10" style={{ alignItems: "center" }}>
                      <span style={{ color: "var(--primary)" }}>
                        <IconUpload size={28} />
                      </span>
                      <span className="small muted drag-hint">Перетащите файлы сюда или</span>
                      <Button variant="secondary" onClick={addFile}>
                        Выбрать файл
                      </Button>
                      <span className="caption muted-3">
                        PDF, DOCX, JPG, PNG · до 20 МБ
                      </span>
                    </div>
                  </div>

                  {uploading > 0 && (
                    <div className="stack g8">
                      <div className="row between caption">
                        <span className="muted">скриншот_моего_теста.jpg</span>
                        <strong>{Math.min(100, uploading)}%</strong>
                      </div>
                      <Progress value={uploading} />
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="stack g8">
                      {files.map((f, i) => (
                        <FileRow
                          key={i}
                          type={f.type}
                          name={f.name}
                          size={f.size}
                          action={
                            <button
                              className="btn btn-icon"
                              style={{ minHeight: 36, width: 36 }}
                              onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
                              aria-label="Удалить файл"
                            >
                              <IconClose size={17} />
                            </button>
                          }
                        />
                      ))}
                    </div>
                  )}

                  <div className="desktop-only">
                    <Button block size="lg" disabled={!canSubmit} onClick={submit}>
                      Отправить на проверку
                    </Button>
                  </div>
                </div>
              )}

              {status !== "none" && (
                <LinkButton href={`/courses/${course.id}`} block variant="secondary">
                  Вернуться к курсу
                </LinkButton>
              )}
            </section>
          </div>
        </div>
      </main>

      {status === "none" && (
        <div className="sticky-cta mobile-only">
          <div className="sticky-cta-inner">
            <Button block size="lg" disabled={!canSubmit} onClick={submit}>
              Отправить на проверку
            </Button>
          </div>
        </div>
      )}

      <TabBar />

      <style>{`
        .task-layout { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
        @media (min-width: 1024px) {
          .task-layout { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 560px) {
          .drag-hint { display: none; }
        }
        @media (max-width: 420px) { .dl-label { display: none; } }
      `}</style>
    </>
  );
}
