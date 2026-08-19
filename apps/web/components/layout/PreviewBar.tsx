"use client";

/**
 * Полоса режима «Предпросмотр как учитель» — раздел 5.18 брифа.
 *
 * Админ ходит по кабинету учителя, но ничего не записывается — за это отвечает
 * сервер: пока режим включён, записи по курсу no-op. Флаг живёт в серверной
 * сессии, клиентское приложение узнаёт о нём из `GET /me` (`preview`), и
 * `?preview=1` в адресе больше не нужен.
 *
 * Полоса видна всё время, чтобы не перепутать режимы. «Выйти» гасит режим
 * на сервере и возвращает в админку.
 */

import { useEffect, useState } from "react";
import { api, useMe } from "@lms/api";
import { IconClose, IconEye } from "@lms/ui/icons";
import { admin } from "@/lib/urls";

export function PreviewBar() {
  const { me } = useMe();
  const preview = Boolean(me?.preview);
  const [leaving, setLeaving] = useState(false);

  /* Полоса встаёт над шапкой — сдвигаем страницу и липкий appbar */
  useEffect(() => {
    document.body.style.paddingTop = preview ? "38px" : "";
    return () => {
      document.body.style.paddingTop = "";
    };
  }, [preview]);

  if (!preview) return null;

  const exit = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      /* Выход идемпотентен: повторное нажатие тоже 204 */
      await api<undefined>("/admin/preview/exit", { method: "POST" });
    } catch {
      /* Уводим в админку в любом случае — там режим виден и его можно снять */
    }
    window.location.href = admin("/courses");
  };

  return (
    <>
      <div className="preview-bar">
        <span className="row g8" style={{ minWidth: 0 }}>
          <IconEye size={16} />
          <span className="preview-bar-text">Предпросмотр — данные не сохраняются</span>
        </span>
        <button className="preview-bar-exit" disabled={leaving} onClick={exit}>
          <IconClose size={15} />
          Выйти
        </button>
      </div>

      <style>{`
        .preview-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 300;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 12px;
          background: var(--text);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }
        .preview-bar-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .preview-bar-exit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          font: inherit;
          flex-shrink: 0;
        }
        .preview-bar-exit:hover { background: rgba(255, 255, 255, 0.26); }
        /* Липкая шапка встаёт под полосой, а не под ней прячется */
        .appbar { top: 38px; }
      `}</style>
    </>
  );
}
