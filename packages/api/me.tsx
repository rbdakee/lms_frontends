"use client";

/**
 * Авторизованность больше не хранится на клиенте: при загрузке приложение
 * спрашивает `GET /me`. 401 — гость, 403 `blocked` — заблокированный учитель,
 * сервер не ответил — отдельное состояние, чтобы не путать гостя и обрыв сети.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, isApiError } from "./client";
import type { User } from "./types";

export type MeStatus = "loading" | "guest" | "authed" | "blocked" | "error";

interface MeCtx {
  me: User | null;
  status: MeStatus;
  /** Текст сервера для экрана «Доступ заблокирован». */
  blocked_message: string | null;
  /** Подставить пользователя из ответа входа или PATCH /me — без лишнего запроса. */
  setMe: (u: User | null) => void;
  /** Перечитать /me с сервера. */
  refresh: () => Promise<void>;
  /** POST /auth/logout и переход в гостя. Выход всегда успешен. */
  logout: () => Promise<void>;
}

const Ctx = createContext<MeCtx | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<User | null>(null);
  const [status, setStatus] = useState<MeStatus>("loading");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const u = await api<User>("/me");
      setMeState(u);
      setStatus("authed");
    } catch (e) {
      setMeState(null);
      if (isApiError(e, "unauthorized")) setStatus("guest");
      else if (isApiError(e, "blocked")) {
        setBlockedMessage(e.message);
        setStatus("blocked");
      } else setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setMe = useCallback((u: User | null) => {
    setMeState(u);
    setStatus(u ? "authed" : "guest");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<undefined>("/auth/logout", { method: "POST" });
    } catch {
      /* даже при мёртвой сессии выходим локально */
    }
    setMeState(null);
    setStatus("guest");
  }, []);

  return (
    <Ctx.Provider value={{ me, status, blocked_message: blockedMessage, setMe, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMe(): MeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMe должен вызываться внутри <MeProvider>");
  return ctx;
}

/** «Нурланова Айгуль Сериковна». */
export function fullName(u: User): string {
  return [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(" ");
}

/** Инициалы для аватара без фото. */
export function userInitials(u: User): string {
  return ((u.first_name[0] ?? "") + (u.last_name[0] ?? "")).toUpperCase() || "??";
}
