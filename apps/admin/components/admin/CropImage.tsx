"use client";

/**
 * Обрезка картинки перед загрузкой (просьба владельца 20.08.2026): рамка
 * повторяет пропорции места, где картинка будет показана, — что в рамке,
 * то и увидят люди. Управление только жестами, без кнопок: перетаскивание —
 * сдвиг, колесо и щипок — масштаб.
 *
 * Никаких зависимостей: pointer events объединяют мышь и палец, результат
 * рисует canvas. SVG и GIF сюда не попадают — растеризация убила бы
 * масштабируемость одного и анимацию другого, их грузят как есть.
 */

import { useEffect, useRef, useState } from "react";
import { Button, Sheet } from "@lms/ui";

/** Типы, которые режем; остальное уходит на сервер без обрезки. */
export const CROPPABLE = ["image/png", "image/jpeg", "image/webp"];

const MAX_ZOOM = 8;

export function CropImageSheet({
  file,
  aspect,
  outWidth,
  title,
  hint,
  onCancel,
  onDone,
}: {
  file: File;
  /** Ширина к высоте места показа: обложка каталога — 16/9 */
  aspect: number;
  /** Ширина итоговой картинки в пикселях; высота выводится из aspect */
  outWidth: number;
  title: string;
  hint: string;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}) {
  const url = useRef<string>("");
  if (!url.current) url.current = URL.createObjectURL(file);
  useEffect(() => () => URL.revokeObjectURL(url.current), []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  /* Трансформация в ref, в DOM — напрямую: setState на каждый pointermove
     перерисовывал бы дерево шторки десятки раз в секунду */
  const t = useRef({ x: 0, y: 0, s: 1, minS: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = () => {
    const img = imgRef.current;
    if (img)
      img.style.transform = `translate(${t.current.x}px, ${t.current.y}px) scale(${t.current.s})`;
  };

  const clamp = () => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img) return;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    const cur = t.current;
    cur.s = Math.min(Math.max(cur.s, cur.minS), cur.minS * MAX_ZOOM);
    const w = img.naturalWidth * cur.s;
    const h = img.naturalHeight * cur.s;
    /* Картинка всегда закрывает рамку целиком — пустых полей в кадре нет */
    cur.x = Math.min(0, Math.max(cur.x, vw - w));
    cur.y = Math.min(0, Math.max(cur.y, vh - h));
  };

  /* Стартовое положение — вписать по «cover» и отцентровать */
  const reset = () => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img || !img.naturalWidth) return;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    const minS = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
    t.current = {
      s: minS,
      minS,
      x: (vw - img.naturalWidth * minS) / 2,
      y: (vh - img.naturalHeight * minS) / 2,
    };
    apply();
    setReady(true);
  };

  /** Масштаб вокруг точки рамки: что под курсором, то под ним и остаётся */
  const zoomAt = (px: number, py: number, factor: number) => {
    const cur = t.current;
    const next = Math.min(Math.max(cur.s * factor, cur.minS), cur.minS * MAX_ZOOM);
    const k = next / cur.s;
    cur.x = px - (px - cur.x) * k;
    cur.y = py - (py - cur.y) * k;
    cur.s = next;
    clamp();
    apply();
  };

  /* Колесо зумит к курсору. Слушатель свой, с passive: false — иначе
     preventDefault не сработает и страница прокрутится вместе с зумом */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = vp.getBoundingClientRect();
      zoomAt(e.clientX - box.left, e.clientY - box.top, Math.exp(-e.deltaY * 0.0015));
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [ready]);

  const onPointerDown = (e: React.PointerEvent) => {
    viewportRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const box = vp.getBoundingClientRect();
    const pts = pointers.current;

    if (pts.size === 1) {
      t.current.x += e.clientX - prev.x;
      t.current.y += e.clientY - prev.y;
      clamp();
      apply();
    } else if (pts.size === 2) {
      /* Щипок: расстояние между пальцами — масштаб, середина — сдвиг */
      const other = [...pts.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const midX = (e.clientX + other.x) / 2 - box.left;
        const midY = (e.clientY + other.y) / 2 - box.top;
        t.current.x += (e.clientX - prev.x) / 2;
        t.current.y += (e.clientY - prev.y) / 2;
        if (before > 0) zoomAt(midX, midY, after / before);
        else {
          clamp();
          apply();
        }
      }
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };

  /** Вырезать содержимое рамки в JPEG и вернуть файлом */
  const crop = async () => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img || busy) return;
    setBusy(true);
    try {
      const { width: vw, height: vh } = vp.getBoundingClientRect();
      const { x, y, s } = t.current;
      const canvas = document.createElement("canvas");
      canvas.width = outWidth;
      canvas.height = Math.round(outWidth / aspect);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, -x / s, -y / s, vw / s, vh / s, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("toBlob");
      const stem = file.name.replace(/\.[^.]+$/, "") || "cover";
      onDone(new File([blob], `${stem}.jpg`, { type: "image/jpeg" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={() => !busy && onCancel()}
      title={title}
      wide
      footer={
        <div className="stack g8">
          <Button block size="lg" loading={busy} disabled={!ready} onClick={() => void crop()}>
            Обрезать и загрузить
          </Button>
          <Button variant="secondary" block disabled={busy} onClick={onCancel}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="stack g10">
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: String(aspect),
            overflow: "hidden",
            borderRadius: 14,
            background: "#0f172a",
            /* без touch-action: none браузер заберёт жесты под прокрутку */
            touchAction: "none",
            cursor: "grab",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- локальный
              blob для обрезки, next/image тут не при чём */}
          <img
            ref={imgRef}
            src={url.current}
            alt=""
            draggable={false}
            onLoad={reset}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transformOrigin: "0 0",
              maxWidth: "none",
              userSelect: "none",
              willChange: "transform",
            }}
          />
        </div>
        <span className="caption muted-3 pretty">{hint}</span>
      </div>
    </Sheet>
  );
}
