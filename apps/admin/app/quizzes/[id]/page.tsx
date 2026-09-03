"use client";

/**
 * Редактор теста «/quizzes/:id» — раздел 5.19 брифа.
 *
 * Единственный экран, которому сервер отдаёт правильные ответы: `is_correct`
 * у варианта и пояснение у вопроса приходят только в `GET /admin/quizzes/{id}`.
 * Учительский `GET /quizzes/{id}` не отдаёт ни того, ни другого, и право
 * на них проверяет сервер, а не то, что экран лежит на админском домене.
 *
 * Главный переключатель — «Пересдаваемый», выключен по умолчанию:
 *  - выключен: одна попытка, пересдачу открывает админ вручную в карточке учителя;
 *  - включён: попыток сколько угодно, засчитывается последний результат.
 * Подсказка под переключателем меняется вместе с ним.
 *
 * **Экран сохраняется сам, по уходу из поля** — не по паузе при печати:
 * промежуточное слово на сервер попадать не должно. Галочки, выпадающие списки
 * и добавление варианта уходят сразу по изменению: уходить из них некуда.
 *
 * Настройки и вопросы сохраняются порознь. Настройки шлёт
 * `PATCH /admin/quizzes/{id}` и только теми полями, что разошлись с сервером;
 * кнопка в шапке осталась способом отправить всё разом и повторить после
 * отказа. Вопросы ходят на сервер поштучно
 * (`POST /admin/quizzes/{id}/questions`, `PATCH /admin/quiz_questions/{id}`),
 * общей ручки «сохранить все вопросы» в контракте нет.
 *
 * **Недоделанный вопрос виден красным и на сервер не уходит вовсе** — правила
 * «вопрос целый» повторены с сервера в `questionProblems`. Запросы идут по
 * одному, очередью: уход из одного поля и щелчок в другом накладываются, и без
 * очереди правка молча пропадала бы. Про закрытие вкладки с недоделанным
 * вопросом переспрашивает браузер; переход по ссылке внутри админки —
 * клиентская навигация, и вопроса там не будет.
 *
 * **Вопрос, попавший хоть в одну попытку, не редактируется.** `has_attempts`
 * приходит с сервера, и замок рисуется по нему, не дожидаясь `409`: у такого
 * вопроса работают только «Скрыть / Показать» и «Дублировать». Дубль —
 * новый вопрос, его править можно, и это ровно то, что предлагает сервер
 * в тексте своего отказа.
 *
 * Порядок вопросов экран не меняет: ручки, которая его переставляет,
 * в контракте нет — новый вопрос всегда встаёт последним.
 */

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminQuiz,
  type AdminQuizPatch,
  type AdminQuizQuestion,
  type QuestionType,
  type QuizOptionIn,
  type QuizQuestionIn,
  type QuizQuestionPatch,
} from "@lms/api";
import { useToast } from "@lms/ui/toast";
import { fieldErrors } from "@/lib/fieldErrors";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Breadcrumbs, Button, Empty, LinkButton, Note, Sheet } from "@lms/ui";
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconInfo,
  IconLock,
  IconPlus,
  IconQuiz,
  IconTrash,
} from "@lms/ui/icons";

/* Сколько вариантов у вопроса имеет смысл — те же границы, что у сервера:
   он их и проверяет, экран только не даёт зайти в заведомо пустое. */
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
/* «Несколько правильных» из двух вариантов — это вопрос с одним ответом
   наоборот: у сервера та же граница и то же объяснение */
const MIN_MULTI_OPTIONS = 3;

/** Ключ настроек в очереди сохранений: у строк вопросов ключи свои. */
const SETTINGS_KEY = "settings";

const TYPE_LABEL: Record<QuestionType, string> = {
  single: "Один правильный",
  multi: "Несколько правильных",
  bool: "Верно / Неверно",
};

/* Подсказка заранее, серым: правила зачёта проверяет сервер, и при отказе
   на экране показывается его строка, а не эта. */
const TYPE_HINT: Record<QuestionType, string> = {
  single: "Правильный ровно один. Вариантов от 2 до 10.",
  multi:
    "Правильных хотя бы один, вариантов не меньше трёх. Зачёт только за полностью верный набор — частичных баллов нет.",
  bool: "Ровно два варианта и ровно один правильный.",
};

/* Ошибки вопроса, у которых на экране есть своё поле; остальные сервер
   называет по-своему (например, вариант по номеру) и они идут строкой сверху. */
const INLINE_FIELDS = ["text", "explanation", "options"];

/* ============ Настройки теста ============ */

interface Form {
  title: string;
  is_final: boolean;
  pass_score: string;
  /* Переключатель «Таймер» — и есть выбор между null и числом */
  timer: boolean;
  time_limit_min: string;
  shuffle: boolean;
  show_review: boolean;
  retakable: boolean;
  time_required_min: string;
  is_hidden: boolean;
}

function formOf(q: AdminQuiz): Form {
  return {
    title: q.title,
    is_final: q.is_final,
    pass_score: String(q.pass_score),
    timer: q.time_limit_min !== null,
    time_limit_min: q.time_limit_min === null ? "" : String(q.time_limit_min),
    shuffle: q.shuffle,
    show_review: q.show_review,
    retakable: q.retakable,
    time_required_min: String(q.time_required_min),
    is_hidden: q.is_hidden,
  };
}

function patchBody(f: Form): AdminQuizPatch {
  return {
    title: f.title.trim(),
    is_final: f.is_final,
    pass_score: Number(f.pass_score),
    /* У таймера null — это значение «таймера нет», а не «не прислано».
       Пустых минут при включённом переключателе сюда не доходит: их
       останавливает validate */
    time_limit_min: f.timer ? Number(f.time_limit_min) : null,
    shuffle: f.shuffle,
    show_review: f.show_review,
    retakable: f.retakable,
    time_required_min: Number(f.time_required_min),
    is_hidden: f.is_hidden,
  };
}

/**
 * Только то, что разошлось с сервером. Автосохранение стреляет по уходу
 * из поля, и слать всю форму целиком нельзя: в соседнем поле в этот момент
 * может лежать наполовину набранное число, которое ушло бы на сервер заодно.
 */
