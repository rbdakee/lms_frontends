"use client";

/**
 * Вкладка «Обучающее видео»: ссылка на ролик «Как учиться на платформе»,
 * который стоит блоком на главной (решение владельца 08.10.2026).
 *
 * Ссылка своя у каждой площадки: ролик снят на её бренде, и чужой логотип
 * в видео сбил бы учителя. Пустое поле — блока на главной нет вовсе.
 *
 * Сохраняется площадка по отдельности, своей кнопкой: в теле `PATCH` уходит
 * только она, и вторая вкладка с соседней площадкой её ссылку не затрёт.
 */

import { useState } from "react";
import { api, isApiError, type AdminSettings, type SettingsPlatform } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { Button } from "@lms/ui";
import { IconExternal } from "@lms/ui/icons";
import { fieldErrors } from "@/lib/fieldErrors";

const errText = (e: unknown, fallback: string) =>
  isApiError(e) && e.status > 0 ? e.message : fallback;

function TutorialRow({
  row,
  onSaved,
}: {
  row: SettingsPlatform;
  onSaved: (s: AdminSettings) => void;
}) {
  const { t } = useLang();
  const toast = useToast();
  const [value, setValue] = useState(row.tutorial_video_url ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const saved = row.tutorial_video_url ?? "";
  const dirty = value.trim() !== saved;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const fresh = await api<AdminSettings>("/admin/settings", {
        method: "PATCH",
        /* Пустая строка, а не null: null сервер читает как «не трогать» */
        json: { platforms: [{ platform: row.platform, tutorial_video_url: value.trim() }] },
      });
      const mine = fresh.platforms.find((p) => p.platform === row.platform);
      /* В поле — ссылка в том написании, в каком её сохранил сервер */
      setValue(mine?.tutorial_video_url ?? "");
      onSaved(fresh);
      toast("Сохранено", "success");
    } catch (e) {
      const fields = fieldErrors(e);
      if (fields.tutorial_video_url) setError(fields.tutorial_video_url);
      else toast(errText(e, "Не удалось сохранить"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad stack g12">
      <strong className="small">{row.platform_name || t.pfUnknown(row.platform)}</strong>
      <div className="field">
        <label className="label">Ссылка на YouTube</label>
        <input
          className={`input${error ? " input-error" : ""}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://youtu.be/… или https://www.youtube.com/watch?v=…"
        />
        {error ? (
          <span className="error-text">{error}</span>
        ) : (
          <span className="hint">
            {saved ? "Ролик стоит на главной этой площадки." : "Ссылки нет — блока на главной нет."}
          </span>
        )}
      </div>
      <div className="row g8 wrap">
        <Button onClick={save} disabled={!dirty || busy}>
          Сохранить
        </Button>
        {saved && (
          <a className="btn btn-secondary" href={saved} target="_blank" rel="noreferrer">
            <IconExternal size={16} /> Открыть на YouTube
          </a>
        )}
      </div>
    </div>
  );
}

export function SettingsTutorial({
  platforms,
  onSaved,
}: {
  platforms: SettingsPlatform[];
  onSaved: (s: AdminSettings) => void;
}) {
  return (
    <div className="stack g16" style={{ maxWidth: 720 }}>
      <div className="stack g8">
        <h2 className="h3">Обучающее видео на главной</h2>
        <span className="caption muted-3 pretty">
          Загрузите ролик на YouTube с доступом «По ссылке» и вставьте ссылку. Учителя
          увидят его блоком «Как учиться на платформе» на главной странице.
        </span>
      </div>
      {platforms.map((p) => (
        <TutorialRow key={p.platform} row={p} onSaved={onSaved} />
      ))}
    </div>
  );
}
