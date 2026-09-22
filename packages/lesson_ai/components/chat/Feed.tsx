"use client";

/**
 * Лента и поле ввода. Своих стилей у пакета нет, классы пузырей чата живут
 * в `admin.css` и в учебку не едут — поэтому пузыри собраны на токенах темы:
 * вторая площадка перекрашивает их вместе со всем остальным.
 */

import type { CSSProperties, ReactNode } from "react";
import { Button } from "@lms/ui";
import { IconArrowUp } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";

const bubble: CSSProperties = {
  maxWidth: "min(85%, 620px)",
  padding: "10px 14px",
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
        background: "var(--primary)",
        color: "var(--text-on-fill)",
        borderRadius: "16px 16px 4px 16px",
      }}
    >
      {children}
    </div>
  );
}

export function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...bubble,
        alignSelf: "flex-start",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "16px 16px 16px 4px",
      }}
    >
      {children}
    </div>
  );
}

export function Thinking({ text }: { text: string }) {
  return (
    <div className="row g8 small muted" role="status" style={{ alignSelf: "flex-start", padding: "4px 2px" }}>
      <span className="spinner" style={{ width: 15, height: 15 }} />
      {text}
    </div>
  );
}

/* Сервер отбивает реплику длиннее 2000 знаков — не даём её набрать */
const TEXT_MAX = 2000;

export function Composer({
  value,
  sending,
  bottom,
  onChange,
  onSend,
  notice,
}: {
  value: string;
  sending: boolean;
  /** Отступ снизу: на телефоне под полем — таб-панель площадки */
  bottom: string;
  onChange: (v: string) => void;
  onSend: () => void;
  notice?: ReactNode;
}) {
  const { t } = useLang();
  return (
    <div
      className="stack g8"
      style={{
        position: "sticky",
        bottom,
        zIndex: 5,
        paddingBlock: "10px 12px",
        background: "var(--bg)",
      }}
    >
      {notice}
      <form
        className="row g8"
        style={{ alignItems: "flex-end" }}
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <textarea
          className="input grow"
          rows={1}
          value={value}
          maxLength={TEXT_MAX}
          placeholder={t.laChatPlaceholder}
          aria-label={t.laChatPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            /* Enter — отправить, Shift+Enter — новая строка, как в мессенджерах */
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          style={{ minHeight: 48, maxHeight: 160, resize: "none", paddingBlock: 12 }}
        />
        <Button
          type="submit"
          loading={sending}
          disabled={!value.trim()}
          aria-label={t.laChatSend}
          title={t.laChatSend}
          icon={<IconArrowUp size={20} />}
          style={{ minHeight: 48, width: 48, padding: 0, flexShrink: 0 }}
        />
      </form>
    </div>
  );
}
