"use client";

/**
 * Редактор содержимого курса «/courses/:id/edit» — раздел 5.17 брифа.
 * Четыре вкладки: Основное · Программа · Условия сертификата · Публикация.
 *
 * Языковой версии внутри курса нет: русская и казахская версии — два
 * самостоятельных курса с общим groupId, поэтому переключатель «РУС | ҚАЗ»
 * в шапке редактора не меняет поля формы, а открывает другой курс.
 *
 * Правка контента вынесена из карточки курса отдельным экраном: в самой
 * карточке методист работает с людьми — участниками, проверкой, отзывами,
 * и редактор не должен стоять с ними в одном ряду вкладок.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  allLessons,
  categories,
  courseParticipants,
  getCourse,
  groupVersions,
  programMinutes,
  type CourseStatus,
  type LessonKind,
} from "@lms/prototype/data";
import { day, duration, price as fmtPrice, plural } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { COURSE_STATUS_LABEL, COURSE_STATUS_ORDER } from "@/components/admin/courseStatus";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  Badge,
  Button,
  Cover,
  Empty,
  LinkButton,
  Note,
  Sheet,
  StatusBadge,
} from "@lms/ui";
import {
  IconBook,
  IconCheck,
  IconCopy,
  IconDrag,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconImage,
  IconMore,
  IconPlus,
  IconQuiz,
  IconTask,
  IconText,
  IconTrash,
  IconVideo,
} from "@lms/ui/icons";

type Tab = "main" | "program" | "cert" | "publish";

/**
 * Из чего собирается модуль. Видеоурок и текстовый — это два вида одного
 * элемента «урок», поэтому кнопка добавления у них одна, а вид выбирается
 * переключателем; тест и задание живут в своих редакторах.
 */
const KIND_META: Record<
  LessonKind,
  { label: string; hint: string; title: string; time: number }
> = {
  video: {
    label: "Видеоурок",
    hint: "Обязательна ссылка на YouTube, текст под видео и файлы — по желанию",
    title: "Новый видеоурок",
    time: 12,
  },
  text: {
    label: "Текстовый урок",
    hint: "Обязателен текст, файлы — по желанию, видео в таком уроке нет",
    title: "Новый текстовый урок",
    time: 10,
  },
  quiz: {
    label: "Тест",
    hint: "Вопросы с вариантами, проходной балл, одна попытка или пересдачи",
    title: "Новый тест",
    time: 15,
  },
  task: {
    label: "Задание",
    hint: "Условие, формат сдачи и ручная проверка администратором",
    title: "Новое задание",
    time: 40,
  },
};

/** Что вообще добавляют в модуль: урок (двух видов), тест, задание */
type AddGroup = "lesson" | "quiz" | "task";

const GROUP_META: Record<AddGroup, { label: string; hint: string }> = {
  lesson: {
    label: "Урок",
    hint: "Видеоурок или текстовый — вид выбирается следующим шагом",
  },
  quiz: { label: KIND_META.quiz.label, hint: KIND_META.quiz.hint },
  task: { label: KIND_META.task.label, hint: KIND_META.task.hint },
};

const GROUP_ORDER: AddGroup[] = ["lesson", "quiz", "task"];

/** Два вида урока — переключатель внутри окна добавления */
const LESSON_KINDS: Extract<LessonKind, "video" | "text">[] = ["video", "text"];

const groupOf = (kind: LessonKind): AddGroup =>
  kind === "quiz" ? "quiz" : kind === "task" ? "task" : "lesson";

function groupIcon(group: AddGroup) {
  return group === "lesson" ? IconBook : group === "quiz" ? IconQuiz : IconTask;
}

/** Куда ведёт элемент программы: урок, тест и задание редактируются по-разному */
function editorHref(kind: LessonKind, itemId: string) {
  if (kind === "quiz") return `/quizzes/${itemId}`;
  if (kind === "task") return `/tasks/${itemId}`;
  return `/lessons/${itemId}`;
}

function kindIcon(kind: LessonKind) {
  return kind === "video"
    ? IconVideo
    : kind === "text"
      ? IconText
      : kind === "quiz"
        ? IconQuiz
        : IconTask;
}

