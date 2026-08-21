"use client";

/**
 * Профиль администратора «/profile».
 *
 * До этого экрана профиль и выход были только у клиентского приложения, и
 * работало это на общей куке: админ выходил из кабинета учителя — закрывалась
 * и админка. Кука по приложениям разъезжается, поэтому у админки появляется
 * свой профиль и свой выход, иначе выйти из неё будет нечем.
 *
 * Данные — `GET /me`, сохранение — `PATCH /me` (только изменённые поля),
 * устройства — `GET /me/sessions`. Школа, предмет, регион и стаж здесь
 * не правятся: это поля учителя, и правят их в кабинете учителя.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  api,
  fullName,
  isApiError,
  useLoad,
  useMe,
  userInitials,
  type Session,
  type SessionList,
  type User,
  type UserPatch,
} from "@lms/api";
import { useToast } from "@lms/ui/toast";
import { dayTime, phoneFmt } from "@lms/ui/i18n";
import { fieldErrors } from "@/lib/fieldErrors";
import { web } from "@/lib/urls";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Badge, Button, Note, Sheet, Skeleton } from "@lms/ui";
import { IconChevronRight, IconDevice, IconLogout, IconPhone } from "@lms/ui/icons";

/** «Mozilla/5.0 (iPhone; …) … Safari/…» → «iPhone · Safari» */
function deviceLabel(ua: string): string {
  const device = /iPhone/i.test(ua)
    ? "iPhone"
    : /iPad/i.test(ua)
      ? "iPad"
      : /Android/i.test(ua)
        ? "Android"
        : /Macintosh/i.test(ua)
          ? "Mac"
          : /Windows/i.test(ua)
            ? "Windows"
            : "Устройство";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\/|Opera/i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : /Safari\//i.test(ua)
            ? "Safari"
            : "браузер";
  return `${device} · ${browser}`;
}

/** Поля, которые правятся здесь. Остальное у админа то же, что у учителя. */
const FIELDS = ["last_name", "first_name", "middle_name", "email"] as const;
type Form = Record<(typeof FIELDS)[number], string>;

function formFromUser(u: User): Form {
  return {
    last_name: u.last_name,
    first_name: u.first_name,
    middle_name: u.middle_name,
    email: u.email,
  };
}

/** Только изменённые поля; пустая строка — это `null`, «стереть» по контракту. */
function buildPatch(user: User, form: Form): UserPatch {
  const patch: UserPatch = {};
  for (const key of FIELDS) {
    const raw = form[key].trim();
    if (raw !== user[key]) patch[key] = raw === "" ? null : raw;
  }
  return patch;
}

export default function AdminProfilePage() {
  const { me } = useMe();

  /* Спиннер гостю и отказ учителю без прав рисует сам каркас — до формы дело
     доходит только у админа. Проверка здесь нужна типам, а не экрану */
  if (!me) return <AdminShell title="Профиль">{null}</AdminShell>;
  return <ProfileScreen user={me} />;
}

