"use client";

/**
 * Тосты — короткие сообщения о том, что действие прошло или не прошло.
 *
 * Провайдер сам рисует их поверх экрана: отдельного `<ToastHost/>` в разметке
 * приложения нет, и забыть его нельзя. Тост живёт 3.2 секунды и ничего не ждёт
 * от человека — то, что требует ответа, показывают шторкой, а не тостом.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { IconAlert, IconCheckCircle, IconInfo } from "./icons";

export type ToastKind = "info" | "success" | "error";

interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

const LIFETIME_MS = 3200;

const Ctx = createContext<((text: string, kind?: ToastKind) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text, kind }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), LIFETIME_MS);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-host" aria-live="polite">
          {toasts.map((x) => (
            <div key={x.id} className={`toast toast-${x.kind}`}>
              {x.kind === "success" ? (
                <IconCheckCircle size={18} />
              ) : x.kind === "error" ? (
                <IconAlert size={18} />
              ) : (
                <IconInfo size={18} />
              )}
              <span>{x.text}</span>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): (text: string, kind?: ToastKind) => void {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast должен вызываться внутри <ToastProvider>");
  return ctx;
}
