"use client";

/**
 * Редактор урока «/lessons/:id» — раздел 5.18 брифа.
 *
 * У урока ровно один вид — видеоурок или текстовый, он переключается наверху.
 * В видеоуроке обязательна одна ссылка на YouTube, дальше по желанию текст
 * и файлы. В текстовом обязателен текст, файлы — по желанию. Второго видео
 * и второго текстового блока в уроке не бывает: если материала на два урока,
 * значит это два урока.
 *
 * «Предпросмотр как учитель» включает режим предпросмотра: админ ходит
 * по кабинету учителя, но ничего не записывается — на выходе состояние
 * возвращается как было. Полоса «Предпросмотр — данные не сохраняются»
 * видна всё время, чтобы не перепутать режимы.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { courses, DEMO_COURSE_ID, getCourse, getLesson, moduleOfLesson } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { webPreview } from "@/lib/urls";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Breadcrumbs, Button, FileRow, Note } from "@lms/ui";
import {
  IconBold,
  IconClose,
  IconEye,
  IconHeading,
  IconItalic,
  IconLink,
  IconList,
  IconPlus,
  IconQuote,
  IconTable,
  IconText,
  IconVideo,
} from "@lms/ui/icons";

type Kind = "video" | "text";

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

/**
 * Пока принимаем только YouTube: другого видеохостинга у курсов нет,
 * а «любая ссылка» превращается в неработающий плеер у учителя.
 */
function youtubeId(url: string): string | null {
  const m = url
    .trim()
    .match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^&]*&)*v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/,
    );
  return m ? m[1] : null;
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} КБ`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} МБ`;
}

function fileType(name: string) {
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  return (ext || "файл").toUpperCase().slice(0, 4);
}

const DEMO_TEXT =
  "Google Формы позволяют собрать проверочный тест за несколько минут. В этом уроке создадим тест из пяти вопросов с автоматической проверкой и посмотрим, как ученики видят его на телефоне.";

