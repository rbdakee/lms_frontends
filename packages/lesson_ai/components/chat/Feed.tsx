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
import { IconArrowUp, IconSparkle } from "@lms/ui/icons";
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

export function Composer({
  value,
  sending,
  placeholder,
  onChange,
  onSend,
  onStop,
  notice,
}: {
  value: string;
  /** Ответ идёт: вместо отправки кнопка «Стоп». */
  sending: boolean;
  placeholder: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  notice?: ReactNode;
}) {
  const { t } = useLang();
  const field = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0 && !sending;

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
        className="row g8"
        style={{
          alignItems: "flex-end",
          padding: "6px 6px 6px 16px",
          background: "var(--card)",
          border: `1px solid ${focused ? "var(--primary)" : "var(--border-strong)"}`,
          borderRadius: 26,
          boxShadow: "var(--shadow)",
        }}
      >
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
            aria-label={t.laChatSend}
            title={t.laChatSend}
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
