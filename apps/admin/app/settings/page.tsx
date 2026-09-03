"use client";

/**
 * Настройки платформы «/settings» — раздел 5.25 брифа.
 *
 * Три вкладки приходят одним `GET /admin/settings`, но общей кнопки
 * «Сохранить» у них нет и быть не может: категории и привязка бота живут
 * своими ручками, а картинки сертификата отсюда вообще не меняются.
 *
 * Бренда в настройках больше нет (PLATFORMS_BRIEF, решение 4): название,
 * организация, контакты, логотип и три картинки сертификата стали константами
 * и файлами в коде бэкенда, свой набор на площадку. Вкладка «Бренд и контакты»
 * снесена вместе с загрузкой файлов, а `PATCH /admin/settings` принимает
 * теперь только `telegram` — любое поле бренда в теле роняет запрос в 422.
 *
 * Чего здесь нет и не будет: редактирования текстов лендинга, текстов
 * уведомлений и конструктора шаблона сертификата. Это мини-CMS ради одного
 * человека, который сам себе владелец: тексты живут в коде и меняются вместе
 * с сайтом, шаблон сертификата один и свёрстан в коде.
 *
 * Пустая база — не пустое состояние: без категорий и без привязанного бота
 * экран рисует свои вкладки как обычно. `Empty` здесь только у ошибки сети.
 */

import { useState } from "react";
import { api, useLoad, type AdminSettings } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { AdminShell } from "@/components/layout/AdminShell";
import { SettingsCategories } from "@/components/admin/SettingsCategories";
import { SettingsCertificatePreview } from "@/components/admin/SettingsCertificatePreview";
import { SettingsTelegram } from "@/components/admin/SettingsTelegram";
import { Button, Empty } from "@lms/ui";

type Tab = "categories" | "telegram" | "cert";

export default function AdminSettingsPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("categories");

  const settings = useLoad(() => api<AdminSettings>("/admin/settings"), []);
  const data = settings.data;

  /* Какую площадку показывает предпросмотр. Пусто — значит первую из
     справочника: набор картинок ничего не меняет и не сохраняется,
     а переключатель стоит рядом. Имена площадок берём из того же ответа,
     что уже загружен, — второй запрос за тем же справочником не нужен */
  const [platform, setPlatform] = useState("");

  if (settings.loading) {
    return (
      <AdminShell title="Настройки платформы">
        <div className="card card-pad row center" style={{ minHeight: 240 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell title="Настройки платформы">
        <div className="card">
          <Empty
            title="Не удалось загрузить настройки"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={settings.reload}>
                Повторить
              </Button>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const shown = platform || data.platforms[0]?.platform || "";

  return (
    <AdminShell
      title="Настройки платформы"
      subtitle="Категории курсов, Telegram-бот и картинки сертификата"
    >
      <div className="stack g20">
        <div className="tabs">
          {(
            [
              ["categories", "Категории"],
              ["telegram", "Telegram-бот"],
              ["cert", "Сертификат"],
            ] as [Tab, string][]
          ).map(([v, label]) => (
            <button key={v} data-active={tab === v} onClick={() => setTab(v)}>
              {label}
            </button>
          ))}
        </div>

        {/* ===== Категории ===== */}
        {tab === "categories" && <SettingsCategories />}

        {/* ===== Telegram-бот и примеры сообщений ===== */}
        {tab === "telegram" && (
          <SettingsTelegram telegram={data.telegram} onSaved={settings.setData} />
        )}

        {/* ===== Картинки сертификата: только показ ===== */}
        {tab === "cert" && (
          <div className="stack g16" style={{ maxWidth: 720 }}>
            <div className="stack g8">
              <h2 className="h3">{t.pfCertTitle}</h2>
              <span className="caption muted-3 pretty">{t.pfCertHint}</span>
            </div>

            {/* Площадок две, и тройки картинок у них разные — без переключателя
                вторую было бы не увидеть вовсе */}
            {data.platforms.length > 1 && (
              <div
                className="segmented"
                role="group"
                aria-label={t.pfLabel}
                style={{ alignSelf: "flex-start" }}
              >
                {data.platforms.map((p) => (
                  <button
                    key={p.platform}
                    type="button"
                    data-active={p.platform === shown}
                    onClick={() => setPlatform(p.platform)}
                  >
                    {p.platform_name || t.pfUnknown(p.platform)}
                  </button>
                ))}
              </div>
            )}

            <div style={{ maxWidth: 420 }}>
              <SettingsCertificatePreview platform={shown} />
            </div>
            <span className="caption muted-3">
              Предпросмотр с придуманными ФИО, курсом и номером — так лягут картинки
              на настоящем документе.
            </span>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
