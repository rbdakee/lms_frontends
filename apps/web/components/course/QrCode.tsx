"use client";

/**
 * Настоящий сканируемый QR-код, а не иконка-заглушка.
 * Рисуется одним SVG-путём: печатается на любом размере без растра.
 */

import { useMemo } from "react";
import { qrMatrix, qrPath } from "@/lib/qr";

/** Белое поле вокруг кода в модулях — без него сканеры не находят границу */
const QUIET = 3;

export function QrCode({
  value,
  className,
  style,
  title,
}: {
  value: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const { path, span } = useMemo(() => {
    const matrix = qrMatrix(value);
    return { path: qrPath(matrix), span: matrix.length + QUIET * 2 };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? `QR-код: ${value}`}
    >
      <rect width={span} height={span} fill="#fff" />
      <g transform={`translate(${QUIET} ${QUIET})`}>
        <path d={path} fill="#0f172a" />
      </g>
    </svg>
  );
}
