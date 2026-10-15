"use client";

/**
 * «Скачать» у одного материала. Скачивание у каждого своё (бриф, раздел 5):
 * архива комплекта целиком в первой волне нет.
 *
 * Файл собирается сервером при каждом скачивании из текущего содержимого,
 * поэтому правка блока видна в следующем же файле. Имя — на языке документа
 * (`materialFileName`), а не интерфейса.
 */

import { useState } from "react";
import { NETWORK_ERROR, isApiError, type LessonKit, type LessonMaterial } from "@lms/api";
import { Button } from "@lms/ui";
import { IconDownload } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../access";
import { downloadMaterial } from "../api";
import { materialFileName } from "../labels";

export function DownloadButton({
  kit,
  material,
  size = "md",
  compact = false,
}: {
  /* Только нужные поля: кнопка стоит и в шторке просмотра «Моих уроков»,
     где у комплекта урезанная форма списка */
  kit: Pick<LessonKit, "lang" | "topic">;
  material: Pick<LessonMaterial, "id" | "kind" | "status">;
  size?: "sm" | "md";
  /** Только значок: телефону не до подписей, название и формат остаются в `title` */
  compact?: boolean;
}) {
  const { t } = useLang();
  const toast = useToast();
  const { handle } = useLessonAiAccess();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await downloadMaterial(material.id, materialFileName(material.kind, kit.lang, kit.topic));
    } catch (e) {
      if (handle(e)) return;
      /* Текст сервера — только у понятных отказов (`409` «материал ещё не готов»).
         Сбой сборки файла, `500` и обрыв сети — одной человеческой строкой */
      if (isApiError(e) && e.code === NETWORK_ERROR) toast(t.loadErrorText, "error");
      else if (isApiError(e) && e.status >= 400 && e.status < 500 && e.code !== "internal_error")
        toast(e.message, "error");
      else toast(t.laDownloadError, "error");
    } finally {
      setBusy(false);
    }
  };

  const label = `${t.laDownload} .${material.kind === "presentation" ? "pptx" : "docx"}`;
  return (
    <Button
      variant="secondary"
      size={size}
      aria-label={label}
      title={label}
      loading={busy}
      disabled={material.status !== "ready"}
      icon={<IconDownload size={17} />}
      onClick={download}
    >
      {/* Формат на кнопке: презентация уходит .pptx, остальное .docx — учитель
          заранее знает, чем открывать */}
      {!compact && label}
    </Button>
  );
}
