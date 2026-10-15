"use client";

/**
 * Лента и поле ввода в стиле ChatGPT. Своих стилей у пакета нет, классы
 * пузырей чата живут в `admin.css` и в учебку не едут — поэтому всё собрано
 * на токенах темы: вторая площадка перекрашивает это вместе со всем остальным.
 *
 * Поле ввода перенесено с компонента «Prompt Input» (21st.dev, tinkerers-labs):
 * та же механика — рост по содержимому до потолка строк, Enter отправляет,
 * Shift+Enter переносит, во время ответа кнопка отправки меняется на «Стоп».
 * Tailwind и shadcn из него не берём — разметка переписана на токены проекта.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LessonAttachment, LessonAttachmentKind } from "@lms/api";
import { fileSize } from "@lms/ui/i18n";
import { IconArrowUp, IconClose, IconFile, IconImage, IconPaperclip, IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";

const bubble: CSSProperties = {
  fontSize: 15,
  lineHeight: "22px",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...bubble,
        alignSelf: "flex-end",
        maxWidth: "min(85%, 620px)",
        padding: "10px 16px",
        background: "var(--primary)",
        color: "var(--text-on-fill)",
        borderRadius: "20px 20px 6px 20px",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Ответ помощника — без рамки, на фоне страницы, со значком слева: как в ChatGPT,
 * где ответ читается текстом, а не репликой в облачке. Рамка осталась бы
 * у карточек (цели, заказ) — они не реплики, а элементы управления.
 */
export function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="row g10" style={{ alignItems: "flex-start", alignSelf: "flex-start", maxWidth: "100%" }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          background: "var(--primary-bg)",
          color: "var(--primary)",
        }}
      >
        <IconSparkle size={15} />
      </span>
      <div style={{ ...bubble, paddingTop: 3, minWidth: 0, maxWidth: 640 }}>{children}</div>
    </div>
  );
}

/**
 * Быстрые ответы под последним сообщением помощника: клик отправляет `text` как
 * реплику учителя. Список приходит с сервера (`suggestions`), экран его не придумывает;
 * исчезают они, как только учитель ответил — отрисовкой их занимается лента.
 */
