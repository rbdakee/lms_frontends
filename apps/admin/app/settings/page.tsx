"use client";

/**
 * Настройки платформы «/settings» — раздел 5.25 брифа.
 *
 * Чего здесь нет и не будет: редактирования текстов лендинга, текстов
 * уведомлений и конструктора шаблона сертификата. Это мини-CMS ради одного
 * человека, который сам себе владелец: тексты живут в коде и меняются вместе
 * с сайтом, шаблон сертификата один и свёрстан в коде — из настроек в него
 * подставляются только три картинки.
 */

import { useState } from "react";
import { adminContacts, categories, telegramSamples } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { useOrigin } from "@lms/ui/useOrigin";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Note } from "@lms/ui";
import {
  IconClose,
  IconImage,
  IconPlus,
  IconTelegram,
  IconUpload,
  LogoMark,
} from "@lms/ui/icons";

type Tab = "brand" | "categories" | "telegram" | "cert";

const CERT_IMAGES = [
  { key: "logo", label: "Логотип", hint: "PNG с прозрачным фоном, высота от 200 px" },
  { key: "sign", label: "Подпись", hint: "PNG с прозрачным фоном, подпись директора" },
  { key: "stamp", label: "Печать", hint: "PNG с прозрачным фоном, круглая печать" },
];