function ProfileScreen({ user }: { user: User }) {
  const router = useRouter();
  const { setMe, logout: apiLogout } = useMe();
  const toast = useToast();

  const [form, setForm] = useState(() => formFromUser(user));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busySession, setBusySession] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const sessions = useLoad(() => api<SessionList>("/me/sessions"), []);

  const patch = useMemo(() => buildPatch(user, form), [user, form]);
  const dirty = Object.keys(patch).length > 0;

  /* Правка поля снимает подпись 422: она относилась к прежнему значению */
  const upd = (key: keyof Form, value: string) => {
    setErrors((e) => (e[key] === undefined ? e : { ...e, [key]: "" }));
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await api<User>("/me", { method: "PATCH", json: patch });
      setMe(updated);
      setForm(formFromUser(updated));
      setErrors({});
      toast("Изменения сохранены", "success");
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(fields);
      if (Object.keys(fields).length === 0) {
        toast(isApiError(e) ? e.message : "Не удалось сохранить", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (s: Session) => {
    if (busySession) return;
    setBusySession(s.id);
    try {
      await api<undefined>(`/me/sessions/${s.id}`, { method: "DELETE" });
      toast("Выход выполнен на этом устройстве", "success");
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не получилось — попробуйте ещё раз", "error");
    } finally {
      setBusySession(null);
    }
    sessions.reload();
  };

  const revokeOthers = async () => {
    if (busySession) return;
    setBusySession("others");
    try {
      const { revoked_count } = await api<{ revoked_count: number }>("/auth/logout_others", {
        method: "POST",
      });
      toast(
        revoked_count > 0
          ? `Вышли на других устройствах: ${revoked_count}`
          : "Других устройств нет",
        "success",
      );
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не получилось — попробуйте ещё раз", "error");
    } finally {
      setBusySession(null);
    }
    sessions.reload();
  };

  const name = fullName(user);
  const sessionItems = sessions.data?.items ?? [];
  const onlyCurrent = sessionItems.filter((s) => !s.is_current).length === 0;

  const field = (key: keyof Form, label: string, optional?: boolean, hint?: string) => (
    <div className="field">
      <label className="label" htmlFor={key}>
        {label}
        {optional && <span className="label-optional"> · необязательно</span>}
      </label>
      <input
        id={key}
        className={`input${errors[key] ? " input-error" : ""}`}
        type={key === "email" ? "email" : "text"}
        value={form[key]}
        onChange={(e) => upd(key, e.target.value)}
      />
      {errors[key] ? (
        <span className="error-text">{errors[key]}</span>
      ) : (
        hint && <span className="hint">{hint}</span>
      )}
    </div>
  );

  return (
    <AdminShell title="Профиль" subtitle="Ваши данные, устройства и выход">
      <div className="stack g20" style={{ maxWidth: 860 }}>
        {/* Кто вошёл */}
        <div className="card card-pad row g16 wrap">
          <Avatar initials={userInitials(user)} size={64} tone="neutral" />
          <div className="grow stack g4" style={{ minWidth: 200 }}>
            <strong style={{ fontSize: 18, letterSpacing: "-0.01em" }} className="pretty">
              {name || "Заполните ФИО"}
            </strong>
            <span className="small muted">{phoneFmt(user.phone)} · администратор</span>
          </div>
        </div>

        {/* Личные данные */}
        <section className="card card-pad stack g16">
          <h2 className="h3">Личные данные</h2>

          <Note kind="muted">
            <span className="small">
              ФИО видят учителя: им подписаны ваши ответы на вопросы под уроками
              и на отзывы о курсах.
            </span>
          </Note>

          <div className="p-two">
            {field("last_name", "Фамилия")}
            {field("first_name", "Имя")}
          </div>
          {field("middle_name", "Отчество", true)}
          {field(
            "email",
            "Email",
            true,
            "Нужен, чтобы не потерять доступ: вход идёт по коду из WhatsApp",
          )}

          <div className="row wrap g12" style={{ alignItems: "center" }}>
            <Button loading={saving} disabled={!dirty} onClick={save}>
              Сохранить
            </Button>
            {dirty && (
              <Button variant="secondary" onClick={() => setForm(formFromUser(user))}>
                Отменить
              </Button>
            )}
            <span className="caption muted-3">
              {dirty ? "Есть несохранённые правки." : "Всё сохранено."} Школу, предмет
              и стаж правят в кабинете учителя.
            </span>
          </div>
        </section>

        {/* Аккаунт */}
        <section className="card card-pad stack g14">
          <h2 className="h3">Аккаунт</h2>

          <div className="row g10">
            <span style={{ color: "var(--text-2)" }}>
              <IconPhone size={20} />
            </span>
            <div className="stack">
              <strong className="small">{phoneFmt(user.phone)}</strong>
              <span className="caption muted-3">вход по коду из WhatsApp</span>
            </div>
          </div>

          <hr className="divider" />

          {/* Устройства: ограничения на число входов нет — список нужен,
              чтобы лишний вход было видно и можно было закрыть */}
          <div className="stack g10">
            <strong className="small">Устройства</strong>

            {sessions.loading && (
              <div className="stack g8">
                <Skeleton h={40} r={10} />
                <Skeleton h={40} r={10} />
              </div>
            )}
            {sessions.error && (
              <div className="row between g10">
                <span className="small muted">Не удалось загрузить</span>
                <Button variant="ghost" size="sm" onClick={sessions.reload}>
                  Повторить
                </Button>
              </div>
            )}

            {sessionItems.map((s) => (
              <div key={s.id} className="row g10" style={{ alignItems: "flex-start" }}>
                <span style={{ color: "var(--text-2)", marginTop: 2 }}>
                  <IconDevice size={20} />
                </span>
                <div className="grow stack g2" style={{ minWidth: 0 }}>
                  <span className="small" style={{ fontWeight: 600 }}>
                    {deviceLabel(s.user_agent)}
                  </span>
                  <span className="caption muted-3">
                    {s.is_current ? "сейчас" : dayTime(s.last_seen_at, "ru")}
                  </span>
                </div>
                {s.is_current ? (
                  <Badge kind="done">Это устройство</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busySession === s.id}
                    onClick={() => revokeSession(s)}
                  >
                    Выйти
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="secondary"
              block
              loading={busySession === "others"}
              disabled={sessions.loading || onlyCurrent}
              onClick={revokeOthers}
            >
              Выйти на других устройствах
            </Button>
            <span className="caption muted-3 pretty">
              Здесь все входы этого номера. Сессии у админки и у кабинета учителя
              теперь разные, но если вы входили в кабинет тем же номером — этот вход
              тоже в списке.
            </span>
          </div>

          <hr className="divider" />

          {/* Кабинет учителя — другой домен, поэтому полный адрес, а не маршрут */}
          <a href={web("/my")} className="btn btn-secondary btn-block">
            Кабинет учителя
            <IconChevronRight size={16} />
          </a>

          <button className="btn btn-danger-soft btn-block" onClick={() => setLogoutOpen(true)}>
            <IconLogout size={17} />
            Выйти
          </button>
        </section>
      </div>

      <Sheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Выйти из админки?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              onClick={async () => {
                await apiLogout();
                router.push("/login");
              }}
            >
              Выйти
            </Button>
            <Button variant="secondary" block onClick={() => setLogoutOpen(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          Выход закрывает только это устройство. Чтобы вернуться, войдите по номеру
          телефона — код придёт в WhatsApp.
        </p>
      </Sheet>

      <style>{`
        .p-two { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 560px) { .p-two { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </AdminShell>
  );
}
