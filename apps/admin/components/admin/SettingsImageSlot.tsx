"use client";

/**
 * Слот картинки настроек: логотип платформы и три картинки сертификата.
 *
 * Порядок один на все четыре: файл сначала уезжает в приватное хранилище
 * (`POST /files`), и только потом ключ привязывается к настройкам
 * (`PATCH /admin/settings`) — сам по себе загруженный файл ни к чему
 * не относится.
 *
 * Каждая картинка сохраняется сразу и отдельным запросом, только своим полем:
 * кнопка «Сохранить» стоит на вкладке «Бренд и контакты» и шлёт другое.
 *
 * Показываем картинку по `url` из ответа — это публичная раздача
 * `GET /branding/{slot}`. Ключ хранилища наружу не отдаётся вовсе, и рисовать
 * по нему нечего.
 */

import { useRef, useState } from "react";
import {
  api,
  isApiError,
  type AdminSettings,
  type AdminSettingsPatch,
  type CertificateImagesIn,
  type SettingsImage,
  type SettingsImageIn,
  type UploadedFile,
} from "@lms/api";
import { useStore } from "@lms/prototype";
import { fieldErrors } from "@/lib/fieldErrors";
import { Button } from "@lms/ui";
import { IconClose, IconImage, IconUpload } from "@lms/ui/icons";

/** Имя поля в теле `PATCH` — оно же приходит в `details.fields[].field` из 422. */
export type ImageField =
  | "logo"
  | "certificate_images.logo"
  | "certificate_images.sign"
  | "certificate_images.stamp";

const CERT_PREFIX = "certificate_images.";

/**
 * Что вообще предлагать в выборе файла.
 *
 * Логотипу площадки svg годится — он уходит в браузер. Трём картинкам
 * сертификата не годится: сервер пропускает любой `image/*`, а сборщик PDF
 * svg не берёт и гасит ошибку — документ печатается без печати, и узнать
 * об этом неоткуда. Это подсказка браузеру, а не запрет: настоящая проверка
 * всё равно на сервере.
 */
const ACCEPT: Record<ImageField, string> = {
  logo: "image/svg+xml,image/png,image/jpeg",
  "certificate_images.logo": "image/png,image/jpeg",
  "certificate_images.sign": "image/png,image/jpeg",
  "certificate_images.stamp": "image/png,image/jpeg",
};

function patchFor(field: ImageField, value: SettingsImageIn | null): AdminSettingsPatch {
  if (field === "logo") return { logo: value };
  const images: CertificateImagesIn = {};
  images[field.slice(CERT_PREFIX.length) as keyof CertificateImagesIn] = value;
  return { certificate_images: images };
}

const BOX: React.CSSProperties = {
  aspectRatio: "3/2",
  borderRadius: 12,
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-3)",
  overflow: "hidden",
};

export function SettingsImageSlot({
  field,
  label,
  hint,
  image,
  onSaved,
}: {
  field: ImageField;
  label: string;
  hint: string;
  image: SettingsImage | null;
  onSaved: (settings: AdminSettings) => void;
}) {
  const { toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pickRef = useRef<HTMLInputElement>(null);

  const patch = async (value: SettingsImageIn | null) => {
    onSaved(
      await api<AdminSettings>("/admin/settings", {
        method: "PATCH",
        json: patchFor(field, value),
      }),
    );
  };

  /* 422 приходит с именем поля — подписываем именно этот слот, а не сваливаем
     в общий тост поверх четырёх одинаковых загрузчиков */
  const fail = (e: unknown, fallback: string) => {
    const mine = fieldErrors(e)[field];
    if (mine) setError(mine);
    else toast(isApiError(e) && e.status > 0 ? e.message : fallback, "error");
  };

  const upload = async (picked: FileList | null) => {
    const file = picked?.[0];
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      /* Content-Type ставит браузер сам — вместе с boundary,
         без него сервер тело не разберёт */
      const up = await api<UploadedFile>("/files", { method: "POST", body });
      await patch({ key: up.key, name: up.name });
      toast("Картинка сохранена", "success");
    } catch (e) {
      fail(e, "Не удалось загрузить картинку");
    } finally {
      setBusy(false);
      if (pickRef.current) pickRef.current.value = "";
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      /* Единственное место этого `PATCH`, где `null` что-то стирает: у названий
         и контактов он значит «не прислали», а у картинки — «убрать» */
      await patch(null);
      toast("Картинка убрана", "success");
    } catch (e) {
      fail(e, "Не удалось убрать картинку");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div style={BOX}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <IconImage size={30} />
        )}
      </div>

      <input
        ref={pickRef}
        type="file"
        accept={ACCEPT[field]}
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <div className="row g8" style={{ marginTop: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          block
          icon={<IconUpload size={15} />}
          loading={busy}
          onClick={() => pickRef.current?.click()}
        >
          {image ? "Заменить" : "Загрузить"}
        </Button>
        {image && (
          <button
            className="btn btn-icon"
            style={{ minHeight: 34, width: 34, flexShrink: 0 }}
            aria-label={`Убрать: ${label}`}
            disabled={busy}
            onClick={remove}
          >
            <IconClose size={16} />
          </button>
        )}
      </div>

      {error ? <span className="error-text">{error}</span> : <span className="hint">{hint}</span>}
    </div>
  );
}
