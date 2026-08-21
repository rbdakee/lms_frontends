"use client";

/**
 * Вкладка «Telegram-бот» настроек — раздел 5.25 брифа.
 *
 * Привязка идёт от бота, а не из поля ввода: `chat_id` наружу не отдаётся
 * вовсе и вписать его руками нельзя. Чужой `chat_id`, вписанный по ошибке,
 * отправлял бы заявки с телефонами учителей незнакомому человеку. Поэтому
 * «Подключить» выдаёт код, админ шлёт боту `/start <код>`, и чат записывает
 * сервер, приняв сообщение.
 *
 * Фонового опроса нет: вернувшись из бота, админ жмёт «Я отправил код —
 * проверить», и экран перечитывает настройки. Явное действие честнее и
 * дешевле поллинга ради события, которое случается раз в год.
 */

import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  type AdminSettings,
  type SettingsTelegram,
  type SettingsTelegramIn,
  type TelegramBindCode,
} from "@lms/api";
import { dayMonth } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { Badge, Button, Note, Sheet } from "@lms/ui";
import { IconExternal, IconRefresh, IconTelegram } from "@lms/ui/icons";

/**
 * Примеры сообщений бота (5.15) — копирайт экрана, а не данные сервера:
 * показываем админу, что именно придёт в чат.
 */
const telegramSamples = [
  {
    id: "tg-lead",
    icon: "🔔",
    title: "Новая заявка на курс",
    lines: [
      "Смагулова Гульмира Токтарбековна · +7 701 555-12-34",
      "Курс: Функциональная грамотность: задания PISA на уроке · 60 000 ₸",
    ],
    action: "Открыть заявку",
  },
  {
    id: "tg-work",
    icon: "📝",
    title: "Работа на проверку",
    lines: [
      "Ахметов Данияр · Задание 2 «Разбор урока»",
      "Курс: Цифровая грамотность педагога",
    ],
    action: "Проверить",
  },
];