export function SuggestionChips({
  items,
  disabled,
  onPick,
}: {
  items: { label: string; text: string }[];
  disabled?: boolean;
  onPick: (text: string) => void;
}) {
  const { t } = useLang();
  return (
    <div className="row wrap g8" role="group" aria-label={t.laChatSuggestions} style={{ paddingLeft: 38 }}>
      {items.map((s) => (
        <button
          key={s.label}
          type="button"
          className="chip"
          disabled={disabled}
          onClick={() => onPick(s.text)}
          style={{ minHeight: 40, fontSize: 14, fontWeight: 600, color: "var(--primary)", borderColor: "var(--primary)" }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Жирное `**...**` внутри строки; остальное — обычный текст (React экранирует сам). */
function inline(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

/**
 * Минимальный маркдаун ответа помощника: абзацы, переносы, списки «- »/«1. », жирный.
 * Разбор в элементы React, а не в HTML-строку: сырой текст модели в разметку не попадает.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length === 0) return;
    const lines = para;
    para = [];
    blocks.push(
      <p key={blocks.length} style={{ margin: 0 }}>
        {lines.map((l, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {inline(l)}
          </span>
        ))}
      </p>,
    );
  };
  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    list = null;
    const Tag = ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} style={{ margin: 0, paddingLeft: 22 }}>
        {items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
  };
  for (const line of text.split("\n")) {
    const item = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/.exec(line);
    if (item) {
      flushPara();
      const ordered = item[2] !== undefined;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(item[3]);
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, whiteSpace: "normal" }}>{blocks}</div>
  );
}

/** Помощник работает: три точки и подпись, что именно он делает. */
export function Thinking({ text }: { text: string }) {
  return (
    <div className="row g8 small muted" role="status" style={{ alignSelf: "flex-start", alignItems: "center", paddingLeft: 38 }}>
      <span className="typing-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {text}
    </div>
  );
}

/* Сервер отбивает реплику длиннее 2000 знаков — не даём её набрать */
const TEXT_MAX = 2000;
const LINE_PX = 22;
/* Выше восьми строк поле не растёт, а прокручивается само */
const MAX_ROWS = 8;

/* Файлы, которые принимает «Жоспар»: то же, что в accept у поля выбора */
const ATTACH_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.docx,.pptx";

/** Вид вложения по имени файла — до ответа сервера, который знает точнее. */
export function kindFromName(name: string): LessonAttachmentKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  return "image";
}

/** Подпись вида на карточке: латиница и «Фото» одинаковы в обоих языках. */
function kindLabel(kind: LessonAttachmentKind, t: ReturnType<typeof useLang>["t"]): string {
  if (kind === "pdf") return t.laAttachKindPdf;
  if (kind === "docx") return t.laAttachKindDocx;
  if (kind === "pptx") return t.laAttachKindPptx;
  return t.laAttachKindImage;
}

/**
 * Вложение у поля ввода, пока реплика с ним не ушла. `serverId` появляется
 * после загрузки, но файл остаётся в ряду до отправки: реплика уходит
 * с `attachment_ids`, и только тогда карточки исчезают.
 */
export interface DraftAttachment {
  /** Ключ ряда, пока серверного номера нет. */
  localId: string;
  serverId: number | null;
  kind: LessonAttachmentKind;
  filename: string;
  sizeBytes: number;
  pages: number | null;
  status: "uploading" | "processing" | "ready" | "failed";
  /** Текст ошибки — с сервера или своя подсказка. */
  error: string | null;
  /** Миниатюра фото: локальный objectURL, на сервере его нет. */
  thumbUrl?: string;
}

/** Миниатюра фото или значок документа с подписью вида — общий глаз карточки. */
function AttachmentTile({ kind, thumbUrl, big }: { kind: LessonAttachmentKind; thumbUrl?: string; big?: boolean }) {
  const { t } = useLang();
  const size = big ? 44 : 36;
  if (kind === "image") {
    return thumbUrl ? (
      <img
        src={thumbUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
      />
    ) : (
      <Tile size={size}>
        <IconImage size={big ? 20 : 16} />
      </Tile>
    );
  }
  return (
    <Tile size={size}>
      <IconFile size={big ? 18 : 15} />
      <span style={{ fontSize: 8, fontWeight: 700, lineHeight: "10px", letterSpacing: "0.02em", marginTop: 1 }}>
        {kindLabel(kind, t)}
      </span>
    </Tile>
  );
}

function Tile({ size, children }: { size: number; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        flexShrink: 0,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--primary-bg)",
        color: "var(--primary)",
      }}
    >
      {children}
    </span>
  );
}

/** Карточка прикреплённого над полем ввода: вид, имя, размер и состояние. */
function DraftCard({ a, onRemove }: { a: DraftAttachment; onRemove: () => void }) {
  const { t } = useLang();
  const status =
    a.status === "uploading"
      ? t.laAttachUploading
      : a.status === "processing"
        ? t.laAttachReading
        : null;
  return (
    <div
      className="row g8"
      style={{
        alignItems: "center",
        padding: "6px 8px",
        border: `1px solid ${a.status === "failed" ? "var(--danger-line)" : "var(--border-strong)"}`,
        borderRadius: 12,
        background: "var(--card)",
      }}
    >
      <AttachmentTile kind={a.kind} thumbUrl={a.thumbUrl} />
      <span className="stack" style={{ gap: 2, minWidth: 0, maxWidth: 150 }}>
        <span style={{ fontSize: 13, lineHeight: "16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.filename}
        </span>
        {a.status === "failed" ? (
          <span className="caption" style={{ color: "var(--danger)", lineHeight: "14px" }}>
            {a.error}
          </span>
        ) : (
          <span className="caption muted" style={{ lineHeight: "14px" }}>
            {fileSize(a.sizeBytes)}
            {status && ` · ${status}`}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t.laAttachRemove}
        title={t.laAttachRemove}
        style={{
          width: 24,
          height: 24,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: 0,
          borderRadius: "50%",
          background: "transparent",
          color: "var(--text-3)",
          cursor: "pointer",
        }}
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}

/** Ряд карточек над полем ввода. */
export function AttachmentDrafts({
  items,
  onRemove,
}: {
  items: DraftAttachment[];
  onRemove: (localId: string) => void;
}) {
  return (
    <div className="row wrap g8" style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
      {items.map((a) => (
        <DraftCard key={a.localId} a={a} onRemove={() => onRemove(a.localId)} />
      ))}
    </div>
  );
}

/** Вложения у реплики учителя в ленте: компактная плашка вида и имени. */
export function MessageAttachments({ items }: { items: LessonAttachment[] }) {
  const { t } = useLang();
  return (
    <div className="row wrap g8" style={{ alignSelf: "flex-end", maxWidth: "min(85%, 620px)" }}>
      {items.map((a) => (
        <span
          key={a.id}
          className="row g8"
          title={a.filename}
          style={{
            alignItems: "center",
            padding: "6px 10px",
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            background: "var(--card)",
            fontSize: 13,
          }}
        >
          <AttachmentTile kind={a.kind} />
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.filename}
          </span>
        </span>
      ))}
    </div>
  );
}

export function Composer({
  value,
  sending,
  placeholder,
  onChange,
  onSend,
  onStop,
  notice,
  attachments = [],
  onPickFiles,
  onRemoveAttachment,
}: {
  value: string;
  /** Ответ идёт: вместо отправки кнопка «Стоп». */
  sending: boolean;
  placeholder: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  notice?: ReactNode;
  /** Прикреплённое над полем ввода: карточки рисует `AttachmentDrafts`. */
  attachments?: DraftAttachment[];
  onPickFiles?: (files: File[]) => void;
  onRemoveAttachment?: (localId: string) => void;
}) {
  const { t } = useLang();
  const field = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  /* Реплика уходит и без текста, если есть что приложить: файлы, ещё
     читающиеся на сервере, уходят вместе с ней (контракт) */
  const hasFiles = attachments.some((a) => a.status !== "failed");
  const canSend = !sending && (value.trim().length > 0 || hasFiles);

  /* Растём вместе с текстом: сначала сбрасываем высоту, иначе поле не сжалось бы
     после стирания */
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    const max = LINE_PX * MAX_ROWS + 20;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value]);

  return (
    <div className="stack g8" style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
      {notice}
      {/* Прикреплённое живёт над полем ввода и уходит вместе с репликой */}
      {attachments.length > 0 && onRemoveAttachment && (
        <AttachmentDrafts items={attachments} onRemove={onRemoveAttachment} />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
        className="row g8"
        style={{
          alignItems: "flex-end",
          padding: "6px 6px 6px 10px",
          background: "var(--card)",
          border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
          borderRadius: 26,
          boxShadow: "var(--shadow)",
        }}
      >
        {onPickFiles && (
          <>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-label={t.laAttachAdd}
              title={t.laAttachAdd}
              style={{
                width: 36,
                height: 40,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: 0,
                borderRadius: "50%",
                background: "transparent",
                color: "var(--text-3)",
                cursor: "pointer",
              }}
            >
              <IconPaperclip size={19} />
            </button>
            {/* Выбор файлов: загрузка начинается сразу, ряд карточек рисует Composer */}
            <input
              ref={fileInput}
              type="file"
              accept={ATTACH_ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                onPickFiles(Array.from(e.target.files ?? []));
                /* Один и тот же файл выбирают дважды — событие должно сработать снова */
                e.target.value = "";
              }}
            />
          </>
        )}
        <textarea
          ref={field}
          rows={1}
          value={value}
          maxLength={TEXT_MAX}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            /* Enter — отправить, Shift+Enter — новая строка. Пока набирается
               кандидат ввода (IME), Enter принадлежит ему, а не форме */
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (canSend) onSend();
          }}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 0,
            resize: "none",
            background: "transparent",
            color: "var(--text)",
            font: "inherit",
            fontSize: 15,
            lineHeight: `${LINE_PX}px`,
            padding: "9px 0",
          }}
        />
        {sending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={t.laChatStop}
            title={t.laChatStop}
            style={roundButton(true)}
          >
            <span style={{ width: 12, height: 12, borderRadius: 2, background: "currentColor" }} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            /* Без текста и файлов отправлять нечего — подсказка объясняет, что нужно */
            aria-label={canSend || sending ? t.laChatSend : t.laAttachSendHint}
            title={canSend || sending ? t.laChatSend : t.laAttachSendHint}
            style={roundButton(canSend)}
          >
            <IconArrowUp size={19} />
          </button>
        )}
      </form>
    </div>
  );
}

function roundButton(active: boolean): CSSProperties {
  return {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: 0,
    borderRadius: "50%",
    cursor: active ? "pointer" : "default",
    background: active ? "var(--primary)" : "var(--track)",
    color: active ? "var(--text-on-fill)" : "var(--text-3)",
    transition: "background 0.14s",
  };
}