function changedFields(f: Form, base: Form): AdminQuizPatch {
  const now = patchBody(f);
  const was = patchBody(base);
  const out: AdminQuizPatch = {};
  for (const key of Object.keys(now) as (keyof AdminQuizPatch)[]) {
    if (now[key] !== was[key]) Object.assign(out, { [key]: now[key] });
  }
  return out;
}

/**
 * Что экран не отправляет.
 *
 * Стёртое обязательное число: `null` сервер читает как «не прислано»
 * и возвращает прежнее значение, форма пересобирается ответом, и правка
 * исчезает при зелёном тосте.
 *
 * Открытый тест без единого видимого вопроса: у учителя попытка отдаёт
 * `409 quiz_empty`, а строка «Сдать все тесты модулей» в условиях сертификата
 * перестаёт быть выполнимой кем бы то ни было — ровно тот отказ, ради которого
 * заготовку теста и заводят скрытой.
 */
function validate(f: Form, hasVisibleQuestions: boolean): Record<string, string> {
  const wrong: Record<string, string> = {};
  if (f.pass_score === "") wrong.pass_score = "Укажите проходной балл";
  if (f.time_required_min === "") wrong.time_required_min = "Укажите минуты";
  if (f.timer && f.time_limit_min === "") {
    wrong.time_limit_min = "Укажите минуты или выключите таймер";
  }
  if (!f.is_hidden && !hasVisibleQuestions) {
    wrong.is_hidden =
      "В тесте нет ни одного видимого вопроса — открытым он остаться не может";
  }
  return wrong;
}

/* ============ Вопрос ============ */

interface Opt {
  /** Ключ строки варианта: у самих вариантов ничего своего нет */
  key: string;
  text: string;
  is_correct: boolean;
}

/* Ключ по индексу React переставляет при удалении варианта из середины —
   каретка и фокус уезжают в чужое поле. Поэтому ключ у варианта свой
   и живёт ровно столько, сколько сама строка */
let optionSeq = 0;
const newOption = (text = "", is_correct = false): Opt => {
  optionSeq += 1;
  return { key: `o${optionSeq}`, text, is_correct };
};

interface QForm {
  type: QuestionType;
  text: string;
  explanation: string;
  points: string;
  options: Opt[];
}

interface Row {
  /** Ключ строки: id с сервера или локальный у ещё не созданного вопроса */
  key: string;
  /** Что лежит на сервере; null — вопрос набран, но ещё не создан */
  saved: AdminQuizQuestion | null;
  form: QForm;
  errors: Record<string, string>;
  /** Номер правки: ответ уже улетевшего запроса не затирает набранное позже */
  rev: number;
}

function qFormOf(q: AdminQuizQuestion): QForm {
  return {
    type: q.type,
    text: q.text,
    explanation: q.explanation ?? "",
    points: String(q.points),
    options: q.options.map((o) => newOption(o.text, o.is_correct)),
  };
}

const rowOf = (q: AdminQuizQuestion): Row => ({
  key: String(q.id),
  saved: q,
  form: qFormOf(q),
  errors: {},
  rev: 0,
});

/** Форма из ответа сервера, но с прежними ключами у не изменившихся вариантов:
    новый ключ пересоздаёт input, а фокус уже ушёл в следующее поле. */
function mergedForm(prev: QForm, saved: AdminQuizQuestion): QForm {
  const fresh = qFormOf(saved);
  return {
    ...fresh,
    options: fresh.options.map((o, i) => {
      const was = prev.options[i];
      return was && was.text === o.text && was.is_correct === o.is_correct ? was : o;
    }),
  };
}

const sameOptions = (a: Opt[], b: Opt[]) =>
  a.length === b.length &&
  a.every((o, i) => o.text === b[i].text && o.is_correct === b[i].is_correct);

/** Набранное расходится с сохранённым — вопрос помечается «не сохранён». */
function isDirty(row: Row): boolean {
  if (!row.saved) return true;
  const base = qFormOf(row.saved);
  return (
    row.form.type !== base.type ||
    row.form.text !== base.text ||
    row.form.explanation !== base.explanation ||
    row.form.points !== base.points ||
    !sameOptions(row.form.options, base.options)
  );
}

/**
 * Чего вопросу не хватает, чтобы уйти на сервер: пусто — вопрос целый.
 *
 * Это **сознательное повторение серверной проверки** — `_checked_text`
 * и `_checked_options` из `backend/app/application/quizzes_admin.py`, вплоть
 * до порядка проверок, чисел и формулировок. Без него автосохранение било бы
 * в `422` на каждой букве: пустая заготовка вопроса не проходит ни одну
 * из этих проверок. Расходится с сервером — экран либо молчит о запрете,
 * либо красит нормальный вопрос красным.
 */
function questionProblems(f: QForm): Record<string, string> {
  const wrong: Record<string, string> = {};
  if (!f.text.trim()) wrong.text = "Без текста вопрос не сохранить";
  const options = f.options.map((o) => ({ text: o.text.trim(), is_correct: o.is_correct }));
  const correct = options.filter((o) => o.is_correct).length;
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    wrong.options = `Вариантов должно быть от ${MIN_OPTIONS} до ${MAX_OPTIONS}`;
  } else if (options.some((o) => !o.text)) {
    wrong.options = "Вариант без текста не сохранить";
  } else if (f.type === "single" && correct !== 1) {
    wrong.options = "В вопросе с одним ответом правильный ровно один";
  } else if (f.type === "multi" && !correct) {
    wrong.options = "В вопросе с несколькими ответами нужен правильный";
  } else if (f.type === "multi" && options.length < MIN_MULTI_OPTIONS) {
    wrong.options = `В вопросе с несколькими ответами вариантов не меньше ${MIN_MULTI_OPTIONS}`;
  } else if (f.type === "bool" && (options.length !== 2 || correct !== 1)) {
    wrong.options = "У вопроса «да/нет» два варианта и один правильный";
  }
  return wrong;
}

const optionsIn = (f: QForm): QuizOptionIn[] =>
  f.options.map((o) => ({ text: o.text, is_correct: o.is_correct }));

/** Тело `POST`: вопрос вместе с вариантами, одним запросом. */
function createBody(f: QForm): QuizQuestionIn {
  return {
    type: f.type,
    text: f.text.trim(),
    /* null — пояснения нет: у сервера это значение, а не «не прислано» */
    explanation: f.explanation.trim() || null,
    points: f.points === "" ? 1 : Number(f.points),
    options: optionsIn(f),
  };
}