/** 583 → «9:43» */
function mmss(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/**
 * Сколько коду осталось жить. Считаем от `expires_at`, а не от «десяти минут»:
 * повторный вызов до истечения отдаёт тот же код с прежним сроком, и константа
 * показала бы лишнее время.
 */
function secLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

const errText = (e: unknown, fallback: string) =>
  isApiError(e) && e.status > 0 ? e.message : fallback;

export function SettingsTelegram({
  telegram,
  onSaved,
}: {
  telegram: SettingsTelegram;
  onSaved: (settings: AdminSettings) => void;
}) {
  const { lang } = useLang();
  const toast = useToast();
  const [bind, setBind] = useState<TelegramBindCode | null>(null);
  const [busy, setBusy] = useState<"" | "bind" | "check" | "test" | "unbind" | "flag">("");
  const [confirm, setConfirm] = useState(false);

  /* Остаток считается прямо в рендере, поэтому состояние здесь нужно только
     затем, чтобы раз в секунду перерисовать строку с обратным отсчётом */
  const [, retick] = useState(0);
  useEffect(() => {
    if (!bind) return;
    const id = setInterval(() => {
      /* Код погас — перерисовывать больше нечего: тикать до закрытия
         вкладки незачем */
      if (secLeft(bind.expires_at) <= 0) clearInterval(id);
      retick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [bind]);

  const leftSec = bind ? secLeft(bind.expires_at) : 0;

  const reread = async () => {
    const fresh = await api<AdminSettings>("/admin/settings");
    onSaved(fresh);
    return fresh;
  };

  const getCode = async () => {
    if (busy) return;
    setBusy("bind");
    try {
      setBind(
        await api<TelegramBindCode>("/admin/settings/telegram/bind_code", { method: "POST" }),
      );
    } catch (e) {
      toast(errText(e, "Не удалось получить код"), "error");
    } finally {
      setBusy("");
    }
  };

  const check = async () => {
    if (busy) return;
    setBusy("check");
    try {
      const fresh = await reread();
      if (fresh.telegram.connected) {
        setBind(null);
        toast("Бот подключён", "success");
      } else {
        toast("Привязки пока не видно — отправьте боту команду и проверьте ещё раз");
      }
    } catch (e) {
      toast(errText(e, "Не удалось перечитать настройки"), "error");
    } finally {
      setBusy("");
    }
  };

  /* Тестовое сообщение — отдельная ручка, не имеющая отношения к отвязке */
  const sendTest = async () => {
    if (busy) return;
    setBusy("test");
    try {
      await api<void>("/admin/settings/telegram/test", { method: "POST" });
      toast("Тестовое сообщение отправлено в Telegram", "success");
    } catch (e) {
      toast(errText(e, "Не удалось отправить тестовое сообщение"), "error");
    } finally {
      setBusy("");
    }
  };

  const unbind = async () => {
    if (busy) return;
    setBusy("unbind");
    try {
      await api<void>("/admin/settings/telegram/unbind", { method: "POST" });
      setConfirm(false);
      setBind(null);
      await reread();
      toast("Бот отвязан — уведомления перестанут приходить");
    } catch (e) {
      toast(errText(e, "Не удалось отвязать бота"), "error");
    } finally {
      setBusy("");
    }
  };

  /* Флаг уходит своим полем: `telegram` в теле `PATCH` принимает только
     их двоих, привязка меняется другими ручками */
  const setFlag = async (body: SettingsTelegramIn) => {
    if (busy) return;
    setBusy("flag");
    try {
      onSaved(
        await api<AdminSettings>("/admin/settings", { method: "PATCH", json: { telegram: body } }),
      );
    } catch (e) {
      toast(errText(e, "Не удалось сохранить"), "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="set-two">
      <div className="card card-pad stack g16">
        <div className="row between wrap g10">
          <h2 className="h3">Привязка бота</h2>
          <Badge kind={telegram.connected ? "accepted" : "locked"}>
            {telegram.connected ? "Подключён" : "Не подключён"}
          </Badge>
        </div>

        <Note kind="muted">
          <span className="small">
            Уведомления администратора живут в Telegram-боте, а не в интерфейсе:
            колокольчика в админке нет. Бот шлёт два типа сообщений, оба
            со ссылкой на нужный экран.
          </span>
        </Note>

        {telegram.connected ? (
          <div className="row between wrap g10">
            <div className="stack g2">
              <span className="small" style={{ fontWeight: 600 }}>
                {telegram.chat_title ?? "Чат без названия"}
              </span>
              {telegram.connected_at && (
                <span className="caption muted-3">
                  Подключено {dayMonth(telegram.connected_at, lang)}
                </span>
              )}
            </div>
            <Button variant="danger-soft" size="sm" onClick={() => setConfirm(true)}>
              Отвязать
            </Button>
          </div>
        ) : bind ? (
          <div className="stack g12">
            <div
              className="stack g6"
              style={{ background: "#f1f5f9", borderRadius: 14, padding: 14 }}
            >
              <span className="caption muted">Код привязки</span>
              <strong className="mono" style={{ fontSize: 26, letterSpacing: "0.14em" }}>
                {bind.code}
              </strong>
              <span className="small pretty">
                Откройте бота и отправьте ему команду{" "}
                <span className="mono">/start {bind.code}</span>
              </span>
            </div>

            <a
              className="btn btn-primary btn-block"
              href={bind.deep_link}
              target="_blank"
              rel="noreferrer"
            >
              <IconExternal size={16} />
              Открыть @{bind.bot_username}
            </a>

            <span className="caption muted-3 pretty">
              {leftSec > 0
                ? `Код действует ещё ${mmss(leftSec)}. Пока он жив, кнопка «Подключить» отдаёт тот же код.`
                : "Код истёк — получите новый."}
            </span>

            <div className="row wrap g8">
              <Button
                variant="secondary"
                icon={<IconRefresh size={15} />}
                loading={busy === "check"}
                onClick={check}
              >
                Я отправил код — проверить
              </Button>
              {leftSec === 0 && (
                <Button variant="ghost" loading={busy === "bind"} onClick={getCode}>
                  Получить новый код
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button
            block
            size="lg"
            icon={<IconTelegram size={18} />}
            loading={busy === "bind"}
            onClick={getCode}
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
              data-on={telegram.notify_leads}
              onClick={() => setFlag({ notify_leads: !telegram.notify_leads })}
              aria-pressed={telegram.notify_leads}
              aria-label="Новые заявки"
              disabled={busy === "flag"}
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
              data-on={telegram.notify_submissions}
              onClick={() => setFlag({ notify_submissions: !telegram.notify_submissions })}
              aria-pressed={telegram.notify_submissions}
              aria-label="Работы на проверку"
              disabled={busy === "flag"}
            />
          </div>
          {!telegram.connected && (
            <span className="caption muted-3 pretty">
              Переключатели сохраняются и без привязки — сообщения просто некуда слать,
              пока бот не подключён.
            </span>
          )}
        </div>

        <Button
          variant="secondary"
          block
          disabled={!telegram.connected}
          loading={busy === "test"}
          onClick={sendTest}
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

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Отвязать бота?"
        footer={
          <div className="stack g8">
            <Button variant="danger" block size="lg" loading={busy === "unbind"} onClick={unbind}>
              Отвязать
            </Button>
            <Button variant="secondary" block onClick={() => setConfirm(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          Уведомления перестанут уходить куда бы то ни было — колокольчика в админке нет.
          Заявки и работы на проверку при этом продолжат складываться в админке, их просто
          придётся открывать самому. Чтобы вернуть уведомления, привязку придётся пройти
          заново: кодом и командой боту.
        </p>
      </Sheet>
    </div>
  );
}
