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
 * **Проверяет сервер, а не экран.** Присланный вид складывается с присланным
 * содержимым, и проверяется пара — поэтому смена вида вместе с новым
 * содержимым проходит одним запросом, а смена вида в одиночку отбивается
 * `422` с полем, которое осталось незаполненным. Тексты ошибок приходят
 * готовыми, экран их только раскладывает по полям.
 *
 * Ссылку на YouTube сервер приводит к одному написанию, а разметку чистит
 * по белому списку — поэтому после сохранения в поля кладётся то, что
 * вернулось, а не то, что было набрано.
 *
 * «Предпросмотр как учитель» включает режим на сервере (`POST /admin/preview/enter`)
 * и уводит в кабинет учителя: записи по курсу становятся no-op, доступ
 * считается открытым, строгий порядок уроков не запирает программу. Флаг живёт
 * в сессии, а не в адресе, поэтому режим работает и для черновика. Полоса
 * «Предпросмотр — данные не сохраняются» рисуется клиентским приложением.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminLesson,
  type AdminLessonPatch,
  type LessonFile,
  type LessonKind,
  type UploadedFile,
} from "@lms/api";
import { fileSize } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { enterPreview } from "@/lib/urls";
import { fieldErrors } from "@/lib/fieldErrors";
import { AdminShell } from "@/components/layout/AdminShell";
import { htmlOf, isEmptyHtml, RichEditor } from "@/components/admin/RichEditor";
import {
  Badge,
  Breadcrumbs,
  Button,
  Empty,
  FileRow,
  fileType,
  LinkButton,
  Note,
  Sheet,
} from "@lms/ui";
import { IconClose, IconEye, IconPlus, IconText, IconVideo } from "@lms/ui/icons";

/**
 * Пока принимаем только YouTube: другого видеохостинга у курсов нет.
 * Разбор нужен превью и подсказке «видео распознано» — источник правды
 * всё равно ответ сервера, он же приводит ссылку к одному написанию.
 */
function youtubeId(url: string): string | null {
  const m = url
    .trim()
    .match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^&]*&)*v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/,
    );
  return m ? m[1] : null;
}

interface Form {
  title: string;
  kind: LessonKind;
  html: string;
  video_url: string;
  duration_label: string;
  time_required_min: string;
  is_hidden: boolean;
}

function formOf(l: AdminLesson): Form {
  return {
    title: l.title,
    kind: l.kind,
    html: htmlOf(l.body),
    video_url: l.video_url ?? "",
    duration_label: l.duration_label ?? "",
    time_required_min: String(l.time_required_min),
    is_hidden: l.is_hidden,
  };
}

function patchBody(f: Form): AdminLessonPatch {
  return {
    title: f.title.trim(),
    kind: f.kind,
    /* У видеоурока пустая заметка — это `null`, так она стирается. У текстового
       пустое уходит как есть: отбить его должен сервер, а не экран */
    body: f.kind === "text" || !isEmptyHtml(f.html) ? { html: f.html } : null,
    /* Текстовый урок ссылку не хранит: поля на экране нет, стереть её было бы
       нечем, а прежняя ссылка у текстового урока однажды уже уехала в плеер */
    video_url: f.kind === "video" ? f.video_url.trim() || null : null,
    /* Длительность — то же самое: поля у текстового урока нет, и оставленное
       от прежней жизни «14:20» показывалось бы у урока без видео */
    duration_label: f.kind === "video" ? f.duration_label.trim() || null : null,
    time_required_min: Number(f.time_required_min),
    is_hidden: f.is_hidden,
  };
}

/**
 * Обязательные числа проверяем до отправки. `null` сервер читает как
 * «не прислано» и возвращает прежнее значение, форма пересобирается ответом,
 * и стёртое число молча возвращается на место при зелёном тосте.
 */
function validate(f: Form): Record<string, string> {
  const wrong: Record<string, string> = {};
  if (f.time_required_min === "") wrong.time_required_min = "Укажите минуты";
  return wrong;
}

const digits = (v: string) => v.replace(/\D/g, "");

