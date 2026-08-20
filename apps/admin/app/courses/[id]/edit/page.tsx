"use client";

/**
 * Редактор курса «/courses/:id/edit» — раздел 5.17 брифа.
 * Четыре вкладки: Основное · Программа · Условия сертификата · Публикация.
 *
 * Все четыре живут одним ответом `GET /admin/courses/{id}`. Чек-лист
 * готовности и сумму по программе считает сервер, поэтому после каждой правки
 * в состояние кладётся то, что он вернул: свой чек-лист здесь не считается
 * нигде, иначе экран и сервер разошлись бы в том, готов ли курс.
 *
 * Языковой версии внутри курса нет: русская и казахская — два самостоятельных
 * курса с общим `group_id`, поэтому переключатель «РУС | ҚАЗ» открывает другой
 * курс, а не переключает поля формы.
 *
 * Правка контента вынесена из карточки курса отдельным экраном: в самой
 * карточке методист работает с людьми — участниками, проверкой, отзывами,
 * и редактор не должен стоять с ними в одном ряду вкладок.
 */

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  categoryTitle,
  isApiError,
  useDictionaries,
  useLoad,
  type AdminCourseCard,
  type AdminLesson,
  type AdminProgram,
  type AdminProgramItem,
  type AdminProgramModule,
  type AdminQuiz,
  type AdminTask,
  type CourseLang,
  type CourseStatus,
  type LessonKind,
  type ProgramOrderIn,
  type UploadedFile,
} from "@lms/api";
import { day, duration, price as fmtPrice, plural } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import {
  courseLangs,
  COURSE_STATUS_LABEL,
  COURSE_STATUS_ORDER,
} from "@/components/admin/courseStatus";
import { CROPPABLE, CropImageSheet } from "@/components/admin/CropImage";
import { fieldErrors } from "@/lib/fieldErrors";
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
  IconClose,
  IconCopy,
  IconDrag,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconLayers,
  IconMore,
  IconPlus,
  IconQuiz,
  IconTask,
  IconText,
  IconTrash,
  IconUpload,
  IconVideo,
} from "@lms/ui/icons";

type Tab = "main" | "program" | "cert" | "publish";

/**
 * Какой вкладке принадлежит поле формы. Ответ автосохранения может прийти,
 * когда админ уже ушёл на «Программу» или «Публикацию», а подписи полей —
 * только на «Основном» и «Условиях»: без этой таблицы такой `422` выглядел бы
 * удавшимся сохранением.
 */
const FIELD_TAB: Record<string, Tab> = {
  title: "main",
  short: "main",
  full: "main",
  category_id: "main",
  hours: "main",
  duration_text: "main",
  price: "main",
  status: "main",
  starts_at: "main",
  strict_order: "cert",
  cert_require_lessons: "cert",
  cert_require_tasks: "cert",
  cert_require_module_quizzes: "cert",
  cert_require_final_quiz: "cert",
};

/** Вид элемента дерева: урок приходит двумя видами, тест и задание — своими. */
type ItemKind = AdminProgramItem["kind"];

/**
 * Из чего собирается модуль. Видеоурок и текстовый — это два вида одного
 * элемента «урок», поэтому кнопка добавления у них одна, а вид выбирается
 * переключателем; тест и задание живут в своих редакторах.
 */
const KIND_META: Record<
  ItemKind,
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
const LESSON_KINDS: LessonKind[] = ["video", "text"];

const groupOf = (kind: ItemKind): AddGroup =>
  kind === "quiz" ? "quiz" : kind === "task" ? "task" : "lesson";

function groupIcon(group: AddGroup) {
  return group === "lesson" ? IconBook : group === "quiz" ? IconQuiz : IconTask;
}

function kindIcon(kind: ItemKind) {
  return kind === "video"
    ? IconVideo
    : kind === "text"
      ? IconText
      : kind === "quiz"
        ? IconQuiz
        : IconTask;
}

/**
 * Хвост адреса элемента: он один и у экрана редактора («/lessons/12»),
 * и у ручки («/admin/lessons/12») — разводить их в два справочника незачем.
 */
function itemPath(kind: ItemKind, itemId: number) {
  if (kind === "quiz") return `/quizzes/${itemId}`;
  if (kind === "task") return `/tasks/${itemId}`;
  return `/lessons/${itemId}`;
}

/** Чем элемент держится, когда его нельзя удалить: у каждого вида это своё. */
function keepsReason(kind: ItemKind): string {
  if (kind === "quiz") return "тест уже проходили — у него есть попытки";
  if (kind === "task") return "по заданию есть чьи-то сдачи";
  return "по уроку есть чей-то прогресс";
}

const digits = (v: string) => v.replace(/\D/g, "");

/* ============ Форма вкладок «Основное» и «Условия сертификата» ============ */

interface Form {
  title: string;
  short: string;
  full: string;
  category_id: number;
  hours: string;
  duration_text: string;
  price: string;
  status: CourseStatus;
  starts_at: string;
  strict_order: boolean;
  cert_require_lessons: boolean;
  cert_require_tasks: boolean;
  cert_require_module_quizzes: boolean;
  cert_require_final_quiz: boolean;
}

/** Четыре флага условий сертификата — рисуются одним списком чекбоксов. */
type CertKey =
  | "cert_require_lessons"
  | "cert_require_tasks"
  | "cert_require_module_quizzes"
  | "cert_require_final_quiz";

function formOf(c: AdminCourseCard): Form {
  return {
    title: c.title,
    short: c.short,
    full: c.full,
    category_id: c.category_id,
    hours: String(c.hours),
    duration_text: c.duration_text ?? "",
    price: c.price === null ? "" : String(c.price),
    status: c.status as CourseStatus,
    starts_at: c.starts_at ?? "",
    strict_order: c.strict_order,
    cert_require_lessons: c.cert_require_lessons,
    cert_require_tasks: c.cert_require_tasks,
    cert_require_module_quizzes: c.cert_require_module_quizzes,
    cert_require_final_quiz: c.cert_require_final_quiz,
  };
}

/** Значение поля в теле PATCH — имя поля то же, преобразований на границе нет. */
type PatchValue = string | number | boolean | null;

/**
 * Одно поле формы в том виде, в каком его принимает сервер: автосохранение
 * шлёт поля по одному. Тем же превращением считается `dirty` — сравнивать
 * буквы в полях с ответом сервера напрямую нельзя, он нормализует присланное.
 *
 * Пустое поле — это `null`, а не пустая строка: «цены нет» и «цена 0» разное.
 */
function fieldValue(f: Form, key: keyof Form): PatchValue {
  switch (key) {
    case "title":
      return f.title.trim();
    case "duration_text":
      return f.duration_text.trim() || null;
    case "hours":
      return Number(f.hours);
    case "price":
      return f.price.trim() === "" ? null : Number(f.price);
    case "starts_at":
      return f.starts_at || null;
    default:
      return f[key];
  }
}

/**
 * Значение, которое сервер заведомо не примет. Пустое поле часов — это
 * `Number("") === 0`, а `PATCH` у опубликованного курса требует `hours >= 1`;
 * пустое название он отбивает по `title` в любом статусе. Автосохранение
 * такое не отправляет вовсе: стереть «36», чтобы вписать «40», — обычный
 * способ править число, и 422 на промежуточном значении прилетать не должен.
 */
function unsendable(f: Form, key: keyof Form): boolean {
  return (key === "hours" || key === "title") && f[key].trim() === "";
}

/** Причина отказа для строки в шапке: формулировки пишет сервер, а не экран. */
function whyFailed(e: unknown, fields: Record<string, string>): string {
  return Object.values(fields)[0] || (isApiError(e) ? e.message : "не удалось сохранить");
}

/** Что показывает строка автосохранения рядом с кнопкой «Сохранить». */
type AutoSave =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed"; why: string };

/* ============ Экран ============ */

export default function CourseEditorPage() {
  /* Вкладка читается из ?tab=, а useSearchParams требует границы Suspense —
     так же обёрнут экран /verify в клиентском приложении */
  return (
    <Suspense fallback={null}>
      <CourseEditor />
    </Suspense>
  );
}