export default function LessonEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { toast, findDraft, updateDraft, modulesOf } = useStore();
  /* Урок, только что добавленный в программе, лежит в состоянии прототипа */
  const draft = findDraft(id);
  /* Урок открывают из программы любого курса — ищем, кому он принадлежит */
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

  const [title, setTitle] = useState(draft?.title ?? lesson?.title ?? "Новый урок");
  /* Вид урока выбран ещё при добавлении в программу, здесь его можно поменять */
  const [kind, setKind] = useState<Kind>(
    (draft?.kind ?? lesson?.kind) === "text" ? "text" : "video",
  );

  const [videoUrl, setVideoUrl] = useState(
    draft ? "" : lesson?.kind === "video" ? "https://youtu.be/dQw4w9WgXcQ" : "",
  );
  const [videoTime, setVideoTime] = useState(draft ? "" : (lesson?.duration ?? ""));
  const [text, setText] = useState(draft ? "" : DEMO_TEXT);
  const [files, setFiles] = useState<Attachment[]>(
    draft
      ? []
      : [{ id: "f1", name: "Чек-лист создания теста.pdf", size: "0,4 МБ", type: "PDF" }],
  );
  /* Ошибку показываем не при первом же пустом поле, а когда попытались сохранить */
  const [touched, setTouched] = useState(false);

  const pickRef = useRef<HTMLInputElement>(null);

  const vid = youtubeId(videoUrl);
  const videoFilled = videoUrl.trim().length > 0;
  const textFilled = text.trim().length > 0;
  const ready = kind === "video" ? !!vid : textFilled;

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const added: Attachment[] = Array.from(list).map((f, i) => ({
      id: `f${Date.now()}-${i}`,
      name: f.name,
      size: fileSize(f.size),
      type: fileType(f.name),
    }));
    setFiles((prev) => [...prev, ...added]);
    toast(
      added.length === 1 ? `Файл «${added[0].name}» прикреплён` : `Прикреплено файлов: ${added.length}`,
      "success",
    );
  };

  const save = () => {
    setTouched(true);
    if (!ready) {
      toast(
        kind === "video"
          ? "Нужна ссылка на YouTube — без неё видеоурок не сохранить"
          : "Нужен текст урока — без него текстовый урок не сохранить",
        "error",
      );
      return;
    }
    if (draft) updateDraft(id, { title: title.trim() || draft.title, kind });
    toast("Урок сохранён", "success");
  };

  const toolbar = (
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
  );

  const attachments = (
    <div className="card card-pad stack g12">
      <div className="stack g2">
        <div className="row g8" style={{ alignItems: "center" }}>
          <strong className="small">Файлы к уроку</strong>
          <Badge kind="neutral">по желанию</Badge>
        </div>
        <span className="caption muted-3 pretty">
          Любые файлы: презентация, шаблон, изображение, таблица. Учитель увидит их
          под уроком и сможет скачать.
        </span>
      </div>

      {files.map((f) => (
        <FileRow
          key={f.id}
          type={f.type}
          name={f.name}
          size={f.size}
          action={
            <button
              className="btn btn-icon"
              style={{ minHeight: 34, width: 34 }}
              aria-label={`Удалить файл ${f.name}`}
              onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
            >
              <IconClose size={16} />
            </button>
          }
        />
      ))}

      <input
        ref={pickRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        icon={<IconPlus size={15} />}
        onClick={() => pickRef.current?.click()}
        style={{ alignSelf: "flex-start" }}
      >
        Добавить файлы
      </Button>
    </div>
  );

  return (
    <AdminShell
      title={title || "Редактор урока"}
      subtitle={`${course.title} · ${mod?.title ?? ""}`}
      actions={
        <div className="row g8">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconEye size={16} />}
            onClick={() => {
              /* Предпросмотр живёт в клиентском приложении — уходим на его домен */
              window.location.href = webPreview(`/learn/${course.id}/${id}`);
            }}
          >
            <span className="hide-sm">Предпросмотр как учитель</span>
          </Button>
          <Button size="sm" onClick={save}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="stack g16" style={{ maxWidth: 860 }}>
        <Breadcrumbs
          items={[
            { label: "Курсы", href: "/courses" },
            { label: course.title, href: `/courses/${course.id}` },
            { label: "Программа", href: `/courses/${course.id}/edit` },
            { label: mod?.title ?? "" },
          ]}
        />

        {draft && (
          <Note kind="muted">
            <span className="small">
              Новый урок в модуле «{mod?.title ?? ""}». Выберите вид урока и заполните
              обязательное поле — остальное по желанию.
            </span>
          </Note>
        )}

        {/* Вид урока и название */}
        <div className="card card-pad stack g14">
          {/* Язык у урока не выбирается: он наследуется от курса, а вторая
              языковая версия — отдельный курс с тем же groupId */}
          <div className="row wrap g8" style={{ alignItems: "center" }}>
            <Badge kind="neutral">{course.lang === "ru" ? "Русский курс" : "Қазақ курсы"}</Badge>
            <span className="caption muted-3 pretty">
              Язык берётся у курса.{" "}
              {course.lang === "ru" ? "Казахская" : "Русская"} версия — отдельный курс
              со своей программой, он переключается{" "}
              <Link href={`/courses/${course.id}/edit`}>в редакторе курса</Link>.
            </span>
          </div>

          <div className="field">
            <label className="label">Вид урока</label>
            <div className="segmented" style={{ width: "100%" }}>
              {(
                [
                  ["video", "Видеоурок", <IconVideo key="v" size={16} />],
                  ["text", "Текстовый урок", <IconText key="t" size={16} />],
                ] as [Kind, string, React.ReactNode][]
              ).map(([v, label, icon]) => (
                <button
                  key={v}
                  data-active={kind === v}
                  onClick={() => setKind(v)}
                  style={{ flex: 1 }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <span className="hint">
              {kind === "video"
                ? "Обязательна ссылка на YouTube. Текст под видео и файлы — по желанию."
                : "Обязателен текст урока. Файлы — по желанию, видео в таком уроке нет."}
            </span>
          </div>

          <div className="field">
            <label className="label">Название урока</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>

        {/* Видеоурок: одно видео, обязательное */}
        {kind === "video" && (
          <div className="card card-pad stack g12">
            <div className="row g8" style={{ alignItems: "center" }}>
              <strong className="small">Видео урока</strong>
              <Badge kind="review">обязательно</Badge>
            </div>

            <div className="field">
              <label className="label">Ссылка на YouTube</label>
              <input
                className={`input${touched && !vid ? " input-error" : ""}`}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtu.be/… или https://www.youtube.com/watch?v=…"
              />
              {touched && !vid ? (
                <span className="error-text">
                  {videoFilled
                    ? "Не похоже на ссылку YouTube — проверьте адрес"
                    : "Без ссылки видеоурок не сохранится"}
                </span>
              ) : (
                <span className="hint">
                  Пока только YouTube: другие хостинги и загрузка своих файлов — позже.
                  {vid && ` Видео распознано: ${vid}`}
                </span>
              )}
            </div>

            <div className="field" style={{ maxWidth: 220 }}>
              <label className="label">Длительность</label>
              <input
                className="input"
                value={videoTime}
                onChange={(e) => setVideoTime(e.target.value)}
                placeholder="12:40"
              />
              <span className="hint">
                Вводится руками: определять её по чужой ссылке ненадёжно.
              </span>
            </div>

            <div
              style={{
                aspectRatio: "16/9",
                borderRadius: 12,
                background: vid
                  ? "linear-gradient(135deg,#1e293b,#0f172a)"
                  : "#f1f5f9",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "center",
                justifyContent: "center",
                color: vid ? "rgba(255,255,255,.55)" : "var(--text-3)",
                maxWidth: 400,
              }}
            >
              <IconVideo size={40} />
              <span className="caption">
                {vid ? "Так видео увидит учитель" : "Здесь появится видео по ссылке"}
              </span>
            </div>
          </div>
        )}

        {/* Текст: обязателен в текстовом уроке, дополняет видео в видеоуроке */}
        <div className="card card-pad stack g12">
          <div className="row g8" style={{ alignItems: "center" }}>
            <strong className="small">
              {kind === "video" ? "Текст под видео" : "Текст урока"}
            </strong>
            {kind === "video" ? (
              <Badge kind="neutral">по желанию</Badge>
            ) : (
              <Badge kind="review">обязательно</Badge>
            )}
          </div>

          {toolbar}
          <textarea
            className={`input${touched && kind === "text" && !textFilled ? " input-error" : ""}`}
            style={{ minHeight: 160, fontSize: 16 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              kind === "video"
                ? "Краткий конспект, шаги из видео, ссылки — что пригодится после просмотра…"
                : "Текст урока…"
            }
          />
          {touched && kind === "text" && !textFilled && (
            <span className="error-text">Без текста текстовый урок не сохранится</span>
          )}
        </div>

        {attachments}

        <Note kind="muted">
          <span className="small">
            Учитель увидит урок в этом же порядке: {kind === "video" ? "видео, текст, файлы" : "текст, файлы"}.
            Если материала хватает на два урока — заведите второй урок в программе,
            внутри одного второго видео или второго текста не бывает.
          </span>
        </Note>
      </div>

      <style>{`@media (max-width: 700px) { .hide-sm { display: none; } }`}</style>
    </AdminShell>
  );
}
