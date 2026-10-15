"use client";

/**
 * Панель чата рабочего места «Жоспара»: разговор, который собирает заказ
 * на урок (бриф, раздел 1; `CONTRACT.md`, L6). Кадр, шапку, историю
 * и соседнюю панель уроков рисует `WorkspaceScreen`.
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
 *
 * Чат не заканчивается на «Готовить» (решение 15.10.2026): `mode: "edit"` —
 * та же лента и то же поле ввода, но реплика теперь просьба поправить
 * материал. События ленты (`role: "event"`) рисуются плашками, а правки
 * материалов (`material_changed` в стриме, `block_changed` в опросе) панель
 * отдаёт наверх (`onMaterial`) — подсветить блок справа решает рабочее место.
 * Пока комплект собирается, ленту и статусы материалов подтягивает опрос.
 *
 * Каждый чат с сервера панель отдаёт наверх (`onChat`): так новый разговор
 * встаёт в сайдбар после первого действия, а тема и статус комплекта
 * обновляются, как только изменились, — без перечитывания списка.
 */

import { Fragment, useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  isApiError,
  type LessonAttachment,
  type LessonChat,
  type LessonChatConfirmIn,
  type LessonChatEvent,
  type LessonChatFeed,
  type LessonChatObjective,
  type LessonChatOrder,
  type LessonChatOrderPatch,
  type LessonKit,
  type LessonLang,
  type LessonSubject,
} from "@lms/api";
import { Button, Empty, Note, Skeleton } from "@lms/ui";
import { IconArrowDown, IconMessage } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import {
  RATE_LIMITED,
  confirmChat,
  createChat,
  deleteAttachment,
  getChat,
  getChatFeed,
  getKit,
  listAttachments,
  listSubjects,
  objectivesOf,
  patchOrder,
  say,
  setKitObjectives,
  uploadAttachment,
} from "../../api";
import { useLessonAiAccess } from "../../access";
import { useRoutes } from "../../host";
import { KIND_ORDER, hoursFrom } from "../../labels";
import { ConfirmForm, type ConfirmPreset } from "./ConfirmForm";
import { EventPill } from "./EventPill";
import {
  BotBubble,
  Composer,
  Markdown,
  MessageAttachments,
  SuggestionChips,
  Thinking,
  UserBubble,
  kindFromName,
  type DraftAttachment,
} from "./Feed";
import { ObjectiveCards, toggled } from "./ObjectiveCards";
import { ObjectiveSheet } from "./ObjectiveSheet";
import { StartPicker } from "./StartPicker";
import { LangPicker, OrderCard, TopicField } from "./OrderCard";
import { fieldMessage, minutesFrom } from "./util";

/*
 * Заказ, пока чата на сервере нет: форма пустого заказа из `POST /chats`
 * (`CONTRACT.md`, L6). Только для карточки — на сервер из него не уходит
 * ничего, галочки и уровни при `ready: false` не показываются.
 */
const NO_ORDER: LessonChatOrder = {
  subject_code: null,
  grade: null,
  lang: null,
  objectives: [],
  many_objectives_confirmed: false,
  topic: null,
  engagement_level: "active",
  difficulty_level: "standard",
  kinds: [],
  class_size: null,
  notes: "",
  missing: ["subject", "grade", "lang", "objective", "topic"],
  ready: false,
};

type Phase = "loading" | "ready" | "chat_not_found" | "kit_not_found" | "error";

interface SheetFor {
  subject_code: string | null;
  grade: number | null;
  lang: LessonLang | null;
}

/* Как часто спрашиваем ленту, пока комплект собирается (контракт: раз в 2–3 с) */
const POLL_MS = 2500;

/* Лимиты вложений знает сервер; клиент повторяет их только ради мгновенной
   подсказки — финальная проверка всегда на бэкенде (контракт) */
const ATTACH_MAX_FILES = 5;
const ATTACH_MAX_MB = 20;
/* Как часто спрашиваем список вложений, пока есть непрочитанные файлы */
const ATTACH_POLL_MS = 2000;

const ATTACH_EXTS = ["jpg", "jpeg", "png", "webp", "pdf", "docx", "pptx"];

/** Текст ошибки загрузки: сервер отвечает человеческой фразой — берём её. */
function attachErrorText(e: unknown, t: ReturnType<typeof useLang>["t"]): string {
  if (isApiError(e) && e.status > 0) return e.message;
  return t.laAttachUploadError;
}

/** Файл не прочитался: список вложений отдаёт только код, словами — свои. */
function failedText(code: string | null, t: ReturnType<typeof useLang>["t"]): string {
  if (code === "attachment_unsupported") return t.laAttachErrUnsupported;
  if (code === "ai_failed") return t.laAttachErrAi;
  if (code === "extract_failed") return t.laAttachErrExtract;
  return t.laAttachUploadError;
}

