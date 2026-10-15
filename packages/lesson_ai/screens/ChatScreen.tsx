"use client";

/**
 * Вход в «Жоспар» и продолжение разговора — рабочее место с открытым чатом.
 * Сам разговор — `components/chat/ChatPanel.tsx`, раскладка —
 * `WorkspaceScreen`; экран остался под прежним именем, чтобы страницы обеих
 * площадок не менялись.
 */

import { WorkspaceScreen } from "./WorkspaceScreen";

export function ChatScreen({ chatId, fromKitId }: { chatId?: string; fromKitId?: string }) {
  return <WorkspaceScreen chatId={chatId} fromKitId={fromKitId} />;
}
