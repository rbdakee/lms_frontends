"use client";

/**
 * Полоса режима «Предпросмотр как учитель» — раздел 5.18 брифа.
 *
 * Админ ходит по кабинету учителя, но ничего не записывается: на входе
 * в режим снимается состояние прототипа, на выходе — возвращается.
 * Полоса видна всё время, чтобы не перепутать режимы.
 *
 * После разделения приложений предпросмотр — переход между доменами: админка
 * открывает клиентское приложение с `?preview=1`, режим включается здесь,
 * выход возвращает в админку. Когда появится сервер, флаг переедет в сессию
 * и параметр в адресе исчезнет — `BACKEND_NOTES.md`, раздел 12.
 */

import { useEffect, useRef } from "react";
import { useStore } from "@lms/prototype";
import { IconClose, IconEye } from "@lms/ui/icons";
import { admin } from "@/lib/urls";

export function PreviewBar() {
  const { preview, ready, enterPreview, exitPreview, toast } = useStore();
  /* Флаг из адреса читается один раз за загрузку страницы */
  const handled = useRef(false);

  useEffect(() => {
    /* Ждём состояние из localStorage: иначе загрузка затрёт включённый режим */
    if (!ready || handled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") !== "1") return;

    handled.current = true;
    if (!preview) enterPreview();

    /* Параметр убираем, чтобы обновление страницы не включало режим заново */
    params.delete("preview");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [ready, preview, enterPreview]);

  /* Полоса встаёт над шапкой — сдвигаем страницу и липкий appbar */
  useEffect(() => {
    document.body.style.paddingTop = preview ? "38px" : "";
    return () => {
      document.body.style.paddingTop = "";
    };
  }, [preview]);

  if (!preview) return null;

  return (
    <>
      <div className="preview-bar">
        <span className="row g8" style={{ minWidth: 0 }}>
          <IconEye size={16} />
          <span className="preview-bar-text">Предпросмотр — данные не сохраняются</span>
        </span>
        <button
          className="preview-bar-exit"
          onClick={() => {
            exitPreview();
            toast("Вышли из предпросмотра — состояние вернулось как было");
            window.location.href = admin("/courses");
          }}
        >
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
