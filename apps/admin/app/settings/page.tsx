"use client";

/**
 * Настройки платформы «/settings» — раздел 5.25 брифа.
 *
 * Четыре вкладки приходят одним `GET /admin/settings`, но сохраняются
 * по-разному, и общей кнопки «Сохранить» у них нет и быть не может:
 * категории и привязка бота живут своими ручками, картинки уходят каждая
 * своим `PATCH` сразу после выбора файла. Кнопка «Сохранить» стоит
 * на вкладке «Бренд и контакты» и шлёт ровно её поля.
 *
 * Чего здесь нет и не будет: редактирования текстов лендинга, текстов
 * уведомлений и конструктора шаблона сертификата. Это мини-CMS ради одного
 * человека, который сам себе владелец: тексты живут в коде и меняются вместе
 * с сайтом, шаблон сертификата один и свёрстан в коде — из настроек в него
 * подставляются только три картинки.
 *
 * Адреса проверки сертификата в настройках тоже нет: он живёт в окружении
 * бэкенда (`VERIFY_BASE_URL`). `PATCH` объявлен `extra: "forbid"` — лишнее
 * поле в теле роняло бы весь запрос в 422, и настройки перестали бы
 * сохраняться совсем.
 *
 * Пустая площадка — не пустое состояние: на чистой базе приходят пустые
 * строки и `null` у картинок, и экран рисует все поля. `Empty` здесь только
 * у ошибки сети.
 */

import { useEffect, useRef, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminSettings,
  type AdminSettingsPatch,
  type SettingsContacts,
} from "@lms/api";
import { useStore } from "@lms/prototype";
import { fieldErrors } from "@/lib/fieldErrors";
import { AdminShell } from "@/components/layout/AdminShell";
import { SettingsCategories } from "@/components/admin/SettingsCategories";
import { SettingsCertificatePreview } from "@/components/admin/SettingsCertificatePreview";
import { SettingsImageSlot } from "@/components/admin/SettingsImageSlot";
import { SettingsTelegram } from "@/components/admin/SettingsTelegram";
import { Button, Empty, Note } from "@lms/ui";
import { PhoneInput } from "@lms/ui/PhoneInput";

type Tab = "brand" | "categories" | "telegram" | "cert";

/* `field` — имя поля в теле `PATCH` и в ошибке 422, `slot` — ключ той же
   картинки в ответе `GET`. Формат назван PNG или JPEG, потому что именно их
   печатает шаблон сертификата: SVG сервер пропустит, а документ выйдет
   без картинки. */
const CERT_IMAGES = [
  {
    field: "certificate_images.logo",
    slot: "logo",
    label: "Логотип",
    hint: "PNG или JPEG; у PNG сохраняется прозрачный фон",
  },
  {
    field: "certificate_images.sign",
    slot: "sign",
    label: "Подпись",
    hint: "Подпись директора — PNG или JPEG",
  },
  {
    field: "certificate_images.stamp",
    slot: "stamp",
    label: "Печать",
    hint: "Круглая печать — PNG или JPEG",
  },
] as const;

/** Форма вкладки «Бренд и контакты» — единственной, у которой есть «Сохранить». */
interface BrandForm {
  platform_name: string;
  org_name: string;
  contacts: SettingsContacts;
}

function brandOf(s: AdminSettings): BrandForm {
  return {
    platform_name: s.platform_name,
    org_name: s.org_name,
    /* Копия, а не ссылка: иначе правка инпута незаметно меняла бы
       загруженный ответ, и кнопка перестала бы видеть разницу */
    contacts: { ...s.contacts },
  };
}

/**
 * Тело `PATCH` вкладки «Бренд и контакты».
 *
 * `contacts` уходит объектом целиком, всеми четырьмя полями. Контракт называет
 * его «объектом целиком», сервер сливает по полям, а смысл частичной отправки
 * владельцем ещё не решён — четыре поля дают один результат при любой трактовке.
 *
 * **Стёртое поле уходит пустой строкой, а не `null`.** `null` сервер читает
 * как «не прислали»: вернётся 200 со старым значением, и админ решит, что
 * стёр. `null` стирает только картинки — там он и значит «убрать». Обычный
 * приём «пустой инпут → `null`» здесь запрещён.
 */