/** Строка списка вложений — карточка у поля ввода (после перезагрузки страницы). */
function draftFromRow(r: LessonAttachment, t: ReturnType<typeof useLang>["t"]): DraftAttachment {
  return {
    localId: `s${r.id}`,
    serverId: r.id,
    kind: r.kind,
    filename: r.filename,
    sizeBytes: r.size_bytes,
    pages: r.pages,
    status: r.status === "ready" ? "ready" : r.status === "processing" ? "processing" : "failed",
    error: r.status === "failed" ? failedText(r.error_code, t) : null,
  };
}

export function ChatPanel({
  chatId,
  fromKitId,
  onChat,
  onMaterial,
  editGoalsRequest = 0,
  reloadRequest = 0,
  onNew,
}: {
  chatId?: string;
  fromKitId?: string;
  onChat: (chat: LessonChat) => void;
  /** Помощник поправил блок материала: подсветить справа и перечитать */
  onMaterial: (event: LessonChatEvent) => void;
  /** Номер просьбы «Изменить цели» из панели материалов: растёт — шторка открывается */
  editGoalsRequest?: number;
  /** Номер просьбы «перечитать чат»: комплект поставили на пересборку снаружи, лента должна об этом узнать */
  reloadRequest?: number;
  onNew: () => void;
}) {
  const { t } = useLang();
  const routes = useRoutes();
  const { handle } = useLessonAiAccess();
  const toast = useToast();

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
  /* В режиме правки `tool` — не поиск по программе, а работа над материалом */
  const [editing, setEditing] = useState(false);
  const [sayError, setSayError] = useState<string | null>(null);
  const [patching, setPatching] = useState(false);
  /* Вложения у поля ввода: до отправки живут здесь, после — в ленте на сервере.
     Дубль в ref нужен тем же местам, что и `chatRef`: колбэки читают ряд
     из замыканий, где state к моменту вызова уже старый */
  const [drafts, setDrafts] = useState<DraftAttachment[]>([]);
  const draftsRef = useRef<DraftAttachment[]>([]);
  const localSeq = useRef(0);
  /* Идущие загрузки: «Отправить» дожидается их, чтобы файлы уехали той же репликой */
  const uploads = useRef(new Set<Promise<void>>());
  const updateDrafts = useCallback((fn: (list: DraftAttachment[]) => DraftAttachment[]) => {
    const next = fn(draftsRef.current);
    draftsRef.current = next;
    setDrafts(next);
  }, []);
  const [sheet, setSheet] = useState<SheetFor | null>(null);
  /* Предметы для стартового блока; не загрузились — блока просто нет, чат работает и без него */
  const [startSubjects, setStartSubjects] = useState<LessonSubject[]>([]);
  /* Язык, выбранный на старте: уходит в заказ вместе с целями */
  const [startLang, setStartLang] = useState<LessonLang | null>(null);
  useEffect(() => {
    let alive = true;
    listSubjects().then(
      (res) => alive && setStartSubjects(res.items),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, []);
  /* Отмеченные цели в порядке отметок. Записываются в урок кнопкой «Готово»;
     пока не записаны, живут здесь, чтобы карточки в ленте и шторка видели одно и то же */
  const [picked, setPicked] = useState<LessonChatObjective[]>([]);
  /* Записанный сервером набор целей — правда: отметки подтягиваются к нему при
     каждой его смене (разговор, «Готово», смена языка заменили цели) */
  const savedKey = savedObjectives(chat).map((o) => o.id).join(",");
  useEffect(() => {
    setPicked(savedObjectives(chatRef.current));
  }, [savedKey]);

  const idRef = useRef<number | null>(null);
  const creating = useRef<Promise<number> | null>(null);
  /* Идущий ответ: «Стоп» обрывает чтение стрима */
  const turn = useRef<AbortController | null>(null);

  /* Через ref: `adopt` стоит в зависимостях входного эффекта, и новый колбэк
     от рабочего места на каждом его рендере перезапускал бы вход */
  const onChatRef = useRef(onChat);
  onChatRef.current = onChat;
  const onMaterialRef = useRef(onMaterial);
  onMaterialRef.current = onMaterial;
  /* Чат, каким его видит опрос: к моменту тика state в замыкании уже старый */
  const chatRef = useRef<LessonChat | null>(null);
  const adopt = useCallback((c: LessonChat) => {
    idRef.current = c.id;
    chatRef.current = c;
    setChat(c);
    onChatRef.current(c);
  }, []);

  /* «Изменить цели» из панели материалов — шторка с текущим набором отмеченным */
  const goalsSeen = useRef(editGoalsRequest);
  useEffect(() => {
    if (goalsSeen.current === editGoalsRequest) return;
    goalsSeen.current = editGoalsRequest;
    const cur = chatRef.current;
    if (cur?.mode !== "edit") return;
    setPicked(savedObjectives(cur));
    setSheet(sheetFor(cur));
  }, [editGoalsRequest]);

  const reloadSeen = useRef(reloadRequest);
  useEffect(() => {
    if (reloadSeen.current === reloadRequest) return;
    reloadSeen.current = reloadRequest;
    void reloadChat().catch((e) => handle(e));
    // `reloadChat` и `handle` стабильны по смыслу: перечитывать надо только по номеру просьбы
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadRequest]);

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
        adopt(await patchOrder(id, { objective_ids: kit.objectives.map((o) => o.id), lang: kit.lang, topic: kit.topic }));
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

  /** Заказ уже отправлен (`409 chat_confirmed` на кнопку): чат перечитывается — он в режиме правки. */
  const reloadChat = useCallback(async () => {
    const id = idRef.current;
    if (id !== null) adopt(await getChat(id));
  }, [adopt]);

  /* ---------- Вложения ---------- */

  /* Вложения заводятся в чате до реплики, поэтому первому файлу нужен чат —
     он заводится тем же `ensureChat`, что и первая реплика */
  const upload = async (file: File, localId: string) => {
    const job = (async () => {
      try {
        const chatId = await ensureChat();
        const row = await uploadAttachment(chatId, file);
        updateDrafts((l) =>
          l.map((d): DraftAttachment =>
            d.localId === localId
              ? {
                  ...d,
                  serverId: row.id,
                  kind: row.kind,
                  filename: row.filename,
                  sizeBytes: row.size_bytes,
                  pages: row.pages,
                  status: row.status === "ready" ? "ready" : row.status === "processing" ? "processing" : "failed",
                  error: row.status === "failed" ? failedText(row.error_code, t) : null,
                }
              : d,
          ),
        );
      } catch (e) {
        if (handle(e)) return;
        /* Карточка к этому моменту могла быть снята крестиком — тогда маппинг её не найдёт */
        updateDrafts((l) =>
          l.map(
            (d): DraftAttachment =>
              d.localId === localId ? { ...d, status: "failed", error: attachErrorText(e, t) } : d,
          ),
        );
      }
    })();
    uploads.current.add(job);
    try {
      await job;
    } finally {
      uploads.current.delete(job);
    }
  };

  const addFiles = (files: File[]) => {
    for (const file of files) {
      /* Клиентские проверки — подсказка сразу, а не после круглой поездки на сервер */
      if (draftsRef.current.length >= ATTACH_MAX_FILES) {
        toast(t.laAttachLimit(ATTACH_MAX_FILES), "error");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ATTACH_EXTS.includes(ext)) {
        toast(t.laAttachBadType, "error");
        continue;
      }
      if (file.size === 0) {
        toast(t.laAttachEmpty, "error");
        continue;
      }
      if (file.size > ATTACH_MAX_MB * 1024 * 1024) {
        toast(t.laAttachTooBig(ATTACH_MAX_MB), "error");
        continue;
      }
      const kind = kindFromName(file.name);
      const localId = `d${++localSeq.current}`;
      updateDrafts((l) => [
        ...l,
        {
          localId,
          serverId: null,
          kind,
          filename: file.name,
          sizeBytes: file.size,
          pages: null,
          status: "uploading",
          error: null,
          /* Миниатюра фото — из локального файла, пока реплика не ушла */
          thumbUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
        },
      ]);
      void upload(file, localId);
    }
  };

  /** Снять карточку: из ряда сразу, с сервера — ручкой, если файл уже загружен. */
  const removeDraft = async (localId: string) => {
    const d = draftsRef.current.find((x) => x.localId === localId);
    if (!d) return;
    updateDrafts((l) => l.filter((x) => x.localId !== localId));
    if (d.thumbUrl) URL.revokeObjectURL(d.thumbUrl);
    if (d.serverId !== null && idRef.current !== null) {
      try {
        await deleteAttachment(idRef.current, d.serverId);
      } catch (e) {
        if (!handle(e)) toast(t.laAttachDeleteError, "error");
      }
    }
  };

  /** Ряд очищается, когда реплика с файлами ушла: дальше они живут в ленте. */
  const clearDrafts = () => {
    for (const d of draftsRef.current) {
      if (d.thumbUrl) URL.revokeObjectURL(d.thumbUrl);
    }
    updateDrafts(() => []);
  };

  /* ---------- Перетаскивание файла в чат ---------- */

  const [dragOver, setDragOver] = useState(false);
  /* enter/leave срабатывают на каждом ребёнке: считаем глубину, а не флаг */
  const dragDepth = useRef(0);
  const dragsFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDragEnter = (e: DragEvent) => {
    if (!dragsFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragOver(true);
  };
  const onDragOver = (e: DragEvent) => {
    if (!dragsFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = () => {
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragOver(false);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(Array.from(e.dataTransfer.files));
  };

  /* ---------- Опрос, пока комплект собирается ---------- */

  const kitGenerating = chat?.kit?.status === "generating";
  useEffect(() => {
    if (!kitGenerating || sending) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /* Хвост кладём на чат, каким он стал к моменту ответа: разговор мог
       продвинуться, пока шёл запрос, — лишние строки отсеет `known` */
    const mergeFeed = (feed: LessonChatFeed) => {
      const cur = chatRef.current;
      if (!cur) return;
      const known = new Set(cur.items.map((i) => i.id));
      const fresh = feed.items.filter((i) => !known.has(i.id));
      adopt({
        ...cur,
        status: feed.status,
        mode: feed.mode,
        kit: feed.kit,
        kit_id: feed.kit?.id ?? cur.kit_id,
        items: [...cur.items, ...fresh],
        updated_at: fresh.length > 0 ? fresh[fresh.length - 1].created_at : cur.updated_at,
      });
      for (const m of fresh) {
        if (m.event?.type === "block_changed" || m.event?.type === "objectives_changed") onMaterialRef.current(m.event);
      }
    };

    const tick = async () => {
      const id = idRef.current;
      const cur = chatRef.current;
      /* Скрытая вкладка не спрашивает — вернётся, и следующий тик догонит */
      if (id !== null && cur && document.visibilityState === "visible") {
        try {
          const lastId = cur.items.reduce((m, i) => Math.max(m, i.id), 0);
          const feed = await getChatFeed(id, lastId);
          if (!alive) return;
          mergeFeed(feed);
        } catch (e) {
          /* Сеть мигнула — не страшно, следующий тик спросит снова */
          if (alive && handle(e)) return;
        }
      }
      if (alive) timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [kitGenerating, sending, adopt, handle]);

  /* ---------- Вложения: уже лежащие в чате и ещё не прочитанные ---------- */

  /* Файлы, загруженные раньше (в том числе до перезагрузки страницы) и ещё не
     приложенные к реплике, возвращаются в тот же ряд у поля ввода */
  const seededFor = useRef<number | null>(null);
  const chatIdNum = chat?.id ?? null;
  useEffect(() => {
    if (chatIdNum === null || seededFor.current === chatIdNum) return;
    seededFor.current = chatIdNum;
    let alive = true;
    listAttachments(chatIdNum).then(
      (res) => {
        if (!alive) return;
        const known = new Set(draftsRef.current.map((d) => d.serverId));
        const fresh = res.items.filter((r) => !known.has(r.id)).map((r) => draftFromRow(r, t));
        if (fresh.length > 0) updateDrafts((l) => [...l, ...fresh]);
      },
      () => {
        /* Список не приехал — ряд просто останется пустым, чат работает и без него */
      },
    );
    return () => {
      alive = false;
    };
  }, [chatIdNum, t, updateDrafts]);

  /* Пока есть файлы со статусом `processing`, опрашиваем список: о готовности
     экран узнаёт только так (контракт) */
  const processingKey = drafts
    .filter((d) => d.status === "processing")
    .map((d) => d.serverId)
    .join(",");
  useEffect(() => {
    if (!processingKey) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const id = idRef.current;
      if (id !== null && document.visibilityState === "visible") {
        try {
          const res = await listAttachments(id);
          if (!alive) return;
          const rows = new Map(res.items.map((r) => [r.id, r]));
          updateDrafts((l) => {
            let changed = false;
            /* Файл, снятый на сервере кем-то другим, из ряда уходит */
            const kept = l.filter((d) => d.serverId === null || rows.has(d.serverId));
            if (kept.length !== l.length) changed = true;
            const next = kept.map((d): DraftAttachment => {
              if (d.serverId === null || d.status !== "processing") return d;
              const row = rows.get(d.serverId);
              if (!row || row.status === "processing") return d;
              changed = true;
              return {
                ...d,
                pages: row.pages,
                status: row.status === "ready" ? "ready" : "failed",
                error: row.status === "failed" ? failedText(row.error_code, t) : null,
              };
            });
            return changed ? next : l;
          });
        } catch {
          /* Сеть мигнула — не страшно, следующий тик спросит снова */
        }
      }
      if (alive) timer = setTimeout(tick, ATTACH_POLL_MS);
    };
    timer = setTimeout(tick, ATTACH_POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [processingKey, t, updateDrafts]);

  /* ---------- Реплика ---------- */

  /* `quick` — текст кнопки-подсказки: уходит как реплика, а набранное в поле не трогаем */
  const send = async (quick?: string) => {
    const said = (quick ?? text).trim();
    /* Реплика уходит и без текста, если прикреплены файлы: читать их сервер
       успеет к отправке — идущие загрузки дожидаемся ниже */
    const hasFiles = draftsRef.current.some((d) => d.status !== "failed");
    if ((!said && !hasFiles) || sending) return;
    setSending(true);
    setSayError(null);
    setNotice(null);
    setPending(said);
    if (quick === undefined) setText("");
    setDraft("");
    setLive([]);
    setEditing(false);
    stick.current = true;
    const ctrl = new AbortController();
    turn.current = ctrl;
    try {
      /* Загрузки дожимаем до запроса: их файлы уезжают этой же репликой */
      if (uploads.current.size > 0) await Promise.allSettled([...uploads.current]);
      const attachmentIds = draftsRef.current
        .filter((d) => d.serverId !== null && d.status !== "failed")
        .map((d) => d.serverId as number);
      if (!said && attachmentIds.length === 0) {
        /* Все файлы упали — отправлять нечего; состояние снимет `finally` */
        return;
      }
      const id = await ensureChat();
      const done = await say(
        id,
        said,
        {
          onDelta: (piece) => setDraft((d) => d + piece),
          onTool: (ev) => {
            /* Текст до вызова — «сейчас посмотрю», в ленту он не ляжет */
            setDraft("");
            const found = objectivesOf(ev.tool_name, ev.tool_result);
            if (found.length > 0) setLive((l) => [...l, found]);
            else setEditing(true);
          },
          onMaterial: (ev) => onMaterialRef.current(ev),
        },
        ctrl.signal,
        attachmentIds,
      );
      adopt(done.chat);
      /* Ход записан: вложения получили `message_id` и ушли из ряда в ленту */
      clearDrafts();
    } catch (e) {
      if (ctrl.signal.aborted) {
        /* «Стоп»: что сервер успел записать — решает он, лента берётся с него.
           Блок, переписанный до обрыва, остаётся переписанным (контракт) */
        try {
          await reloadChat();
        } catch (e2) {
          handle(e2);
        }
        return;
      }
      if (handle(e)) return;
      /* Хода не было — реплика возвращается в поле, если учитель не начал новую */
      if (quick === undefined) setText((cur) => cur || said);
      if (isApiError(e, RATE_LIMITED)) setSayError(t.laChatTooMany(minutesFrom(e.retryAfterSec)));
      else if (isApiError(e, "validation_error")) setSayError(fieldMessage(e) ?? t.laChatAiFailed);
      else setSayError(t.laChatAiFailed);
    } finally {
      turn.current = null;
      setSending(false);
      setPending(null);
      setDraft("");
      setLive([]);
      setEditing(false);
    }
  };

  const stop = () => turn.current?.abort();

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
        try {
          await reloadChat();
        } catch (e2) {
          handle(e2);
        }
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

  /* Урок уже собран (`mode: "edit"`): набор целей меняет не заказ, а комплект —
     той же ручкой, что и инструмент чата. Вернул текст — не прошло, показать у шторки */
  const patchKitObjectives = async (): Promise<string | null> => {
    const kitId = idRef.current !== null ? chatRef.current?.kit_id : null;
    if (kitId == null) return null;
    setPatching(true);
    try {
      await setKitObjectives(kitId, picked.map((o) => o.id));
      /* Лента и комплект — с сервера: в ней событие, а в комплекте новый набор;
         справа блоки перечитает панель материалов по смене набора */
      await reloadChat();
      return null;
    } catch (e) {
      if (handle(e)) return null;
      if (isApiError(e) && e.status === 404) return t.laChatObjectiveGone;
      if (isApiError(e, "validation_error")) return fieldMessage(e) ?? t.loadErrorText;
      return isApiError(e) ? e.message : t.loadErrorText;
    } finally {
      setPatching(false);
    }
  };

  const commitObjectives = () => (chat?.mode === "edit" ? patchKitObjectives() : patch({ objective_ids: picked.map((o) => o.id) }));

  const commitOrToast = async () => {
    const err = await commitObjectives();
    if (err) toast(err, "error");
  };

  const commitPicked = async () => {
    const err = await (startLang && chat?.mode !== "edit"
      ? patch({ objective_ids: picked.map((o) => o.id), lang: startLang })
      : commitObjectives());
    if (!err) {
      setSheet(null);
      setStartLang(null);
    }
    return err;
  };

  /* ---------- «Готовить» ---------- */

  const confirm = async (body: LessonChatConfirmIn): Promise<string | null> => {
    const id = idRef.current;
    if (id === null) return null;
    try {
      /* Остаёмся в разговоре: в `res.chat` режим уже правки, комплект справа */
      adopt((await confirmChat(id, body)).chat);
      return null;
    } catch (e) {
      if (handle(e)) return null;
      if (isApiError(e, RATE_LIMITED)) {
        /* Лимит суточный — часы, а не секундный таймер; заказ остаётся как был */
        return e.retryAfterSec < 3600 ? t.laOrderLimitSoon : t.laOrderLimit(hoursFrom(e.retryAfterSec));
      }
      if (isApiError(e, "chat_confirmed")) {
        try {
          await reloadChat();
          return null;
        } catch (e2) {
          if (handle(e2)) return null;
          return e.message;
        }
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

  /* Лента крутится сама, а не страница. К низу — пока учитель сам не поднялся
     читать выше: стрим иначе вырывал бы его из прочитанного */
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  /* Далеко ли ушли от низа: кнопка «вниз» видна только когда учитель поднялся
     читать выше. Порог больше, чем у stick, чтобы кнопка не мигала на границе */
  const [downShown, setDownShown] = useState(false);
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = fromBottom < 80;
    setDownShown(fromBottom > 150);
  };

  /* Плавно к последнему сообщению: отступ снизу — часть прокрутки, докручиваем
     до конца ленты. Дошли до низа — автопрокрутка стрима снова включается сама */
  const scrollToBottom = () => {
    const el = scroller.current;
    if (!el) return;
    stick.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const itemsCount = chat?.items.length ?? 0;
  /* Кнопки цели, языка и темы модель не зовут — лента не растёт, а внизу
     появляется следующий вопрос или форма «Готовить». К ним тоже прокручиваем */
  const missingKey = chat?.order.missing.join() ?? "";
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [phase, itemsCount, pending, draft, live.length, missingKey, sending, editing]);

  if (phase === "loading") {
    return (
      <div className="stack g12" aria-busy="true" style={{ padding: 16 }}>
        <Skeleton h={64} r={16} />
        <Skeleton w="70%" h={48} r={16} />
        <Skeleton w="50%" h={40} r={16} style={{ alignSelf: "flex-end" }} />
        <Skeleton w="80%" h={120} r={16} />
      </div>
    );
  }

  if (phase === "chat_not_found" || phase === "kit_not_found") {
    return (
      <Empty
        icon={<IconMessage size={38} />}
        title={phase === "chat_not_found" ? t.laChatNotFound : t.laKitNotFound}
        text={phase === "chat_not_found" ? t.laChatNotFoundText : t.laKitNotFoundText}
        action={<Button onClick={onNew}>{t.laNewLesson}</Button>}
      />
    );
  }

  if (phase === "error") {
    return (
      <Empty
        title={t.loadError}
        text={t.loadErrorText}
        action={
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </Button>
        }
      />
    );
  }

  /* ---------- Разговор ---------- */

  const order = chat?.order ?? NO_ORDER;
  const confirmed = chat?.status === "confirmed";
  const edit = chat?.mode === "edit";
  /* Карточки заказа и кнопки под ним после «Готовить» только читаются */
  const locked = sending || patching || (confirmed && !edit);
  /* Записанный набор целей: до «Готовить» — заказ, после — комплект */
  const saved = savedObjectives(chat);
  const committedIds = saved.map((o) => o.id);
  const hasObjectives = order.objectives.length > 0;

  /* Класс и язык для «Показать другие»: из заказа, иначе из показанной карточки */
  const openSheet = (from?: LessonChatObjective) => setSheet(sheetFor(chat, from));

  const cards = (items: LessonChatObjective[], key: string | number) => (
    <ObjectiveCards
      key={key}
      items={items}
      picked={picked}
      committedIds={committedIds}
      disabled={locked}
      onToggle={(o) => setPicked((p) => toggled(p, o))}
      onDone={() => void commitOrToast()}
      onOthers={(o) => openSheet(o)}
    />
  );

  const orderCard = (
    <OrderCard
      order={order}
      disabled={locked}
      collapsible
      onPatch={patchOrToast}
      onPickObjective={() => openSheet()}
    />
  );

  const confirmForm =
    chat && order.ready && !confirmed ? (
      <ConfirmForm order={order} preset={preset} disabled={sending || patching} onSubmit={confirm} />
    ) : null;

  const lastUser = chat?.items.findLast((m) => m.role === "user")?.id ?? 0;
  const lastBot = chat?.items.findLast((m) => m.role === "assistant");
  const suggestFor = lastBot && lastBot.id > lastUser ? lastBot.id : null;

  const feed = (
    <div className="stack g12" aria-live="polite">
      {/* Первый заход: без этой строки учитель видит чат и не знает,
          что на выходе будут готовые файлы к уроку */}
      {!edit && !chat && !pending && <span className="small muted pretty">{t.laTagline}</span>}
      <BotBubble>
        {t.laChatHello}
        <span className="caption muted" style={{ display: "block", marginTop: 6 }}>
          {t.laChatExample}
        </span>
      </BotBubble>

      {readingOrder(chat?.items ?? []).map((m) =>
        m.role === "user" ? (
          <Fragment key={m.id}>
            {/* Файлы реплики — плашками над ней; миниатюр в ленте нет,
                сервер их не отдаёт, и хранить локальные уже нечего */}
            {m.attachments.length > 0 && <MessageAttachments items={m.attachments} />}
            {m.content && <UserBubble>{m.content}</UserBubble>}
          </Fragment>
        ) : m.role === "assistant" ? (
          m.content ? (
            <Fragment key={m.id}>
              <BotBubble>
                <Markdown text={m.content} />
              </BotBubble>
              {/* Кнопки — только у последней реплики помощника и пока учитель не ответил */}
              {m.id === suggestFor && m.suggestions && !sending && (
                <SuggestionChips items={m.suggestions} onPick={(text) => void send(text)} />
              )}
            </Fragment>
          ) : null
        ) : m.role === "event" ? (
          <EventPill key={m.id} message={m} />
        ) : (
          /* Вызов инструмента правки карточкой не рисуется: о нём скажет событие */
          cards(objectivesOf(m.tool_name, m.tool_result), m.id)
        ),
      )}

      {pending && <UserBubble>{pending}</UserBubble>}
      {/* Тот же порядок, что в ленте: сначала «подойдут такие цели», потом карточки */}
      {draft && <BotBubble><Markdown text={draft} /></BotBubble>}
      {live.map((found, i) => cards(found, `live-${i}`))}
      {sending && !draft && (
        /* До первого события сервер разбирает реплику; без цели в заказе
           модель первым делом ищет её в программе */
        <Thinking
          text={
            editing
              ? t.laChatEditing
              : hasObjectives || live.length > 0 || edit
                ? t.laChatThinking
                : t.laChatSearching
          }
        />
      )}

      {/* Вопрос языка — под лентой, как в брифе, когда цель уже подтверждена */}
      {chat && !sending && !confirmed && hasObjectives && order.missing.includes("lang") && (
        <BotBubble>
          <LangPicker lang={order.lang} question disabled={locked} onPick={(lang) => void patchOrToast({ lang })} />
        </BotBubble>
      )}

      {/* Вопрос темы — так же под лентой: кнопки цели и языка модель не зовут,
          и без этого вопроса после них чат молчит, а учитель не знает, что дальше */}
      {chat &&
        !sending &&
        !confirmed &&
        hasObjectives &&
        order.lang &&
        order.missing.includes("topic") &&
        !order.missing.includes("lang") && (
          <BotBubble>
            <TopicField
              id="la-topic-q"
              order={order}
              question
              disabled={locked}
              onSave={(topic) => patchOrToast({ topic })}
            />
          </BotBubble>
        )}
    </div>
  );

  const showStart = !edit && !pending && !sending && !hasObjectives && (chat?.items.length ?? 0) === 0;

  const noticeNote = notice && <Note kind="info">{notice}</Note>;

  /* Карточка заказа сверху ленты и свёрнута до строки; галочки и «Готовить» —
     под лентой: помощник пишет «ниже список материалов». Поле ввода живёт
     вне прокрутки, у нижнего края, как в ChatGPT */
  return (
    <>
      <div
        style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, position: "relative" }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Файл тащат в чат: подсветка на всю колонку, пока он над ней */}
        {dragOver && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px dashed var(--primary)",
              borderRadius: 16,
              background: "var(--primary-bg)",
              color: "var(--primary)",
              fontSize: 15,
              fontWeight: 600,
              pointerEvents: "none",
            }}
          >
            {t.laAttachDrop}
          </div>
        )}
        {/* Нижний отступ держит последнее сообщение и чипы на виду у поля ввода;
            он внутри прокрутки, поэтому автопрокрутка докручивает ленту до конца */}
        <div ref={scroller} onScroll={onScroll} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 56px" }}>
          <div className="stack g12" style={{ maxWidth: 760, margin: "0 auto" }}>
            {!edit && orderCard}
            {noticeNote}
            {feed}
            {showStart && (
              <StartPicker
                subjects={startSubjects}
                disabled={patching}
                onGoals={(c) => {
                  setStartLang(c.lang);
                  setSheet({ subject_code: c.subject_code, grade: c.grade, lang: c.lang });
                }}
                onChat={(summary) => void send(summary)}
              />
            )}
            {confirmForm}
          </div>
        </div>
        {/* Кнопка «вниз» — над полем ввода, поверх ленты: якорится к обёртке поля,
            поэтому не перекрывает ни ввод, ни кнопку отправки, каким бы ни был ввод высоким */}
        <div style={{ position: "relative", padding: "8px 16px 12px" }}>
          {downShown && (
            <button
              type="button"
              aria-label={t.laChatScrollDown}
              title={t.laChatScrollDown}
              onClick={scrollToBottom}
              style={{
                position: "absolute",
                left: "50%",
                bottom: "calc(100% + 8px)",
                transform: "translateX(-50%)",
                width: 36,
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                border: "1px solid var(--border-strong)",
                borderRadius: "50%",
                cursor: "pointer",
                background: "var(--card)",
                color: "var(--primary)",
                boxShadow: "var(--shadow)",
                zIndex: 2,
              }}
            >
              <IconArrowDown size={16} />
            </button>
          )}
          <Composer
            value={text}
            sending={sending}
            placeholder={edit ? t.laChatPlaceholderEdit : t.laChatPlaceholder}
            onChange={(v) => {
              setText(v);
              if (sayError) setSayError(null);
            }}
            onSend={() => void send()}
            onStop={stop}
            notice={sayError && <Note kind="warning">{sayError}</Note>}
            attachments={drafts}
            onPickFiles={addFiles}
            onRemoveAttachment={(localId) => void removeDraft(localId)}
          />
        </div>
      </div>

      <ObjectiveSheet
        open={sheet !== null}
        subjectCode={sheet?.subject_code ?? null}
        grade={sheet?.grade ?? null}
        lang={sheet?.lang ?? null}
        picked={picked}
        committedIds={committedIds}
        onClose={() => {
          setSheet(null);
          setStartLang(null);
        }}
        onToggle={(o) => setPicked((p) => toggled(p, o))}
        onDone={commitPicked}
      />
    </>
  );
}

/** Класс и язык для шторки целей: из заказа, иначе из записанных целей или показанной карточки. */
function sheetFor(chat: LessonChat | null, from?: LessonChatObjective): SheetFor {
  const order = chat?.order ?? NO_ORDER;
  const first = savedObjectives(chat)[0];
  return {
    subject_code: order.subject_code ?? from?.subject_code ?? first?.subject_code ?? null,
    grade: order.grade ?? from?.grade ?? first?.grade ?? lastShown(chat)?.grade ?? null,
    lang: order.lang ?? from?.lang ?? first?.lang ?? lastShown(chat)?.lang ?? null,
  };
}

/**
 * Цели урока, записанные на сервере: до «Готовить» — заказ чата, после — комплект
 * (он единственный знает набор, который сменили из чата или кнопкой).
 */
function savedObjectives(chat: LessonChat | null): LessonChatObjective[] {
  if (!chat) return [];
  const kit = chat.kit;
  if (chat.mode === "edit" && kit) {
    return kit.objectives.map((o) => ({
      ...o,
      grade: kit.grade,
      lang: kit.lang,
      subject_code: kit.subject_code,
      section: "",
      subsection: "",
    }));
  }
  return chat.order.objectives;
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

/**
 * Порядок чтения ленты. На сервере поиск идёт раньше ответа, который его
 * представляет («Подойдут такие цели…»), и карточки вставали над текстом.
 * Подряд идущие строки поиска ставим после следующего за ними ответа.
 */
function readingOrder(items: LessonChat["items"]): LessonChat["items"] {
  const out: LessonChat["items"] = [];
  let tools: LessonChat["items"] = [];
  for (const m of items) {
    if (m.role === "tool") {
      tools.push(m);
      continue;
    }
    if (m.role === "assistant") out.push(m, ...tools);
    else out.push(...tools, m);
    tools = [];
  }
  return [...out, ...tools];
}

/** Последняя цель, показанная карточкой, — откуда взять класс, пока заказ пуст. */
function lastShown(chat: LessonChat | null): LessonChatObjective | undefined {
  if (!chat) return undefined;
  for (let i = chat.items.length - 1; i >= 0; i--) {
    const found = objectivesOf(chat.items[i].tool_name, chat.items[i].tool_result);
    if (found.length > 0) return found[0];
  }
  return undefined;
}
