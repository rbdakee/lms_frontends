"use client";

/**
 * Переход из «Моих уроков» и со страницы комплекта в рабочее место с чатом этого
 * урока. Чат есть (`chat_id`) — идём сразу; нет (комплект заказан напрямую) —
 * сервер заводит его по комплекту, и идём в него.
 */

import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@lms/ui";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../access";
import { openKitChat } from "../api";
import { useRoutes } from "../host";

export function useOpenKitChat(kitId: number, chatId: number | null) {
  const { t } = useLang();
  const routes = useRoutes();
  const router = useRouter();
  const toast = useToast();
  const { handle } = useLessonAiAccess();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (busy) return;
    if (chatId !== null) return router.push(routes.chat(chatId));
    setBusy(true);
    try {
      router.push(routes.chat((await openKitChat(kitId)).id));
    } catch (e) {
      if (!handle(e)) toast(t.laSbError, "error");
      setBusy(false);
    }
  };
  return { open, busy };
}

/** Кнопка «Открыть в чате». */
export function OpenInChatButton({ kitId, chatId }: { kitId: number; chatId: number | null }) {
  const { t } = useLang();
  const { open, busy } = useOpenKitChat(kitId, chatId);
  return (
    <Button loading={busy} onClick={() => void open()}>
      {t.laLessonsOpenChat}
    </Button>
  );
}

/** Область карточки, которая ведёт в чат: кнопка, а не ссылка, — адреса чата до клика может не быть. */
export function OpenChatArea({
  kitId,
  chatId,
  className,
  children,
}: {
  kitId: number;
  chatId: number | null;
  className?: string;
  children: ReactNode;
}) {
  const { open } = useOpenKitChat(kitId, chatId);
  const style: CSSProperties = {
    display: "flex",
    width: "100%",
    border: 0,
    background: "transparent",
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
  };
  return (
    <button type="button" className={className} style={{ ...style, flexDirection: "column" }} onClick={() => void open()}>
      {children}
    </button>
  );
}
