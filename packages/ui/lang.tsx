"use client";

/**
 * Язык интерфейса — RU и KZ.
 *
 * Переводится обвязка, а не содержание курсов: курс одноязычный, русская
 * и казахская версии живут отдельными курсами и связаны `group_id`.
 *
 * Выбор хранится в браузере. У пользователя на сервере поле `lang` тоже есть,
 * но экраны рисуются раньше, чем ответит `GET /me`, — источником остаётся
 * localStorage, пока язык не начнёт приезжать вместе с профилем.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dict, type UiLang } from "./i18n";

const KEY = "lms-lang";

interface LangCtx {
  lang: UiLang;
  setLang: (l: UiLang) => void;
  /** Словарь выбранного языка — `t.save`, `t.pageOf(1, 3)` */
  t: (typeof dict)["ru"];
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setStored] = useState<UiLang>("ru");

  /* Читаем после монтирования: на сервере localStorage нет, а первый рендер
     обязан совпасть с серверной разметкой */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "ru" || saved === "kz") setStored(saved);
    } catch {
      /* приватный режим — остаёмся на русском */
    }
  }, []);

  const setLang = useCallback((next: UiLang) => {
    setStored(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* приватный режим — просто не сохраняем */
    }
  }, []);

  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, t: dict[lang] }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang должен вызываться внутри <LangProvider>");
  return ctx;
}
