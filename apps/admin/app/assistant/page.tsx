"use client";

/**
 * Страница «Ассистент» — раздел 10 `ASSISTANT_BRIEF.md`.
 *
 * Слева список чатов, справа лента. Чат принадлежит админу, который его завёл:
 * чужие не приходят вовсе, и это проверка сервера, а не скрытие здесь.
 *
 * Три вещи, которые легко потерять при правке этого экрана:
 *
 * 1. **Порядок ленты — серверный.** Сортировать по `created_at` нельзя:
 *    у вопроса, карточки вызова и ответа одного хода время совпадает
 *    до микросекунды, и сортировка перемешала бы ход. Ключ строки — `id`.
 * 2. **Кнопка «Выполнить» посылает только `id`.** Аргументы исполнение берёт
 *    из своей строки в базе; отсюда наружу не уходит ничего (раздел 6).
 * 3. **Имён ассистент не видит.** В ленте человек подписан `Учитель #418`,
 *    живое имя подставляет браузер отдельной ручкой — и только в чипах
 *    допусков и в карточке выбора (раздел 5).
 *
 * Пустой чат не встречает простынёй: подсказки-примеры лежат отдельным блоком
 * и правятся здесь, а не моделью. Список подсказок — ответ владельца 09.09.2026.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isApiError,
  useLoad,
  type AssistantGrant,
  type AssistantGrantLevel,
  type AssistantMessage,
  type AssistantProposal,
  type AssistantThread,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { Badge, Button, Empty, Note, Skeleton } from "@lms/ui";
import {
  IconChevronDown,
  IconMessage,
  IconPlus,
  IconSparkle,
  IconTrash,
} from "@lms/ui/icons";
import { AdminShell } from "@/components/layout/AdminShell";
import { AssistantGrants } from "@/components/admin/AssistantGrants";
import { AssistantPicker, type PickerRow } from "@/components/admin/AssistantPicker";
import {
  ASSISTANT_OFF,
  assistantErrorText,
  cancelProposal,
  createThread,
  deleteThread,
  executeProposal,
  grantPd,
  listGrants,
  listThreads,
  loadMessages,
  revokeGrant,
  say,
  useAssistantEnabled,
  type TurnToolCard,
} from "@/components/admin/assistantApi";

/* ============ Как называется вызов инструмента ============

   Свёрнутая карточка говорит человеческим языком: «Посмотрел список заявок,
   12 штук». Имя инструмента (`leads_list`) в ней не показывается — админ
   не обязан знать реестр наизусть.

   Таблицей, а не сборкой из частей: русский требует падежей, и «посмотрел
   список заявка» — ровно тот брак, ради которого таблицу и завели. Реестр
   закрытый и меняется правкой бэкенда, так что расходиться ей особо негде;
   инструмент, которого здесь нет, честно покажется своим именем — это видно
   глазом и чинится одной строкой. */
