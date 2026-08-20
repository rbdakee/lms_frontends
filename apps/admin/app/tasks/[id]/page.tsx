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
 *
 * Остальное сохраняется само: текст и числа — по уходу из поля, галочки,
 * переключатель и формат сдачи — сразу по клику, потому что «уйти» из них
 * некуда. По паузе при печати не сохраняем нарочно: на сервер уезжало бы
 * недописанное слово. Кнопка «Сохранить» осталась — ею отправляют всё разом
 * и повторяют то, на чём сервер споткнулся.
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

/**
 * Поля `PATCH` — они же имена, под которыми сервер возвращает ошибки полей,
 * поэтому одним ключом помечены и отправка, и подпись под полем.
 * `template_file` сюда не входит: у сохранённого шаблона нет ключа.
 */
type Field =
  | "title"
  | "statement"
  | "submit_format"
  | "allowed_ext"
  | "max_size_mb"
  | "time_required_min"
  | "is_hidden";

const FIELDS: Field[] = [
  "title",
  "statement",
  "submit_format",
  "allowed_ext",
  "max_size_mb",
  "time_required_min",
  "is_hidden",
];

/** Значение поля строкой — только чтобы сравнить его с сохранённым. */
function mark(f: Form, key: Field): string {
  switch (key) {
    case "title":
      return f.title.trim();
    case "statement":
      return f.html;
    case "submit_format":
      return f.submit_format;
    case "allowed_ext":
      return buildExt(f.groups, f.extra).join(" ");
    case "max_size_mb":
      return f.max_size_mb;
    case "time_required_min":
      return f.time_required_min;
    case "is_hidden":
      return String(f.is_hidden);
  }
}

/**
 * Поле формы → поле `PATCH`. Расходятся они в одном месте: разрешённые
 * расширения человек правит двумя списками, а на сервер уходит один.
 */
const FIELD_OF: Record<keyof Form, Field> = {
  title: "title",
  html: "statement",
  submit_format: "submit_format",
  groups: "allowed_ext",
  extra: "allowed_ext",
  max_size_mb: "max_size_mb",
  time_required_min: "time_required_min",
  is_hidden: "is_hidden",
};

/** Чем форма разошлась с тем, что подтвердил сервер. */
function changed(f: Form, saved: Form): Field[] {
  return FIELDS.filter((key) => mark(f, key) !== mark(saved, key));
}

/**
 * Пустое число не уходит вовсе: `Number("") === 0`, а ноль сервер принимает
 * как значение — минуты обнулились бы молча, а лимит размера отбился бы
 * `422` про `ge=1`, хотя человек просто не дописал число.
 */
function sendable(f: Form, key: Field): boolean {
  if (key === "time_required_min") return f.time_required_min !== "";
  if (key === "max_size_mb") return f.max_size_mb !== "";
  return true;
}

/** Тело `PATCH` из перечисленных полей: у сервера он частичный. */
function patchBody(f: Form, fields: Field[]): AdminTaskPatch {
  const body: AdminTaskPatch = {};
  for (const key of fields) {
    if (key === "title") body.title = f.title.trim();
    if (key === "statement") body.statement = { html: f.html };
    if (key === "submit_format") body.submit_format = f.submit_format;
    if (key === "allowed_ext") body.allowed_ext = buildExt(f.groups, f.extra);
    if (key === "max_size_mb") body.max_size_mb = Number(f.max_size_mb);
    if (key === "time_required_min") body.time_required_min = Number(f.time_required_min);
    if (key === "is_hidden") body.is_hidden = f.is_hidden;
  }
  return body;
}

/** Значение поля из ответа сервера — на место набранного. */
function adopt(f: Form, from: Form, key: Field): Form {
  if (key === "title") return { ...f, title: from.title };
  if (key === "statement") return { ...f, html: from.html };
  if (key === "submit_format") return { ...f, submit_format: from.submit_format };
  if (key === "allowed_ext") return { ...f, groups: from.groups, extra: from.extra };
  if (key === "max_size_mb") return { ...f, max_size_mb: from.max_size_mb };
  if (key === "time_required_min") return { ...f, time_required_min: from.time_required_min };
  return { ...f, is_hidden: from.is_hidden };
}

/**
 * Подписи к пустым числам. Лимит размера подписываем, только пока он виден:
 * форматом сдачи «текст» поле спрятано, и ошибке негде показаться.
 */
function validate(f: Form): Record<string, string> {
  const wrong: Record<string, string> = {};
  if (f.time_required_min === "") wrong.time_required_min = "Укажите минуты";
  if (f.submit_format !== "text" && f.max_size_mb === "") {
    wrong.max_size_mb = "Укажите лимит размера — от 1 до 20 МБ";
  }
  return wrong;
}

