"use client";

import { useStore } from "./store";
import { IconAlert, IconCheckCircle, IconInfo } from "@lms/ui/icons";

export function ToastHost() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.kind === "success" ? (
            <IconCheckCircle size={18} />
          ) : t.kind === "error" ? (
            <IconAlert size={18} />
          ) : (
            <IconInfo size={18} />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