const TOOL_LABEL: Record<string, string> = {
  dashboard: "Посмотрел сводку",

  courses_list: "Посмотрел список курсов",
  course_card: "Открыл карточку курса",
  course_program: "Посмотрел программу курса",
  course_report: "Свёл отчёт по курсу",
  course_participants: "Посмотрел учеников курса",
  course_create: "Завёл курс",
  course_update: "Поправил курс",
  course_duplicate: "Продублировал курс",
  course_add_version: "Добавил версию курса",
  course_publish: "Готовит публикацию курса",
  course_unpublish: "Готовит снятие курса с публикации",
  course_status: "Готовит смену статуса курса",
  course_delete: "Готовит удаление курса",

  module_add: "Завёл модуль",
  module_rename: "Переименовал модуль",
  module_delete: "Готовит удаление модуля",
  program_move: "Переставил программу",

  lesson_card: "Открыл урок",
  lesson_create: "Завёл урок",
  lesson_update: "Поправил урок",
  lesson_delete: "Готовит удаление урока",

  quiz_card: "Открыл тест",
  quiz_create: "Завёл тест",
  quiz_update: "Поправил тест",
  quiz_delete: "Готовит удаление теста",
  quiz_question_add: "Добавил вопрос в тест",
  quiz_question_update: "Поправил вопрос теста",
  quiz_question_delete: "Готовит удаление вопроса теста",
  quiz_retake_allow: "Готовит разрешение на пересдачу",

  task_card: "Открыл задание",
  task_create: "Завёл задание",
  task_update: "Поправил задание",
  task_delete: "Готовит удаление задания",

  teachers_list: "Посмотрел список учителей",
  teachers_find: "Поискал человека",
  teacher_card: "Открыл карточку человека",
  teacher_courses: "Посмотрел курсы человека",
  teacher_quizzes: "Посмотрел тесты человека",
  teacher_update: "Поправил данные человека",

  leads_list: "Посмотрел список заявок",
  lead_update: "Поправил заявку",
  enrollment_grant: "Готовит выдачу доступа к курсу",
  enrollment_revoke: "Готовит снятие доступа к курсу",

  submissions_list: "Посмотрел работы на проверку",
  submission_card: "Открыл работу",
  submission_review: "Готовит проверку работы",

  reviews_list: "Посмотрел отзывы",
  review_card: "Открыл отзыв",
  review_reply: "Готовит ответ на отзыв",
  review_delete: "Готовит удаление отзыва",

  questions_list: "Посмотрел вопросы учителей",
  question_thread: "Открыл ветку вопроса",
  question_answer: "Готовит ответ на вопрос",
  question_delete: "Готовит удаление вопроса",

  categories_list: "Посмотрел категории",
  category_create: "Завёл категорию",
  category_rename: "Переименовал категорию",
  category_delete: "Готовит удаление категории",

  certificates_list: "Посмотрел сертификаты",
  certificate_card: "Открыл сертификат",
  certificate_issue: "Готовит выдачу сертификата",
  certificate_revoke: "Готовит отзыв сертификата",
  certificate_set_registration_number: "Готовит правку регистрационного номера",

  memory_list: "Посмотрел, что помнит",
  memory_read: "Прочитал запись памяти",
  memory_write: "Записал в память",
  memory_delete: "Удалил запись памяти",
};

/** «Посмотрел список заявок» + «12 штук», когда инструмент вернул число. */
function toolCount(result: AssistantMessage["tool_result"]): number | null {
  const total = result?.total;
  return typeof total === "number" ? total : null;
}

/* ============ Страница ============ */

export default function AssistantPage() {
  /* Чат и вход с карточки человека живут в адресе, а `useSearchParams`
     требует границы Suspense — без неё маршрут не собирается */
  return (
    <Suspense fallback={null}>
      <Assistant />
    </Suspense>
  );
}