/** Короткая отметка рядом с кнопкой — вместо тоста на каждое поле. */
type SaveState = { kind: "saving" } | { kind: "ok" } | { kind: "fail"; text: string };

const digits = (v: string) => v.replace(/\D/g, "");

export default function TaskEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useStore();

  const task = useLoad(() => api<AdminTask>(`/admin/tasks/${id}`), [id]);
  const data = task.data;

  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);

  /* Форма и последнее подтверждённое сервером лежат ещё и в ref: сохранение
     живёт в асинхронном цикле, и состояние из замыкания там уже прошлое */
  const formRef = useRef<Form | null>(null);
  const savedRef = useRef<Form | null>(null);
  /* Запрос идёт один за раз — тогда ответы возвращаются в том же порядке,
     в каком уходили правки, и ответ первого не может затереть второе.
     Набежавшее за время запроса уедет следующим, а не потеряется */
  const busy = useRef(false);
  /* Поля, которые человек уже дописал: ушёл из поля или щёлкнул галочку.
     Отправляется только очередь, а не всё расхождение с сервером — иначе
     после чужого ответа уехало бы недописанное соседнее поле */
  const queued = useRef(new Set<Field>());
  /* Значения, на которых сервер уже споткнулся: пока в поле стоит ровно
     оно, соседние правки не тащат его с собой и не ловят тот же отказ */
  const refused = useRef(new Map<Field, string>());

  /* Форма пересобирается только при смене задания: шаблон ходит на сервер
     своим запросом и не должен стирать набранное */
  const seeded = useRef<number | null>(null);
  useEffect(() => {
    if (data && seeded.current !== data.id) {
      seeded.current = data.id;
      const fresh = formOf(data);
      formRef.current = fresh;
      savedRef.current = fresh;
      setForm(fresh);
      setErrors({});
      setSaveState(null);
      queued.current.clear();
      refused.current.clear();
    }
  }, [data]);

  /**
   * Прокручивает очередь и повторяет круг, пока она не опустеет: правка,
   * дописанная во время запроса, уедет следующим кругом, а не потеряется.
   *
   * `byHand` — нажали кнопку: тогда отметка «сохранено» появляется и когда
   * отправлять было нечего, иначе кнопка выглядела бы сломанной.
   */
  const run = async (byHand = false) => {
    if (busy.current) return;
    busy.current = true;
    let anySent = false;
    try {
      for (;;) {
        const f = formRef.current;
        const saved = savedRef.current;
        if (!f || !saved) return;

        const wrong = validate(f);
        const dirty = changed(f, saved);
        const ready = dirty.filter(
          (key) => queued.current.has(key) && refused.current.get(key) !== mark(f, key),
        );
        const fields = ready.filter((key) => sendable(f, key));
        /* Подписи под отправляемыми полями снимаем заранее: дальше их
           поставит либо проверка пустого числа, либо ответ сервера */
        setErrors((prev) => {
          const next = { ...prev };
          for (const key of ready) delete next[key];
          for (const key of ready) if (wrong[key]) next[key] = wrong[key];
          return next;
        });

        if (!fields.length) {
          const marked =
            ready.some((key) => wrong[key]) ||
            dirty.some((key) => refused.current.get(key) === mark(f, key));
          if (marked) setSaveState({ kind: "fail", text: "Проверьте отмеченные поля." });
          /* Дописанного нет, а расхождение осталось — человек ещё в поле */
          else if (dirty.length) setSaveState({ kind: "fail", text: "" });
          else if (anySent || byHand) setSaveState({ kind: "ok" });
          return;
        }

        setSaveState({ kind: "saving" });
        /* Что ушло на сервер — чтобы не затереть ответом то, что успели
           набрать, пока запрос летел */
        const sent = new Map(fields.map((key): [Field, string] => [key, mark(f, key)]));
        let updated: AdminTask;
        try {
          updated = await api<AdminTask>(`/admin/tasks/${id}`, {
            method: "PATCH",
            json: patchBody(f, fields),
          });
        } catch (e) {
          const bad = fieldErrors(e);
          if (Object.keys(bad).length) {
            /* Набранное остаётся в поле: из отказа выходят правкой значения,
               а не тем, что экран вернёт прежнее */
            setErrors((prev) => ({ ...prev, ...bad }));
            for (const key of fields) {
              if (bad[key] !== undefined) refused.current.set(key, sent.get(key) ?? "");
            }
            setSaveState({ kind: "fail", text: "Проверьте отмеченные поля." });
          } else {
            setSaveState({
              kind: "fail",
              text: isApiError(e) ? e.message : "Не удалось сохранить.",
            });
          }
          return;
        }

        anySent = true;
        task.setData(updated);
        const fresh = formOf(updated);
        savedRef.current = fresh;
        /* Сервер почистил разметку и привёл расширения к своему виду —
           показываем то, что вернулось. Но только там, где поле с момента
           отправки не трогали: иначе ответ съел бы свежий набор */
        let next = formRef.current ?? fresh;
        for (const key of fields) {
          refused.current.delete(key);
          /* Из очереди поле уходит только сохранённым: пока запрос летел,
             в нём могли снова начать печатать — это уедет по уходу из него,
             а не сейчас */
          queued.current.delete(key);
          if (mark(next, key) === sent.get(key)) next = adopt(next, fresh, key);
        }
        formRef.current = next;
        setForm(next);
      }
    } finally {
      busy.current = false;
    }
  };

  /** Поле дописано — в очередь и на сервер. */
  const flush = (...keys: Field[]) => {
    for (const key of keys) queued.current.add(key);
    run();
  };

  /* Кнопка отправляет всё разом и заново пробует то, на чём сервер
     споткнулся: правку рядом отказ одного поля больше не задерживает,
     а повторить его надо чем-то явным */
  const saveAll = () => {
    const f = formRef.current;
    const saved = savedRef.current;
    if (f && saved) for (const key of changed(f, saved)) queued.current.add(key);
    refused.current.clear();
    run(true);
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

  /* Единственное место, где меняется форма: рядом с состоянием пишется ref,
     из которого читает сохранение */
  const write = (next: Form) => {
    formRef.current = next;
    setForm(next);
    /* «Сохранено» относилось к прошлому значению — снимаем */
    setSaveState((s) => (s?.kind === "ok" ? null : s));
  };

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    write({ ...form, [key]: value });

  /* У галочки, переключателя и формата сдачи ухода из поля нет — сохраняем
     сразу по клику */
  const setNow = <K extends keyof Form>(key: K, value: Form[K]) => {
    write({ ...form, [key]: value });
    flush(FIELD_OF[key]);
  };

  const toggleGroup = (label: string) =>
    setNow("groups", form.groups.includes(label)
      ? form.groups.filter((g) => g !== label)
      : [...form.groups, label]);

  const allowed = buildExt(form.groups, form.extra);

  return (
    <AdminShell
      title={form.title || "Редактор задания"}
      subtitle={`${data.course.title} · ${data.module.title}`}
      actions={
        <div className="row g10" style={{ flexShrink: 0 }}>
          {saveState && (
            <span
              className="caption save-note"
              style={{
                color:
                  saveState.kind === "fail"
                    ? "var(--danger)"
                    : saveState.kind === "ok"
                      ? "var(--success)"
                      : "var(--text-2)",
              }}
            >
              {saveState.kind === "saving" && "Сохраняем…"}
              {saveState.kind === "ok" && "Сохранено"}
              {saveState.kind === "fail" && (
                <>
                  Не сохранено
                  {saveState.text && <span className="save-why">. {saveState.text}</span>}
                </>
              )}
            </span>
          )}
          <Button
            size="sm"
            style={{ flexShrink: 0 }}
            loading={saveState?.kind === "saving"}
            onClick={saveAll}
          >
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
              onBlur={() => flush("title")}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          {/* Своего onBlur у редактора условия нет — он живёт в contentEditable,
              а focusout всплывает сюда. Уход внутрь самого редактора (окно
              ссылки) уходом из поля не считается */}
          <div
            className="field"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) flush("statement");
            }}
          >
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
                  onClick={() => setNow("submit_format", v)}
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
                              setNow("extra", form.extra.filter((x) => x !== e))
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
                  onBlur={() => flush("max_size_mb")}
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
              onBlur={() => flush("time_required_min")}
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
              onClick={() => setNow("is_hidden", !form.is_hidden)}
              aria-pressed={form.is_hidden}
              aria-label="Скрыто от учителей"
            />
          </div>
        </div>
      </div>

      <style>{`
        .save-note { max-width: 220px; text-align: right; }
        /* На телефоне в шапке помещается только само состояние: с причиной
           она выдавливает кнопку «Сохранить» за край. Причина при отказе поля
           всё равно подписана под самим полем */
        @media (max-width: 720px) {
          .save-note { max-width: 96px; }
          .save-why { display: none; }
        }
        .ext-drop {
          display: inline-flex; align-items: center; justify-content: center;
          margin-left: 6px; padding: 0; border: none; background: none;
          color: inherit; cursor: pointer;
        }
      `}</style>
    </AdminShell>
  );
}