function brandPatch(f: BrandForm): AdminSettingsPatch {
  return {
    platform_name: f.platform_name.trim(),
    org_name: f.org_name.trim(),
    contacts: {
      name: f.contacts.name.trim(),
      phone: f.contacts.phone.trim(),
      whatsapp: f.contacts.whatsapp.trim(),
      hours: f.contacts.hours.trim(),
    },
  };
}

export default function AdminSettingsPage() {
  const { toast } = useStore();
  const [tab, setTab] = useState<Tab>("brand");

  const settings = useLoad(() => api<AdminSettings>("/admin/settings"), []);
  const data = settings.data;

  const [form, setForm] = useState<BrandForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  /* Форма собирается один раз: картинки и переключатели бота ходят
     на сервер своими запросами и не должны стирать набранное */
  const seeded = useRef(false);
  useEffect(() => {
    if (data && !seeded.current) {
      seeded.current = true;
      setForm(brandOf(data));
    }
  }, [data]);

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const updated = await api<AdminSettings>("/admin/settings", {
        method: "PATCH",
        json: brandPatch(form),
      });
      settings.setData(updated);
      /* Показываем то, что вернулось, а не то, что было набрано */
      setForm(brandOf(updated));
      toast("Настройки сохранены", "success");
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else
        toast(isApiError(e) && e.status > 0 ? e.message : "Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  };

  /* `form` сеет эффект — он отрабатывает после отрисовки, поэтому кадр
     «данные пришли, формы ещё нет» существует. Без него в этот кадр
     показалась бы карточка ошибки сети */
  if (!form && !settings.error) {
    return (
      <AdminShell title="Настройки платформы">
        <div className="card card-pad row center" style={{ minHeight: 240 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  if (!data || !form) {
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

  /* Правка поля снимает подпись 422: она относилась к прежнему значению */
  const clearError = (key: string) =>
    setErrors((e) => (e[key] === undefined ? e : { ...e, [key]: "" }));

  const set = <K extends keyof BrandForm>(key: K, value: BrandForm[K]) => {
    clearError(key);
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const setContact = (key: keyof SettingsContacts, value: string) => {
    clearError(`contacts.${key}`);
    setForm((f) => (f ? { ...f, contacts: { ...f.contacts, [key]: value } } : f));
  };

  /* Порядок полей задаёт `brandOf` — сравнение строк честное */
  const dirty = JSON.stringify(form) !== JSON.stringify(brandOf(data));

  const contactField = (
    key: keyof SettingsContacts,
    label: string,
    phone?: boolean,
    hint?: string,
  ) => (
    <div className="field">
      <label className="label">{label}</label>
      {phone ? (
        <PhoneInput
          className={`input mono${errors[`contacts.${key}`] ? " input-error" : ""}`}
          value={form.contacts[key]}
          onChange={(v) => setContact(key, v)}
        />
      ) : (
        <input
          className={`input${errors[`contacts.${key}`] ? " input-error" : ""}`}
          value={form.contacts[key]}
          onChange={(e) => setContact(key, e.target.value)}
        />
      )}
      {errors[`contacts.${key}`] ? (
        <span className="error-text">{errors[`contacts.${key}`]}</span>
      ) : (
        hint && <span className="hint">{hint}</span>
      )}
    </div>
  );

  return (
    <AdminShell
      title="Настройки платформы"
      subtitle="Бренд, категории, контакты администратора и Telegram-бот"
    >
      <div className="stack g20">
        <div className="tabs">
          {(
            [
              ["brand", "Бренд и контакты"],
              ["categories", "Категории"],
              ["telegram", "Telegram-бот"],
              ["cert", "Картинки сертификата"],
            ] as [Tab, string][]
          ).map(([v, label]) => (
            <button key={v} data-active={tab === v} onClick={() => setTab(v)}>
              {label}
            </button>
          ))}
        </div>

        {/* ===== Бренд и контакты администратора ===== */}
        {tab === "brand" && (
          <>
            <div className="set-two">
              <div className="card card-pad stack g14">
                <h2 className="h3">Логотип и название</h2>
                <div style={{ maxWidth: 260 }}>
                  <SettingsImageSlot
                    field="logo"
                    label="Логотип платформы"
                    hint="SVG, PNG или JPEG — он стоит в шапке лендинга"
                    image={data.logo}
                    onSaved={settings.setData}
                  />
                </div>
                <div className="field">
                  <label className="label">Название платформы</label>
                  <input
                    className={`input${errors.platform_name ? " input-error" : ""}`}
                    value={form.platform_name}
                    onChange={(e) => set("platform_name", e.target.value)}
                  />
                  {errors.platform_name && (
                    <span className="error-text">{errors.platform_name}</span>
                  )}
                </div>
                <div className="field">
                  <label className="label">Название организации</label>
                  <input
                    className={`input${errors.org_name ? " input-error" : ""}`}
                    value={form.org_name}
                    onChange={(e) => set("org_name", e.target.value)}
                  />
                  {errors.org_name ? (
                    <span className="error-text">{errors.org_name}</span>
                  ) : (
                    <span className="hint">Печатается на сертификате</span>
                  )}
                </div>
              </div>

              <div className="card card-pad stack g14">
                <h2 className="h3">Контакты администратора</h2>
                <Note kind="muted">
                  <span className="small">
                    Именно эти контакты подставляются в кнопку «Связаться с администратором»
                    на странице курса и в подвал лендинга. Деньги администратор принимает
                    вне платформы — платёжных форм в продукте нет.
                  </span>
                </Note>
                {contactField("name", "Имя администратора")}
                {contactField("phone", "Телефон для звонков", true)}
                {contactField("whatsapp", "Номер WhatsApp", true)}
                <div className="field">
                  <label className="label">Часы работы</label>
                  <input
                    className={`input${errors["contacts.hours"] ? " input-error" : ""}`}
                    value={form.contacts.hours}
                    onChange={(e) => setContact("hours", e.target.value)}
                  />
                  {errors["contacts.hours"] ? (
                    <span className="error-text">{errors["contacts.hours"]}</span>
                  ) : (
                    <span className="hint">Подпись под кнопкой связи</span>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопка стоит на своей вкладке и шлёт только её: категории,
                привязка бота и картинки сохраняются своими действиями */}
            <div className="row wrap g12" style={{ alignItems: "center" }}>
              <Button loading={saving} disabled={!dirty} onClick={save}>
                Сохранить
              </Button>
              <span className="caption muted-3 pretty">
                {dirty ? "Есть несохранённые правки." : "Всё сохранено."} Логотип уходит
                на сервер сразу, не дожидаясь кнопки.
              </span>
            </div>
          </>
        )}

        {/* ===== Категории ===== */}
        {tab === "categories" && <SettingsCategories />}

        {/* ===== Telegram-бот и примеры сообщений ===== */}
        {tab === "telegram" && (
          <SettingsTelegram telegram={data.telegram} onSaved={settings.setData} />
        )}

        {/* ===== Три картинки для сертификата ===== */}
        {tab === "cert" && (
          <div className="stack g16" style={{ maxWidth: 720 }}>
            <div style={{ maxWidth: 420 }}>
              <SettingsCertificatePreview images={data.certificate_images} />
            </div>
            <span className="caption muted-3">
              Предпросмотр с придуманными ФИО, курсом и номером — так лягут картинки
              на настоящем документе.
            </span>

            <div className="cert-images">
              {CERT_IMAGES.map((img) => (
                <div key={img.field} className="card card-pad">
                  <SettingsImageSlot
                    field={img.field}
                    label={img.label}
                    hint={img.hint}
                    image={data.certificate_images[img.slot]}
                    onSaved={settings.setData}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .set-two { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        .cert-images { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .cert-images { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1100px) { .set-two { grid-template-columns: 1fr 1fr; gap: 24px; } }
      `}</style>
    </AdminShell>
  );
}