function Assistant() {
  const { t } = useLang();
  const enabled = useAssistantEnabled();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const threadParam = Number(params.get("thread")) || null;
  const [current, setCurrent] = useState<number | null>(threadParam);
  const [showArchived, setShowArchived] = useState(false);

  const threads = useLoad(() => listThreads(showArchived), [showArchived]);

  /* Адрес — источник правды: чат переживает перезагрузку и уходит в закладку
     целиком, как фильтр площадки на соседних экранах */
  useEffect(() => setCurrent(threadParam), [threadParam]);

  const open = useCallback(
    (id: number | null) => router.replace(id ? `/assistant?thread=${id}` : "/assistant"),
    [router],
  );

  /* ---- Вход с карточки человека (раздел 5, путь 1) ----
     `?ask=418&level=write` — чат заводится сразу с допуском, фамилию админ
     не набирает и в OpenAI она не уходит вовсе. Это основной путь входа. */
  const ask = Number(params.get("ask")) || null;
  const askLevel = (params.get("level") === "write" ? "write" : "read") as AssistantGrantLevel;
  const askCourse = Number(params.get("course")) || null;
  const asked = useRef(false);

  useEffect(() => {
    if (!ask || asked.current || !enabled) return;
    asked.current = true;
    (async () => {
      try {
        const th = await createThread(askCourse);
        await grantPd(th.id, ask, askLevel);
        threads.reload();
        open(th.id);
      } catch (e) {
        toast(assistantErrorText(e), "error");
        open(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, askLevel, askCourse, enabled]);

  const onNew = async () => {
    try {
      const th = await createThread();
      threads.reload();
      open(th.id);
    } catch (e) {
      toast(assistantErrorText(e), "error");
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm(t.asDeleteThreadHint)) return;
    try {
      await deleteThread(id);
      toast(t.asThreadDeleted, "success");
      threads.reload();
      if (current === id) open(null);
    } catch (e) {
      toast(assistantErrorText(e), "error");
    }
  };

  /* Ключа модели нет — страницы нет (раздел 11). Отказ вместо экрана, а не
     экран, который на каждое действие отвечает 503. */
  if (!enabled) {
    return (
      <AdminShell title={t.asName}>
        <div className="card card-pad">
          <Empty icon={<IconSparkle size={36} />} title={t.asOffTitle} text={t.asOffHint} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={t.asName}
      subtitle={t.asSubtitle}
      actions={
        <Button size="sm" icon={<IconPlus size={16} />} onClick={onNew}>
          {t.asNewChat}
        </Button>
      }
    >
      <div className="as-layout">
        <aside className="as-threads card">
          <div className="stack g2" style={{ padding: 8 }}>
            {threads.loading && !threads.data ? (
              <>
                <Skeleton h={38} />
                <Skeleton h={38} />
                <Skeleton h={38} />
              </>
            ) : threads.data?.items.length ? (
              threads.data.items.map((th) => (
                <ThreadRow
                  key={th.id}
                  thread={th}
                  active={th.id === current}
                  onOpen={() => open(th.id)}
                  onDelete={() => onDelete(th.id)}
                />
              ))
            ) : (
              <div className="stack g4" style={{ padding: "18px 10px", textAlign: "center" }}>
                <strong className="small">{showArchived ? t.asArchived : t.asNoThreads}</strong>
                <span className="caption muted-3">{t.asNoThreadsHint}</span>
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ margin: 8, marginTop: "auto" }}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? t.asHideArchived : t.asShowArchived}
          </button>
        </aside>

        {current ? (
          <Chat key={current} threadId={current} onThreadChanged={threads.reload} />
        ) : (
          <div className="card as-chat">
            <NewChatInvite onNew={onNew} />
          </div>
        )}
      </div>

      <style>{`
        .as-layout {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
          min-height: calc(100dvh - 150px);
        }
        .as-threads { display: flex; flex-direction: column; padding: 0; }
        .as-chat { display: flex; flex-direction: column; padding: 0; min-height: 420px; }
        .as-feed { flex: 1; overflow-y: auto; padding: 16px; display: flex;
                   flex-direction: column; gap: 14px; }
        .as-msg-user { align-self: flex-end; max-width: 78%; background: var(--primary);
                       color: var(--text-on-fill); border-radius: 14px 14px 4px 14px; padding: 9px 13px;
                       white-space: pre-wrap; word-break: break-word; }
        .as-msg-bot { align-self: flex-start; max-width: 86%; white-space: pre-wrap;
                      word-break: break-word; line-height: 1.55; }
        .as-tool { align-self: flex-start; max-width: 86%; width: 100%; }
        .as-tool-head { display: flex; align-items: center; gap: 8px; width: 100%;
                        border: none; background: none; cursor: pointer; text-align: left;
                        padding: 7px 10px; border-radius: 10px; color: var(--muted); }
        .as-tool-head:hover { background: var(--surface-subtle); }
        .as-tool-body { padding: 8px 10px 2px; }
        .as-tool-body pre { margin: 4px 0 10px; padding: 10px; border-radius: 10px;
                            background: var(--surface-sunken); overflow-x: auto;
                            font-size: 12px; line-height: 1.5; max-height: 320px; }
        .as-compose { border-top: 1px solid var(--border); padding: 12px; }
        .as-compose textarea { resize: none; min-height: 44px; max-height: 180px; }
        @media (max-width: 900px) {
          .as-layout { grid-template-columns: minmax(0, 1fr); }
          .as-threads { max-height: 220px; }
        }
      `}</style>
    </AdminShell>
  );
}

/* ============ Список чатов ============ */

function ThreadRow({
  thread,
  active,
  onOpen,
  onDelete,
}: {
  thread: AssistantThread;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="row g4" style={{ alignItems: "stretch" }}>
      <button
        className="admin-nav-item grow"
        data-active={active || undefined}
        onClick={onOpen}
        style={{ border: "none", cursor: "pointer", minWidth: 0, textAlign: "left" }}
      >
        <IconMessage size={17} />
        <span className="grow clamp-2" style={{ minWidth: 0, fontSize: 13.5 }}>
          {thread.title || t.asUntitled}
        </span>
      </button>
      <button
        className="btn btn-icon btn-sm"
        onClick={onDelete}
        aria-label={t.asDeleteThread}
        title={t.asDeleteThread}
      >
        <IconTrash size={15} />
      </button>
    </div>
  );
}

function NewChatInvite({ onNew }: { onNew: () => void }) {
  const { t } = useLang();
  return (
    <div className="row center grow" style={{ padding: 24 }}>
      <Empty
        icon={<IconSparkle size={36} />}
        title={t.asAsk}
        text={t.asSubtitle}
        action={
          <Button icon={<IconPlus size={16} />} onClick={onNew}>
            {t.asNewChat}
          </Button>
        }
      />
    </div>
  );
}

/* ============ Лента одного чата ============ */

/* Вопрос админа в ленте, пока идёт ход. Настоящую строку — со своим `id`
   и временем сервера — пришлёт конец хода, эта живёт до него.
   `id` отрицательный: ключ не столкнётся с настоящими строками ленты. */
function askedRow(content: string): AssistantMessage {
  return {
    id: -Date.now(),
    role: "user",
    content,
    tool_name: null,
    tool_args: null,
    tool_result: null,
    proposal: null,
    tokens_in: 0,
    tokens_out: 0,
    created_at: new Date().toISOString(),
  };
}

function Chat({ threadId, onThreadChanged }: { threadId: number; onThreadChanged: () => void }) {
  const { t } = useLang();
  const toast = useToast();
  const feed = useLoad(() => loadMessages(threadId), [threadId]);
  const grants = useLoad(() => listGrants(threadId), [threadId]);

  const [items, setItems] = useState<AssistantMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [cap, setCap] = useState(false);
  /* Ход на лету: то, что уже пришло кусками, но в ленте ещё не лежит.
     На `done` и то и другое заменяется настоящей лентой */
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState<TurnToolCard[]>([]);
  const [spent, setSpent] = useState<{ in: number; out: number } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feed.data) setItems(feed.data.items);
  }, [feed.data]);

  /* Лента прокручивается к свежему после каждого хода — иначе ответ уезжает
     под край и выглядит как «ничего не произошло» */
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [items.length, sending, draft, live.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setCap(false);
    setDraft("");
    setLive([]);
    /* Вопрос уходит в ленту и из поля сразу, не дожидаясь конца хода. Ход
       идёт секундами, и всё это время админ видел свой текст в поле и ленту
       без своего вопроса — это читается как «не отправилось», и вопрос
       посылают второй раз. */
    const before = items;
    setItems([...items, askedRow(body)]);
    setText("");
    try {
      const turn = await say(threadId, body, {
        onDelta: (piece) => setDraft((was) => was + piece),
        onTool: (card) => {
          /* Присказку перед вызовом («сейчас посмотрю») сбрасываем: в ленту
             она не ляжет, и на `done` строка бы просто исчезла */
          setDraft("");
          setLive((was) => [...was, card]);
        },
      });
      setItems(turn.items);
      setCap(turn.stopped_at_cap);
      setSpent({ in: turn.tokens_in, out: turn.tokens_out });
      /* Заголовок ассистент пишет сам после первого ответа — он приезжает
         в `done`, и список чатов надо перечитать, чтобы его увидеть */
      onThreadChanged();
    } catch (e) {
      /* Хода не было: вопрос возвращается в поле и уходит из ленты, чтобы
         админ нажал ещё раз, а не искал, куда делся его текст */
      setItems(before);
      setText(body);
      toast(assistantErrorText(e), "error");
      if (isApiError(e, ASSISTANT_OFF)) onThreadChanged();
    } finally {
      setSending(false);
      setDraft("");
      setLive([]);
    }
  };

  /* Допуск выдаётся кликом по строке карточки выбора; уровень выбирает админ */
  const onGrant = async (userId: number, level: AssistantGrantLevel) => {
    try {
      await grantPd(threadId, userId, level);
      grants.reload();
    } catch (e) {
      toast(assistantErrorText(e), "error");
    }
  };

  const onRevoke = async (userId: number) => {
    try {
      await revokeGrant(threadId, userId);
      grants.reload();
    } catch (e) {
      toast(assistantErrorText(e), "error");
    }
  };

  const onProposal = async (id: number, execute: boolean) => {
    try {
      const res = execute ? await executeProposal(id) : await cancelProposal(id);
      /* Карточка превращается в результат на месте: перечитывать всю ленту
         ради одной строки незачем */
      setItems((list) =>
        list.map((m) => (m.proposal?.id === id ? { ...m, proposal: res.proposal } : m)),
      );
      if (execute) toast(t.asProposalDone, "success");
    } catch (e) {
      toast(assistantErrorText(e), "error");
      /* Отказ инструмента меняет состояние предложения на сервере —
         перечитываем, чтобы кнопка не осталась живой у протухшего */
      feed.reload();
    }
  };

  const granted = useMemo(() => {
    const map: Record<number, AssistantGrantLevel> = {};
    for (const g of grants.data?.items ?? []) map[g.subject_user_id] = g.level;
    return map;
  }, [grants.data]);

  return (
    <div className="card as-chat">
      <ChatHeader grants={grants.data?.items ?? []} onRevoke={onRevoke} />

      <div className="as-feed">
        {feed.loading && !feed.data ? (
          <Skeleton h={80} />
        ) : items.length === 0 ? (
          <EmptyChat onPick={(s) => setText(s)} />
        ) : (
          items.map((m) => (
            <Row key={m.id} m={m} granted={granted} onGrant={onGrant} onProposal={onProposal} />
          ))
        )}

        {/* Ход на лету: карточки вызовов в момент вызова и текст по мере
            генерации. На `done` всё это заменяется настоящей лентой */}
        {live.map((card, i) => (
          <LiveToolCard key={`${card.tool_name}-${i}`} card={card} />
        ))}
        {draft && <div className="as-msg-bot">{draft}</div>}
        {sending && !draft && (
          <div className="row g8 muted-3 small as-msg-bot">
            <span className="spinner" style={{ width: 15, height: 15 }} />
            {t.asThinking}…
          </div>
        )}

        {cap && (
          <Note kind="warning">
            <span className="small">{t.asStoppedAtCap}</span>
          </Note>
        )}

        <div ref={bottom} />
      </div>

      <div className="as-compose stack g6">
        <textarea
          className="input"
          value={text}
          placeholder={t.asAskPlaceholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="row between g10">
          <span className="caption muted-3">
            {t.asSendHint}
            {spent && (
              /* Цена последнего хода — из неё складывается счёт за месяц,
                 и по ней видно, что вопрос длиной в слово стоит столько же */
              <>
                {" · "}
                <span title={t.asTokensHint}>
                  {t.asTokensTitle}: {t.asTokens(spent.in + spent.out)}
                </span>
              </>
            )}
          </span>
          <Button size="sm" loading={sending} disabled={!text.trim()} onClick={() => void send()}>
            {t.send}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Шапка чата: чипы допусков и селектор закреплённого курса.
 *
 * Оба — слоты под компоненты пакета 3 (`AssistantGrants`, `AssistantPicker`),
 * они подключаются в фазе B3. Пока стоит честная заглушка: чипы рисуются
 * здесь простым списком, чтобы допуск было видно и без пакета.
 */
function ChatHeader({
  grants,
  onRevoke,
}: {
  grants: AssistantGrant[];
  onRevoke: (userId: number) => void;
}) {
  if (grants.length === 0) return null;
  return (
    <div
      className="stack g8"
      style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}
    >
      <AssistantGrants grants={grants} onRevoke={onRevoke} />
    </div>
  );
}

/** Пустой чат: подсказки-примеры, а не простыня «я умею…» (раздел 3). */
function EmptyChat({ onPick }: { onPick: (s: string) => void }) {
  const { t } = useLang();
  const examples = [t.asExAccess, t.asExReport, t.asExLeads, t.asExSubmissions];
  return (
    <div className="stack g12" style={{ margin: "auto", maxWidth: 460, textAlign: "center" }}>
      <div className="stack g4">
        <strong>{t.asAsk}</strong>
        <span className="caption muted-3">{t.asExamplesTitle}</span>
      </div>
      <div className="stack g6">
        {examples.map((s) => (
          <button key={s} className="btn btn-secondary btn-sm" onClick={() => onPick(s)}>
            {s}
          </button>
        ))}
      </div>
      <span className="caption muted-3">{t.asDraftNote}</span>
    </div>
  );
}

/* ============ Строка ленты ============ */

function Row({
  m,
  granted,
  onGrant,
  onProposal,
}: {
  m: AssistantMessage;
  granted: Record<number, AssistantGrantLevel>;
  onGrant: (userId: number, level: AssistantGrantLevel) => void;
  onProposal: (id: number, execute: boolean) => void;
}) {
  if (m.role === "user") return <div className="as-msg-user">{m.content}</div>;
  if (m.role === "assistant") return <div className="as-msg-bot">{m.content}</div>;
  return <ToolRow m={m} granted={granted} onGrant={onGrant} onProposal={onProposal} />;
}

/**
 * Карточка вызова: свёрнута до одной строки человеческим языком,
 * разворачивается в аргументы и ответ.
 */
function ToolRow({
  m,
  granted,
  onGrant,
  onProposal,
}: {
  m: AssistantMessage;
  granted: Record<number, AssistantGrantLevel>;
  onGrant: (userId: number, level: AssistantGrantLevel) => void;
  onProposal: (id: number, execute: boolean) => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const name = m.tool_name ?? "";
  const label = TOOL_LABEL[name] ?? name;
  const n = toolCount(m.tool_result);

  /* Карточка выбора человека: строки вернул `teachers_find`, а имена в них
     подставит браузер — пакет 3 (раздел 5). Слот подключается в B3. */
  const pickerRows =
    name === "teachers_find" && Array.isArray(m.tool_result?.items)
      ? (m.tool_result.items as PickerRow[])
      : null;

  return (
    <div className="as-tool stack g4">
      <button className="as-tool-head" onClick={() => setOpen((v) => !v)}>
        <IconChevronDown
          size={15}
          style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s" }}
        />
        <span className="small grow">
          {label}
          {n !== null && <span className="muted-3">, {n} шт.</span>}
        </span>
      </button>

      {open && (
        <div className="as-tool-body">
          <div className="caption muted-3">{t.asToolArgs}</div>
          <pre>{JSON.stringify(m.tool_args ?? {}, null, 2)}</pre>
          <div className="caption muted-3">{t.asToolResult}</div>
          <pre>{JSON.stringify(m.tool_result ?? {}, null, 2)}</pre>
        </div>
      )}

      {pickerRows && (
        <AssistantPicker rows={pickerRows} granted={granted} onPick={onGrant} />
      )}

      {m.proposal && <ProposalCard p={m.proposal} onAct={onProposal} />}
    </div>
  );
}

/**
 * Карточка вызова, пришедшая событием `tool`.
 *
 * Свёрнута и не разворачивается: строки в базе ещё нет, `id` у неё нет тоже,
 * а через секунду её место займёт настоящая из `done`. Смысл её один — чтобы
 * на длинной задаче было видно, что ассистент работает, а не завис.
 */
function LiveToolCard({ card }: { card: TurnToolCard }) {
  const n = toolCount(card.tool_result);
  return (
    <div className="as-tool">
      <div className="as-tool-head" style={{ cursor: "default" }}>
        <span className="spinner" style={{ width: 13, height: 13 }} />
        <span className="small grow">
          {TOOL_LABEL[card.tool_name] ?? card.tool_name}
          {n !== null && <span className="muted-3">, {n} шт.</span>}
        </span>
      </div>
    </div>
  );
}

/**
 * Предложение опасного действия: последствия своими словами и две кнопки.
 *
 * Кнопка шлёт **только `id`** — аргументы исполнение берёт из своей строки.
 * После выполнения карточка превращается в результат.
 */
function ProposalCard({
  p,
  onAct,
}: {
  p: AssistantProposal;
  onAct: (id: number, execute: boolean) => void;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState<"" | "go" | "no">("");

  const act = async (execute: boolean) => {
    setBusy(execute ? "go" : "no");
    await onAct(p.id, execute);
    setBusy("");
  };

  const status =
    p.status === "executed"
      ? t.asProposalExecuted
      : p.status === "expired"
        ? t.asProposalExpired
        : p.status === "cancelled"
          ? t.asProposalCancelled
          : t.asProposalWaiting;

  return (
    <div
      className="card card-pad stack g10"
      style={{ borderColor: p.status === "waiting" ? "var(--warning-line)" : undefined }}
    >
      <div className="row between g10">
        <strong className="small">{t.asProposalTitle}</strong>
        <Badge kind={p.status === "executed" ? "done" : p.status === "waiting" ? "new" : "neutral"}>
          {status}
        </Badge>
      </div>

      <div className="small">{p.what_happens}</div>

      {p.status === "waiting" && (
        <div className="row g8">
          <Button size="sm" loading={busy === "go"} onClick={() => void act(true)}>
            {t.asExecute}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={busy === "no"}
            onClick={() => void act(false)}
          >
            {t.asProposalCancel}
          </Button>
        </div>
      )}

      {p.status === "expired" && <span className="caption muted-3">{t.asProposalExpiredHint}</span>}

      {p.status === "executed" && p.result && (
        <ProposalResult tool={p.tool_name} result={p.result} />
      )}
    </div>
  );
}

/**
 * Что получилось — со ссылкой на экран, где это видно.
 *
 * Экран угадывается по имени инструмента: реестр закрытый, а ссылка «посмотреть
 * своими глазами» после необратимого действия дороже точности угадывания.
 * Не угадали — карточка просто без ссылки.
 */
function ProposalResult({ tool, result }: { tool: string; result: Record<string, unknown> }) {
  const { t } = useLang();
  const id = (k: string) => (typeof result[k] === "number" ? (result[k] as number) : null);

  const href = tool.startsWith("course_")
    ? id("course_id") && `/courses/${id("course_id")}`
    : tool.startsWith("certificate_")
      ? id("certificate_id") && `/certificates/${id("certificate_id")}`
      : tool.startsWith("enrollment_") || tool.startsWith("teacher_")
        ? id("user_id") && `/teachers/${id("user_id")}`
        : tool.startsWith("submission_")
          ? id("submission_id") && `/submissions/${id("submission_id")}`
          : tool.startsWith("review_")
            ? "/reviews"
            : tool.startsWith("question_")
              ? "/questions"
              : null;

  return (
    <div className="row between g10">
      <span className="caption muted-3">{t.asProposalDone}</span>
      {href && (
        <Link href={href} className="btn btn-secondary btn-sm">
          {t.asOpenScreen}
        </Link>
      )}
    </div>
  );
}
