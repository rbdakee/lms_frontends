"use client";

/**
 * Вход в «Жоспар»: чат, который собирает заказ на урок (бриф, раздел 1;
 * `CONTRACT.md`, L6).
 *
 * Правда о заказе и ленте — на сервере: после каждого хода и каждой кнопки
 * экран целиком заменяет чат тем, что вернулось. Своё у экрана — только то,
 * чего сервер ещё не прислал: черновой ответ, карточки поиска посреди хода,
 * реплика учителя, пока ход не закончился, и предвыбор «копии как основы».
 *
 * Три развилки на входе:
 * - ни `chatId`, ни `fromKitId` — новый разговор. Чат на сервере заводится
 *   только первым действием учителя (реплика, язык, тема, выбор цели) —
 *   иначе каждый заход в продукт плодил бы пустые чаты;
 * - `chatId` — продолжение: лента и заказ с сервера;
 * - `fromKitId` — «копия как основа»: новый чат, в заказ сразу цель, язык
 *   и тема прошлого комплекта, галочки и уровни — предвыбором формы.
 *
 * Адрес заведённого чата подменяется `history.replaceState`, а не роутером:
 * навигация размонтировала бы экран посреди стрима.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isApiError,
  type LessonChat,
  type LessonChatConfirmIn,
  type LessonChatObjective,
  type LessonChatOrder,
  type LessonChatOrderPatch,
  type LessonKit,
  type LessonLang,
} from "@lms/api";
import { Button, Empty, LinkButton, Note, Skeleton } from "@lms/ui";
import { IconMessage, IconPlus } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import {
  RATE_LIMITED,
  confirmChat,
  createChat,
  getChat,
  getKit,
  objectivesOf,
  patchOrder,
  say,
} from "../api";
import { AccessUntil, useLessonAiAccess } from "../access";
import { useChrome, useRoutes } from "../host";
import { KIND_ORDER, hoursFrom } from "../labels";
import { LESSON_AI_NAME } from "../name";
import { ConfirmForm, type ConfirmPreset } from "../components/chat/ConfirmForm";
import { BotBubble, Composer, Thinking, UserBubble } from "../components/chat/Feed";
import { ObjectiveCards } from "../components/chat/ObjectiveCards";
import { ObjectiveSheet } from "../components/chat/ObjectiveSheet";
import { LangPicker, OrderCard } from "../components/chat/OrderCard";
import { fieldMessage, minutesFrom, useWide } from "../components/chat/util";

/*
 * Заказ, пока чата на сервере нет: форма пустого заказа из `POST /chats`
 * (`CONTRACT.md`, L6). Только для карточки — на сервер из него не уходит
 * ничего, галочки и уровни при `ready: false` не показываются.
 */
const NO_ORDER: LessonChatOrder = {
  subject_code: null,
  grade: null,
  lang: null,
  objective: null,
  topic: null,
  engagement_level: "active",
  difficulty_level: "standard",
  kinds: [],
  class_size: null,
  notes: "",
  missing: ["subject", "grade", "lang", "objective", "topic"],
  ready: false,
};

export function ChatScreen({ chatId, fromKitId }: { chatId?: string; fromKitId?: string }) {
  const routes = useRoutes();
  const pathname = usePathname();
  /*
   * Новый разговор живёт на адресе входа, а после первой реплики адрес
   * подменён на адрес чата — маршрут Next при этом прежний. Ссылка «Новый
   * урок» ведёт на тот же маршрут, и без смены ключа экран остался бы
   * со старым чатом: возврат на адрес входа — это новый разговор.
   */
  const [epoch, setEpoch] = useState(0);
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (pathname === routes.home && lastPath.current !== routes.home) setEpoch((n) => n + 1);
    lastPath.current = pathname;
  }, [pathname, routes.home]);

  return <Chat key={`${chatId ?? ""}|${fromKitId ?? ""}|${epoch}`} chatId={chatId} fromKitId={fromKitId} />;
}