function CourseEditor() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast, lang: uiLang } = useStore();
  const dicts = useDictionaries();

  /* Карточка курса «/courses/{слаг}» осталась на прототипе и уводит в редактор
     слагом — «/courses/digital-literacy/edit». Сервер знает только числовые id:
     на слаг он ответил бы ошибкой типа, а не `not_found`, и экран навсегда
     остался бы на «Не удалось загрузить». Такой id разбираем сами, без запроса */
  const numericId = /^\d+$/.test(id);

  const course = useLoad(
    () =>
      numericId
        ? api<AdminCourseCard>(`/admin/courses/${id}`)
        : Promise.reject(
            new ApiError(404, { code: "not_found", message: "Курс не найден" }),
          ),
    [id],
  );
  const data = course.data;

  const [tab, setTab] = useState<Tab>("main");
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /* Тоста на каждое поле не будет — их было бы столько же, сколько полей,
     и они забили бы экран. Единственный след автосохранения — эта строка */
  const [auto, setAuto] = useState<AutoSave>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [copyProgram, setCopyProgram] = useState(true);
  /* Обложка живёт мимо формы: это файл, а не буквы в поле, и уходит на сервер
     сразу — «ухода из поля» у кнопки нет. Поэтому её нет ни в `Form`, ни в
     `dirty`: иначе «не сохранено» горело бы после каждой загрузки */
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");
  /* Имя файла сервер наружу не отдаёт — помним то, что сами же и загрузили */
  const [coverName, setCoverName] = useState("");
  /* Адрес раздачи у курса один и тот же на все картинки, а кэшируется он
     на пять минут: без метки замена обложки показала бы прежнюю */
  const [coverStamp, setCoverStamp] = useState(0);
  const coverPick = useRef<HTMLInputElement>(null);
  /* Что выбрали в проводнике: растровые форматы сперва проходят обрезку
     под рамку 16:9 — как обложка стоит в каталоге, — SVG и GIF грузятся
     как есть (обрезка убила бы масштабируемость и анимацию) */
  const [cropping, setCropping] = useState<File | null>(null);

  /* Форма пересобирается только при смене курса: пока админ печатает, дерево
     программы ходит на сервер своими запросами и не должно стирать поля */
  const seeded = useRef<number | null>(null);
  /* Номер чтения курса: ответ устаревшего refresh не должен затереть свежий */
  const refreshSeq = useRef(0);
  /* То же по записи: два ухода из полей подряд дают два PATCH, и ответ более
     раннего вернул бы карточку без второй правки — вместе с ней откатился бы
     и чек-лист «Публикации». Счётчик один на все записи курса: кнопка
     «Сохранить» и кнопки публикации кладут в `data` такую же карточку */
  const writeSeq = useRef(0);
  /* Что по полю уже ушло на сервер: в `data` правка появится только с ответом,
     а до него второй уход из того же поля сравнивать не с чем */
  const sent = useRef<Partial<Record<keyof Form, PatchValue>>>({});
  useEffect(() => {
    if (data && seeded.current !== data.id) {
      seeded.current = data.id;
      setForm(formOf(data));
      setErrors({});
      sent.current = {};
      setAuto({ kind: "idle" });
      /* Переключатель РУС|ҚАЗ открывает другой курс тем же экраном: имя файла
         и метка кэша относились к прошлой обложке */
      setCoverName("");
      setCoverError("");
      setCoverStamp(0);
    }
  }, [data]);

  /* Из списка приходят сразу в программу: /edit?tab=program. Читаем параметр
     маршрута, а не адрес один раз: иначе переход на тот же маршрут с другим
     ?tab= и кнопки браузера «назад/вперёд» вкладку бы не меняли */
  const tabParam = useSearchParams().get("tab");
  useEffect(() => {
    if (
      tabParam === "main" ||
      tabParam === "program" ||
      tabParam === "cert" ||
      tabParam === "publish"
    )
      setTab(tabParam);
  }, [tabParam]);

  /**
   * Тихо перечитать курс. После правки элемента программы сумма минут
   * и чек-лист пересчитаны сервером, а показывать ради этого спиннер
   * на весь экран незачем — форму такое чтение не трогает.
   */
  const refresh = async () => {
    const my = ++refreshSeq.current;
    try {
      const fresh = await api<AdminCourseCard>(`/admin/courses/${id}`);
      /* Быстрый Tab между двумя полями времени даёт два чтения подряд:
         пришедший последним старый ответ показал бы значение до правки */
      if (refreshSeq.current === my) course.setData(fresh);
    } catch {
      if (refreshSeq.current === my)
        toast("Не удалось обновить программу — перезагрузите страницу", "error");
    }
  };

  const applyProgram = (program: AdminProgramModule[], minutes?: number) =>
    course.setData((d) =>
      d ? { ...d, program, program_minutes: minutes ?? d.program_minutes } : d,
    );

  /**
   * `422` с именем поля. Ответ автосохранения может прийти уже с другой
   * вкладки, где подписи поля не видно, — поэтому уводим на вкладку поля
   * и повторяем причину тостом.
   */
  const showFieldErrors = (fields: Record<string, string>) => {
    setErrors(fields);
    const first = Object.entries(fields)[0];
    if (!first) return;
    const target = FIELD_TAB[first[0]];
    if (target) setTab(target);
    toast(first[1] || "Проверьте заполнение полей", "error");
  };

  /** Кнопки «Публикации» и «Сохранить» у статуса — PATCH со сменой статуса */
  const setStatus = async (status: CourseStatus, message: string) => {
    if (busy) return;
    setBusy(true);
    setErrors({});
    const my = ++writeSeq.current;
    try {
      const updated = await api<AdminCourseCard>(`/admin/courses/${id}`, {
        method: "PATCH",
        json: { status },
      });
      /* Клик по кнопке публикации сначала уводит фокус из поля — автосохранение
         этого поля уже летит, и его ответ моложе нашего быть не должен */
      if (writeSeq.current !== my) return;
      course.setData(updated);
      /* Форму целиком не пересобираем: несохранённые правки полей — работа
         админа, и кнопка публикации не должна её выбрасывать */
      setForm((f) => (f ? { ...f, status: updated.status as CourseStatus } : f));
      toast(message, "success");
    } catch (e) {
      if (writeSeq.current !== my) return;
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) showFieldErrors(fields);
      else toast(isApiError(e) ? e.message : "Не удалось поменять статус", "error");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const copy = await api<AdminCourseCard>(`/admin/courses/${id}/duplicate`, {
        method: "POST",
      });
      toast("Копия создана — черновик, в каталоге её пока нет", "success");
      router.push(`/courses/${copy.id}/edit`);
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось скопировать курс", "error");
      setBusy(false);
    }
  };

  const createVersion = async (lang: CourseLang) => {
    if (busy) return;
    setBusy(true);
    try {
      const version = await api<AdminCourseCard>(`/admin/courses/${id}/versions`, {
        method: "POST",
        json: { lang, copy_program: copyProgram },
      });
      setVersionOpen(false);
      toast(
        copyProgram
          ? "Версия создана — структура программы скопирована как заготовка"
          : "Версия создана — программа пустая",
        "success",
      );
      router.push(`/courses/${version.id}/edit`);
    } catch (e) {
      /* 409 version_exists приходит с готовой русской строкой — показываем её */
      toast(isApiError(e) ? e.message : "Не удалось создать версию", "error");
      setBusy(false);
    }
  };

  if (course.loading && !data) {
    return (
      <AdminShell title="Редактор курса">
        <div className="card card-pad row center" style={{ minHeight: 240 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  if (isApiError(course.error, "not_found")) {
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

  if (course.error || !data || !form) {
    return (
      <AdminShell title="Редактор курса">
        <div className="card">
          <Empty
            title="Не удалось загрузить"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={course.reload}>
                Повторить
              </Button>
            }
          />
        </div>
      </AdminShell>
    );
  }

  /* Себя сервер в versions не включает — склеиваем, чтобы нарисовать переключатель */
  const versions = [
    { id: data.id, lang: data.lang },
    ...data.versions.map((v) => ({ id: v.id, lang: v.lang })),
  ].sort((a, b) => (a.lang === "ru" ? 0 : 1) - (b.lang === "ru" ? 0 : 1));
  const other = data.versions[0];
  const missingLang: CourseLang = data.lang === "ru" ? "kz" : "ru";
  const missingLabel = missingLang === "kz" ? "казахскую" : "русскую";

  const categories = dicts.data?.categories ?? [];
  const visible = data.program.flatMap((m) => m.items).filter((i) => !i.is_hidden);
  const lessonsCount = visible.filter((i) => i.kind === "video" || i.kind === "text").length;
  const tasksCount = visible.filter((i) => i.kind === "task").length;
  const moduleQuizCount = visible.filter((i) => i.kind === "quiz" && !i.is_final).length;
  const finalQuizCount = visible.filter((i) => i.kind === "quiz" && i.is_final).length;
  const anyCondition =
    form.cert_require_lessons ||
    form.cert_require_tasks ||
    form.cert_require_module_quizzes ||
    form.cert_require_final_quiz;
  /* Условие, под которым не осталось ни одного видимого элемента, сервер
     выполненным не считает — сертификата по нему не будет ни у кого */
  const emptyCondition =
    (form.cert_require_lessons && lessonsCount === 0) ||
    (form.cert_require_tasks && tasksCount === 0) ||
    (form.cert_require_module_quizzes && moduleQuizCount === 0) ||
    (form.cert_require_final_quiz && finalQuizCount === 0);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    /* Правка поля снимает его ошибку: красная рамка до следующего сохранения
       говорит о запрете, которого уже нет */
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  };

  /* В счётчик под кнопкой идут только блокирующие пункты: отсутствие обложки
     набор больше не держит, и в числе «незакрытых» ему делать нечего */
  const notOk = data.readiness.items.filter((r) => !r.ok && r.blocking).length;

  /* Чек-лист посчитан сервером по сохранённому курсу, а поля показывают
     напечатанное: пока правка не сохранена, «Публикация» говорит о старой
     версии — и понять это со стороны неоткуда */
  const saved = formOf(data);
  /* Сравниваем не буквы в полях, а то, что уйдёт на сервер: пробел в хвосте
     названия сервер срежет сам, и «несохранённое» из-за него горело бы вечно */
  const dirty = (Object.keys(saved) as (keyof Form)[]).some(
    (k) => fieldValue(saved, k) !== fieldValue(form, k),
  );

  /**
   * Поле уходит на сервер само: у текста и чисел — по выходу из поля,
   * у флажков, списков и даты — сразу, «ухода» у них нет. Шлём одно поле,
   * а не форму целиком: PATCH применяет только присланное, и то, что админ
   * печатает в соседнем поле прямо сейчас, чужой запрос не заденет.
   * `status` не шлём никогда — его меняют кнопки «Публикации».
   */
  const saveField = async <K extends keyof Form>(key: K, value: Form[K]) => {
    if (key === "status") return;
    const next: Form = { ...form, [key]: value };
    const now = fieldValue(next, key);
    /* Сравниваем с тем, что на сервере: ушли из поля, ничего не поменяв, —
       запроса нет. Пока ответ летит, сервер знает уже отправленное значение */
    const before = key in sent.current ? sent.current[key] : fieldValue(saved, key);
    if (now === before) return;
    if (unsendable(next, key)) {
      /* Напечатанное остаётся в поле, а «не сохранено» скажет строка в шапке;
         прошлая причина отказа к этому значению уже не относится */
      setAuto({ kind: "idle" });
      return;
    }
    sent.current[key] = now;
    setAuto({ kind: "saving" });
    const my = ++writeSeq.current;
    try {
      const updated = await api<AdminCourseCard>(`/admin/courses/${id}`, {
        method: "PATCH",
        json: { [key]: now },
      });
      if (writeSeq.current !== my) return;
      /* Ответ идёт в `data`: из него живут чек-лист «Публикации» и превью
         карточки. Форму при этом не пересобираем — админ уже печатает
         в соседнем поле, и его буквы пропасть не должны */
      course.setData(updated);
      setAuto({ kind: "saved" });
    } catch (e) {
      /* Не дошло — значит на сервере старое значение, и повторный уход
         из поля с тем же текстом обязан попробовать ещё раз */
      delete sent.current[key];
      if (writeSeq.current !== my) return;
      const fields = fieldErrors(e);
      /* Напечатанное серверным значением не затираем: отказ съел бы работу.
         Показываем причину тем же способом, что и кнопка «Сохранить» */
      if (Object.keys(fields).length) showFieldErrors(fields);
      else toast(isApiError(e) ? e.message : "Не удалось сохранить", "error");
      setAuto({ kind: "failed", why: whyFailed(e, fields) });
    }
  };

  /**
   * Обложка: файл сначала уезжает в приватное хранилище (`POST /files`),
   * и только потом ключ привязывается к курсу — тем же порядком, что картинки
   * настроек. Сам по себе загруженный файл ни к чему не относится.
   */
  const patchCover = async (value: { key: string; name: string } | null) => {
    const my = ++writeSeq.current;
    const updated = await api<AdminCourseCard>(`/admin/courses/${id}`, {
      method: "PATCH",
      json: { cover: value },
    });
    /* Счётчик записи тот же, что у автосохранения полей: ответ более раннего
       PATCH не должен затереть свежую карточку вместе с чек-листом */
    if (writeSeq.current !== my) return;
    course.setData(updated);
    setCoverName(value?.name ?? "");
    setCoverStamp(Date.now());
  };

  /* 422 приходит с именем поля — причину показываем у самой обложки.
     Всё остальное (404 «файл не найден») говорит тостом, как в настройках */
  const coverFail = (e: unknown, fallback: string) => {
    const mine = fieldErrors(e).cover;
    if (mine) setCoverError(mine);
    else toast(isApiError(e) && e.status > 0 ? e.message : fallback, "error");
  };

  const pickCover = (picked: FileList | null) => {
    const file = picked?.[0];
    if (!file || coverBusy) return;
    /* Тот же файл после отмены выбирают заново — без сброса `change`
       на нём не случится */
    if (coverPick.current) coverPick.current.value = "";
    if (CROPPABLE.includes(file.type)) setCropping(file);
    else void uploadCover(file);
  };

  const uploadCover = async (file: File) => {
    if (coverBusy) return;
    setCoverBusy(true);
    setCoverError("");
    try {
      const body = new FormData();
      body.append("file", file);
      /* Content-Type ставит браузер сам — вместе с boundary,
         без него сервер тело не разберёт */
      const up = await api<UploadedFile>("/files", { method: "POST", body });
      await patchCover({ key: up.key, name: up.name });
      toast("Обложка сохранена", "success");
    } catch (e) {
      coverFail(e, "Не удалось загрузить обложку");
    } finally {
      setCoverBusy(false);
    }
  };

  const removeCover = async () => {
    if (coverBusy) return;
    setCoverBusy(true);
    setCoverError("");
    try {
      await patchCover(null);
      toast("Обложка убрана", "success");
    } catch (e) {
      coverFail(e, "Не удалось убрать обложку");
    } finally {
      setCoverBusy(false);
    }
  };

  /* Обложка показывается из ответа сервера, а не из формы: наружу он отдаёт
     адрес раздачи, а метка гасит кэш браузера после замены картинки */
  const coverSrc = data.cover && coverStamp ? `${data.cover}?v=${coverStamp}` : data.cover;

  /** Флажок, список и дата: правка и отправка одним движением */
  const setNow = <K extends keyof Form>(key: K, value: Form[K]) => {
    set(key, value);
    saveField(key, value);
  };

  /* «Сохранено» значит «в полях нет ничего сверх того, что лежит на сервере»,
     и считается это по `dirty`, а не по последнему ответу: причина отказа,
     которую админ уже исправил, висеть в шапке не должна */
  const autoText =
    auto.kind === "saving"
      ? "Сохраняем…"
      : dirty
        ? auto.kind === "failed"
          ? `Не сохранено: ${auto.why}`
          : "Не сохранено"
        : auto.kind === "idle"
          ? ""
          : "Сохранено";

  return (
    <AdminShell
      title={data.title || "Курс без названия"}
      subtitle="Редактирование содержимого"
      /* Кнопки «Сохранить» в шапке нет: поля уходят на сервер сами
         (решение владельца 20.08.2026). Статус — своей кнопкой у селекта */
      actions={
        autoText && (
          <span
            className={`caption nowrap${auto.kind === "failed" ? "" : " muted"}`}
            /* Причина от сервера бывает в предложение — в шапке ей столько
               места нет, целиком её уже сказал тост */
            style={{
              maxWidth: 230,
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: auto.kind === "failed" ? "var(--warning)" : undefined,
            }}
            title={autoText}
          >
            {autoText}
          </span>
        )
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
                  data-active={v.id === data.id}
                  onClick={() => v.id !== data.id && router.push(`/courses/${v.id}/edit`)}
                >
                  {v.lang === "ru" ? "РУС" : "ҚАЗ"}
                </button>
              ))}
            </div>
            {other ? (
              <span className="caption muted-3 pretty" style={{ maxWidth: 340 }}>
                Переключатель открывает другой курс той же группы. Версии живут своей
                жизнью — своя программа, цена и дата старта.
              </span>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setVersionOpen(true)}>
                <IconPlus size={15} />
                Создать {missingLabel} версию
              </Button>
            )}
          </div>
          <div className="row g8">
            <StatusBadge status={COURSE_STATUS_LABEL[data.status as CourseStatus]} />
            <Button variant="ghost" size="sm" loading={busy} onClick={duplicate}>
              <IconCopy size={15} />
              Дублировать курс
            </Button>
          </div>
        </div>

        {data.has_students && (
          <Note kind="warning">
            <span className="small pretty">
              На курсе уже учатся — правки идут с ограничениями. Элемент, по которому есть
              чужие данные, не удаляется, а скрывается: иначе у людей «12 из 18»
              превратится в «12 из 17», а у кого-то условия сертификата выполнятся сами
              собой.
            </span>
          </Note>
        )}

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
                    className={`input${errors.title ? " input-error" : ""}`}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    onBlur={() => saveField("title", form.title)}
                    placeholder={data.lang === "kz" ? "Курс атауы" : "Название курса"}
                  />
                  {errors.title && <span className="error-text">{errors.title}</span>}
                </div>

                <div className="field">
                  <label className="label">Короткое описание</label>
                  <textarea
                    className={`input${errors.short ? " input-error" : ""}`}
                    style={{ minHeight: 80 }}
                    value={form.short}
                    onChange={(e) => set("short", e.target.value)}
                    onBlur={() => saveField("short", form.short)}
                    placeholder="Одно предложение — показывается в карточке каталога"
                  />
                  {errors.short && <span className="error-text">{errors.short}</span>}
                </div>

                <div className="field">
                  <label className="label">Полное описание</label>
                  <textarea
                    className={`input${errors.full ? " input-error" : ""}`}
                    style={{ minHeight: 120 }}
                    value={form.full}
                    onChange={(e) => set("full", e.target.value)}
                    onBlur={() => saveField("full", form.full)}
                  />
                  {errors.full && <span className="error-text">{errors.full}</span>}
                </div>

                <div className="edit-row">
                  <div className="field">
                    <label className="label">Категория</label>
                    <select
                      className={`input${errors.category_id ? " input-error" : ""}`}
                      value={form.category_id}
                      onChange={(e) => setNow("category_id", Number(e.target.value))}
                      disabled={dicts.loading}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    {dicts.error && (
                      <div className="row g8" style={{ marginTop: 4 }}>
                        <span className="error-text">Справочник категорий не загрузился</span>
                        <Button variant="ghost" size="sm" onClick={dicts.reload}>
                          Повторить
                        </Button>
                      </div>
                    )}
                    {errors.category_id && (
                      <span className="error-text">{errors.category_id}</span>
                    )}
                  </div>

                  {/* Объём — обязательное поле, рядом серая подсказка по программе */}
                  <div className="field">
                    <label className="label">
                      Объём курса, часов{" "}
                      <span style={{ color: "var(--danger)" }}>· обязательно</span>
                    </label>
                    <input
                      className={`input${errors.hours ? " input-error" : ""}`}
                      inputMode="numeric"
                      value={form.hours}
                      onChange={(e) => set("hours", digits(e.target.value))}
                      onBlur={() => saveField("hours", form.hours)}
                    />
                    <span className="hint">
                      По элементам курса набирается {duration(data.program_minutes)}. Это
                      подсказка, а не значение поля: в сертификате пишут учебный объём
                      вместе с самостоятельной работой.
                    </span>
                    {errors.hours && <span className="error-text">{errors.hours}</span>}
                  </div>
                </div>

                <div className="field">
                  <label className="label">
                    Сколько обычно занимает{" "}
                    <span className="label-optional">· необязательно</span>
                  </label>
                  <input
                    className={`input${errors.duration_text ? " input-error" : ""}`}
                    value={form.duration_text}
                    onChange={(e) => set("duration_text", e.target.value)}
                    onBlur={() => saveField("duration_text", form.duration_text)}
                    placeholder="≈ 6 недель"
                  />
                  <span className="hint">Показывается в карточке каталога рядом с объёмом</span>
                  {errors.duration_text && (
                    <span className="error-text">{errors.duration_text}</span>
                  )}
                </div>
              </div>

              {/* Набор: цена, статус, дата старта */}
              <div className="card card-pad stack g14">
                <h2 className="h3">Набор на курс</h2>
                <div className="edit-row">
                  <div className="field">
                    <label className="label">Цена, ₸</label>
                    <input
                      className={`input${errors.price ? " input-error" : ""}`}
                      inputMode="numeric"
                      value={form.price}
                      onChange={(e) => set("price", digits(e.target.value))}
                      onBlur={() => saveField("price", form.price)}
                      placeholder="45000"
                    />
                    <span className="hint">
                      Пусто — в каталоге «Цена по запросу». Деньги принимает администратор
                      вне платформы, платёжных форм в продукте нет.
                    </span>
                    {errors.price && <span className="error-text">{errors.price}</span>}
                  </div>
                  <div className="field">
                    <label className="label">Статус набора</label>
                    {/* Единственное поле со своей кнопкой: смена статуса —
                        действие с последствиями, само оно не уходит
                        (решение владельца 20.08.2026) */}
                    <div className="row g8">
                      <select
                        className={`input grow${errors.status ? " input-error" : ""}`}
                        value={form.status}
                        onChange={(e) => set("status", e.target.value as CourseStatus)}
                      >
                        {COURSE_STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {COURSE_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        loading={busy}
                        disabled={form.status === saved.status}
                        onClick={() =>
                          setStatus(
                            form.status,
                            `Статус сохранён — «${COURSE_STATUS_LABEL[form.status]}»`,
                          )
                        }
                      >
                        Сохранить
                      </Button>
                    </div>
                    <span className="hint">
                      Остальные поля сохраняются сами, статус — только этой кнопкой
                      или кнопками «Публикации».
                    </span>
                    {errors.status && <span className="error-text">{errors.status}</span>}
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
                    className={`input${errors.starts_at ? " input-error" : ""}`}
                    type="date"
                    value={form.starts_at}
                    onChange={(e) => setNow("starts_at", e.target.value)}
                  />
                  <span className="hint">
                    Именно она рисует бейдж «Старт {day(form.starts_at || "2026-09-01", uiLang)}»
                    в каталоге.
                  </span>
                  {errors.starts_at && <span className="error-text">{errors.starts_at}</span>}
                </div>

                {form.status === "planned" && !form.starts_at && (
                  <Note kind="warning">
                    <span className="small">
                      У запланированного курса дата старта обязательна — без неё
                      в каталоге нечего показать, и сервер такой статус не примет.
                    </span>
                  </Note>
                )}
              </div>
            </div>

            {/* Обложка — файлом: адрес раздачи делает сервер сам, а ссылку
                на чужую картинку он больше не принимает */}
            <div className="card card-pad stack g12">
              <h2 className="h3">Обложка</h2>
              <Cover src={coverSrc} style={{ borderRadius: 12 }} />
              <input
                ref={coverPick}
                type="file"
                /* Подсказка браузеру, а не запрет: настоящая проверка — по байтам
                   файла на сервере, и имя картинки её не обманет */
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                hidden
                onChange={(e) => pickCover(e.target.files)}
              />
              <div className="row g8">
                <Button
                  variant="secondary"
                  size="sm"
                  block
                  icon={<IconUpload size={15} />}
                  loading={coverBusy}
                  onClick={() => coverPick.current?.click()}
                >
                  {data.cover ? "Заменить обложку" : "Загрузить обложку"}
                </Button>
                {data.cover && (
                  <button
                    className="btn btn-icon"
                    style={{ minHeight: 34, width: 34, flexShrink: 0 }}
                    aria-label="Убрать обложку"
                    disabled={coverBusy}
                    onClick={removeCover}
                  >
                    <IconClose size={16} />
                  </button>
                )}
              </div>
              {coverName && <span className="caption muted-3">{coverName}</span>}
              {coverError ? (
                <span className="error-text">{coverError}</span>
              ) : (
                <span className="hint">
                  Формат 16:9, минимум 640×360; PNG, JPEG, GIF, WEBP или SVG. Показывается
                  в каталоге и на странице курса. Пусто — останется градиент.
                </span>
              )}
              <Note kind="muted">
                <span className="caption pretty">
                  Сохраняется сразу, как и остальные поля. У людей новая картинка
                  появится на месте старой не сразу: адрес раздачи один и тот же,
                  и браузер помнит его пять минут.
                </span>
              </Note>
            </div>
          </div>
        )}

        {/* ===== Вкладка «Программа» ===== */}
        {tab === "program" && (
          <ProgramTab
            courseId={id}
            program={data.program}
            programMinutes={data.program_minutes}
            hours={form.hours}
            onProgram={applyProgram}
            refresh={refresh}
          />
        )}

        {/* ===== Вкладка «Условия сертификата» ===== */}
        {tab === "cert" && (
          <div className="edit-two">
            <div className="stack g16">
              <div className="card card-pad stack g16">
                <h2 className="h3">Условия получения</h2>

                <div className="stack g4">
                  {(
                    [
                      ["cert_require_lessons", "Пройти все уроки", null],
                      ["cert_require_tasks", "Сдать все задания", "(принято админом)"],
                      ["cert_require_module_quizzes", "Сдать все тесты модулей", null],
                      ["cert_require_final_quiz", "Сдать итоговый тест", null],
                    ] as [CertKey, string, string | null][]
                  ).map(([key, label, note]) => (
                    <label key={key} className="check">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => setNow(key, e.target.checked)}
                      />
                      <span className="check-box">
                        <IconCheck size={14} />
                      </span>
                      <span className="check-label">
                        {label} {note && <span className="muted-3">{note}</span>}
                      </span>
                    </label>
                  ))}
                </div>

                <span className="caption muted-3 pretty">
                  Проходной балл живёт у теста, а не у курса: он задаётся в редакторе
                  теста и там же показывается учителю в результате попытки.
                </span>

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
                      [
                        false,
                        "Свободный порядок",
                        "можно открывать уроки в любой последовательности",
                      ],
                      [
                        true,
                        "Строго по порядку",
                        "следующий урок откроется после завершения текущего",
                      ],
                    ] as [boolean, string, string][]
                  ).map(([v, label, hint]) => (
                    <label key={String(v)} className="check">
                      <input
                        type="radio"
                        name="order"
                        checked={form.strict_order === v}
                        onChange={() => setNow("strict_order", v)}
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
                <div className="field" style={{ maxWidth: 260 }}>
                  <label className="label">Объём курса, часов</label>
                  <input
                    className={`input${errors.hours ? " input-error" : ""}`}
                    inputMode="numeric"
                    value={form.hours}
                    onChange={(e) => set("hours", digits(e.target.value))}
                    onBlur={() => saveField("hours", form.hours)}
                  />
                  <span className="hint">
                    То же поле, что на вкладке «Основное»: в сертификате и в каталоге
                    число одно.
                  </span>
                  {errors.hours && <span className="error-text">{errors.hours}</span>}
                </div>
                <span className="caption muted-3 pretty">
                  Шаблон сертификата один и свёрстан в коде — выбирать нечего.
                </span>
              </div>
            </div>

            {/* Живое превью — по видимым элементам программы */}
            <div className="stack g10" style={{ position: "sticky", top: 88 }}>
              <div className="row g8 caption muted">
                <IconEye size={16} />
                Так увидит учитель — обновляется живо
              </div>
              <div className="card card-pad stack g14" style={{ background: "#fbfcff" }}>
                <h3 className="h3">Что нужно для сертификата</h3>
                <div className="stack g10">
                  {[
                    form.cert_require_lessons &&
                      `Пройти все ${lessonsCount} ${plural(lessonsCount, "урок", "урока", "уроков")}`,
                    form.cert_require_tasks &&
                      `Сдать все ${tasksCount} ${plural(tasksCount, "задание", "задания", "заданий")}`,
                    form.cert_require_module_quizzes &&
                      `Сдать все ${moduleQuizCount} ${plural(moduleQuizCount, "тест", "теста", "тестов")} модулей`,
                    form.cert_require_final_quiz && "Сдать итоговый тест",
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
                  Сертификат на {form.hours || "—"} часов ·{" "}
                  {form.strict_order ? "строго по порядку" : "свободный порядок уроков"}
                </span>
              </div>
              {emptyCondition && (
                <Note kind="warning">
                  <span className="caption pretty">
                    Под одним из условий нет ни одного видимого элемента. Такое условие
                    выполненным не считается — сертификат по нему не получит никто, пока
                    в программе не появится хотя бы один элемент.
                  </span>
                </Note>
              )}
            </div>
          </div>
        )}

        {/* ===== Вкладка «Публикация» ===== */}
        {tab === "publish" && (
          <div className="edit-two">
            <div className="card card-pad stack g16">
              <h2 className="h3">Готовность к публикации</h2>
              {dirty && (
                <Note kind="info">
                  <span className="caption pretty">
                    В полях есть несохранённые правки, а чек-лист считает по сохранённой
                    версии курса. Поля уходят на сервер сами, когда из них выходят;
                    статус набора сохраняется своей кнопкой на «Основном».
                  </span>
                </Note>
              )}
              <div className="stack g12">
                {data.readiness.items.map((r) => {
                  /* Пока в программе нет ни одного видимого элемента, проверки
                     уроков и тестов не над чем было выполнять — сервер отдаёт
                     их с ok: true просто потому, что нарушений не нашлось.
                     Зелёная галочка на непроверенном врёт хуже предупреждения,
                     поэтому такой пункт рисуем нейтрально. Ветвимся по code и
                     своему подсчёту видимых: текст пункта пишет сервер */
                  const notChecked =
                    visible.length === 0 &&
                    (r.code === "empty_lessons" || r.code === "empty_quizzes");
                  /* Невыполненный неблокирующий пункт публикацию не держит —
                     это совет. Тот же знак, но бледной заливкой: сплошной
                     оранжевый читался бы как невыполненное требование */
                  const advice = !r.ok && !r.blocking;
                  return (
                    <div key={r.code} className="row g10" style={{ alignItems: "flex-start" }}>
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
                          background: notChecked
                            ? "var(--border)"
                            : r.ok
                              ? "var(--success)"
                              : advice
                                ? "var(--warning-bg)"
                                : "var(--warning)",
                          color: notChecked
                            ? "var(--text-2)"
                            : advice
                              ? "var(--warning)"
                              : "#fff",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {notChecked ? "—" : r.ok ? <IconCheck size={13} /> : "!"}
                      </span>
                      <span className="stack g2 grow">
                        <span
                          className={
                            notChecked || advice ? "small pretty muted" : "small pretty"
                          }
                        >
                          {r.text}
                        </span>
                        {r.items.length > 0 && (
                          <span className="caption muted-3 pretty">{r.items.join(" · ")}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <hr className="divider" />

              <div className="stack g10">
                <Button
                  variant="secondary"
                  block
                  loading={busy}
                  onClick={() => setStatus("draft", "Черновик сохранён — курса в каталоге нет")}
                >
                  Сохранить черновик
                </Button>
                <Button
                  variant="secondary"
                  block
                  loading={busy}
                  disabled={!data.readiness.can_plan}
                  onClick={() =>
                    setStatus(
                      "planned",
                      /* Дату берём с сервера: в форме её могли стереть и не
                         сохранить, а `day("")` дал бы «старт » без даты */
                      data.starts_at
                        ? `Курс опубликован как запланированный — старт ${day(data.starts_at, uiLang)}`
                        : "Курс опубликован как запланированный",
                    )
                  }
                >
                  Опубликовать как запланированный
                </Button>
                <Button
                  block
                  size="lg"
                  loading={busy}
                  disabled={!data.readiness.can_open}
                  onClick={() => setStatus("open", "Набор открыт — курс принимает заявки")}
                >
                  Открыть набор
                </Button>
              </div>

              <span className="caption muted-3 pretty">
                Запланированный курс можно публиковать с незаполненными уроками — он попадает
                в каталог собирать заявки, а чек-лист показывает, что осталось доделать
                к старту.
              </span>
              {!data.readiness.can_plan && (
                <span className="caption" style={{ color: "var(--warning)" }}>
                  Чтобы опубликовать запланированным, задайте дату старта на вкладке
                  «Основное» и сохраните.
                </span>
              )}
              {!data.readiness.can_open && (
                <span className="caption" style={{ color: "var(--warning)" }}>
                  Открыть набор можно, когда в чек-листе не осталось незакрытых пунктов:
                  сейчас их {notOk}.
                </span>
              )}
            </div>

            <div className="stack g10">
              <div className="row g8 caption muted">
                <IconEye size={16} />
                Превью карточки в каталоге
              </div>
              <div className="card" style={{ overflow: "hidden", maxWidth: 340 }}>
                <Cover src={coverSrc}>
                  <div className="cover-badges">
                    <span className="badge badge-lang">{courseLangs(data)}</span>
                  </div>
                </Cover>
                <div className="stack g8 card-pad">
                  <span className="caption" style={{ color: "var(--primary)" }}>
                    {categoryTitle(categories, form.category_id)}
                  </span>
                  <h3 className="h3 pretty">{form.title}</h3>
                  <div className="row wrap g8">
                    <StatusBadge status={COURSE_STATUS_LABEL[form.status]} />
                    {form.status === "planned" && form.starts_at && (
                      <span className="caption muted">старт {day(form.starts_at, uiLang)}</span>
                    )}
                  </div>
                  <div className="row between wrap g8">
                    <span className="small muted">
                      {lessonsCount} {plural(lessonsCount, "урок", "урока", "уроков")} ·{" "}
                      {form.hours || "—"} часов
                    </span>
                    <strong className="small">
                      {fmtPrice(form.price === "" ? undefined : Number(form.price), uiLang)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Обрезка обложки перед загрузкой: рамка 16:9 — как в каталоге */}
      {cropping && (
        <CropImageSheet
          file={cropping}
          aspect={16 / 9}
          outWidth={1280}
          title="Обложка курса"
          hint="В рамке — то, что увидят в каталоге и на странице курса.
            Двигайте картинку, масштаб — колесом мыши или щипком."
          onCancel={() => setCropping(null)}
          onDone={(cropped) => {
            setCropping(null);
            void uploadCover(cropped);
          }}
        />
      )}

      {/* Создание второй языковой версии */}
      <Sheet
        open={versionOpen}
        /* Пока запрос идёт, шторка не закрывается: версия всё равно создастся,
           и человек об этом уже не узнает */
        onClose={() => !busy && setVersionOpen(false)}
        title={`Создать ${missingLabel} версию`}
        footer={
          <div className="stack g8">
            <Button block size="lg" loading={busy} onClick={() => createVersion(missingLang)}>
              Создать версию
            </Button>
            <Button variant="secondary" block disabled={busy} onClick={() => setVersionOpen(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <p className="small muted pretty">
            Заведём новый курс с тем же group_id. В каталоге он останется одной карточкой
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
          <p className="caption muted-3 pretty">
            Копируются модули, уроки, тесты и задания вместе с содержимым. Материалы
            уроков и файлы-шаблоны не копируются: файл в хранилище один, и удаление
            из одной версии сломало бы вторую.
          </p>
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
        .drag-handle { cursor: grab; color: var(--muted-3); display: flex; }
        .drag-handle:active { cursor: grabbing; }
        .program-module[data-drop="in"] { border-color: var(--primary); }
        /* Карточка модуля не режет своё содержимое: overflow:hidden обрезал меню
           «⋮» у нижней строки ровно по её границе. Скругление держат крайние
           строки сами — на 1px меньше, это радиус изнутри рамки карточки */
        .program-module > :first-child {
          border-radius: calc(var(--r-card) - 1px) calc(var(--r-card) - 1px) 0 0;
        }
        .program-module > :last-child {
          border-radius: 0 0 calc(var(--r-card) - 1px) calc(var(--r-card) - 1px);
        }
        .drop-row[data-drop="before"] { box-shadow: inset 0 2px 0 0 var(--primary); }
        .drop-row[data-drop="after"] { box-shadow: inset 0 -2px 0 0 var(--primary); }
        @media (min-width: 640px) { .edit-row { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1100px) { .edit-two { grid-template-columns: 1.4fr 1fr; gap: 24px; } }
      `}</style>
    </AdminShell>
  );
}

/* ============ Вкладка «Программа» ============ */

/** Что тащат: модуль целиком или элемент внутри модуля. */
type Drag =
  | { type: "module"; id: number }
  | { type: "item"; kind: ItemKind; id: number };

/** Куда целятся: ключ строки и половина, в которую попал курсор. */
interface Over {
  key: string;
  after: boolean;
}

const itemKey = (i: { kind: ItemKind; id: number }) => `${i.kind}:${i.id}`;

/** Курсор в нижней половине строки — значит «после неё», а не «перед». */
function isAfter(e: React.DragEvent<HTMLElement>): boolean {
  const box = e.currentTarget.getBoundingClientRect();
  return e.clientY > box.top + box.height / 2;
}

/**
 * Дерево после переноса элемента. Позиция считается по соседу, а не по индексу
 * исходного массива: элемент сначала вынимается, и индексы за ним съезжают.
 */
function moveItem(
  program: AdminProgramModule[],
  drag: { kind: ItemKind; id: number },
  toModuleId: number,
  near: { kind: ItemKind; id: number } | null,
  after: boolean,
): AdminProgramModule[] {
  const moved = program
    .flatMap((m) => m.items)
    .find((i) => i.kind === drag.kind && i.id === drag.id);
  if (!moved) return program;
  return program.map((m) => {
    const items = m.items.filter((i) => !(i.kind === moved.kind && i.id === moved.id));
    if (m.id !== toModuleId) return { ...m, items };
    const at = near ? items.findIndex((i) => i.kind === near.kind && i.id === near.id) : -1;
    const pos = at < 0 ? items.length : at + (after ? 1 : 0);
    return { ...m, items: [...items.slice(0, pos), moved, ...items.slice(pos)] };
  });
}

/** Дерево после перестановки модулей — тем же способом, по соседу. */
function moveModule(
  program: AdminProgramModule[],
  fromId: number,
  toId: number,
  after: boolean,
): AdminProgramModule[] {
  if (fromId === toId) return program;
  const moved = program.find((m) => m.id === fromId);
  if (!moved) return program;
  const rest = program.filter((m) => m.id !== fromId);
  const at = rest.findIndex((m) => m.id === toId);
  const pos = at < 0 ? rest.length : at + (after ? 1 : 0);
  return [...rest.slice(0, pos), moved, ...rest.slice(pos)];
}

function ProgramTab({
  courseId,
  program,
  programMinutes,
  hours,
  onProgram,
  refresh,
}: {
  courseId: string;
  program: AdminProgramModule[];
  programMinutes: number;
  hours: string;
  onProgram: (program: AdminProgramModule[], minutes?: number) => void;
  refresh: () => Promise<void>;
}) {
  const router = useRouter();
  const { toast } = useStore();

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [moduleMenu, setModuleMenu] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  /* Удаление элемента — с подтверждением, как у модуля: урок с набранным
     текстом, видео и материалами уходит необратимо, а `has_data` защищает
     только от чужих данных */
  const [deletingItem, setDeletingItem] = useState<AdminProgramItem | null>(null);

  /* Номер запроса и точка отката у порядка: два перетаскивания подряд идут
     двумя PUT, и ответ устаревшего перерисовал бы дерево без уже применённой
     перестановки. Образец нумерации — useLoad в @lms/api */
  const orderSeq = useRef(0);
  const orderPending = useRef(0);
  const orderRollback = useRef<AdminProgramModule[]>(program);
  /* То же по каждому элементу у времени: правку могли отправить дважды подряд */
  const timeSeq = useRef<Record<string, number>>({});

  /* Перетаскивание: что тащим и над чем висим */
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<Over | null>(null);

  /* Требуемое время правится на месте: program_order времени не несёт,
     поэтому каждая строка сохраняется PATCH-ем своего элемента */
  const [times, setTimes] = useState<Record<string, string>>({});
  const [timeErrors, setTimeErrors] = useState<Record<string, string>>({});

  /* Добавление элемента: тип → вид урока → модуль → название → время */
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<ItemKind>("video");
  const [addModuleId, setAddModuleId] = useState<number | "">("");
  const [addTitle, setAddTitle] = useState("");
  const [addTime, setAddTime] = useState("12");
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  /* Модуль: создание и переименование живут одной шторкой */
  const [moduleOpen, setModuleOpen] = useState(false);
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleError, setModuleError] = useState("");

  /* Удаление модуля: 409 приходит со списком того, что держит */
  const [deleting, setDeleting] = useState<AdminProgramModule | null>(null);
  const [blockers, setBlockers] = useState<
    { kind?: string; title?: string; reason?: string }[]
  >([]);
  const [blockMessage, setBlockMessage] = useState("");

  const hiddenItems = program.flatMap((m) => m.items).filter((i) => i.is_hidden);
  const hiddenCount = hiddenItems.length;
  /* Сервер суммирует только видимое, и «Всего по программе: 0 мин» под
     строками с числами выглядит потерей данных. Сколько минут спрятано —
     считаем сами: в ответе такого поля нет */
  const hiddenMinutes = hiddenItems.reduce((s, i) => s + i.time_required_min, 0);
  const addGroup = groupOf(addKind);

  const endDrag = () => {
    setDrag(null);
    setOver(null);
  };

  /* dragover прилетает непрерывно — перерисовываем дерево только когда
     цель действительно сменилась */
  const hover = (key: string, after: boolean) =>
    setOver((o) => (o && o.key === key && o.after === after ? o : { key, after }));

  /**
   * Порядок уходит деревом целиком: на неполное дерево сервер отвечает 422
   * и не меняет ничего. Ответ заменяет состояние — перерисовываем им, а не
   * своей оптимистичной перестановкой.
   */
  const saveOrder = async (next: AdminProgramModule[]) => {
    const my = ++orderSeq.current;
    /* Откат — к дереву до всей цепочки: неполное дерево сервер не применяет,
       и возвращаться к чужой неподтверждённой перестановке незачем */
    if (orderPending.current === 0) orderRollback.current = program;
    orderPending.current += 1;
    onProgram(next);
    const body: ProgramOrderIn = {
      modules: next.map((m) => ({
        id: m.id,
        items: m.items.map((i) => ({ kind: i.kind, id: i.id })),
      })),
    };
    try {
      const res = await api<AdminProgram>(`/admin/courses/${courseId}/program_order`, {
        method: "PUT",
        json: body,
      });
      if (orderSeq.current === my) onProgram(res.program, res.program_minutes);
    } catch (e) {
      if (orderSeq.current === my) {
        onProgram(orderRollback.current);
        /* Весь смысл 422 здесь в `details.fields` — «В дереве не хватает
           элементов курса: 2»; `message` у него общий, показывать нечего */
        const fields = fieldErrors(e);
        toast(
          Object.values(fields)[0] ||
            (isApiError(e) ? e.message : "Не удалось сохранить порядок"),
          "error",
        );
      }
    } finally {
      orderPending.current -= 1;
    }
  };

  /** Бросили на модуль: свой модуль переставляем, чужой элемент кладём в конец */
  const dropOnModule = (m: AdminProgramModule, after: boolean, onHeader: boolean) => {
    if (!drag) return;
    const next =
      drag.type === "module"
        ? onHeader
          ? moveModule(program, drag.id, m.id, after)
          : program
        : moveItem(program, drag, m.id, null, false);
    endDrag();
    if (next !== program) saveOrder(next);
  };

  const dropOnItem = (m: AdminProgramModule, item: AdminProgramItem, after: boolean) => {
    if (!drag || drag.type !== "item") return;
    if (drag.kind === item.kind && drag.id === item.id) {
      endDrag();
      return;
    }
    const next = moveItem(program, drag, m.id, item, after);
    endDrag();
    saveOrder(next);
  };

  /** Требуемое время сохраняется у своего элемента, сумму пересчитывает сервер */
  const saveTime = async (item: AdminProgramItem) => {
    const key = itemKey(item);
    const raw = times[key];
    if (raw === undefined) return;
    const clear = () =>
      setTimes((t) => {
        const { [key]: _, ...rest } = t;
        return rest;
      });
    if (raw === "" || Number(raw) === item.time_required_min) {
      clear();
      setTimeErrors((t) => ({ ...t, [key]: "" }));
      return;
    }
    const my = (timeSeq.current[key] ?? 0) + 1;
    timeSeq.current[key] = my;
    try {
      await api(`/admin${itemPath(item.kind, item.id)}`, {
        method: "PATCH",
        json: { time_required_min: Number(raw) },
      });
      if (timeSeq.current[key] !== my) return;
      setTimeErrors((t) => ({ ...t, [key]: "" }));
      clear();
      await refresh();
    } catch (e) {
      if (timeSeq.current[key] !== my) return;
      const fields = fieldErrors(e);
      const other = Object.entries(fields).find(([f]) => f !== "time_required_min");
      if (fields.time_required_min) {
        setTimeErrors((t) => ({ ...t, [key]: fields.time_required_min }));
      } else if (other) {
        /* Пустую заготовку сервер отбивает по своему полю — видеоурок без
           ссылки. Под полем времени этот текст читался бы как «время
           не сохранилось из-за времени», поэтому причину называем тостом
           и уводим в редактор элемента, где её и чинят */
        setTimeErrors((t) => ({ ...t, [key]: "не сохранилось — дело в другом поле" }));
        toast(
          `«${item.title}»: ${other[1]} Откройте элемент — время сохранится вместе с ним.`,
          "error",
        );
      } else {
        setTimeErrors((t) => ({
          ...t,
          [key]: isApiError(e) ? e.message : "Не удалось сохранить время",
        }));
      }
    }
  };

  /** Скрыть можно всегда — даже то, что нельзя удалить */
  const toggleHidden = async (item: AdminProgramItem) => {
    if (busy) return;
    setBusy(true);
    setMenuFor(null);
    try {
      await api(`/admin${itemPath(item.kind, item.id)}`, {
        method: "PATCH",
        json: { is_hidden: !item.is_hidden },
      });
      await refresh();
      toast(
        item.is_hidden
          ? "Элемент показан — он снова в программе у учителей"
          : "Элемент скрыт — у тех, кто его прошёл, всё осталось",
        "success",
      );
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось поменять видимость", "error");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (item: AdminProgramItem) => {
    if (busy) return;
    setBusy(true);
    setMenuFor(null);
    try {
      await api(`/admin${itemPath(item.kind, item.id)}`, { method: "DELETE" });
      await refresh();
      toast("Элемент удалён", "success");
    } catch (e) {
      /* 409 приходит с готовой русской строкой и числом — показываем её */
      toast(isApiError(e) ? e.message : "Не удалось удалить элемент", "error");
    } finally {
      setBusy(false);
      setDeletingItem(null);
    }
  };

  const openAdd = (kind: ItemKind, target?: number) => {
    setAddKind(kind);
    setAddTime(String(KIND_META[kind].time));
    setAddTitle("");
    setAddErrors({});
    setAddModuleId(target ?? program[0]?.id ?? "");
    setAddOpen(true);
  };

  const pickKind = (kind: ItemKind) => {
    setAddKind(kind);
    setAddTime(String(KIND_META[kind].time));
  };

  /** Урок открывается видеоуроком: он у методистов чаще */
  const pickGroup = (group: AddGroup) => pickKind(group === "lesson" ? "video" : group);

  /**
   * Все три ручки отвечают объектом своего редактора целиком — у него есть id,
   * поэтому «добавить и открыть» уходит туда сразу.
   */
  const submitAdd = async (openEditor: boolean) => {
    if (busy || addModuleId === "") return;
    setBusy(true);
    setAddErrors({});
    const meta = KIND_META[addKind];
    const title = addTitle.trim() || meta.title;
    /* Ноль — это «времени не требует», а не пустое поле: подставляем своё
       значение только когда поле стёрли */
    const time = addTime === "" ? meta.time : Number(addTime);
    const base = `/admin/modules/${addModuleId}`;
    try {
      const created = await api<AdminLesson | AdminQuiz | AdminTask>(
        addKind === "quiz"
          ? `${base}/quizzes`
          : addKind === "task"
            ? `${base}/tasks`
            : `${base}/lessons`,
        {
          method: "POST",
          json:
            addKind === "quiz"
              ? { title, time_required_min: time, is_final: false, pass_score: 70 }
              : addKind === "task"
                ? { title, time_required_min: time }
                : { title, kind: addKind, time_required_min: time },
        },
      );
      setAddOpen(false);
      if (openEditor) {
        router.push(itemPath(addKind, created.id));
        return;
      }
      await refresh();
      toast(`Добавили «${title}» — заготовка скрыта, пока не наполнена`, "success");
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setAddErrors(fields);
      else toast(isApiError(e) ? e.message : "Не удалось добавить элемент", "error");
    } finally {
      setBusy(false);
    }
  };

  const openModuleSheet = (m?: AdminProgramModule) => {
    setModuleId(m?.id ?? null);
    setModuleTitle(m?.title ?? "");
    setModuleError("");
    setModuleOpen(true);
    setModuleMenu(null);
  };

  const submitModule = async () => {
    if (busy) return;
    setBusy(true);
    setModuleError("");
    const title = moduleTitle.trim() || `Модуль ${program.length + 1}`;
    try {
      if (moduleId === null) {
        const created = await api<AdminProgramModule>(
          `/admin/courses/${courseId}/modules`,
          { method: "POST", json: { title } },
        );
        setModuleOpen(false);
        await refresh();
        /* Пустой модуль никому не нужен — сразу предлагаем первый элемент */
        openAdd("video", created.id);
      } else {
        await api<AdminProgramModule>(`/admin/modules/${moduleId}`, {
          method: "PATCH",
          json: { title },
        });
        setModuleOpen(false);
        await refresh();
        toast("Модуль переименован", "success");
      }
    } catch (e) {
      const fields = fieldErrors(e);
      setModuleError(
        fields.title ?? (isApiError(e) ? e.message : "Не удалось сохранить модуль"),
      );
    } finally {
      setBusy(false);
    }
  };

  const removeModule = async (m: AdminProgramModule) => {
    if (busy) return;
    setBusy(true);
    setBlockers([]);
    setBlockMessage("");
    try {
      await api(`/admin/modules/${m.id}`, { method: "DELETE" });
      setDeleting(null);
      await refresh();
      toast("Модуль удалён вместе со своими элементами", "success");
    } catch (e) {
      /* 409 module_in_use несёт список того, что держит удаление: без него
         непонятно, куда идти разбираться */
      if (isApiError(e, "module_in_use")) {
        setBlockMessage(e.message);
        setBlockers(
          Array.isArray(e.details.items)
            ? (e.details.items as { kind?: string; title?: string; reason?: string }[])
            : [],
        );
      } else {
        setDeleting(null);
        toast(isApiError(e) ? e.message : "Не удалось удалить модуль", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack g16">
      <div className="row wrap g8">
        <Button size="sm" icon={<IconPlus size={15} />} onClick={() => openModuleSheet()}>
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
        Урок бывает двух видов — видеоурок и текстовый, вид выбирается при добавлении
        и меняется в редакторе урока. У теста и задания свои редакторы. Порядок
        меняется перетаскиванием за ручку слева: и элементы внутри модуля, и модули
        между собой, и элемент из одного модуля в другой.
      </span>

      {program.length === 0 ? (
        <div className="card">
          <Empty
            icon={<IconLayers size={34} />}
            title="Программа пока пустая"
            text="Добавьте модуль, а внутрь — уроки, тесты и задания."
            action={
              <Button icon={<IconPlus size={16} />} onClick={() => openModuleSheet()}>
                Добавить модуль
              </Button>
            }
          />
        </div>
      ) : (
        <div className="stack g12">
          {program.map((m) => {
            const mKey = `m${m.id}`;
            const visibleMinutes = m.items
              .filter((i) => !i.is_hidden)
              .reduce((s, i) => s + i.time_required_min, 0);
            /* Элементы в шапке считаются все, минуты — только видимые, и «4
               элемента · 0 мин» читается как поломка. Скрытые называем прямо */
            const hiddenInModule = m.items.filter((i) => i.is_hidden).length;
            return (
              <div
                key={m.id}
                className="card program-module"
                data-drop={over?.key === mKey && drag?.type === "item" ? "in" : undefined}
                onDragOver={(e) => {
                  if (drag?.type !== "item") return;
                  e.preventDefault();
                  hover(mKey, false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOnModule(m, false, false);
                }}
              >
                <div
                  className="row g10 drop-row"
                  style={{
                    padding: "14px 16px",
                    background: "#fbfcfe",
                    borderBottom: "1px solid var(--border)",
                  }}
                  data-drop={
                    over?.key === mKey && drag?.type === "module"
                      ? over.after
                        ? "after"
                        : "before"
                      : undefined
                  }
                  onDragOver={(e) => {
                    if (!drag) return;
                    e.preventDefault();
                    e.stopPropagation();
                    hover(mKey, isAfter(e));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropOnModule(m, isAfter(e), true);
                  }}
                >
                  <span
                    className="drag-handle"
                    draggable
                    aria-label={`Перетащить модуль: ${m.title}`}
                    onDragStart={(e) => {
                      /* Firefox не начинает перетаскивание без setData */
                      e.dataTransfer.setData("text/plain", m.title);
                      e.dataTransfer.effectAllowed = "move";
                      setDrag({ type: "module", id: m.id });
                    }}
                    onDragEnd={endDrag}
                  >
                    <IconDrag size={18} />
                  </span>
                  <div className="grow stack g2" style={{ minWidth: 0 }}>
                    <strong className="small">{m.title}</strong>
                    <span className="caption muted-3">
                      {m.items.length}{" "}
                      {plural(m.items.length, "элемент", "элемента", "элементов")}
                      {hiddenInModule > 0 &&
                        ` (${hiddenInModule} ${plural(
                          hiddenInModule,
                          "скрыт",
                          "скрыты",
                          "скрыто",
                        )})`}{" "}
                      · {duration(visibleMinutes)}
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <button
                      className="btn btn-icon"
                      style={{ minHeight: 34, width: 34 }}
                      aria-label="Действия с модулем"
                      onClick={() => setModuleMenu(moduleMenu === m.id ? null : m.id)}
                    >
                      <IconMore size={17} />
                    </button>
                    {moduleMenu === m.id && (
                      <>
                        <div
                          style={{ position: "fixed", inset: 0, zIndex: 40 }}
                          onClick={() => setModuleMenu(null)}
                        />
                        <div className="row-menu">
                          <MenuButton icon={IconEdit} onClick={() => openModuleSheet(m)}>
                            Переименовать
                          </MenuButton>
                          <MenuButton
                            icon={IconTrash}
                            danger
                            onClick={() => {
                              setModuleMenu(null);
                              setBlockers([]);
                              setBlockMessage("");
                              setDeleting(m);
                            }}
                          >
                            Удалить модуль
                          </MenuButton>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {m.items.length === 0 && (
                  <p className="small muted pretty" style={{ padding: "14px 16px", margin: 0 }}>
                    В модуле пока ничего нет — добавьте первый элемент кнопками ниже.
                  </p>
                )}

                {m.items.map((item) => {
                  const key = itemKey(item);
                  const Icon = kindIcon(item.kind);
                  const href = itemPath(item.kind, item.id);
                  return (
                    <div
                      key={key}
                      className="row wrap g10 program-row drop-row"
                      style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}
                      data-drop={
                        over?.key === key && drag?.type === "item"
                          ? over.after
                            ? "after"
                            : "before"
                          : undefined
                      }
                      onDragOver={(e) => {
                        if (drag?.type !== "item") return;
                        e.preventDefault();
                        e.stopPropagation();
                        hover(key, isAfter(e));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dropOnItem(m, item, isAfter(e));
                      }}
                    >
                      <span
                        className="drag-handle"
                        draggable
                        aria-label={`Перетащить: ${item.title}`}
                        onDragStart={(e) => {
                          /* Firefox не начинает перетаскивание без setData */
                          e.dataTransfer.setData("text/plain", item.title);
                          e.dataTransfer.effectAllowed = "move";
                          setDrag({ type: "item", kind: item.kind, id: item.id });
                        }}
                        onDragEnd={endDrag}
                      >
                        <IconDrag size={16} />
                      </span>
                      <span
                        className="lesson-icon"
                        style={{ width: 30, height: 30, borderRadius: 9 }}
                      >
                        <Icon size={16} />
                      </span>
                      {/* Ссылку не тащим: перетаскивание живёт на ручке слева */}
                      <Link
                        href={href}
                        draggable={false}
                        className="grow"
                        style={{ minWidth: 120 }}
                      >
                        <span className="small" style={{ fontWeight: 600 }}>
                          {item.title}
                        </span>
                      </Link>

                      {/* Требует времени — вручную у урока, теста и задания */}
                      <div className="stack g2">
                        <label className="row g6 nowrap caption muted">
                          требует времени
                          <input
                            className={`input${timeErrors[key] ? " input-error" : ""}`}
                            inputMode="numeric"
                            aria-label={`Требуемое время: ${item.title}`}
                            value={times[key] ?? String(item.time_required_min)}
                            onChange={(e) =>
                              setTimes((t) => ({ ...t, [key]: digits(e.target.value) }))
                            }
                            onBlur={() => saveTime(item)}
                            style={{ width: 64, height: 38, textAlign: "center" }}
                          />
                          мин
                        </label>
                        {timeErrors[key] && (
                          <span className="error-text">{timeErrors[key]}</span>
                        )}
                      </div>

                      <Badge kind={item.is_ready ? "accepted" : "neutral"}>
                        {item.is_ready ? "готов" : "черновик"}
                      </Badge>
                      {/* Название теста пишет админ, а условие сертификата смотрит
                          на is_final: без бейджа «Итоговый тест» в списке может
                          оказаться обычным, и перепутать их нечем */}
                      {item.kind === "quiz" && item.is_final && (
                        <Badge kind="new">итоговый</Badge>
                      )}
                      {item.is_hidden && (
                        /* Заготовка заводится скрытой всегда, поэтому «Показать» —
                           самое частое действие при сборке курса: держать его в «⋮»
                           дорого. На узком экране бейдж с кнопкой переносятся парой */
                        <span className="row g6 nowrap">
                          <Badge kind="locked">скрыт</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<IconEye size={15} />}
                            onClick={() => toggleHidden(item)}
                          >
                            Показать
                          </Button>
                        </span>
                      )}

                      <div style={{ position: "relative" }}>
                        <button
                          className="btn btn-icon"
                          style={{ minHeight: 32, width: 32 }}
                          aria-label="Действия"
                          onClick={() => setMenuFor(menuFor === key ? null : key)}
                        >
                          <IconMore size={16} />
                        </button>
                        {menuFor === key && (
                          <>
                            <div
                              style={{ position: "fixed", inset: 0, zIndex: 40 }}
                              onClick={() => setMenuFor(null)}
                            />
                            <div className="row-menu">
                              <Link
                                href={href}
                                className="admin-nav-item"
                                onClick={() => setMenuFor(null)}
                              >
                                <IconEdit size={17} />
                                Редактировать
                              </Link>
                              <MenuButton
                                icon={item.is_hidden ? IconEye : IconEyeOff}
                                onClick={() => toggleHidden(item)}
                              >
                                {item.is_hidden ? "Показать" : "Скрыть"}
                              </MenuButton>
                              {item.has_data ? (
                                <p
                                  className="caption muted-3 pretty"
                                  style={{ padding: "6px 12px 8px", margin: 0 }}
                                >
                                  Удалить нельзя: {keepsReason(item.kind)}. Скрытый элемент
                                  исчезает у учителей целиком, но у тех, кто его прошёл,
                                  засчитанное остаётся.
                                </p>
                              ) : (
                                <MenuButton
                                  icon={IconTrash}
                                  danger
                                  onClick={() => {
                                    setMenuFor(null);
                                    setDeletingItem(item);
                                  }}
                                >
                                  Удалить
                                </MenuButton>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Добавление прямо в этот модуль — тип виден сразу */}
                <div className="row wrap g8" style={{ padding: "10px 16px", background: "#fbfcfe" }}>
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
            );
          })}
        </div>
      )}

      {/* Сумма по программе — считает сервер по видимым элементам */}
      <div className="card card-pad row between wrap g10">
        <span className="small muted">Всего по программе</span>
        <span className="row wrap g8" style={{ alignItems: "baseline" }}>
          <strong style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
            {duration(programMinutes)}
          </strong>
          {hiddenMinutes > 0 && (
            <span className="caption muted-3">+ {duration(hiddenMinutes)} скрыто</span>
          )}
        </span>
      </div>
      <span className="caption muted-3 pretty">
        Объём курса в сертификате задаётся отдельно, на вкладке «Основное»: сейчас
        там {hours || "—"} часов. Скрытые элементы в сумму не входят.
      </span>
      {hiddenCount > 0 && (
        <Note kind="muted">
          <span className="caption pretty">
            Скрытых элементов: {hiddenCount}. У учителя такого элемента нет ни в программе,
            ни по прямой ссылке — заготовка заводится скрытой нарочно. Показать её можно
            пунктом «Показать» в меню строки или переключателем видимости в редакторе
            элемента, когда она наполнена.
          </span>
        </Note>
      )}

      {/* Добавление элемента программы: сначала тип, потом куда и как называется */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Добавить в программу"
        footer={
          <div className="stack g8">
            <Button block size="lg" loading={busy} onClick={() => submitAdd(true)}>
              Добавить и открыть редактор
            </Button>
            <Button variant="secondary" block loading={busy} onClick={() => submitAdd(false)}>
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
              onChange={(e) => setAddModuleId(Number(e.target.value))}
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
              className={`input${addErrors.title ? " input-error" : ""}`}
              value={addTitle}
              onChange={(e) => {
                setAddTitle(e.target.value);
                setAddErrors((p) => (p.title ? { ...p, title: "" } : p));
              }}
              placeholder={KIND_META[addKind].title}
            />
            <span className="hint">
              Оставьте пустым — подставим «{KIND_META[addKind].title}». Название меняется
              в редакторе в любой момент.
            </span>
            {addErrors.title && <span className="error-text">{addErrors.title}</span>}
          </div>

          <div className="field" style={{ maxWidth: 220 }}>
            <label className="label">Требует времени, минут</label>
            <input
              className={`input${addErrors.time_required_min ? " input-error" : ""}`}
              inputMode="numeric"
              value={addTime}
              onChange={(e) => {
                setAddTime(digits(e.target.value));
                setAddErrors((p) =>
                  p.time_required_min ? { ...p, time_required_min: "" } : p,
                );
              }}
            />
            <span className="hint">Складывается в сумму по программе</span>
            {addErrors.time_required_min && (
              <span className="error-text">{addErrors.time_required_min}</span>
            )}
          </div>

          <Note kind="muted">
            <span className="small">
              {addKind === "quiz"
                ? "Тест откроется в редакторе теста: вопросы, проходной балл и признак итогового задаются там — сейчас ставим 70% и «не итоговый»."
                : addKind === "task"
                  ? "Задание откроется в редакторе задания: условие, формат сдачи, критерии."
                  : addKind === "video"
                    ? "Видеоурок откроется в редакторе: ссылка на YouTube обязательна, текст под видео и файлы — по желанию."
                    : "Текстовый урок откроется в редакторе: текст обязателен, файлы — по желанию."}{" "}
              Заготовка заводится скрытой и черновиком: пустой элемент не должен всплыть
              у учителей, пока его не наполнили.
            </span>
          </Note>
        </div>
      </Sheet>

      {/* Модуль: одна шторка на создание и переименование */}
      <Sheet
        open={moduleOpen}
        onClose={() => setModuleOpen(false)}
        title={moduleId === null ? "Новый модуль" : "Переименовать модуль"}
        footer={
          <div className="stack g8">
            <Button block size="lg" loading={busy} onClick={submitModule}>
              {moduleId === null ? "Создать модуль" : "Сохранить название"}
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
              className={`input${moduleError ? " input-error" : ""}`}
              value={moduleTitle}
              onChange={(e) => {
                setModuleTitle(e.target.value);
                setModuleError("");
              }}
              placeholder={`Модуль ${program.length + 1}`}
            />
            {moduleError && <span className="error-text">{moduleError}</span>}
          </div>
          {moduleId === null && (
            <p className="small muted pretty">
              Сразу после создания предложим добавить в него первый элемент — урок, тест
              или задание.
            </p>
          )}
        </div>
      </Sheet>

      {/* Удаление модуля: что держит удаление, сервер называет поимённо */}
      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Удалить модуль?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              loading={busy}
              onClick={() => deleting && removeModule(deleting)}
            >
              Удалить
            </Button>
            <Button variant="secondary" block onClick={() => setDeleting(null)}>
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <p className="body muted pretty">
            «{deleting?.title}» удалится вместе со своими уроками, тестами и заданиями:
            модуль без содержимого никому не нужен, а вычищать его поэлементно значит
            десять раз ответить на один и тот же вопрос.
          </p>
          {blockMessage && (
            <Note kind="danger">
              <div className="stack g8">
                <span className="small pretty">{blockMessage}</span>
                <div className="stack g4">
                  {blockers.map((b, i) => (
                    <span key={i} className="caption pretty">
                      {KIND_META[(b.kind ?? "video") as ItemKind]?.label ?? b.kind} «{b.title}»
                      {b.reason === "has_attempts"
                        ? " — есть попытки"
                        : b.reason === "has_submissions"
                          ? " — есть сдачи"
                          : " — есть прогресс"}
                    </span>
                  ))}
                </div>
                <span className="caption muted pretty">
                  Такие элементы скрывают по одному — пункт «Скрыть» в меню строки, —
                  а модуль остаётся.
                </span>
              </div>
            </Note>
          )}
        </div>
      </Sheet>

      {/* Удаление элемента: заготовку не жаль, а наполненный урок — уже работа */}
      <Sheet
        open={deletingItem !== null}
        onClose={() => !busy && setDeletingItem(null)}
        title="Удалить элемент?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              loading={busy}
              onClick={() => deletingItem && removeItem(deletingItem)}
            >
              Удалить
            </Button>
            <Button
              variant="secondary"
              block
              disabled={busy}
              onClick={() => setDeletingItem(null)}
            >
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          «{deletingItem?.title}» удалится вместе со своим содержимым — текстом,
          видео, вопросами, материалами. Вернуть его будет нечем: копии
          не остаётся. Если элемент ещё пригодится, его лучше скрыть.
        </p>
      </Sheet>

      <style>{`
        .row-menu {
          position: absolute; right: 0; top: calc(100% + 4px); z-index: 50;
          min-width: 230px; padding: 6px; background: #fff;
          border: 1px solid var(--border); border-radius: 12px;
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
}

/** Пункт меню-кнопка: в разметке их много, а классы у всех одни и те же. */
function MenuButton({
  icon: Icon,
  danger,
  onClick,
  children,
}: {
  icon: (p: { size?: number }) => React.JSX.Element;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="admin-nav-item"
      style={{
        color: danger ? "var(--danger)" : undefined,
        width: "100%",
        border: "none",
        background: "none",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Icon size={17} />
      {children}
    </button>
  );
}
