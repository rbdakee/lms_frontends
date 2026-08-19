"use client";

/**
 * Редактор задания «/tasks/:id» — раздел 5.20 брифа.
 *
 * Отдельных «типов заданий» нет — вид задания это методика, а не настройка.
 * Оценка только зачтено / на доработку, без баллов: балл за домашку потянул бы
 * за собой итоговую оценку курса, от которой сертификат всё равно не зависит.
 * Число отправок на доработку не ограничено — проверка ручная, ограничивать нечего.
 *
 * На границу уходит `allowed_ext` — список расширений без точки и в нижнем
 * регистре, ровно в том виде, в каком их сравнивает сдача работы. Экран
 * показывает их группами, поэтому соответствие «группа → расширения» заведено
 * явно, а расширение, не попавшее ни в одну группу, живёт отдельным списком
 * и при сохранении не пропадает.
 *
 * Файл-шаблон сохраняется сразу, отдельным `PATCH`: в ответе `GET` у него
 * есть имя, размер и тип, но нет ключа хранилища — а `PATCH` принимает
 * именно ключ, и держать его в форме до кнопки «Сохранить» было бы нечем.
 */

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminTask,
  type AdminTaskPatch,
  type SubmitFormat,
  type UploadedFile,
} from "@lms/api";
import { fileSize } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
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
} from "@lms/ui";
import { IconCheck, IconClose, IconPlus } from "@lms/ui/icons";

/**
 * Группы форматов, как их видит методист, и расширения, как их проверяет
 * сдача работы. Подпись группы перечисляет ровно те расширения, которые
 * уйдут на сервер: иначе галочка «JPG / PNG» тихо разрешала бы что-то ещё.
 */
const EXT_GROUPS: { label: string; ext: string[] }[] = [
  { label: "PDF", ext: ["pdf"] },
  { label: "DOC / DOCX", ext: ["doc", "docx"] },
  { label: "JPG / JPEG / PNG", ext: ["jpg", "jpeg", "png"] },
  { label: "XLS / XLSX", ext: ["xls", "xlsx"] },
  { label: "PPT / PPTX", ext: ["ppt", "pptx"] },
];

/** Группа отмечена, когда пришли все её расширения; остальное — «прочие». */
function parseExt(list: string[]): { groups: string[]; extra: string[] } {
  const has = new Set(list);
  const groups = EXT_GROUPS.filter((g) => g.ext.every((e) => has.has(e)));
  const covered = new Set(groups.flatMap((g) => g.ext));
  return {
    groups: groups.map((g) => g.label),
    extra: list.filter((e) => !covered.has(e)),
  };
}

function buildExt(groups: string[], extra: string[]): string[] {
  const out: string[] = [];
  for (const g of EXT_GROUPS) {
    if (!groups.includes(g.label)) continue;
    for (const e of g.ext) if (!out.includes(e)) out.push(e);
  }
  for (const e of extra) if (!out.includes(e)) out.push(e);
  return out;
}

interface Form {
  title: string;
  html: string;
  submit_format: SubmitFormat;
  groups: string[];
  /* Расширения, заведённые мимо групп: сохраняются, пока их не уберут */
  extra: string[];
  max_size_mb: string;
  time_required_min: string;
  is_hidden: boolean;
}

function formOf(task: AdminTask): Form {
  const { groups, extra } = parseExt(task.allowed_ext);
  return {
    title: task.title,
    html: htmlOf(task.statement),
    submit_format: task.submit_format,
    groups,
    extra,
    max_size_mb: String(task.max_size_mb),
    time_required_min: String(task.time_required_min),
    is_hidden: task.is_hidden,
  };
}

/** `template_file` здесь не уходит: у сохранённого шаблона нет ключа. */
function patchBody(f: Form): AdminTaskPatch {
  const body: AdminTaskPatch = {
    title: f.title.trim(),
    statement: { html: f.html },
    submit_format: f.submit_format,
    allowed_ext: buildExt(f.groups, f.extra),
    time_required_min: Number(f.time_required_min),
    is_hidden: f.is_hidden,
  };
  /* Пустым лимит остаётся, только пока поле спрятано форматом сдачи «текст»:
     видимое пустое поле сохранение не пропускает. Тогда ключ не уходит вовсе,
     и прежнее число сервера остаётся прежним */
  if (f.max_size_mb !== "") body.max_size_mb = Number(f.max_size_mb);
  return body;
}

/**
 * Обязательные числа проверяем до отправки. `null` сервер читает как
 * «не прислано» и возвращает прежнее значение, форма пересобирается ответом,
 * и стёртое число молча возвращается на место при зелёном тосте.
 */
function validate(f: Form): Record<string, string> {
  const wrong: Record<string, string> = {};
  if (f.time_required_min === "") wrong.time_required_min = "Укажите минуты";
  /* Лимит размера показан только когда сдают файлом: подписывать ошибкой
     спрятанное поле некуда */
  if (f.submit_format !== "text" && f.max_size_mb === "") {
    wrong.max_size_mb = "Укажите лимит размера — от 1 до 20 МБ";
  }
  return wrong;
}