type Phase = "loading" | "ready" | "chat_not_found" | "kit_not_found" | "error";

interface SheetFor {
  grade: number | null;
  lang: LessonLang | null;
}

function Chat({ chatId, fromKitId }: { chatId?: string; fromKitId?: string }) {
  const { t } = useLang();
  const routes = useRoutes();
  const router = useRouter();
  const { Shell } = useChrome();
  const { handle } = useLessonAiAccess();
  const toast = useToast();
  const wide = useWide();

  const [chat, setChat] = useState<LessonChat | null>(null);
  const [phase, setPhase] = useState<Phase>(chatId || fromKitId ? "loading" : "ready");
  const [attempt, setAttempt] = useState(0);
  const [preset, setPreset] = useState<ConfirmPreset | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  /* Реплика учителя, пока ход не закончился: в ленту её кладёт только `done` */
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState<LessonChatObjective[][]>([]);
  const [sayError, setSayError] = useState<string | null>(null);
  const [patching, setPatching] = useState(false);
  const [sheet, setSheet] = useState<SheetFor | null>(null);

  const idRef = useRef<number | null>(null);
  const creating = useRef<Promise<number> | null>(null);

  const adopt = useCallback((c: LessonChat) => {
    idRef.current = c.id;
    setChat(c);
  }, []);

  const moveTo = useCallback(
    (id: number) => window.history.replaceState(null, "", routes.chat(id)),
    [routes],
  );

  /* ---------- Вход: продолжение или копия ---------- */

  /* Номер запуска: в строгом режиме эффект зовётся дважды, а копия заводит
     чат на сервере — второй пустой чат учителю не нужен */
  const started = useRef(-1);
  useEffect(() => {
    if (!chatId && !fromKitId) return;
    if (started.current === attempt) return;
    started.current = attempt;
    setPhase("loading");

    void (async () => {
      try {
        if (chatId) {
          adopt(await getChat(chatId));
        } else if (fromKitId) {
          await startFromKit(fromKitId);
        }
        setPhase("ready");
      } catch (e) {
        if (handle(e)) return;
        if (isApiError(e) && e.status === 404) {
          setPhase(chatId ? "chat_not_found" : "kit_not_found");
        } else {
          setPhase("error");
        }
      }
    })();

    async function startFromKit(kitId: string) {
      const kit = await getKit(kitId);
      setPreset(presetOf(kit));
      /* Повтор после сбоя сети не заводит второй чат, если первый уже есть */
      const id = idRef.current ?? (await createChat()).id;
      idRef.current = id;
      moveTo(id);
      try {
        adopt(await patchOrder(id, { objective_id: kit.objective.id, lang: kit.lang, topic: kit.topic }));
      } catch (e) {
        const gone = isApiError(e, "objective_lang_missing") || (isApiError(e) && e.status === 404);
        if (!gone) throw e;
        /* Цель прошлого урока сняли с публикации или её нет в редакции языка:
           чат уже есть, учитель выберет цель заново */
        adopt(await getChat(id));
        setNotice(isApiError(e, "objective_lang_missing") ? t.laObjectiveLangMissing : t.laChatObjectiveGone);
        return;
      }
      setNotice(t.laChatFromKit);
    }
  }, [chatId, fromKitId, attempt, adopt, handle, moveTo, t]);

  /* ---------- Чат на сервере — первым действием ---------- */

  const ensureChat = useCallback(async (): Promise<number> => {
    if (idRef.current !== null) return idRef.current;
    if (!creating.current) {
      creating.current = createChat().then(
        (c) => {
          adopt(c);
          moveTo(c.id);
          return c.id;
        },
        (e) => {
          creating.current = null;
          throw e;
        },
      );
    }
    return creating.current;
  }, [adopt, moveTo]);

  /** Заказ уже отправлен (`409 chat_confirmed`): ввод закрывается, ведём к комплекту. */
  const markConfirmed = useCallback((kitId: unknown) => {
    setChat((c) => (c ? { ...c, status: "confirmed", kit_id: Number(kitId) || c.kit_id } : c));
  }, []);

  /* ---------- Реплика ---------- */

  const send = async () => {
    const said = text.trim();
    if (!said || sending) return;
    setSending(true);
    setSayError(null);
    setNotice(null);
    setPending(said);
    setText("");
    setDraft("");
    setLive([]);
    try {
      const id = await ensureChat();
      const turn = await say(id, said, {
        onDelta: (piece) => setDraft((d) => d + piece),
        onTool: (ev) => {
          /* Текст до поиска — «сейчас посмотрю», в ленту он не ляжет */
          setDraft("");
          const found = objectivesOf(ev.tool_result);
          if (found.length > 0) setLive((l) => [...l, found]);
        },
      });
      adopt(turn.chat);
    } catch (e) {
      if (handle(e)) return;
      /* Хода не было — реплика возвращается в поле, если учитель не начал новую */
      setText((cur) => cur || said);
      if (isApiError(e, RATE_LIMITED)) setSayError(t.laChatTooMany(minutesFrom(e.retryAfterSec)));
      else if (isApiError(e, "chat_confirmed")) {
        setText("");
        markConfirmed(e.details.kit_id);
      } else if (isApiError(e, "validation_error")) setSayError(fieldMessage(e) ?? t.laChatAiFailed);
      else setSayError(t.laChatAiFailed);
    } finally {
      setSending(false);
      setPending(null);
      setDraft("");
      setLive([]);
    }
  };

  /* ---------- Кнопки заказа ---------- */

  /** Вернул текст — правка не прошла, показать его там, откуда нажали. */
  const patch = async (body: LessonChatOrderPatch): Promise<string | null> => {
    setPatching(true);
    try {
      const id = await ensureChat();
      adopt(await patchOrder(id, body));
      setNotice(null);
      return null;
    } catch (e) {
      if (handle(e)) return null;
      if (isApiError(e, "objective_lang_missing")) return t.laObjectiveLangMissing;
      if (isApiError(e, "chat_confirmed")) {
        markConfirmed(e.details.kit_id);
        return null;
      }
      if (isApiError(e) && e.status === 404) return t.laChatObjectiveGone;
      if (isApiError(e, "validation_error")) return fieldMessage(e);
      return isApiError(e) ? e.message : t.loadErrorText;
    } finally {
      setPatching(false);
    }
  };

  const patchOrToast = async (body: LessonChatOrderPatch) => {
    const err = await patch(body);
    if (err) toast(err, "error");
  };

  const pickFromSheet = async (o: LessonChatObjective) => {
    const err = await patch({ objective_id: o.id });
    if (!err) setSheet(null);
    return err;
  };

  /* ---------- «Готовить» ---------- */

  const confirm = async (body: LessonChatConfirmIn): Promise<string | null> => {
    const id = idRef.current;
    if (id === null) return null;
    try {
      const res = await confirmChat(id, body);
      adopt(res.chat);
      router.push(routes.kit(res.kit.id));
      return null;
    } catch (e) {
      if (handle(e)) return null;
      if (isApiError(e, RATE_LIMITED)) {
        /* Лимит суточный — часы, а не секундный таймер; заказ остаётся как был */
        return e.retryAfterSec < 3600 ? t.laOrderLimitSoon : t.laOrderLimit(hoursFrom(e.retryAfterSec));
      }
      if (isApiError(e, "chat_confirmed")) {
        router.push(routes.kit(Number(e.details.kit_id)));
        return null;
      }
      if (isApiError(e, "order_incomplete")) {
        /* Заказ на сервере не тот, что на экране: перечитываем — карточка
           сама покажет, чего не хватает, а форма спрячется */
        try {
          adopt(await getChat(id));
          return null;
        } catch (e2) {
          if (handle(e2)) return null;
          return e.message;
        }
      }
      if (isApiError(e, "validation_error")) return fieldMessage(e);
      return isApiError(e) ? e.message : t.loadErrorText;
    }
  };

  /* ---------- Прокрутка к свежему ---------- */

  const itemsCount = chat?.items.length ?? 0;
  useEffect(() => {
    if (phase !== "ready" || (itemsCount === 0 && !pending)) return;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [phase, itemsCount, pending, draft, live.length]);

  /* ---------- Кадр ---------- */

  const header = (
    <div className="row between g12 wrap" style={{ marginBottom: 16 }}>
      <div className="stack g4" style={{ minWidth: 0 }}>
        <h1 className="h2">{LESSON_AI_NAME}</h1>
        <AccessUntil />
      </div>
      <div className="row g8 wrap">
        {chat && (
          <LinkButton href={routes.home} variant="secondary" size="sm" icon={<IconPlus size={16} />}>
            {t.laNewLesson}
          </LinkButton>
        )}
        <LinkButton href={routes.lessons} variant="ghost" size="sm">
          {t.laMyLessons}
        </LinkButton>
      </div>
    </div>
  );

  const frame = (content: ReactNode) => (
    <Shell title={LESSON_AI_NAME}>
      <div className="page section">
        {header}
        {content}
      </div>
    </Shell>
  );

  if (phase === "loading") {
    return frame(
      <div className="stack g12" aria-busy="true">
        <Skeleton h={64} r={16} />
        <Skeleton w="70%" h={48} r={16} />
        <Skeleton w="50%" h={40} r={16} style={{ alignSelf: "flex-end" }} />
        <Skeleton w="80%" h={120} r={16} />
      </div>,
    );
  }

  if (phase === "chat_not_found" || phase === "kit_not_found") {
    return frame(
      <Empty
        icon={<IconMessage size={38} />}
        title={phase === "chat_not_found" ? t.laChatNotFound : t.laKitNotFound}
        text={phase === "chat_not_found" ? t.laChatNotFoundText : t.laKitNotFoundText}
        action={<LinkButton href={routes.home}>{t.laNewLesson}</LinkButton>}
      />,
    );
  }

  if (phase === "error") {
    return frame(
      <Empty
        title={t.loadError}
        text={t.loadErrorText}
        action={
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </Button>
        }
      />,
    );
  }

  /* ---------- Разговор ---------- */

  const order = chat?.order ?? NO_ORDER;
  const confirmed = chat?.status === "confirmed";
  const locked = sending || patching || confirmed;
  const chosenId = order.objective?.id ?? null;

  /* Класс и язык для «Показать другие»: из заказа, иначе из показанной карточки */
  const openSheet = (from?: LessonChatObjective) =>
    setSheet({
      grade: order.grade ?? from?.grade ?? order.objective?.grade ?? lastShown(chat)?.grade ?? null,
      lang: order.lang ?? from?.lang ?? order.objective?.lang ?? lastShown(chat)?.lang ?? null,
    });

  const cards = (items: LessonChatObjective[], key: string | number) => (
    <ObjectiveCards
      key={key}
      items={items}
      chosenId={chosenId}
      disabled={locked}
      onYes={(o) => void patchOrToast({ objective_id: o.id })}
      onOthers={(o) => openSheet(o)}
    />
  );

  const orderCard = (
    <OrderCard
      order={order}
      disabled={locked}
      collapsible={!wide}
      onPatch={patchOrToast}
      onPickObjective={() => openSheet()}
    />
  );

  const confirmForm =
    chat && order.ready && !confirmed ? (
      <ConfirmForm order={order} preset={preset} disabled={sending || patching} onSubmit={confirm} />
    ) : null;

  const feed = (
    <div className="stack g12" aria-live="polite">
      <BotBubble>
        {t.laChatHello}
        <span className="caption muted" style={{ display: "block", marginTop: 6 }}>
          {t.laChatExample}
        </span>
      </BotBubble>

      {chat?.items.map((m) =>
        m.role === "user" ? (
          <UserBubble key={m.id}>{m.content}</UserBubble>
        ) : m.role === "assistant" ? (
          m.content ? <BotBubble key={m.id}>{m.content}</BotBubble> : null
        ) : (
          cards(objectivesOf(m.tool_result), m.id)
        ),
      )}

      {pending && <UserBubble>{pending}</UserBubble>}
      {live.map((found, i) => cards(found, `live-${i}`))}
      {draft && <BotBubble>{draft}</BotBubble>}
      {sending && !draft && (
        /* До первого события сервер разбирает реплику; без цели в заказе
           модель первым делом ищет её в программе */
        <Thinking text={order.objective || live.length > 0 ? t.laChatThinking : t.laChatSearching} />
      )}

      {/* Вопрос языка — под лентой, как в брифе, когда цель уже подтверждена */}
      {chat && !sending && !confirmed && order.objective && order.missing.includes("lang") && (
        <BotBubble>
          <LangPicker lang={order.lang} question disabled={locked} onPick={(lang) => void patchOrToast({ lang })} />
        </BotBubble>
      )}
    </div>
  );

  const bottomEnd = confirmed ? (
    <div style={{ marginTop: 16 }}>
      <Note kind="success">
        <div className="stack g8">
          <span>{t.laChatConfirmed}</span>
          {chat?.kit_id != null && (
            <div>
              <LinkButton href={routes.kit(chat.kit_id)} size="sm">
                {t.laChatOpenKit}
              </LinkButton>
            </div>
          )}
        </div>
      </Note>
    </div>
  ) : (
    <Composer
      value={text}
      sending={sending}
      bottom={wide ? "0px" : "calc(var(--tabbar-h) + env(safe-area-inset-bottom))"}
      onChange={(v) => {
        setText(v);
        if (sayError) setSayError(null);
      }}
      onSend={() => void send()}
      notice={sayError && <Note kind="warning">{sayError}</Note>}
    />
  );

  const noticeNote = notice && <Note kind="info">{notice}</Note>;

  return (
    <Shell title={LESSON_AI_NAME}>
      <div className="page section" style={{ paddingBottom: 0 }}>
        {header}
        {wide ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 380px",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div className="stack g12" style={{ minWidth: 0 }}>
              {noticeNote}
              {feed}
              {bottomEnd}
            </div>
            <aside
              className="stack g16"
              style={{
                position: "sticky",
                top: "calc(var(--header-h) + 16px)",
                maxHeight: "calc(100vh - var(--header-h) - 32px)",
                overflowY: "auto",
              }}
            >
              {orderCard}
              {confirmForm}
            </aside>
          </div>
        ) : (
          <div className="stack g12" style={{ maxWidth: 720, margin: "0 auto" }}>
            {orderCard}
            {noticeNote}
            {feed}
            {confirmForm}
            {bottomEnd}
          </div>
        )}
      </div>

      <ObjectiveSheet
        open={sheet !== null}
        grade={sheet?.grade ?? null}
        lang={sheet?.lang ?? null}
        chosenId={chosenId}
        onClose={() => setSheet(null)}
        onPick={pickFromSheet}
      />
    </Shell>
  );
}

/** Предвыбор формы по прошлому комплекту: виды — те, что в нём были. */
function presetOf(kit: LessonKit): ConfirmPreset {
  const had = new Set(kit.materials.map((m) => m.kind));
  return {
    kinds: KIND_ORDER.filter((k) => had.has(k)),
    engagement_level: kit.engagement_level,
    difficulty_level: kit.difficulty_level,
    class_size: kit.class_size,
    notes: kit.notes,
  };
}

/** Последняя цель, показанная карточкой, — откуда взять класс, пока заказ пуст. */
function lastShown(chat: LessonChat | null): LessonChatObjective | undefined {
  if (!chat) return undefined;
  for (let i = chat.items.length - 1; i >= 0; i--) {
    const found = objectivesOf(chat.items[i].tool_result);
    if (found.length > 0) return found[0];
  }
  return undefined;
}