export default function CourseEditorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const {
    toast,
    isStrict,
    setStrict,
    lang: uiLang,
    addModule,
    addItem,
    draftsOf,
    modulesOf,
    removeDraft,
  } = useStore();
  const course = getCourse(id);

  const [tab, setTab] = useState<Tab>("main");
  const [createVersion, setCreateVersion] = useState(false);
  const [copyProgram, setCopyProgram] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  /* Добавление элемента программы: тип → модуль → название и время.
     У урока тип двухуровневый: сначала «урок», потом видео или текст */
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<LessonKind>("video");
  const [addModuleId, setAddModuleId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addTime, setAddTime] = useState("12");
  /* Новый модуль — отдельным шагом, внутрь него сразу предлагаем добавить элемент */
  const [moduleOpen, setModuleOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");

  /* Из карточки курса приходят сразу в программу: /edit?tab=program */
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "program" || t === "cert" || t === "publish") setTab(t);
  }, []);

  /* Условия сертификата — управляют живым превью справа */
  const [cAll, setCAll] = useState(true);
  const [cTasks, setCTasks] = useState(true);
  const [cModuleTests, setCModuleTests] = useState(false);
  const [cFinal, setCFinal] = useState(true);
  const [moduleScore, setModuleScore] = useState("70");
  const [finalScore, setFinalScore] = useState("70");
  const [hours, setHours] = useState(String(course?.hours ?? 36));

  const [form, setForm] = useState({
    title: course?.title ?? "",
    short: course?.short ?? "",
    full: course?.full ?? "",
    category: course?.category ?? categories[0],
    hours: String(course?.hours ?? 36),
    weeks: course?.weeks ?? "",
    price: course?.price ? String(course.price) : "",
    status: (course?.status ?? "draft") as CourseStatus,
    startsAt: course?.startsAt ?? "",
  });

  /* «Требует времени» у каждого элемента — вручную, суммируется внизу дерева */
  const [times, setTimes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (course ? allLessons(course) : []).map((l) => [l.id, String(l.timeMin)]),
    ),
  );

  if (!course) {
    return (
      <AdminShell title="Курс не найден">
        <div className="card">
          <Empty
            title="Курс не найден"
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

  const versions = groupVersions(course);
  const other = versions.find((c) => c.id !== course.id);
  const missingLang = course.lang === "ru" ? "kz" : "ru";

  /** Уроки, по которым у кого-то уже есть прогресс: их можно только скрыть */
  const maxDone = Math.max(0, ...courseParticipants(course.id).map((p) => p.lessonsDone));
  const lessons = allLessons(course);
  const hasProgress = (lessonId: string) => {
    const i = lessons.findIndex((l) => l.id === lessonId);
    return i >= 0 && i < maxDone;
  };

  /* Дерево программы: модули курса и добавленные админом, внутри — их элементы */
  const program = [
    ...(course.modulesList ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      rows: [
        ...m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          kind: l.kind,
          timeMin: l.timeMin ?? 0,
          isNew: false,
        })),
        ...draftsOf(course.id, m.id).map((d) => ({
          id: d.id,
          title: d.title,
          kind: d.kind,
          timeMin: d.timeMin,
          isNew: true,
        })),
      ],
    })),
    ...modulesOf(course.id).map((m) => ({
      id: m.id,
      title: m.title,
      rows: draftsOf(course.id, m.id).map((d) => ({
        id: d.id,
        title: d.title,
        kind: d.kind,
        timeMin: d.timeMin,
        isNew: true,
      })),
    })),
  ];

  const minutesOf = (row: { id: string; timeMin: number }) =>
    Number(times[row.id] ?? row.timeMin) || 0;

  const byElements = programMinutes(course);
  const currentSum = program.reduce(
    (s, m) => s + m.rows.reduce((ms, r) => ms + minutesOf(r), 0),
    0,
  );

  const addGroup = groupOf(addKind);

  /** Открыть окно добавления с выбранным типом и, если известно, модулем */
  const openAdd = (kind: LessonKind, moduleId?: string) => {
    setAddKind(kind);
    setAddTime(String(KIND_META[kind].time));
    setAddTitle("");
    setAddModuleId(moduleId ?? program[0]?.id ?? "");
    setAddOpen(true);
  };

  const pickKind = (kind: LessonKind) => {
    setAddKind(kind);
    setAddTime(String(KIND_META[kind].time));
  };

  /** Урок открывается видеоуроком: он у методистов чаще */
  const pickGroup = (group: AddGroup) =>
    pickKind(group === "lesson" ? "video" : group);

  /** Добавить элемент в модуль и, если нужно, сразу открыть его редактор */
  const submitAdd = (openEditor: boolean) => {
    const meta = KIND_META[addKind];
    const moduleId = addModuleId || program[0]?.id || "";
    const created = addItem({
      courseId: course.id,
      moduleId,
      title: addTitle.trim() || meta.title,
      kind: addKind,
      timeMin: Number(addTime) || meta.time,
    });
    setTimes((t) => ({ ...t, [created.id]: String(created.timeMin) }));
    setAddOpen(false);
    if (openEditor) {
      router.push(editorHref(created.kind, created.id));
      return;
    }
    const modTitle = program.find((m) => m.id === moduleId)?.title ?? "";
    toast(`Добавили «${created.title}» в модуль «${modTitle}» — пока черновик`, "success");
  };

  const submitModule = () => {
    const created = addModule(
      course.id,
      moduleTitle.trim() || `Модуль ${program.length + 1}`,
    );
    setModuleOpen(false);
    setModuleTitle("");
    openAdd("video", created.id);
  };

  const anyCondition = cAll || cTasks || cModuleTests || cFinal;

  const readiness = [
    { ok: Boolean(form.title.trim()), text: "Название и описание заполнены" },
    { ok: true, text: "Обложка загружена" },
    {
      ok: false,
      text: "У 2 уроков нет контента — «Безопасность в интернете», «Совместные документы»",
    },
    { ok: false, text: "В итоговом тесте 0 вопросов" },
    { ok: Boolean(form.hours.trim()), text: "Объём курса в часах заполнен" },
    {
      ok: form.status !== "planned" || Boolean(form.startsAt),
      text: "У запланированного курса задана дата старта",
    },
  ];
  const problems = readiness.filter((r) => !r.ok).length;

  const publish = (status: CourseStatus, message: string) => {
    setForm((f) => ({ ...f, status }));
    toast(message, "success");
  };

  return (
    <AdminShell
      title={course.title}
      subtitle="Редактирование содержимого"
      actions={
        <Button variant="secondary" size="sm" onClick={() => toast("Черновик сохранён", "success")}>
          Сохранить
        </Button>
      }
    >
      <div className="stack g20">
        {/* ===== Шапка редактора: языковая версия открывает другой курс ===== */}
        <div className="card card-pad row wrap g12 between">
          <div className="row wrap g10">
            <div className="segmented">
              {versions.map((v) => (
                <button
                  key={v.id}
                  data-active={v.id === course.id}
                  onClick={() => router.push(`/courses/${v.id}/edit`)}
                >
                  {v.lang === "ru" ? "РУС" : "ҚАЗ"}
                </button>
              ))}
            </div>
            {other ? (
              <span className="caption muted-3 pretty" style={{ maxWidth: 340 }}>
                Переключатель открывает другой курс: «{other.title}». Версии живут своей
                жизнью — своя программа, цена и дата старта.
              </span>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setCreateVersion(true)}>
                <IconPlus size={15} />
                Создать {missingLang === "kz" ? "казахскую" : "русскую"} версию
              </Button>
            )}
          </div>
          <div className="row g8">
            <StatusBadge status={COURSE_STATUS_LABEL[form.status]} />
            <LinkButton href={`/courses/${course.id}`} variant="ghost" size="sm">
              К карточке курса
            </LinkButton>
          </div>
        </div>

        <div className="tabs">
          {(
            [
              ["main", "Основное"],
              ["program", "Программа"],
              ["cert", "Условия сертификата"],
              ["publish", "Публикация"],
            ] as [Tab, string][]
          ).map(([v, label]) => (
            <button key={v} data-active={tab === v} onClick={() => setTab(v)}>
              {label}
            </button>
          ))}
        </div>

        {/* ===== Вкладка «Основное» ===== */}
        {tab === "main" && (
          <div className="edit-two">
            <div className="stack g16">
              <div className="card card-pad stack g14">
                <div className="field">
                  <label className="label">Название курса</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={course.lang === "kz" ? "Курс атауы" : "Название курса"}
                  />
                </div>

                <div className="field">
                  <label className="label">Короткое описание</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 80 }}
                    value={form.short}
                    onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
                    placeholder="Одно предложение — показывается в карточке каталога"
                  />
                </div>

                <div className="field">
                  <label className="label">Полное описание</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 120 }}
                    value={form.full}
                    onChange={(e) => setForm((f) => ({ ...f, full: e.target.value }))}
                  />
                </div>

                <div className="edit-row">
                  <div className="field">
                    <label className="label">Категория</label>
                    <select
                      className="input"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Объём — обязательное поле, рядом серая подсказка по программе */}
                  <div className="field">
                    <label className="label">
                      Объём курса, часов{" "}
                      <span style={{ color: "var(--danger)" }}>· обязательно</span>
                    </label>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.hours}
                      onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                    />
                    <span className="hint">
                      По элементам курса набирается {duration(byElements)}. Это подсказка,
                      а не значение поля: в сертификате пишут учебный объём вместе
                      с самостоятельной работой.
                    </span>
                  </div>
                </div>

                <div className="field">
                  <label className="label">
                    Сколько обычно занимает{" "}
                    <span className="label-optional">· необязательно</span>
                  </label>
                  <input
                    className="input"
                    value={form.weeks}
                    onChange={(e) => setForm((f) => ({ ...f, weeks: e.target.value }))}
                    placeholder="≈ 6 недель"
                  />
                  <span className="hint">Показывается в карточке каталога рядом с объёмом</span>
                </div>
              </div>

              {/* Набор: цена, статус, дата старта */}
              <div className="card card-pad stack g14">
                <h2 className="h3">Набор на курс</h2>
                <div className="edit-row">
                  <div className="field">
                    <label className="label">Цена, ₸</label>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="45000"
                    />
                    <span className="hint">
                      Пусто — в каталоге «Цена по запросу». Деньги принимает администратор
                      вне платформы, платёжных форм в продукте нет.
                    </span>
                  </div>
                  <div className="field">
                    <label className="label">Статус набора</label>
                    <select
                      className="input"
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, status: e.target.value as CourseStatus }))
                      }
                    >
                      {COURSE_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {COURSE_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="label">
                    Дата старта
                    {form.status === "planned" ? (
                      <span style={{ color: "var(--danger)" }}> · обязательно</span>
                    ) : (
                      <span className="label-optional"> · необязательно</span>
                    )}
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                  />
                  <span className="hint">
                    Именно она рисует бейдж «Старт {day(form.startsAt || "2026-09-01", uiLang)}»
                    в каталоге.
                  </span>
                </div>

                {form.status === "planned" && !form.startsAt && (
                  <Note kind="warning">
                    <span className="small">
                      У запланированного курса дата старта обязательна — без неё
                      в каталоге нечего показать.
                    </span>
                  </Note>
                )}
              </div>
            </div>

            <div className="card card-pad stack g12">
              <h2 className="h3">Обложка</h2>
              <Cover tone={course.cover} style={{ borderRadius: 12 }} />
              <Button
                variant="secondary"
                block
                icon={<IconImage size={17} />}
                onClick={() => toast("Открылся бы выбор файла")}
              >
                Заменить обложку
              </Button>
              <span className="caption muted-3">
                Формат 16:9, минимум 640×360. Показывается в каталоге и на странице курса.
              </span>
            </div>
          </div>
        )}

        {/* ===== Вкладка «Программа» ===== */}
        {tab === "program" && (
          <div className="stack g16">
            <div className="row wrap g8">
              <Button size="sm" icon={<IconPlus size={15} />} onClick={() => setModuleOpen(true)}>
                Модуль
              </Button>
              {GROUP_ORDER.map((g) => {
                const Icon = groupIcon(g);
                return (
                  <Button
                    key={g}
                    variant="secondary"
                    size="sm"
                    icon={<Icon size={15} />}
                    disabled={program.length === 0}
                    onClick={() => openAdd(g === "lesson" ? "video" : g)}
                  >
                    {GROUP_META[g].label}
                  </Button>
                );
              })}
            </div>

            <span className="caption muted-3 pretty">
              Урок бывает двух видов — видеоурок и текстовый, вид выбирается при
              добавлении и меняется в редакторе урока. У теста и задания свои редакторы.
            </span>

            {program.length === 0 ? (
              <div className="card">
                <Empty
                  title="Программа пока пустая"
                  text="Добавьте модуль, а внутрь — уроки, тесты и задания."
                  action={
                    <Button icon={<IconPlus size={16} />} onClick={() => setModuleOpen(true)}>
                      Добавить модуль
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="stack g12">
                {program.map((m) => (
                  <div key={m.id} className="card" style={{ overflow: "hidden" }}>
                    <div
                      className="row g10"
                      style={{
                        padding: "14px 16px",
                        background: "#fbfcfe",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span className="muted-3" style={{ cursor: "grab" }}>
                        <IconDrag size={18} />
                      </span>
                      <div className="grow stack g2" style={{ minWidth: 0 }}>
                        <strong className="small">{m.title}</strong>
                        <span className="caption muted-3">
                          {m.rows.length}{" "}
                          {plural(m.rows.length, "элемент", "элемента", "элементов")} ·{" "}
                          {duration(m.rows.reduce((s, r) => s + minutesOf(r), 0))}
                        </span>
                      </div>
                      <button
                        className="btn btn-icon"
                        style={{ minHeight: 34, width: 34 }}
                        aria-label="Действия"
                      >
                        <IconMore size={17} />
                      </button>
                    </div>

                    {m.rows.length === 0 && (
                      <p
                        className="small muted pretty"
                        style={{ padding: "14px 16px", margin: 0 }}
                      >
                        В модуле пока ничего нет — добавьте первый элемент кнопками ниже.
                      </p>
                    )}

                    {m.rows.map((l) => {
                      const Icon = kindIcon(l.kind);
                      const href = editorHref(l.kind, l.id);
                      const draft = l.isNew || l.id === "l2" || l.id === "l8";
                      const locked = hasProgress(l.id);
                      return (
                        <div
                          key={l.id}
                          className="row wrap g10 program-row"
                          style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}
                        >
                          <span className="muted-3" style={{ cursor: "grab" }}>
                            <IconDrag size={16} />
                          </span>
                          <span
                            className="lesson-icon"
                            style={{ width: 30, height: 30, borderRadius: 9 }}
                          >
                            <Icon size={16} />
                          </span>
                          <Link href={href} className="grow" style={{ minWidth: 120 }}>
                            <span className="small" style={{ fontWeight: 600 }}>
                              {l.title}
                            </span>
                          </Link>

                          {/* Требует времени — вручную у урока, теста и задания */}
                          <label className="row g6 nowrap caption muted">
                            требует времени
                            <input
                              className="input"
                              inputMode="numeric"
                              aria-label={`Требуемое время: ${l.title}`}
                              value={times[l.id] ?? String(l.timeMin)}
                              onChange={(e) =>
                                setTimes((t) => ({ ...t, [l.id]: e.target.value }))
                              }
                              style={{ width: 64, height: 38, textAlign: "center" }}
                            />
                            мин
                          </label>

                          <Badge kind={draft ? "neutral" : "accepted"}>
                            {draft ? "черновик" : "готов"}
                          </Badge>

                          <div style={{ position: "relative" }}>
                            <button
                              className="btn btn-icon"
                              style={{ minHeight: 32, width: 32 }}
                              aria-label="Действия"
                              onClick={() => setMenuFor(menuFor === l.id ? null : l.id)}
                            >
                              <IconMore size={16} />
                            </button>
                            {menuFor === l.id && (
                              <>
                                <div
                                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                                  onClick={() => setMenuFor(null)}
                                />
                                <div
                                  className="card"
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "calc(100% + 4px)",
                                    zIndex: 50,
                                    minWidth: 230,
                                    padding: 6,
                                    boxShadow: "var(--shadow-lg)",
                                  }}
                                >
                                  <Link href={href} className="admin-nav-item">
                                    <IconEdit size={17} />
                                    Редактировать
                                  </Link>
                                  <button
                                    className="admin-nav-item"
                                    style={{
                                      width: "100%",
                                      border: "none",
                                      background: "none",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setMenuFor(null);
                                      toast("Элемент продублирован");
                                    }}
                                  >
                                    <IconCopy size={17} />
                                    Дублировать
                                  </button>
                                  {locked ? (
                                    <>
                                      <button
                                        className="admin-nav-item"
                                        style={{
                                          width: "100%",
                                          border: "none",
                                          background: "none",
                                          cursor: "pointer",
                                        }}
                                        onClick={() => {
                                          setMenuFor(null);
                                          toast("Урок скрыт — у тех, кто его прошёл, всё осталось");
                                        }}
                                      >
                                        <IconEyeOff size={17} />
                                        Скрыть
                                      </button>
                                      <p
                                        className="caption muted-3 pretty"
                                        style={{ padding: "6px 12px 8px", margin: 0 }}
                                      >
                                        Удалить нельзя: по уроку есть чей-то прогресс.
                                        Иначе «12 из 18» превратится в «12 из 17», а у кого-то
                                        условия сертификата выполнятся сами собой.
                                      </p>
                                    </>
                                  ) : (
                                    <button
                                      className="admin-nav-item"
                                      style={{
                                        width: "100%",
                                        border: "none",
                                        background: "none",
                                        cursor: "pointer",
                                        color: "var(--danger)",
                                      }}
                                      onClick={() => {
                                        setMenuFor(null);
                                        if (l.isNew) removeDraft(l.id);
                                        toast("Элемент удалён");
                                      }}
                                    >
                                      <IconTrash size={17} />
                                      Удалить
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Добавление прямо в этот модуль — тип виден сразу */}
                    <div
                      className="row wrap g8"
                      style={{ padding: "10px 16px", background: "#fbfcfe" }}
                    >
                      <span className="caption muted-3" style={{ alignSelf: "center" }}>
                        Добавить в модуль:
                      </span>
                      {GROUP_ORDER.map((g) => {
                        const Icon = groupIcon(g);
                        return (
                          <Button
                            key={g}
                            variant="ghost"
                            size="sm"
                            icon={<Icon size={15} />}
                            onClick={() => openAdd(g === "lesson" ? "video" : g, m.id)}
                          >
                            {GROUP_META[g].label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Сумма по программе */}
            <div className="card card-pad row between wrap g10">
              <span className="small muted">Всего по программе</span>
              <strong style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
                {duration(currentSum)}
              </strong>
            </div>
            <span className="caption muted-3 pretty">
              Объём курса в сертификате задаётся отдельно, на вкладке «Основное»:
              сейчас там {form.hours} часов.
            </span>
          </div>
        )}

        {/* ===== Вкладка «Условия сертификата» ===== */}
        {tab === "cert" && (
          <div className="edit-two">
            <div className="stack g16">
              <div className="card card-pad stack g16">
                <h2 className="h3">Условия получения</h2>

                <div className="stack g4">
                  <label className="check">
                    <input type="checkbox" checked={cAll} onChange={(e) => setCAll(e.target.checked)} />
                    <span className="check-box">
                      <IconCheck size={14} />
                    </span>
                    <span className="check-label">Пройти все уроки</span>
                  </label>

                  <label className="check">
                    <input
                      type="checkbox"
                      checked={cTasks}
                      onChange={(e) => setCTasks(e.target.checked)}
                    />
                    <span className="check-box">
                      <IconCheck size={14} />
                    </span>
                    <span className="check-label">
                      Сдать все задания <span className="muted-3">(принято админом)</span>
                    </span>
                  </label>

                  <div className="row g10 wrap" style={{ alignItems: "center" }}>
                    <label className="check grow">
                      <input
                        type="checkbox"
                        checked={cModuleTests}
                        onChange={(e) => setCModuleTests(e.target.checked)}
                      />
                      <span className="check-box">
                        <IconCheck size={14} />
                      </span>
                      <span className="check-label">Сдать все тесты модулей</span>
                    </label>
                    <div className="row g6 nowrap">
                      <input
                        className="input"
                        style={{ width: 68, height: 40, textAlign: "center" }}
                        value={moduleScore}
                        onChange={(e) => setModuleScore(e.target.value)}
                        disabled={!cModuleTests}
                        inputMode="numeric"
                        aria-label="Проходной балл тестов модулей"
                      />
                      <span className="small muted">%</span>
                    </div>
                  </div>

                  <div className="row g10 wrap" style={{ alignItems: "center" }}>
                    <label className="check grow">
                      <input
                        type="checkbox"
                        checked={cFinal}
                        onChange={(e) => setCFinal(e.target.checked)}
                      />
                      <span className="check-box">
                        <IconCheck size={14} />
                      </span>
                      <span className="check-label">Сдать итоговый тест</span>
                    </label>
                    <div className="row g6 nowrap">
                      <input
                        className="input"
                        style={{ width: 68, height: 40, textAlign: "center" }}
                        value={finalScore}
                        onChange={(e) => setFinalScore(e.target.value)}
                        disabled={!cFinal}
                        inputMode="numeric"
                        aria-label="Проходной балл итогового теста"
                      />
                      <span className="small muted">%</span>
                    </div>
                  </div>
                </div>

                {!anyCondition && (
                  <Note kind="warning">
                    Не выбрано ни одного условия — сертификат будет выдаваться сразу
                    после выдачи доступа.
                  </Note>
                )}
              </div>

              <div className="card card-pad stack g14">
                <h2 className="h3">Прохождение</h2>
                <div className="stack g4">
                  {(
                    [
                      ["free", "Свободный порядок", "можно открывать уроки в любой последовательности"],
                      ["strict", "Строго по порядку", "следующий урок откроется после завершения текущего"],
                    ] as ["free" | "strict", string, string][]
                  ).map(([v, label, hint]) => (
                    <label key={v} className="check">
                      <input
                        type="radio"
                        name="order"
                        checked={(isStrict(course.id) ? "strict" : "free") === v}
                        onChange={() => {
                          setStrict(course.id, v === "strict");
                          toast(
                            v === "strict"
                              ? "Строгий порядок включён — уроки откроются по очереди"
                              : "Свободный порядок — уроки открываются в любой последовательности",
                          );
                        }}
                      />
                      <span className="check-box round">
                        <IconCheck size={13} />
                      </span>
                      <span className="check-label stack g2">
                        <span>{label}</span>
                        <span className="caption muted-3">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="card card-pad stack g14">
                <h2 className="h3">Сертификат</h2>
                <div className="edit-row">
                  <div className="field">
                    <label className="label">Шаблон</label>
                    <select className="input" defaultValue="Стандартный">
                      <option>Стандартный</option>
                      <option>С печатью института</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Объём курса, часов</label>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Живое превью */}
            <div className="stack g10" style={{ position: "sticky", top: 88 }}>
              <div className="row g8 caption muted">
                <IconEye size={16} />
                Так увидит учитель — обновляется живо
              </div>
              <div className="card card-pad stack g14" style={{ background: "#fbfcff" }}>
                <h3 className="h3">Что нужно для сертификата</h3>
                <div className="stack g10">
                  {[
                    cAll && `Пройти все ${course.lessons} уроков`,
                    cTasks && `Сдать все ${course.tasksCount} задания`,
                    cModuleTests && `Сдать все тесты модулей — проходной балл ${moduleScore}%`,
                    cFinal && `Сдать итоговый тест — проходной балл ${finalScore}%`,
                  ]
                    .filter(Boolean)
                    .map((label, i) => (
                      <div key={i} className="row g10" style={{ alignItems: "flex-start" }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            background: "#f1f5f9",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        />
                        <span className="small grow" style={{ lineHeight: "22px" }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  {!anyCondition && (
                    <span className="small muted">Условий нет — сертификат выдаётся сразу.</span>
                  )}
                </div>
                <hr className="divider" />
                <span className="caption muted">
                  Сертификат на {hours} часов ·{" "}
                  {isStrict(course.id) ? "строго по порядку" : "свободный порядок уроков"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== Вкладка «Публикация» ===== */}
        {tab === "publish" && (
          <div className="edit-two">
            <div className="card card-pad stack g16">
              <h2 className="h3">Готовность к публикации</h2>
              <div className="stack g12">
                {readiness.map((r, i) => (
                  <div key={i} className="row g10" style={{ alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                        background: r.ok ? "var(--success)" : "var(--warning)",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {r.ok ? <IconCheck size={13} /> : "!"}
                    </span>
                    <span className="small grow pretty">{r.text}</span>
                  </div>
                ))}
              </div>

              <hr className="divider" />

              <div className="stack g10">
                <Button
                  variant="secondary"
                  block
                  onClick={() => publish("draft", "Черновик сохранён — курса в каталоге нет")}
                >
                  Сохранить черновик
                </Button>
                <Button
                  variant="secondary"
                  block
                  disabled={!form.startsAt}
                  onClick={() =>
                    publish(
                      "planned",
                      `Курс опубликован как запланированный — старт ${day(form.startsAt, uiLang)}`,
                    )
                  }
                >
                  Опубликовать как запланированный
                </Button>
                <Button
                  block
                  size="lg"
                  onClick={() => publish("open", "Набор открыт — курс принимает заявки")}
                >
                  Открыть набор
                </Button>
              </div>

              <span className="caption muted-3 pretty">
                Запланированный курс можно публиковать с незаполненными уроками — он попадает
                в каталог собирать заявки, а чек-лист показывает, что осталось доделать
                к старту{problems > 0 ? `: осталось ${problems}` : ""}.
              </span>
              {!form.startsAt && (
                <span className="caption" style={{ color: "var(--warning)" }}>
                  Чтобы опубликовать запланированным, задайте дату старта во вкладке «Основное».
                </span>
              )}
            </div>

            <div className="stack g10">
              <div className="row g8 caption muted">
                <IconEye size={16} />
                Превью карточки в каталоге
              </div>
              <div className="card" style={{ overflow: "hidden", maxWidth: 340 }}>
                <Cover tone={course.cover}>
                  <div className="cover-badges">
                    <span className="badge badge-lang">
                      {versions.map((v) => (v.lang === "ru" ? "RU" : "KZ")).join(" · ")}
                    </span>
                  </div>
                </Cover>
                <div className="stack g8 card-pad">
                  <span className="caption" style={{ color: "var(--primary)" }}>
                    {form.category}
                  </span>
                  <h3 className="h3 pretty">{form.title}</h3>
                  <div className="row wrap g8">
                    <StatusBadge status={COURSE_STATUS_LABEL[form.status]} />
                    {form.status === "planned" && form.startsAt && (
                      <span className="caption muted">старт {day(form.startsAt, uiLang)}</span>
                    )}
                  </div>
                  <div className="row between wrap g8">
                    <span className="small muted">
                      {course.lessons} уроков · {form.hours} часов
                    </span>
                    <strong className="small">
                      {fmtPrice(Number(form.price) || undefined, uiLang)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Добавление элемента программы: сначала тип, потом куда и как называется */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Добавить в программу"
        footer={
          <div className="stack g8">
            <Button block size="lg" onClick={() => submitAdd(true)}>
              Добавить и открыть редактор
            </Button>
            <Button variant="secondary" block onClick={() => submitAdd(false)}>
              Добавить и остаться в программе
            </Button>
          </div>
        }
      >
        <div className="stack g16">
          <div className="stack g8">
            <span className="label">Что добавляем</span>
            <div className="kind-grid">
              {GROUP_ORDER.map((g) => {
                const Icon = groupIcon(g);
                return (
                  <button
                    key={g}
                    className="kind-card"
                    data-active={addGroup === g}
                    onClick={() => pickGroup(g)}
                  >
                    <span
                      className="lesson-icon"
                      style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0 }}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="stack g2">
                      <strong className="small">{GROUP_META[g].label}</strong>
                      <span className="caption muted-3 pretty">{GROUP_META[g].hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Вид урока — только у урока: у теста и задания видов нет */}
          {addGroup === "lesson" && (
            <div className="field">
              <label className="label">Вид урока</label>
              <div className="segmented" style={{ width: "100%" }}>
                {LESSON_KINDS.map((k) => {
                  const Icon = kindIcon(k);
                  return (
                    <button
                      key={k}
                      data-active={addKind === k}
                      onClick={() => pickKind(k)}
                      style={{ flex: 1 }}
                    >
                      <Icon size={16} />
                      {KIND_META[k].label}
                    </button>
                  );
                })}
              </div>
              <span className="hint">{KIND_META[addKind].hint}</span>
            </div>
          )}

          <div className="field">
            <label className="label">Модуль</label>
            <select
              className="input"
              value={addModuleId}
              onChange={(e) => setAddModuleId(e.target.value)}
            >
              {program.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">Название</label>
            <input
              className="input"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder={KIND_META[addKind].title}
            />
            <span className="hint">
              Оставьте пустым — подставим «{KIND_META[addKind].title}». Название меняется
              в редакторе в любой момент.
            </span>
          </div>

          <div className="field" style={{ maxWidth: 220 }}>
            <label className="label">Требует времени, минут</label>
            <input
              className="input"
              inputMode="numeric"
              value={addTime}
              onChange={(e) => setAddTime(e.target.value)}
            />
            <span className="hint">Складывается в сумму по программе</span>
          </div>

          <Note kind="muted">
            <span className="small">
              {addKind === "quiz"
                ? "Тест откроется в редакторе теста: вопросы, проходной балл, одна попытка или пересдачи."
                : addKind === "task"
                  ? "Задание откроется в редакторе задания: условие, формат сдачи, критерии."
                  : addKind === "video"
                    ? "Видеоурок откроется в редакторе: ссылка на YouTube обязательна, текст под видео и файлы — по желанию."
                    : "Текстовый урок откроется в редакторе: текст обязателен, файлы — по желанию."}{" "}
              В программе он появится черновиком, пока не наполнен.
            </span>
          </Note>
        </div>
      </Sheet>

      {/* Новый модуль — сразу ведёт к добавлению первого элемента */}
      <Sheet
        open={moduleOpen}
        onClose={() => setModuleOpen(false)}
        title="Новый модуль"
        footer={
          <div className="stack g8">
            <Button block size="lg" onClick={submitModule}>
              Создать модуль
            </Button>
            <Button variant="secondary" block onClick={() => setModuleOpen(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <div className="field">
            <label className="label">Название модуля</label>
            <input
              className="input"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder={`Модуль ${program.length + 1}`}
            />
          </div>
          <p className="small muted pretty">
            Сразу после создания предложим добавить в него первый элемент — урок, тест
            или задание.
          </p>
        </div>
      </Sheet>

      {/* Создание второй языковой версии */}
      <Sheet
        open={createVersion}
        onClose={() => setCreateVersion(false)}
        title={`Создать ${missingLang === "kz" ? "казахскую" : "русскую"} версию`}
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              onClick={() => {
                setCreateVersion(false);
                toast(
                  copyProgram
                    ? "Версия создана — структура программы скопирована как заготовка"
                    : "Версия создана — программа пустая",
                  "success",
                );
              }}
            >
              Создать версию
            </Button>
            <Button variant="secondary" block onClick={() => setCreateVersion(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <p className="small muted pretty">
            Заведём новый курс с тем же groupId. В каталоге он останется одной карточкой
            с бейджами языков, а дальше содержимое живёт своей жизнью: своя программа,
            цена, дата старта и сертификат. Совпадать один в один версии не обязаны.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={copyProgram}
              onChange={(e) => setCopyProgram(e.target.checked)}
            />
            <span className="check-box">
              <IconCheck size={14} />
            </span>
            <span className="check-label">Скопировать структуру программы как заготовку</span>
          </label>
        </div>
      </Sheet>

      <style>{`
        .edit-two { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        .edit-row { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .program-row { row-gap: 8px; }
        .kind-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .kind-card {
          display: flex; gap: 10px; align-items: flex-start; text-align: left;
          padding: 12px; border: 1px solid var(--border); border-radius: 12px;
          background: #fff; cursor: pointer; transition: border-color .15s, background .15s;
        }
        .kind-card:hover { border-color: var(--border-strong); }
        .kind-card[data-active="true"] { border-color: var(--primary); background: #f6f9ff; }
        @media (min-width: 640px) { .edit-row { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1100px) { .edit-two { grid-template-columns: 1.4fr 1fr; gap: 24px; } }
      `}</style>
    </AdminShell>
  );
}
