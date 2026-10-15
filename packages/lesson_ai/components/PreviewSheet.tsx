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
import { Button, Empty, Skeleton } from "@lms/ui";
import { IconClose } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useLessonAiAccess } from "../access";
import { previewMaterial } from "../api";
import { KIND_ORDER, kindTitle } from "../labels";
import { useWide } from "./chat/util";
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
  const roomy = useWide();
  const ready = [...materials]
    .filter((m) => m.status === "ready")
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const [selected, setSelected] = useState<number | undefined>(initialId);
  const current = ready.find((m) => m.id === selected) ?? ready[0];

  /* Каждое открытие — с того материала, с которого позвали */
  useEffect(() => {
    if (open) setSelected(initialId);
  }, [open, initialId]);

  /* Escape и запрет прокрутки страницы под шторкой — как у общей шторки */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  /* Закрытая шторка ничего не рисует — и на сервере, где `document` нет */
  if (!open || !current) return null;

  /* Не общая `Sheet`: у той прокручивается вся шторка вместе с липкими шапкой и подвалом.
     Здесь высота задана, шапка (название, скачивание, закрыть) и вкладки стоят на месте,
     а прокручивается одна область — страница материала */
  return createPortal(
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={kindTitle(t, current.kind)}>
      <div
        className="sheet sheet-wide"
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "min(88dvh, 900px)", maxHeight: "none" }}
      >
        <div className="row g8" style={{ alignItems: "center", padding: "12px 12px 8px 16px", flexShrink: 0 }}>
          <div className="h3 grow" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {kindTitle(t, current.kind)}
          </div>
          <DownloadButton kit={kit} material={current} size="sm" compact={!roomy} />
          <button className="btn btn-icon" onClick={onClose} aria-label={t.uiClose} title={t.uiClose}>
            <IconClose />
          </button>
        </div>
        {ready.length > 1 && (
          <div className="tabs" role="tablist" aria-label={t.laKitMaterials} style={{ margin: "0 16px", flexShrink: 0 }}>
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
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "0 16px 16px" }}>
          <p className="caption muted-3 pretty" style={{ margin: "10px 0" }}>
            {t.laPreviewNote}
          </p>
          <PreviewFrame key={current.id} materialId={current.id} />
        </div>
      </div>
    </div>,
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
      /* Своей прокрутки у фрейма нет вовсе: высоту ему даёт документ, а до первого
         замера (400px) и при дробной высоте иначе мелькала бы вторая полоса */
      scrolling="no"
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
