"use client";

/**
 * Полоса режима «Предпросмотр как учитель».
 *
 * В режиме админ видит экраны курса ровно так, как их видит учитель, поэтому
 * админского меню на них нет — из режима выходят этой кнопкой, и она же
 * возвращает в редактор курса, откуда в предпросмотр и заходили.
 *
 * Обещание «данные не сохраняются» держит сервер: доступ и видимость курса
 * подменяются на время режима, попытка теста живёт в памяти, сдача задания
 * и отзыв не пишутся (BACKEND_NOTES, раздел 12).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@lms/api";
import { IconClose, IconEye } from "@lms/ui/icons";

export function PreviewBar({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const exit = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await api<undefined>("/admin/preview/exit", { method: "POST" });
    } catch {
      /* Режим всё равно гаснет: уход с маршрута выключит его ещё раз */
    }
    router.push(`/courses/${courseId}/edit`);
  };

  return (
    <>
      <div className="preview-bar">
        <span className="row g8" style={{ minWidth: 0 }}>
          <IconEye size={16} />
          <span className="preview-bar-text">
            Предпросмотр как учитель — данные не сохраняются
          </span>
        </span>
        <button className="preview-bar-exit" disabled={leaving} onClick={exit}>
          <IconClose size={15} />
          Выйти из предпросмотра
        </button>
      </div>

      <style>{`
        body { padding-top: 38px; }
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
        /* Липкая шапка урока встаёт под полосой, а не прячется под ней */
        .appbar { top: 38px; }
      `}</style>
    </>
  );
}