export default function LessonEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { t, toast } = useStore();

  const lesson = useLoad(() => api<AdminLesson>(`/admin/lessons/${id}`), [id]);
  const data = lesson.data;

  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [entering, setEntering] = useState(false);
  const [removing, setRemoving] = useState<LessonFile | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);

  /* Форма пересобирается только при смене урока: материалы ходят на сервер
     своими запросами и не должны стирать набранное */
  const seeded = useRef<number | null>(null);
  useEffect(() => {
    if (data && seeded.current !== data.id) {
      seeded.current = data.id;
      setForm(formOf(data));
      setErrors({});
    }
  }, [data]);

  const save = async () => {
    if (!form || saving) return;
    const wrong = validate(form);
    if (Object.keys(wrong).length) {
      setErrors(wrong);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const updated = await api<AdminLesson>(`/admin/lessons/${id}`, {
        method: "PATCH",
        json: patchBody(form),
      });
      lesson.setData(updated);
      /* Сервер нормализовал ссылку и почистил разметку — показываем его
         значения, иначе автор не увидит, что с его текстом стало */
      setForm(formOf(updated));
      toast("Урок сохранён", "success");
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else toast(isApiError(e) ? e.message : "Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  };

  /* Файл сначала уезжает в хранилище, и только потом ключ привязывается
     к уроку: сам по себе загруженный файл ни к чему не относится */
  const addFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0 || uploading) return;
    setUploading(true);
    try {
      for (const file of Array.from(picked)) {
        try {
          const body = new FormData();
          body.append("file", file);
          /* Content-Type ставит браузер сам — вместе с boundary,
             без него сервер тело не разберёт */
          const up = await api<UploadedFile>("/files", { method: "POST", body });
          const row = await api<LessonFile>(`/admin/lessons/${id}/files`, {
            method: "POST",
            json: { key: up.key, name: up.name },
          });
          lesson.setData((d) => (d ? { ...d, files: [...d.files, row] } : d));
        } catch (e) {
          /* 413 file_too_large приходит готовой строкой — её и показываем */
          toast(
            isApiError(e) && e.status > 0 ? e.message : "Не удалось загрузить файл",
            "error",
          );
        }
      }
    } finally {
      setUploading(false);
      if (pickRef.current) pickRef.current.value = "";
    }
  };

  /* Материал убирается с подтверждением и по одному запросу за раз: промах
     мимо кнопки стоил бы файла, а второй `DELETE` по той же строке вернул бы
     `404` поверх удачного удаления */
  const removeFile = async () => {
    const file = removing;
    if (!file || removingBusy) return;
    setRemovingBusy(true);
    try {
      await api(`/admin/lesson_files/${file.id}`, { method: "DELETE" });
      lesson.setData((d) =>
        d ? { ...d, files: d.files.filter((f) => f.id !== file.id) } : d,
      );
      toast("Материал убран", "success");
    } catch (e) {
      toast(
        isApiError(e) && e.status > 0 ? e.message : "Не удалось убрать материал",
        "error",
      );
    } finally {
      setRemovingBusy(false);
      setRemoving(null);
    }
  };

  const startPreview = async () => {
    if (!data || entering) return;
    setEntering(true);
    try {
      await enterPreview(data.course.id);
    } catch {
      setEntering(false);
      toast(t.pvError, "error");
    }
  };

  if (lesson.loading && !data) {
    return (
      <AdminShell title="Редактор урока">
        <div className="card card-pad row center" style={{ minHeight: 240 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  if (isApiError(lesson.error, "not_found")) {
    return (
      <AdminShell title="Урок не найден">
        <div className="card">
          <Empty
            title="Урок не найден"
            action={
              <LinkButton href="/courses" variant="secondary">
                К списку курсов
              </LinkButton>
            }
          />
        </div>
      </AdminShell>
    );
  }

  if (lesson.error || !data || !form) {
    return (
      <AdminShell title="Редактор урока">
        <div className="card">
          <Empty
            title="Не удалось загрузить"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={lesson.reload}>
                Повторить
              </Button>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const vid = youtubeId(form.video_url);
  const emptyText = isEmptyHtml(form.html);

  return (
    <AdminShell
      title={form.title || "Редактор урока"}
      subtitle={`${data.course.title} · ${data.module.title}`}
      actions={
        <div className="row g8">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconEye size={16} />}
            loading={entering}
            onClick={startPreview}
          >
            <span className="hide-sm">{t.pvTitle}</span>
          </Button>
          <Button size="sm" loading={saving} onClick={save}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="stack g16" style={{ maxWidth: 860 }}>
        <Breadcrumbs
          items={[
            { label: "Курсы", href: "/courses" },
            { label: data.course.title, href: `/courses/${data.course.id}` },
            { label: "Программа", href: `/courses/${data.course.id}/edit?tab=program` },
            { label: data.module.title },
          ]}
        />

        {!data.is_ready && (
          <Note kind="muted">
            <span className="small pretty">
              Урок ещё не наполнен и потому скрыт от учителей. Заполните обязательное
              поле вида урока и снимите «Скрыт от учителей» — иначе он не появится
              в программе.
            </span>
          </Note>
        )}

        {/* Вид урока и название */}
        <div className="card card-pad stack g14">
          {/* Язык у урока не выбирается: он наследуется от курса, а вторая
              языковая версия — отдельный курс с тем же group_id */}
          <div className="row wrap g8" style={{ alignItems: "center" }}>
            <Badge kind="neutral">
              {data.course.lang === "ru" ? "Русский курс" : "Қазақ курсы"}
            </Badge>
            <span className="caption muted-3 pretty">
              Язык берётся у курса. {data.course.lang === "ru" ? "Казахская" : "Русская"}{" "}
              версия — отдельный курс со своей программой, он переключается{" "}
              <Link href={`/courses/${data.course.id}/edit`}>в редакторе курса</Link>.
            </span>
          </div>

          <div className="field">
            <label className="label">Вид урока</label>
            <div className="segmented" style={{ width: "100%" }}>
              {(
                [
                  ["video", "Видеоурок", <IconVideo key="v" size={16} />],
                  ["text", "Текстовый урок", <IconText key="t" size={16} />],
                ] as [LessonKind, string, React.ReactNode][]
              ).map(([v, label, icon]) => (
                <button
                  key={v}
                  data-active={form.kind === v}
                  onClick={() => set("kind", v)}
                  style={{ flex: 1 }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
            <span className="hint">
              {form.kind === "video"
                ? "Обязательна ссылка на YouTube. Текст под видео и файлы — по желанию."
                : "Обязателен текст урока. Файлы — по желанию, видео в таком уроке нет."}
            </span>
            {form.kind === "text" &&
              (form.video_url.trim() !== "" || form.duration_label.trim() !== "") && (
                <Note kind="warning">
                  <span className="small pretty">
                    В уроке сохранены ссылка на видео и длительность. У текстового
                    урока их нет — при сохранении они сотрутся.
                  </span>
                </Note>
              )}
          </div>

          <div className="field">
            <label className="label">Название урока</label>
            <input
              className={`input${errors.title ? " input-error" : ""}`}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>
        </div>

        {/* Видеоурок: одно видео, обязательное */}
        {form.kind === "video" && (
          <div className="card card-pad stack g12">
            <div className="row g8" style={{ alignItems: "center" }}>
              <strong className="small">Видео урока</strong>
              <Badge kind="review">обязательно</Badge>
            </div>

            <div className="field">
              <label className="label">Ссылка на YouTube</label>
              <input
                className={`input${errors.video_url ? " input-error" : ""}`}
                value={form.video_url}
                onChange={(e) => set("video_url", e.target.value)}
                placeholder="https://youtu.be/… или https://www.youtube.com/watch?v=…"
              />
              {errors.video_url ? (
                <span className="error-text">{errors.video_url}</span>
              ) : (
                <span className="hint">
                  Пока только YouTube: другие хостинги и загрузка своих файлов — позже.
                  Любое написание ссылки сервер приведёт к одному виду.
                  {vid && ` Видео распознано: ${vid}`}
                </span>
              )}
            </div>

            <div className="field" style={{ maxWidth: 220 }}>
              <label className="label">Длительность</label>
              <input
                className={`input${errors.duration_label ? " input-error" : ""}`}
                value={form.duration_label}
                onChange={(e) => set("duration_label", e.target.value)}
                placeholder="12:40"
              />
              {errors.duration_label ? (
                <span className="error-text">{errors.duration_label}</span>
              ) : (
                <span className="hint">
                  Вводится руками: определять её по чужой ссылке ненадёжно.
                </span>
              )}
            </div>

            <div
              style={{
                aspectRatio: "16/9",
                borderRadius: 12,
                background: vid ? "linear-gradient(135deg,#1e293b,#0f172a)" : "#f1f5f9",
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
              {form.kind === "video" ? "Текст под видео" : "Текст урока"}
            </strong>
            {form.kind === "video" ? (
              <Badge kind="neutral">по желанию</Badge>
            ) : (
              <Badge kind="review">обязательно</Badge>
            )}
          </div>

          <RichEditor
            value={form.html}
            onChange={(html) => set("html", html)}
            invalid={!!errors.body}
            ariaLabel={form.kind === "video" ? "Текст под видео" : "Текст урока"}
            placeholder={
              form.kind === "video"
                ? "Краткий конспект, шаги из видео, ссылки — что пригодится после просмотра…"
                : "Текст урока…"
            }
          />
          {errors.body ? (
            <span className="error-text">{errors.body}</span>
          ) : (
            <span className="hint">
              Разметку чистит сервер: из вставки из Word останутся только жирный,
              курсив, заголовок, список, цитата, ссылка и таблица — остальное
              исчезнет молча.
              {form.kind === "text" &&
                emptyText &&
                " Сейчас пусто, и неразрывный пробел сервер считает такой же пустотой."}
            </span>
          )}
        </div>

        {/* Материалы урока */}
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

          {data.files.map((f) => (
            <FileRow
              key={f.id}
              type={fileType(f.mime)}
              name={f.name}
              size={fileSize(f.size_bytes)}
              action={
                <button
                  className="btn btn-icon"
                  style={{ minHeight: 34, width: 34 }}
                  aria-label={`Убрать файл ${f.name}`}
                  disabled={removingBusy}
                  onClick={() => setRemoving(f)}
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
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<IconPlus size={15} />}
            loading={uploading}
            onClick={() => pickRef.current?.click()}
            style={{ alignSelf: "flex-start" }}
          >
            Добавить файлы
          </Button>
        </div>

        {/* Время и видимость */}
        <div className="card card-pad stack g14">
          <div className="field" style={{ maxWidth: 260 }}>
            <label className="label">Требует времени, минут</label>
            <input
              className={`input${errors.time_required_min ? " input-error" : ""}`}
              inputMode="numeric"
              value={form.time_required_min}
              onChange={(e) => set("time_required_min", digits(e.target.value))}
            />
            {errors.time_required_min ? (
              <span className="error-text">{errors.time_required_min}</span>
            ) : (
              <span className="hint">Складывается в сумму по программе курса</span>
            )}
          </div>

          <div className="row g12 between" style={{ alignItems: "flex-start" }}>
            <div className="stack g2">
              <span className="small" style={{ fontWeight: 700 }}>
                Скрыт от учителей
              </span>
              <span className="caption muted-3 pretty">
                Скрытый урок у учителя исчезает целиком — он не открывается и по прямой
                ссылке. У того, кто уже прошёл его, пройденное не отбирается.
              </span>
            </div>
            <button
              className="switch"
              data-on={form.is_hidden}
              onClick={() => set("is_hidden", !form.is_hidden)}
              aria-pressed={form.is_hidden}
              aria-label="Скрыт от учителей"
            />
          </div>
        </div>

        <Note kind="muted">
          <span className="small">
            Учитель увидит урок в этом же порядке:{" "}
            {form.kind === "video" ? "видео, текст, файлы" : "текст, файлы"}. Если
            материала хватает на два урока — заведите второй урок в программе, внутри
            одного второго видео или второго текста не бывает.
          </span>
        </Note>
      </div>

      <Sheet
        open={removing !== null}
        onClose={() => {
          if (!removingBusy) setRemoving(null);
        }}
        title="Убрать материал?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              loading={removingBusy}
              onClick={removeFile}
            >
              Убрать
            </Button>
            <Button
              variant="secondary"
              block
              disabled={removingBusy}
              onClick={() => setRemoving(null)}
            >
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          {removing ? `«${removing.name}»` : "Материал"} пропадёт из урока, и учитель
          его больше не скачает. Вернуть можно только загрузкой файла заново.
        </p>
      </Sheet>

      <style>{`@media (max-width: 700px) { .hide-sm { display: none; } }`}</style>
    </AdminShell>
  );
}