/** Тело `PATCH`: варианты уходят полным списком и заменяют прежние. */
function questionPatch(f: QForm): QuizQuestionPatch {
  return {
    type: f.type,
    text: f.text.trim(),
    explanation: f.explanation.trim() || null,
    points: f.points === "" ? null : Number(f.points),
    options: optionsIn(f),
  };
}

const digits = (v: string) => v.replace(/\D/g, "");

export default function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const quiz = useLoad(() => api<AdminQuiz>(`/admin/quizzes/${id}`), [id]);
  const data = quiz.data;

  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>([]);
  /** Настройки доехали до сервера — короткое «сохранено» рядом с заголовком */
  const [settingsSaved, setSettingsSaved] = useState(false);
  /** Ключ строки, по которой идёт кнопочное действие: копия, видимость, удаление */
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const nextKey = useRef(0);

  /* Очередь сохранений: ключ настроек или ключ строки вопроса. Уход из поля
     одного вопроса и щелчок в другом идут подряд, и без очереди второе
     сохранение либо терялось бы молча, либо обгоняло первое. Задача читает
     состояние в момент отправки, а не в момент постановки: пока она ждёт,
     в поле успевают набрать ещё, и повторная постановка того же ключа
     не нужна */
  const waiting = useRef<string[]>([]);
  const running = useRef<string | null>(null);
  const draining = useRef(false);
  /** Вопросы поменялись — «максимум N баллов» и замки надо перечитать */
  const stale = useRef(false);
  const [savingKeys, setSavingKeys] = useState<string[]>([]);
  /* Счётчик запусков очереди: она трогает состояние строк, поэтому стартует
     после отрисовки, а не из обработчика — до коммита строка в rowsRef ещё
     прежняя, и щелчок по «правильный» ушёл бы на сервер без него */
  const [pulse, setPulse] = useState(0);
  /** Нажали кнопку в шапке: шлём всё тело, а не только разошедшееся */
  const sendAll = useRef(false);
  /** Номер правки настроек — та же защита от старого ответа, что у строки */
  const formRev = useRef(0);

  /* Задача очереди выполняется позже своей постановки и читает состояние
     через ссылки: в замыкании обработчика оно было бы уже устаревшим */
  const rowsRef = useRef<Row[]>(rows);
  rowsRef.current = rows;
  const formRef = useRef<Form | null>(form);
  formRef.current = form;
  const dataRef = useRef<AdminQuiz | null>(data);
  dataRef.current = data;

  const seeded = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    if (seeded.current !== data.id) {
      seeded.current = data.id;
      setForm(formOf(data));
      setErrors({});
      setRows(data.questions.map(rowOf));
      return;
    }
    /* Перечитанный тест не должен стирать набранное: у строки с правками
       обновляется только серверный снимок, её форма остаётся как есть */
    setRows((prev) => {
      const known = new Map(prev.filter((r) => r.saved).map((r) => [r.saved!.id, r]));
      const fresh = data.questions.map((q) => {
        const old = known.get(q.id);
        if (!old) return rowOf(q);
        const next = { ...old, saved: q };
        /* Строку, которая и так совпадает с сервером, не пересобираем:
           у вариантов сменились бы ключи, input пересоздался бы, и фокус
           уехал бы из поля, в котором сейчас печатают */
        if (!isDirty(next)) return next;
        return isDirty(old) ? next : { ...rowOf(q), rev: old.rev };
      });
      /* Ещё не созданные вопросы живут в конце — новый всё равно встаёт последним */
      return [...fresh, ...prev.filter((r) => !r.saved)];
    });
  }, [data]);

  const unsaved = rows.filter(isDirty).length;
  /* Считаем по серверным вопросам: набранная на экране строка теста ещё
     не наполняет, а учитель видит только то, что уже сохранено */
  const visibleQuestions = data ? data.questions.filter((q) => !q.is_hidden).length : 0;
  /* Обе формы собирает formOf, порядок ключей у них один — сравнение по строке
     здесь честнее, чем перечислять десять полей руками */
  const settingsDirty = !!form && !!data && JSON.stringify(form) !== JSON.stringify(formOf(data));
  const settingsBusy = savingKeys.includes(SETTINGS_KEY);

  /* Вопросы уходят на сервер поштучно, и набранное легко потерять уходом
     со страницы: про несохранённое переспрашивает браузер */
  useEffect(() => {
    if (!unsaved && !settingsDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved, settingsDirty]);

  /* «максимум N баллов» и признаки попыток считает сервер — после правки
     вопроса их надо перечитать. Молча: неудача перечитывания не должна гасить
     экран, на котором только что сохранился вопрос */
  const refresh = useCallback(async () => {
    try {
      quiz.setData(await api<AdminQuiz>(`/admin/quizzes/${id}`));
    } catch {
      /* цифры останутся прежними до следующего успешного запроса */
    }
  }, [id, quiz.setData]);

  const patchRow = (key: string, fn: (r: Row) => Row) =>
    setRows((rs) => rs.map((r) => (r.key === key ? fn(r) : r)));

  /* Правка формы двигает номер: ответ уже улетевшего запроса не должен
     вернуть в поля то, что успели перепечатать */
  const editRow = (key: string, fn: (r: Row) => Row) =>
    patchRow(key, (r) => {
      const next = fn(r);
      return next === r ? r : { ...next, rev: r.rev + 1 };
    });

  const setField = <K extends keyof QForm>(key: string, field: K, value: QForm[K]) =>
    editRow(key, (r) => ({ ...r, form: { ...r.form, [field]: value } }));

  const syncSaving = () =>
    setSavingKeys(running.current ? [running.current, ...waiting.current] : [...waiting.current]);

  /** Поставить сохранение в очередь. Повторная постановка того же ключа
      не нужна: задача возьмёт строку такой, какой она будет к отправке. */
  const enqueue = (key: string) => {
    if (!waiting.current.includes(key)) waiting.current.push(key);
    syncSaving();
    setPulse((p) => p + 1);
  };

  /** Настройки теста. Кнопка в шапке шлёт всё тело, автосохранение — только
      то, что разошлось с сервером. */
  const sendSettings = async () => {
    const f = formRef.current;
    const base = dataRef.current;
    const all = sendAll.current;
    sendAll.current = false;
    if (!f || !base) return;
    const wrong = validate(f, base.questions.filter((q) => !q.is_hidden).length > 0);
    if (Object.keys(wrong).length) {
      setErrors(wrong);
      setSettingsSaved(false);
      return;
    }
    const body = all ? patchBody(f) : changedFields(f, formOf(base));
    if (!Object.keys(body).length) return;
    const rev = formRev.current;
    setErrors({});
    try {
      const updated = await api<AdminQuiz>(`/admin/quizzes/${id}`, { method: "PATCH", json: body });
      quiz.setData(updated);
      /* Пока запрос летел, в соседнем поле могли набрать ещё — старый ответ
         его не затирает */
      if (formRev.current === rev) setForm(formOf(updated));
      setSettingsSaved(true);
      /* Тоста на каждое поле нет: об автосохранении говорит строка состояния
         рядом с заголовком. Тост остаётся у кнопки — её нажали руками */
      if (all) toast("Настройки теста сохранены", "success");
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      /* 409 final_quiz_exists приходит готовой строкой и называет тест,
         который уже итоговый, — показываем её как есть */
      else toast(isApiError(e) ? e.message : "Не удалось сохранить", "error");
      setSettingsSaved(false);
    }
  };

  /** Одна строка вопроса. `true` — запрос ушёл, и серверные цифры устарели. */
  const sendRow = async (key: string): Promise<boolean> => {
    const row = rowsRef.current.find((r) => r.key === key);
    /* Всё проверяется в момент отправки, а не постановки: пока строка ждала
       очереди, её могли доделать, сломать или удалить */
    if (!row || row.saved?.has_attempts || !isDirty(row)) return false;
    if (Object.keys(questionProblems(row.form)).length) return false;
    const rev = row.rev;
    patchRow(key, (r) => ({ ...r, errors: {} }));
    try {
      const saved = row.saved
        ? await api<AdminQuizQuestion>(`/admin/quiz_questions/${row.saved.id}`, {
            method: "PATCH",
            json: questionPatch(row.form),
          })
        : await api<AdminQuizQuestion>(`/admin/quizzes/${id}/questions`, {
            method: "POST",
            json: createBody(row.form),
          });
      patchRow(key, (r) => {
        /* Снимок с сервера обновляется всегда, даже если строку успели
           поправить: без него следующее сохранение нового вопроса ушло бы
           вторым POST и завело бы дубль */
        const next: Row = { ...r, saved, errors: {} };
        /* Ответ более старого запроса не затирает набранное позже */
        if (r.rev !== rev) return next;
        /* Сервер обрезал пробелы — в полях то, что вернулось */
        return isDirty(next) ? { ...next, form: mergedForm(r.form, saved) } : next;
      });
      return true;
    } catch (e) {
      const fields = fieldErrors(e);
      /* Отказ ложится в поля строки и не съедает набранное: форму не трогаем,
         строка остаётся несохранённой и уйдёт снова со следующей правкой */
      if (Object.keys(fields).length) patchRow(key, (r) => ({ ...r, errors: fields }));
      else toast(isApiError(e) ? e.message : "Не удалось сохранить вопрос", "error");
      return false;
    }
  };

  /** Одна задача из очереди — ровно одна: следующая пойдёт со следующей
      отрисовки, иначе она прочитала бы строку до того, как в неё лёг ответ
      предыдущей, и новый вопрос ушёл бы вторым `POST`. */
  const step = async () => {
    if (draining.current) return;
    if (!waiting.current.length) {
      /* «максимум N баллов» и признаки попыток считает сервер: перечитываем
         один раз на опустевшую очередь, а не после каждого поля */
      if (stale.current) {
        stale.current = false;
        await refresh();
      }
      return;
    }
    const key = waiting.current[0];
    waiting.current = waiting.current.slice(1);
    running.current = key;
    draining.current = true;
    syncSaving();
    try {
      if (key === SETTINGS_KEY) await sendSettings();
      else if (await sendRow(key)) stale.current = true;
    } finally {
      running.current = null;
      draining.current = false;
      syncSaving();
      setPulse((p) => p + 1);
    }
  };

  useEffect(() => {
    if (pulse) void step();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);

  /* Пустой вопрос заводится на экране, а не на сервере: `POST` требует готовых
     вариантов, и заготовка отбилась бы `422`. Правильный заранее не отмечен —
     отметку ставит автор, иначе верным молча оказался бы вариант, которого
     никто не выбирал */
  const addRow = () => {
    nextKey.current += 1;
    setRows((rs) => [
      ...rs,
      {
        key: `new-${nextKey.current}`,
        saved: null,
        form: {
          type: "single",
          text: "",
          explanation: "",
          points: "1",
          options: [newOption(), newOption()],
        },
        errors: {},
        rev: 0,
      },
    ]);
  };

  /* Скрыть можно всегда, даже вопрос с попытками: `PATCH`, в котором нет ничего,
     кроме is_hidden, сервер не отбивает никогда — ровно это он и советует
     в тексте своего отказа. Поэтому в теле только один ключ */
  const toggleHidden = async (row: Row) => {
    if (!row.saved || actionKey) return;
    const hide = !row.saved.is_hidden;
    setActionKey(row.key);
    try {
      const body: QuizQuestionPatch = { is_hidden: hide };
      const saved = await api<AdminQuizQuestion>(`/admin/quiz_questions/${row.saved.id}`, {
        method: "PATCH",
        json: body,
      });
      patchRow(row.key, (r) => ({ ...r, saved }));
      toast(
        hide
          ? "Вопрос скрыт — у учителей его не будет, в максимум баллов он не входит"
          : "Вопрос показан",
        "success",
      );
      await refresh();
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось поменять видимость", "error");
    } finally {
      setActionKey(null);
    }
  };

  /* Отдельной ручки «дублировать» нет и не нужно: у экрана есть весь вопрос
     целиком, и дубль — тот же `POST` с тем же телом. Копия встаёт последней
     и правится свободно, даже когда исходник заперт попытками.

     Дублируется только то, что уже на сервере: у ещё не созданного вопроса
     оригинала нет, и `POST` создал бы его копией — исходная строка осталась бы
     несохранённой, а сохранить её значило бы завести второй такой же вопрос
     и вдвое больший максимум баллов */
  const duplicate = async (row: Row) => {
    if (!row.saved || actionKey) return;
    const dirty = isDirty(row);
    setActionKey(row.key);
    try {
      const saved = await api<AdminQuizQuestion>(`/admin/quizzes/${id}/questions`, {
        method: "POST",
        json: createBody(qFormOf(row.saved)),
      });
      setRows((rs) => [...rs, rowOf(saved)]);
      toast(
        dirty
          ? "Копия сохранённого вопроса добавлена в конец — правок, которых ещё нет на сервере, в ней нет"
          : "Копия вопроса добавлена в конец — её можно править",
        "success",
      );
      await refresh();
    } catch (e) {
      const fields = fieldErrors(e);
      const first = Object.values(fields)[0];
      toast(first ?? (isApiError(e) ? e.message : "Не удалось продублировать"), "error");
    } finally {
      setActionKey(null);
    }
  };

  const removeRow = async (row: Row) => {
    /* Не созданный вопрос убирается с экрана — на сервере его нет */
    if (!row.saved) {
      setRows((rs) => rs.filter((r) => r.key !== row.key));
      setDeletingKey(null);
      return;
    }
    if (actionKey) return;
    setActionKey(row.key);
    try {
      await api(`/admin/quiz_questions/${row.saved.id}`, { method: "DELETE" });
      setRows((rs) => rs.filter((r) => r.key !== row.key));
      setDeletingKey(null);
      toast("Вопрос удалён", "success");
      await refresh();
    } catch (e) {
      /* 409 has_attempts приходит готовой строкой с числом попыток. Лист
         закрываем: повторное нажатие красной кнопки даст тот же отказ,
         а вопрос с попытками не удаляют, а прячут */
      setDeletingKey(null);
      toast(isApiError(e) ? e.message : "Не удалось удалить вопрос", "error");
    } finally {
      setActionKey(null);
    }
  };

  const setOption = (key: string, index: number, patch: Partial<Opt>) =>
    editRow(key, (r) => ({
      ...r,
      form: {
        ...r.form,
        options: r.form.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
      },
    }));

  /* У «одного ответа» и «верно / неверно» отметка ведёт себя как радиокнопка:
     правильный там ровно один. Смена типа отметок не трогает — иначе
     «два правильных при типе один ответ» нечем было бы получить, а это ровно
     тот набор, который сервер отбивает своим текстом */
  const markCorrect = (row: Row, index: number) => {
    if (row.form.type === "multi") {
      setOption(row.key, index, { is_correct: !row.form.options[index].is_correct });
    } else {
      editRow(row.key, (r) => ({
        ...r,
        form: {
          ...r.form,
          options: r.form.options.map((o, i) => ({ ...o, is_correct: i === index })),
        },
      }));
    }
    /* Отметка уходит сразу: уйти из галочки некуда */
    enqueue(row.key);
  };

  /* Добавление и удаление варианта — тоже «сразу»: кнопка, а не поле */
  const addOption = (key: string) => {
    editRow(key, (r) =>
      r.form.options.length >= MAX_OPTIONS
        ? r
        : { ...r, form: { ...r.form, options: [...r.form.options, newOption()] } },
    );
    enqueue(key);
  };

  const dropOption = (key: string, index: number) => {
    editRow(key, (r) =>
      r.form.options.length <= MIN_OPTIONS
        ? r
        : { ...r, form: { ...r.form, options: r.form.options.filter((_, i) => i !== index) } },
    );
    enqueue(key);
  };

  if (quiz.loading && !data) {
    return (
      <AdminShell title="Редактор теста">
        <div className="card card-pad row center" style={{ minHeight: 240 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  if (isApiError(quiz.error, "not_found")) {
    return (
      <AdminShell title="Тест не найден">
        <div className="card">
          <Empty
            title="Тест не найден"
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

  if (quiz.error || !data || !form) {
    return (
      <AdminShell title="Редактор теста">
        <div className="card">
          <Empty
            title="Не удалось загрузить"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={quiz.reload}>
                Повторить
              </Button>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    /* Каждая правка двигает номер: ответ уже улетевшего запроса не должен
       вернуть в форму то, что успели перепечатать */
    formRev.current += 1;
    setSettingsSaved(false);
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  /* Переключатели и списки уходят сразу по изменению: уйти из них некуда.
     Текстовые и числовые поля ждут ухода из поля — иначе на сервер попадало бы
     наполовину набранное число */
  const setNow = <K extends keyof Form>(key: K, value: Form[K]) => {
    set(key, value);
    enqueue(SETTINGS_KEY);
  };

  /** Кнопка в шапке: то же сохранение, но всем телом разом. */
  const saveAll = () => {
    sendAll.current = true;
    enqueue(SETTINGS_KEY);
  };

  const deleting = rows.find((r) => r.key === deletingKey) ?? null;
  const hiddenCount = data.questions.filter((q) => q.is_hidden).length;
  /* Открыть пустой тест нечем: переключатель заперт, пока в тесте нет ни одного
     видимого вопроса. Скрыть — можно всегда, в том числе уже открытый пустой */
  const cannotOpen = visibleQuestions === 0 && form.is_hidden;

  return (
    <AdminShell
      title={form.title || "Редактор теста"}
      subtitle={`${data.course.title} · ${data.module.title}`}
      actions={
        <Button size="sm" loading={settingsBusy} onClick={saveAll}>
          Сохранить настройки
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

        {/* ===== Настройки ===== */}
        <div className="card card-pad stack g16">
          <div className="row between g12" style={{ alignItems: "center" }}>
            <h2 className="h3">Настройки теста</h2>
            {/* Короткое состояние вместо тоста на каждое поле */}
            {settingsBusy ? (
              <span className="caption muted-3">Сохраняем…</span>
            ) : settingsDirty ? (
              <Badge kind="review">Не сохранено</Badge>
            ) : (
              settingsSaved && <span className="caption muted-3">Сохранено</span>
            )}
          </div>

          {/* Язык у теста не выбирается: он наследуется от курса, а вторая
              языковая версия — отдельный курс с тем же group_id */}
          <div className="row wrap g8" style={{ alignItems: "center" }}>
            <Badge kind="neutral">
              {data.course.lang === "ru" ? "Русский курс" : "Қазақ курсы"}
            </Badge>
            <span className="caption muted-3">Язык берётся у курса</span>
          </div>

          <div className="field">
            <label className="label">Название</label>
            <input
              className={`input${errors.title ? " input-error" : ""}`}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => enqueue(SETTINGS_KEY)}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="q-row">
            <div className="field">
              <label className="label">Тип</label>
              <div className="segmented" style={{ width: "100%" }}>
                <button
                  data-active={form.is_final}
                  onClick={() => setNow("is_final", true)}
                  style={{ flex: 1 }}
                >
                  Итоговый
                </button>
                <button
                  data-active={!form.is_final}
                  onClick={() => setNow("is_final", false)}
                  style={{ flex: 1 }}
                >
                  Тест модуля
                </button>
              </div>
              {errors.is_final ? (
                <span className="error-text">{errors.is_final}</span>
              ) : (
                <span className="hint">
                  Итоговый тест в курсе один: отчёт и чек-лист сертификата говорят
                  о нём в единственном числе.
                </span>
              )}
            </div>
            <div className="field">
              <label className="label">Проходной балл, %</label>
              <input
                className={`input${errors.pass_score ? " input-error" : ""}`}
                inputMode="numeric"
                value={form.pass_score}
                onChange={(e) => set("pass_score", digits(e.target.value))}
                onBlur={() => enqueue(SETTINGS_KEY)}
              />
              {errors.pass_score ? (
                <span className="error-text">{errors.pass_score}</span>
              ) : (
                data.has_attempts && (
                  <span className="hint">
                    Тест уже проходили. Новый балл действует на будущие попытки:
                    у завершённых зачёт и баллы посчитаны на прежнем и такими
                    останутся — задним числом не пересчитываются.
                  </span>
                )
              )}
            </div>
          </div>

          <div className="field" style={{ maxWidth: 260 }}>
            <label className="label">Требует времени, минут</label>
            <input
              className={`input${errors.time_required_min ? " input-error" : ""}`}
              inputMode="numeric"
              value={form.time_required_min}
              onChange={(e) => set("time_required_min", digits(e.target.value))}
              onBlur={() => enqueue(SETTINGS_KEY)}
            />
            {errors.time_required_min ? (
              <span className="error-text">{errors.time_required_min}</span>
            ) : (
              <span className="hint">Складывается в сумму по программе курса</span>
            )}
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
                  {form.retakable
                    ? "Попыток сколько угодно, засчитывается последний результат"
                    : "Одна попытка"}
                </span>
              </div>
              <button
                className="switch"
                data-on={form.retakable}
                onClick={() => setNow("retakable", !form.retakable)}
                aria-pressed={form.retakable}
                aria-label="Пересдаваемый"
              />
            </div>
            {/* Подсказка меняется вместе с переключателем */}
            <span className="caption muted-3 pretty">
              {form.retakable
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
                {form.timer && (
                  <div className="row g6 nowrap">
                    <input
                      className={`input${errors.time_limit_min ? " input-error" : ""}`}
                      style={{ width: 68, height: 40, textAlign: "center" }}
                      value={form.time_limit_min}
                      onChange={(e) => set("time_limit_min", digits(e.target.value))}
                      onBlur={() => enqueue(SETTINGS_KEY)}
                      inputMode="numeric"
                      aria-label="Минут"
                    />
                    <span className="small muted">мин</span>
                  </div>
                )}
                <button
                  className="switch"
                  data-on={form.timer}
                  onClick={() => {
                    const on = !form.timer;
                    set("timer", on);
                    /* Включённый таймер без минут отправлять нечем — ждём,
                       пока их наберут. Выключенный уходит сразу: null и есть
                       значение «ограничения нет» */
                    if (!on) enqueue(SETTINGS_KEY);
                  }}
                  aria-pressed={form.timer}
                  aria-label="Таймер"
                />
              </div>
            </div>
            {errors.time_limit_min ? (
              <span className="error-text">{errors.time_limit_min}</span>
            ) : (
              form.timer &&
              form.time_limit_min === "" && (
                <span className="caption muted-3 pretty">
                  Укажите минуты — с пустым полем настройки не сохранятся. Ограничения
                  по времени нет — выключите переключатель.
                </span>
              )
            )}

            <div className="row between g12" style={{ minHeight: 44 }}>
              <div className="stack g2 grow">
                <span className="small" style={{ fontWeight: 600 }}>
                  Перемешивать вопросы
                </span>
                <span className="caption muted-3">Каждый учитель видит свой порядок</span>
              </div>
              <button
                className="switch"
                data-on={form.shuffle}
                onClick={() => setNow("shuffle", !form.shuffle)}
                aria-pressed={form.shuffle}
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
                data-on={form.show_review}
                onClick={() => setNow("show_review", !form.show_review)}
                aria-pressed={form.show_review}
                aria-label="Разбор после сдачи"
              />
            </div>
          </div>

          {form.retakable && form.show_review && (
            <Note kind="warning" icon={<IconInfo size={18} />}>
              <span className="small">
                Тест пересдаваемый, а разбор ответов включён — вторая попытка сдастся
                по памяти. Выключите разбор или включите перемешивание вопросов.
              </span>
            </Note>
          )}

          <hr className="divider" />

          {/* Открытый тест без видимых вопросов — отказ у каждого учителя
              и невыполнимая строка условий сертификата у всего курса */}
          {visibleQuestions === 0 && !form.is_hidden && (
            <Note kind="warning">
              <span className="small pretty">
                Тест открыт учителям, но ни одного видимого вопроса в нём нет: попытка
                отдаст учителю отказ, а строку «Сдать все тесты модулей» в условиях
                сертификата не выполнит никто. Добавьте вопрос или скройте тест —
                открытым и пустым он не сохранится.
              </span>
            </Note>
          )}

          <div className="row g12 between" style={{ alignItems: "flex-start" }}>
            <div className="stack g2">
              <span className="small" style={{ fontWeight: 700 }}>
                Скрыт от учителей
              </span>
              <span className="caption muted-3 pretty">
                Скрытый тест у учителя исчезает целиком — он не открывается и по прямой
                ссылке. Начатую попытку дают доделать и разобрать, новую начать нельзя.
                Заготовка теста заводится скрытой: наполнили — снимите переключатель.
              </span>
              {cannotOpen && (
                <span className="caption muted-3 pretty">
                  Пока в тесте нет ни одного видимого вопроса, открыть его нельзя:
                  учителю такой тест отдаёт отказ на попытку, а условие сертификата
                  «Сдать все тесты модулей» перестаёт выполняться у всего курса.
                </span>
              )}
              {errors.is_hidden && <span className="error-text">{errors.is_hidden}</span>}
            </div>
            <button
              className="switch"
              data-on={form.is_hidden}
              disabled={cannotOpen}
              style={cannotOpen ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              onClick={() => setNow("is_hidden", !form.is_hidden)}
              aria-pressed={form.is_hidden}
              aria-label="Скрыт от учителей"
            />
          </div>
        </div>

        {/* ===== Вопросы ===== */}
        <div className="row between g12" style={{ alignItems: "center" }}>
          <h2 className="h3">Вопросы</h2>
          {unsaved > 0 && (
            <Badge kind="review">
              Не сохранено: {unsaved}
            </Badge>
          )}
        </div>

        {unsaved > 0 && (
          <Note kind="muted">
            <span className="small pretty">
              Вопросы сохраняются сами и по одному — по уходу из поля. Недоделанный
              вопрос помечен красным и на сервер не уходит вовсе, пока в нём чего-то
              не хватает. Непомеченные вопросы уже на сервере.
            </span>
          </Note>
        )}

        {rows.length === 0 && (
          <div className="card">
            <Empty
              icon={<IconQuiz size={38} />}
              title="Вопросов пока нет"
              text="Тест без вопросов ничего не проверяет, и заготовка потому заводится скрытой. Тип, варианты и пояснение задаются прямо в вопросе."
              action={
                <Button variant="secondary" icon={<IconPlus size={16} />} onClick={addRow}>
                  Добавить вопрос
                </Button>
              }
            />
          </div>
        )}

        <div className="stack g12">
          {rows.map((row, i) => {
            const locked = !!row.saved?.has_attempts;
            const hidden = !!row.saved?.is_hidden;
            const dirty = isDirty(row);
            const busy = savingKeys.includes(row.key);
            /* Копия, видимость и удаление идут по одной на весь экран — они
               меняют состав вопросов, и второй такой же клик не нужен */
            const blocked = actionKey !== null;
            /* Чего вопросу не хватает — поверх отказа сервера: тот описывает
               прошлую отправку, а это то, что в полях сейчас */
            const problems = locked ? {} : questionProblems(row.form);
            const broken = Object.keys(problems).length > 0;
            const shown: Record<string, string> = { ...row.errors, ...problems };
            const topErrors = Object.entries(shown).filter(
              ([field]) => !INLINE_FIELDS.includes(field),
            );

            return (
              <div
                key={row.key}
                className={`card${broken ? " q-bad" : ""}`}
                style={{ overflow: "hidden", opacity: hidden ? 0.75 : 1 }}
              >
                <div
                  className="row g10 wrap"
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface-subtle)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span className="caption muted" style={{ letterSpacing: "0.06em" }}>
                    ВОПРОС {i + 1}
                  </span>
                  <select
                    className="input"
                    style={{ height: 34, width: "auto", fontSize: 13 }}
                    value={row.form.type}
                    disabled={locked}
                    onChange={(e) => {
                      setField(row.key, "type", e.target.value as QuestionType);
                      /* Список — «сразу»: правила зачёта у типов разные,
                         и вопрос может стать целым или, наоборот, красным */
                      enqueue(row.key);
                    }}
                    aria-label="Тип вопроса"
                  >
                    <option value="single">{TYPE_LABEL.single}</option>
                    <option value="multi">{TYPE_LABEL.multi}</option>
                    <option value="bool">{TYPE_LABEL.bool}</option>
                  </select>

                  {locked && (
                    <Badge kind="locked" icon={<IconLock size={13} />}>
                      Был в попытках
                    </Badge>
                  )}
                  {hidden && <Badge kind="neutral">Скрыт</Badge>}
                  {broken ? (
                    <Badge kind="rework">Не доделан</Badge>
                  ) : (
                    dirty && <Badge kind="review">Не сохранён</Badge>
                  )}

                  <div className="grow" />

                  <div className="row g6 nowrap">
                    <span className="caption muted">Баллы</span>
                    <input
                      className={`input${shown.points ? " input-error" : ""}`}
                      style={{ width: 56, height: 34, textAlign: "center", fontSize: 13 }}
                      value={row.form.points}
                      disabled={locked}
                      inputMode="numeric"
                      onChange={(e) => setField(row.key, "points", digits(e.target.value))}
                      onBlur={() => enqueue(row.key)}
                      aria-label="Баллы за вопрос"
                    />
                  </div>

                  {/* Дублировать можно только существующий вопрос: копировать
                      нечего, пока оригинала нет на сервере */}
                  {row.saved && (
                    <button
                      className="btn btn-icon"
                      style={{ minHeight: 32, width: 32 }}
                      disabled={busy || blocked}
                      onClick={() => duplicate(row)}
                      aria-label="Дублировать вопрос"
                      title="Дублировать — копия сохранённого вопроса встанет последней"
                    >
                      <IconCopy size={16} />
                    </button>
                  )}

                  {row.saved && (
                    <button
                      className="btn btn-icon"
                      style={{ minHeight: 32, width: 32 }}
                      disabled={busy || blocked}
                      onClick={() => toggleHidden(row)}
                      aria-label={hidden ? "Показать вопрос" : "Скрыть вопрос"}
                      title={hidden ? "Показать учителям" : "Скрыть от учителей"}
                    >
                      {hidden ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                    </button>
                  )}

                  {/* У вопроса с попытками удаления нет вовсе — сервер его
                      отбивает, и вместо него скрытие */}
                  {!locked && (
                    <button
                      className="btn btn-icon"
                      style={{ minHeight: 32, width: 32 }}
                      disabled={busy || blocked}
                      onClick={() => setDeletingKey(row.key)}
                      aria-label="Удалить вопрос"
                    >
                      <IconTrash size={16} />
                    </button>
                  )}
                </div>

                <div className="card-pad stack g12">
                  {topErrors.map(([field, message]) => (
                    <span key={field} className="error-text">
                      {message}
                    </span>
                  ))}

                  {locked && (
                    <Note kind="muted" icon={<IconLock size={18} />}>
                      <span className="small pretty">
                        Вопрос уже был в попытках — ни текст, ни варианты, ни тип,
                        ни баллы ему не поменять: по нему посчитаны чужие баллы.
                        Нужны правки — продублируйте вопрос, поправьте копию,
                        а этот скройте.
                      </span>
                    </Note>
                  )}

                  <div className="field">
                    <label className="label">Текст вопроса</label>
                    <textarea
                      className={`input${shown.text ? " input-error" : ""}`}
                      style={{ minHeight: 68 }}
                      value={row.form.text}
                      disabled={locked}
                      onChange={(e) => setField(row.key, "text", e.target.value)}
                      onBlur={() => enqueue(row.key)}
                      placeholder="О чём спрашиваем"
                    />
                    {shown.text && <span className="error-text">{shown.text}</span>}
                  </div>

                  <div className="stack g8">
                    {row.form.options.map((opt, oi) => (
                      <div key={opt.key} className="row g10">
                        <button
                          className={`check-box ${row.form.type === "multi" ? "" : "round"}`}
                          style={{
                            marginTop: 0,
                            padding: 0,
                            background: opt.is_correct ? "var(--success)" : "var(--card)",
                            borderColor: opt.is_correct
                              ? "var(--success)"
                              : "var(--border-strong)",
                            cursor: locked ? "default" : "pointer",
                          }}
                          disabled={locked}
                          onClick={() => markCorrect(row, oi)}
                          aria-pressed={opt.is_correct}
                          aria-label={`Вариант ${oi + 1} — правильный`}
                        >
                          {opt.is_correct && <IconCheck size={13} />}
                        </button>
                        <input
                          className={`input${broken && !opt.text.trim() ? " input-error" : ""}`}
                          style={{ height: 44 }}
                          value={opt.text}
                          disabled={locked}
                          onChange={(e) => setOption(row.key, oi, { text: e.target.value })}
                          onBlur={() => enqueue(row.key)}
                          placeholder={`Вариант ${oi + 1}`}
                        />
                        {!locked && row.form.options.length > MIN_OPTIONS && (
                          <button
                            className="btn btn-icon"
                            style={{ minHeight: 40, width: 40 }}
                            onClick={() => dropOption(row.key, oi)}
                            aria-label={`Удалить вариант ${oi + 1}`}
                          >
                            <IconClose size={16} />
                          </button>
                        )}
                      </div>
                    ))}

                    {!locked && row.form.options.length < MAX_OPTIONS && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<IconPlus size={15} />}
                        style={{ alignSelf: "flex-start" }}
                        onClick={() => addOption(row.key)}
                      >
                        Вариант
                      </Button>
                    )}

                    {shown.options ? (
                      <span className="error-text">{shown.options}</span>
                    ) : (
                      <span className="caption muted-3 pretty">
                        {TYPE_HINT[row.form.type]}
                      </span>
                    )}
                  </div>

                  <div className="field">
                    <label className="label">
                      Пояснение к ответу{" "}
                      <span className="label-optional">· показывается в разборе</span>
                    </label>
                    <textarea
                      className={`input${shown.explanation ? " input-error" : ""}`}
                      style={{ minHeight: 60 }}
                      value={row.form.explanation}
                      disabled={locked}
                      onChange={(e) => setField(row.key, "explanation", e.target.value)}
                      onBlur={() => enqueue(row.key)}
                    />
                    {shown.explanation && (
                      <span className="error-text">{shown.explanation}</span>
                    )}
                  </div>

                  {/* Второй кнопки «сохранить вопрос» нет: строка уходит
                      на сервер сама, как только вопрос стал целым */}
                  {!locked && (
                    <div className="row g8 wrap" style={{ alignItems: "center" }}>
                      {dirty && row.saved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || blocked}
                          onClick={() => editRow(row.key, () => rowOf(row.saved!))}
                        >
                          Вернуть сохранённое
                        </Button>
                      )}
                      <span
                        className="caption muted-3"
                        style={broken ? { color: "var(--danger)" } : undefined}
                      >
                        {busy
                          ? "Сохраняем…"
                          : broken
                            ? "Вопрос не доделан — на сервер он не уйдёт"
                            : dirty
                              ? row.saved
                                ? "Правки ещё не на сервере"
                                : "Вопроса ещё нет на сервере"
                              : "Сохранён"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {rows.length > 0 && (
          <Button variant="secondary" block icon={<IconPlus size={17} />} onClick={addRow}>
            Добавить вопрос
          </Button>
        )}

        <span className="caption muted-3 pretty">
          На сервере вопросов {data.questions.length} · максимум {data.max_score} баллов
          {hiddenCount > 0 && ` · скрытых ${hiddenCount}, в максимум они не входят`}. Новый
          вопрос встаёт последним.
        </span>
      </div>

      {/* Удаление вопроса: у вопроса с попытками этой кнопки нет вовсе */}
      <Sheet
        open={deleting !== null}
        onClose={() => setDeletingKey(null)}
        title={deleting?.saved ? "Удалить вопрос?" : "Убрать вопрос?"}
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              loading={deleting ? actionKey === deleting.key : false}
              onClick={() => deleting && removeRow(deleting)}
            >
              {deleting?.saved ? "Удалить" : "Убрать"}
            </Button>
            <Button variant="secondary" block onClick={() => setDeletingKey(null)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          {deleting?.saved
            ? "Вопрос удалится вместе со своими вариантами и пояснением. Если он уже попадал в чьи-то попытки, сервер удаление отобьёт — такой вопрос скрывают."
            : "Набранный вопрос исчезнет с экрана. На сервере его ещё нет, восстановить будет нечем."}
        </p>
      </Sheet>

      <style>{`
        .q-bad { border-color: var(--danger); }
        .q-row { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .q-row { grid-template-columns: 1.4fr 1fr; } }
      `}</style>
    </AdminShell>
  );
}
