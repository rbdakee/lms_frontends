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
import { isApiError, type LessonKit, type LessonMaterial } from "@lms/api";
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
}: {
  kit: LessonKit;
  material: LessonMaterial;
  size?: "sm" | "md";
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
      toast(isApiError(e) && e.code !== "internal_error" ? e.message : t.laDownloadError, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size={size}
      loading={busy}
      disabled={material.status !== "ready"}
      icon={<IconDownload size={17} />}
      onClick={download}
    >
      {t.laDownload}
    </Button>
  );
}