const digits = (v: string) => v.replace(/\D/g, "");

export default function TaskEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useStore();

  const task = useLoad(() => api<AdminTask>(`/admin/tasks/${id}`), [id]);
  const data = task.data;

  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);

  /* Форма пересобирается только при смене задания: шаблон ходит на сервер
     своим запросом и не должен стирать набранное */
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
      const updated = await api<AdminTask>(`/admin/tasks/${id}`, {
        method: "PATCH",
        json: patchBody(form),
      });
      task.setData(updated);
      /* Сервер почистил разметку и привёл расширения к своему виду —
         показываем то, что вернулось, а не то, что было набрано */
      setForm(formOf(updated));
      toast("Задание сохранено", "success");
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else toast(isApiError(e) ? e.message : "Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  };

  /* Шаблон сначала уезжает в хранилище, и только потом ключ привязывается
     к заданию: сам по себе загруженный файл ни к чему не относится */
  const uploadTemplate = async (picked: FileList | null) => {
    const file = picked?.[0];
    if (!file || templateBusy) return;
    setTemplateBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      /* Content-Type ставит браузер сам — вместе с boundary,
         без него сервер тело не разберёт */
      const up = await api<UploadedFile>("/files", { method: "POST", body });
      const updated = await api<AdminTask>(`/admin/tasks/${id}`, {
        method: "PATCH",
        json: { template_file: { key: up.key, name: up.name } },
      });
      task.setData(updated);
      toast("Шаблон приложен", "success");
    } catch (e) {
      /* 413 file_too_large приходит готовой строкой — её и показываем */
      toast(isApiError(e) && e.status > 0 ? e.message : "Не удалось загрузить шаблон", "error");
    } finally {
      setTemplateBusy(false);
      if (pickRef.current) pickRef.current.value = "";
    }
  };

  const removeTemplate = async () => {
    if (templateBusy) return;
    setTemplateBusy(true);
    try {
      const updated = await api<AdminTask>(`/admin/tasks/${id}`, {
        method: "PATCH",
        json: { template_file: null },
      });
      task.setData(updated);
      toast("Шаблон убран", "success");
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось убрать шаблон", "error");
    } finally {
      setTemplateBusy(false);
    }
  };

  if (task.loading && !data) {
    return (
      <AdminShell title="Редактор задания">
        <div className="card card-pad row center" style={{ minHeight: 240 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  if (isApiError(task.error, "not_found")) {
    return (
      <AdminShell title="Задание не найдено">
        <div className="card">
          <Empty
            title="Задание не найдено"
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

  if (task.error || !data || !form) {
    return (
      <AdminShell title="Редактор задания">
        <div className="card">
          <Empty
            title="Не удалось загрузить"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={task.reload}>
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

  const toggleGroup = (label: string) =>
    set("groups", form.groups.includes(label)
      ? form.groups.filter((g) => g !== label)
      : [...form.groups, label]);

  const allowed = buildExt(form.groups, form.extra);

  return (
    <AdminShell
      title={form.title || "Редактор задания"}
      subtitle={`${data.course.title} · ${data.module.title}`}
      actions={
        <Button size="sm" loading={saving} onClick={save}>
          Сохранить
        </Button>
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
              Условие ещё не написано, и потому задание скрыто от учителей. Напишите
              условие и снимите «Скрыто от учителей» — иначе оно не появится в программе.
            </span>
          </Note>
        )}

        <div className="card card-pad stack g14">
          <div className="field">
            <label className="label">Название задания</label>
            <input
              className={`input${errors.title ? " input-error" : ""}`}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="field">
            <label className="label">Условие</label>
            <RichEditor
              value={form.html}
              onChange={(html) => set("html", html)}
              invalid={!!errors.statement}
              ariaLabel="Условие задания"
              minHeight={140}
              placeholder="Что учитель должен сделать и что прислать в ответ"
            />
            {errors.statement ? (
              <span className="error-text">{errors.statement}</span>
            ) : (
              <span className="hint">
                Разметку чистит сервер: из вставки из Word останутся только жирный,
                курсив, заголовок, список, цитата, ссылка и таблица — остальное
                исчезнет молча.
              </span>
            )}
          </div>

          <div className="field">
            <label className="label">
              Файл-шаблон <span className="label-optional">· необязательно</span>
            </label>
            {data.template_file && (
              <FileRow
                type={fileType(data.template_file.mime)}
                name={data.template_file.name}
                size={fileSize(data.template_file.size_bytes)}
                action={
                  <button
                    className="btn btn-icon"
                    style={{ minHeight: 34, width: 34 }}
                    aria-label="Убрать шаблон"
                    disabled={templateBusy}
                    onClick={removeTemplate}
                  >
                    <IconClose size={16} />
                  </button>
                }
              />
            )}
            <input
              ref={pickRef}
              type="file"
              hidden
              onChange={(e) => uploadTemplate(e.target.files)}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<IconPlus size={15} />}
              loading={templateBusy}
              style={{ alignSelf: "flex-start", marginTop: 8 }}
              onClick={() => pickRef.current?.click()}
            >
              {data.template_file ? "Заменить шаблон" : "Загрузить шаблон"}
            </Button>
            <span className="hint">
              Шаблон сохраняется сразу, не дожидаясь кнопки «Сохранить».
            </span>
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
                ] as [SubmitFormat, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  data-active={form.submit_format === v}
                  onClick={() => set("submit_format", v)}
                  style={{ flex: 1 }}
                >
                  {label}
                </button>
              ))}
            </div>
            {errors.submit_format && (
              <span className="error-text">{errors.submit_format}</span>
            )}
          </div>

          {form.submit_format !== "text" && (
            <>
              <div className="field">
                <label className="label">Разрешённые форматы файлов</label>
                <div className="stack g4">
                  {EXT_GROUPS.map((g) => (
                    <label key={g.label} className="check">
                      <input
                        type="checkbox"
                        checked={form.groups.includes(g.label)}
                        onChange={() => toggleGroup(g.label)}
                      />
                      <span className="check-box">
                        <IconCheck size={14} />
                      </span>
                      <span className="check-label">{g.label}</span>
                    </label>
                  ))}
                </div>

                {form.extra.length > 0 && (
                  <div className="stack g6" style={{ marginTop: 6 }}>
                    <span className="caption muted-3 pretty">
                      В задании заведены форматы, которых нет в списке выше. Они
                      сохранятся, пока их не убрать здесь.
                    </span>
                    <div className="row wrap g6">
                      {form.extra.map((e) => (
                        <span key={e} className="badge badge-neutral">
                          {e.toUpperCase()}
                          <button
                            className="ext-drop"
                            aria-label={`Убрать формат ${e}`}
                            onClick={() =>
                              set("extra", form.extra.filter((x) => x !== e))
                            }
                          >
                            <IconClose size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {errors.allowed_ext && (
                  <span className="error-text">{errors.allowed_ext}</span>
                )}

                {allowed.length === 0 && (
                  <Note kind="muted">
                    <span className="small pretty">
                      Ограничения по формату нет — учитель приложит файл любого типа.
                      Ограничение по размеру действует всегда.
                    </span>
                  </Note>
                )}
              </div>

              <div className="field" style={{ maxWidth: 260 }}>
                <label className="label">Лимит размера, МБ</label>
                <input
                  className={`input${errors.max_size_mb ? " input-error" : ""}`}
                  inputMode="numeric"
                  value={form.max_size_mb}
                  onChange={(e) => set("max_size_mb", digits(e.target.value))}
                />
                {errors.max_size_mb ? (
                  <span className="error-text">{errors.max_size_mb}</span>
                ) : (
                  <span className="hint">
                    От 1 до 20: потолок стоит у загрузки, и задание не может обещать
                    больше, чем примет сервер.
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ===== Оценка ===== */}
        <div className="card card-pad stack g14">
          <h2 className="h3">Оценка</h2>

          <div className="row wrap g8">
            <Badge kind="accepted">Зачтено</Badge>
            <Badge kind="rework">На доработку</Badge>
          </div>

          <Note kind="muted">
            <span className="small">
              Баллов за задание нет: балл потянул бы за собой итоговую оценку курса,
              от которой сертификат всё равно не зависит. Число отправок на доработку
              не ограничено — проверка ручная, ограничивать нечего.
            </span>
          </Note>
        </div>

        {/* ===== Время и видимость ===== */}
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

          {/* Пустое условие сертификат не ломает — учитель просто не поймёт,
              что сдавать. Поэтому предупреждение, а не запрет */}
          {!form.is_hidden && isEmptyHtml(form.html) && (
            <Note kind="warning">
              <span className="small pretty">
                Условие пустое, а задание открыто учителям: в программе оно появится
                без текста, и что сдавать — непонятно. Напишите условие или скройте
                задание.
              </span>
            </Note>
          )}

          <div className="row g12 between" style={{ alignItems: "flex-start" }}>
            <div className="stack g2">
              <span className="small" style={{ fontWeight: 700 }}>
                Скрыто от учителей
              </span>
              <span className="caption muted-3 pretty">
                Скрытое задание у учителя исчезает целиком — оно не открывается и по
                прямой ссылке. У того, кто его уже сдал, сданное не отбирается.
              </span>
            </div>
            <button
              className="switch"
              data-on={form.is_hidden}
              onClick={() => set("is_hidden", !form.is_hidden)}
              aria-pressed={form.is_hidden}
              aria-label="Скрыто от учителей"
            />
          </div>
        </div>
      </div>

      <style>{`
        .ext-drop {
          display: inline-flex; align-items: center; justify-content: center;
          margin-left: 6px; padding: 0; border: none; background: none;
          color: inherit; cursor: pointer;
        }
      `}</style>
    </AdminShell>
  );
}