export default function AdminSettingsPage() {
  const { toast } = useStore();
  const { verifyHost } = useOrigin();
  const [tab, setTab] = useState<Tab>("brand");
  const [cats, setCats] = useState(categories);
  const [newCat, setNewCat] = useState("");

  /* Telegram-бот: в прототипе просто состояние, отправлять некуда */
  const [connected, setConnected] = useState(true);
  const [notifyLeads, setNotifyLeads] = useState(true);
  const [notifyWorks, setNotifyWorks] = useState(true);

  return (
    <AdminShell
      title="Настройки платформы"
      subtitle="Бренд, категории, контакты администратора и Telegram-бот"
      actions={
        <Button size="sm" onClick={() => toast("Настройки сохранены", "success")}>
          Сохранить
        </Button>
      }
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
          <div className="set-two">
            <div className="card card-pad stack g14">
              <h2 className="h3">Логотип и название</h2>
              <div className="row g14">
                <span className="logo-mark" style={{ width: 56, height: 56, borderRadius: 16 }}>
                  <LogoMark size={30} />
                </span>
                <div className="stack g8 grow">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<IconUpload size={15} />}
                    onClick={() => toast("Открылся бы выбор файла")}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Загрузить логотип
                  </Button>
                  <span className="caption muted-3">SVG или PNG, минимум 128×128</span>
                </div>
              </div>
              <div className="field">
                <label className="label">Название платформы</label>
                <input className="input" defaultValue="LMS" />
              </div>
              <div className="field">
                <label className="label">Название организации</label>
                <input className="input" defaultValue="Институт повышения квалификации" />
              </div>
              <div className="field">
                <label className="label">Домен проверки сертификатов</label>
                <input key={verifyHost} className="input mono" defaultValue={verifyHost} />
                <span className="hint">Печатается на сертификате рядом с QR-кодом</span>
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
              <div className="field">
                <label className="label">Имя администратора</label>
                <input className="input" defaultValue={adminContacts.name} />
              </div>
              <div className="field">
                <label className="label">Телефон</label>
                <input className="input mono" defaultValue={adminContacts.phone} />
              </div>
              <div className="field">
                <label className="label">Ссылка WhatsApp</label>
                <input className="input mono" defaultValue={adminContacts.whatsapp} />
              </div>
              <div className="field">
                <label className="label">Ссылка Telegram</label>
                <input className="input mono" defaultValue={adminContacts.telegram} />
              </div>
              <div className="field">
                <label className="label">Часы работы</label>
                <input className="input" defaultValue={adminContacts.hours} />
                <span className="hint">Подпись под кнопкой связи</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== Категории ===== */}
        {tab === "categories" && (
          <div className="card card-pad stack g14" style={{ maxWidth: 620 }}>
            <h2 className="h3">Категории курсов</h2>
            <div className="stack g8">
              {cats.map((c, i) => (
                <div key={c} className="row g8">
                  <input
                    className="input"
                    defaultValue={c}
                    onChange={(e) =>
                      setCats((prev) => prev.map((x, xi) => (xi === i ? e.target.value : x)))
                    }
                  />
                  <button
                    className="btn btn-icon"
                    onClick={() => setCats((prev) => prev.filter((_, xi) => xi !== i))}
                    aria-label="Удалить категорию"
                  >
                    <IconClose size={18} />
                  </button>
                </div>
              ))}
            </div>
            <div className="row g8">
              <input
                className="input"
                placeholder="Новая категория"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCat.trim()) {
                    setCats((p) => [...p, newCat.trim()]);
                    setNewCat("");
                  }
                }}
              />
              <Button
                icon={<IconPlus size={16} />}
                disabled={!newCat.trim()}
                onClick={() => {
                  setCats((p) => [...p, newCat.trim()]);
                  setNewCat("");
                }}
              >
                Добавить
              </Button>
            </div>
            <span className="caption muted-3">
              Категории используются в фильтрах каталога и в карточке курса
            </span>
          </div>
        )}

        {/* ===== Telegram-бот и примеры сообщений ===== */}
        {tab === "telegram" && (
          <div className="set-two">
            <div className="card card-pad stack g16">
              <div className="row between wrap g10">
                <h2 className="h3">Привязка бота</h2>
                <Badge kind={connected ? "accepted" : "locked"}>
                  {connected ? "Подключён" : "Не подключён"}
                </Badge>
              </div>

              <Note kind="muted">
                <span className="small">
                  Уведомления администратора живут в Telegram-боте, а не в интерфейсе:
                  колокольчика в админке нет. Бот шлёт два типа сообщений, оба
                  со ссылкой на нужный экран.
                </span>
              </Note>

              {connected ? (
                <div className="row between wrap g10">
                  <div className="stack g2">
                    <span className="small" style={{ fontWeight: 600 }}>
                      {adminContacts.telegramName}
                    </span>
                    <span className="caption muted-3">Аскарова Б. · подключено 6 августа</span>
                  </div>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    onClick={() => {
                      setConnected(false);
                      toast("Бот отвязан — уведомления перестанут приходить");
                    }}
                  >
                    Отвязать
                  </Button>
                </div>
              ) : (
                <Button
                  block
                  size="lg"
                  icon={<IconTelegram size={18} />}
                  onClick={() => {
                    setConnected(true);
                    toast("Бот подключён", "success");
                  }}
                >
                  Подключить
                </Button>
              )}

              <hr className="divider" />

              <div className="stack g4">
                <span className="caption muted">Какие сообщения слать</span>
                <div className="row between g12" style={{ minHeight: 44 }}>
                  <div className="stack g2 grow">
                    <span className="small" style={{ fontWeight: 600 }}>
                      Новые заявки
                    </span>
                    <span className="caption muted-3">Учитель нажал «Записаться»</span>
                  </div>
                  <button
                    className="switch"
                    data-on={notifyLeads}
                    onClick={() => setNotifyLeads((v) => !v)}
                    aria-pressed={notifyLeads}
                    aria-label="Новые заявки"
                    disabled={!connected}
                  />
                </div>
                <div className="row between g12" style={{ minHeight: 44 }}>
                  <div className="stack g2 grow">
                    <span className="small" style={{ fontWeight: 600 }}>
                      Работы на проверку
                    </span>
                    <span className="caption muted-3">Учитель сдал задание</span>
                  </div>
                  <button
                    className="switch"
                    data-on={notifyWorks}
                    onClick={() => setNotifyWorks((v) => !v)}
                    aria-pressed={notifyWorks}
                    aria-label="Работы на проверку"
                    disabled={!connected}
                  />
                </div>
              </div>

              <Button
                variant="secondary"
                block
                disabled={!connected}
                onClick={() => toast("Тестовое сообщение отправлено в Telegram", "success")}
              >
                Отправить тестовое сообщение
              </Button>
            </div>

            {/* Примеры сообщений бота — раздел 5.15 */}
            <div className="card card-pad stack g14">
              <h2 className="h3">Как выглядят сообщения</h2>
              <div className="stack g12">
                {telegramSamples.map((s) => (
                  <div
                    key={s.id}
                    className="stack g8"
                    style={{
                      background: "#f1f5f9",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <strong className="small">
                      {s.icon} {s.title}
                    </strong>
                    <div className="stack g4">
                      {s.lines.map((line) => (
                        <span key={line} className="caption pretty" style={{ color: "var(--text-2)" }}>
                          {line}
                        </span>
                      ))}
                    </div>
                    <span
                      className="caption"
                      style={{
                        alignSelf: "flex-start",
                        background: "#fff",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "8px 12px",
                        fontWeight: 700,
                        color: "var(--primary)",
                        minHeight: 36,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {s.action}
                    </span>
                  </div>
                ))}
              </div>
              <span className="caption muted-3 pretty">
                Кнопка в сообщении ведёт прямо на заявку или на экран проверки работы.
              </span>
            </div>
          </div>
        )}

        {/* ===== Три картинки для сертификата ===== */}
        {tab === "cert" && (
          <div className="stack g16" style={{ maxWidth: 720 }}>
            <Note kind="muted">
              <span className="small">
                Шаблон сертификата один и свёрстан в коде — подставляются только ФИО,
                название курса, объём в часах, дата и номер. Конструктора шаблона нет:
                три картинки закрывают ту же задачу.
              </span>
            </Note>

            <div className="cert-images">
              {CERT_IMAGES.map((img) => (
                <div key={img.key} className="card card-pad stack g10">
                  <strong className="small">{img.label}</strong>
                  <div
                    style={{
                      aspectRatio: "3/2",
                      borderRadius: 12,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-3)",
                    }}
                  >
                    <IconImage size={30} />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    block
                    icon={<IconUpload size={15} />}
                    onClick={() => toast("Открылся бы выбор файла")}
                  >
                    Загрузить
                  </Button>
                  <span className="caption muted-3 pretty">{img.hint}</span>
                </div>
              ))}
            </div>

            <div className="field" style={{ maxWidth: 320 }}>
              <label className="label">Формат номера сертификата</label>
              <input className="input mono" defaultValue="KZ-{ГОД}-{6 цифр}" />
              <span className="hint">По этому номеру сертификат проверяется на /verify</span>
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
