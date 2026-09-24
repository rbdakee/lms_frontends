"use client";

/**
 * Просмотр материала на сайте — без скачивания и без Word.
 *
 * Страницу собирает сервер из того же файла, что уходит скачиванием
 * (`GET /lesson_ai/materials/{id}/preview`), поэтому видно ровно то, что
 * распечатается, вместе с последней правкой блока. Экран её не разбирает,
 * а кладёт во фрейм: стили страницы не смешиваются со стилями сайта.
 *
 * Фрейм в песочнице без скриптов — текст в странице писали модель и учитель.
 * `allow-same-origin` нужен только затем, чтобы измерить высоту документа
 * и растянуть фрейм: прокрутка остаётся одна, у шторки, а не фрейм в шторке.
 *
 * Шторка уходит порталом в `body`: зовут её из карточки урока (`transform`
 * при наведении) и из липкой колонки уроков, и внутри них фиксированный
 * слой прилипал к карточке или уходил под поле ввода чата.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NETWORK_ERROR, isApiError, type LessonKit, type LessonMaterial } from "@lms/api";
import { Button, Empty, Sheet, Skeleton } from "@lms/ui";
import { useLang } from "@lms/ui/lang";
import { useLessonAiAccess } from "../access";
import { previewMaterial } from "../api";
import { KIND_ORDER, kindTitle } from "../labels";
import { DownloadButton } from "./DownloadButton";

type Material = Pick<LessonMaterial, "id" | "kind" | "status">;

export function PreviewSheet({
  open,
  onClose,
  kit,
  materials,
  initialId,
}: {
  open: boolean;
  onClose: () => void;
  kit: Pick<LessonKit, "lang" | "topic">;
  /** Что можно листать в шторке: из них показываются только готовые */
  materials: Material[];
  initialId?: number;
}) {
  const { t } = useLang();
  const ready = [...materials]
    .filter((m) => m.status === "ready")
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const [selected, setSelected] = useState<number | undefined>(initialId);
  const current = ready.find((m) => m.id === selected) ?? ready[0];

  /* Каждое открытие — с того материала, с которого позвали */
  useEffect(() => {
    if (open) setSelected(initialId);
  }, [open, initialId]);

  /* Закрытая шторка ничего не рисует — и на сервере, где `document` нет */
  if (!open || !current) return null;

  return createPortal(
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={kindTitle(t, current.kind)}
      footer={
        <div className="row between wrap g8" style={{ alignItems: "center" }}>
          <span className="caption muted-3 pretty" style={{ flex: "1 1 200px" }}>
            {t.laPreviewNote}
          </span>
          <DownloadButton kit={kit} material={current} size="sm" />
        </div>
      }
    >
      {ready.length > 1 && (
        <div className="tabs" role="tablist" aria-label={t.laKitMaterials} style={{ marginBottom: 12 }}>
          {ready.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === current.id}
              data-active={m.id === current.id}
              onClick={() => setSelected(m.id)}
            >
              {kindTitle(t, m.kind)}
            </button>
          ))}
        </div>
      )}
      <PreviewFrame key={current.id} materialId={current.id} />
    </Sheet>,
    document.body,
  );
}

function PreviewFrame({ materialId }: { materialId: number }) {
  const { t } = useLang();
  const { handle } = useLessonAiAccess();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [height, setHeight] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let alive = true;
    setHtml(null);
    setError(null);
    previewMaterial(materialId)
      .then((page) => alive && setHtml(page))
      .catch((e) => {
        if (!alive || handle(e)) return;
        /* Текст сервера — только у понятных отказов, как у «Скачать» */
        if (isApiError(e) && e.code === NETWORK_ERROR) setError(t.loadErrorText);
        else if (isApiError(e) && e.status >= 400 && e.status < 500 && e.code !== "internal_error")
          setError(e.message);
        else setError(t.laPreviewError);
      });
    return () => {
      alive = false;
    };
  }, [materialId, attempt, handle, t]);

  /* Высота фрейма — по документу, и заново при каждом изменении ширины:
     поворот телефона переливает текст, и документ меняет высоту */
  const observer = useRef<ResizeObserver | null>(null);
  const measure = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    const fit = () => setHeight(doc.documentElement.scrollHeight);
    fit();
    observer.current?.disconnect();
    observer.current = new ResizeObserver(fit);
    observer.current.observe(doc.body);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);

  if (error) {
    return (
      <Empty
        title={t.loadError}
        text={error}
        action={
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </Button>
        }
      />
    );
  }

  if (html === null) {
    return (
      <div className="stack g10" style={{ padding: "8px 0" }}>
        <Skeleton w="60%" h={20} />
        <Skeleton w="100%" h={14} />
        <Skeleton w="100%" h={14} />
        <Skeleton w="80%" h={14} />
        <Skeleton w="100%" h={180} r={8} />
      </div>
    );
  }

  return (
    <iframe
      ref={frame}
      title={t.laPreview}
      srcDoc={html}
      sandbox="allow-same-origin"
      onLoad={measure}
      /* Во всю ширину шторки: поля у страницы свои */
      style={{
        display: "block",
        width: "calc(100% + 32px)",
        margin: "0 -16px",
        height: height || 400,
        border: 0,
      }}
    />
  );
}
