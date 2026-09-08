"use client";

/**
 * Профиль «/profile» — раздел 5.13 брифа.
 * Кнопка «Сохранить» появляется только при изменениях.
 *
 * Данные — `GET /me`, сохранение — `PATCH /me` (только изменённые поля).
 * Устройства — `GET /me/sessions`: города нет (геолокации по IP не делаем),
 * вместо «где» показываем «когда»; устройство и браузер выводим из user_agent.
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  api,
  fullName,
  isApiError,
  useDictionaries,
  useLoad,
  useMe,
  userInitials,
  type Session,
  type SessionList,
  type User,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { dayTime, phoneFmt } from "@lms/ui/i18n";
import { buildPatch, formFromUser, iinFilled } from "../lib/userForm";
import { useChrome, useRoutes } from "../host";
import { Avatar, Badge, Button, LinkButton, Note, Sheet, Skeleton } from "@lms/ui";
import {
  IconCamera,
  IconChevronRight,
  IconDevice,
  IconLogout,
  IconPhone,
} from "@lms/ui/icons";

/**
 * «Mozilla/5.0 (iPhone; …) … Safari/…» → «iPhone · Safari».
 * Словарь приходит параметром: функция не компонент, хук в ней не вызвать,
 * а запасные подписи человек видит наравне с остальными.
 */
function deviceLabel(ua: string, t: { prfDevice: string; prfBrowser: string }): string {
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
            : t.prfDevice;
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
            : t.prfBrowser;
  return `${device} · ${browser}`;
}

export function ProfileScreen() {
  const router = useRouter();
  const { me, status } = useMe();
  const routes = useRoutes();
  const { TeacherShell } = useChrome();

  useEffect(() => {
    if (status === "guest") router.replace(routes.login());
  }, [status, router]);

  if (!me) {
    return (
      <TeacherShell>
        <div className="page section stack g20" style={{ paddingTop: 20 }}>
          <Skeleton w={180} h={30} />
          <div className="card card-pad stack g12">
            <Skeleton w="60%" h={18} />
            <Skeleton w="40%" h={14} />
            <Skeleton h={44} r={10} />
            <Skeleton h={44} r={10} />
          </div>
        </div>
      </TeacherShell>
    );
  }
  return <ProfileForm user={me} />;
}

function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const { setMe, logout: apiLogout } = useMe();
  const { t, setLang, lang } = useLang();
  const toast = useToast();
  const dictionaries = useDictionaries();
  const routes = useRoutes();
  const { TeacherShell } = useChrome();

  const [form, setForm] = useState(() => formFromUser(user));
  const [saving, setSaving] = useState(false);
  const [logout, setLogout] = useState(false);

  const sessions = useLoad(() => api<SessionList>("/me/sessions"), []);

  const patch = useMemo(() => buildPatch(user, form), [user, form]);
  const dirty = Object.keys(patch).length > 0;

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await api<User>("/me", { method: "PATCH", json: patch });
      setMe(updated);
      setForm(formFromUser(updated));
      toast(t.prfSavedToast, "success");
    } catch (e) {
      toast(isApiError(e) ? e.message : t.prfSaveError, "error");
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (s: Session) => {
    try {
      await api<undefined>(`/me/sessions/${s.id}`, { method: "DELETE" });
      toast(t.prfDeviceOut, "success");
    } catch (e) {
      toast(isApiError(e) ? e.message : t.prfActionError, "error");
    }
    sessions.reload();
  };

  const revokeOthers = async () => {
    try {
      const { revoked_count } = await api<{ revoked_count: number }>(
        "/auth/logout_others",
        { method: "POST" },
      );
      toast(
        revoked_count > 0 ? t.prfOthersOut(revoked_count) : t.prfNoOthers,
        "success",
      );
    } catch (e) {
      toast(isApiError(e) ? e.message : t.prfActionError, "error");
    }
    sessions.reload();
  };

  const name = fullName(user);
  const regions = dictionaries.data?.regions ?? [];
  const sessionItems = sessions.data?.items ?? [];
  const onlyCurrent = sessionItems.filter((s) => !s.is_current).length === 0;

  return (
    <TeacherShell>
      <div className={`page section stack g24 ${dirty ? "has-sticky-cta" : ""}`} style={{ paddingTop: 20 }}>
        <h1 className="h1">{t.navProfile}</h1>

        {/* Шапка профиля */}
        <div className="card card-pad row g16 wrap">
          <Avatar initials={userInitials(user)} size={72} />
          <div className="grow stack g6" style={{ minWidth: 200 }}>
            <strong style={{ fontSize: 18, letterSpacing: "-0.01em" }} className="pretty">
              {name || t.prfFillName}
            </strong>
            <span className="small muted pretty">
              {[user.school, user.region, user.subject].filter(Boolean).join(" · ") ||
                t.prfNoSchool}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={<IconCamera size={16} />}
              onClick={() => toast(t.prfPhotoStub)}
              style={{ alignSelf: "flex-start", marginTop: 4 }}
            >
              {t.prfPhotoChange}
            </Button>
          </div>
        </div>

        <div className="profile-grid">
          {/* Личные данные */}
          <section className="card card-pad stack g16">
            <h2 className="h3">{t.prfPersonal}</h2>

            <div className="p-two">
              <div className="field">
                <label className="label" htmlFor="ln">
                  {t.prfLastName}
                </label>
                <input
                  id="ln"
                  className="input"
                  value={form.last_name}
                  onChange={(e) => upd("last_name", e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="fn">
                  {t.prfFirstName}
                </label>
                <input
                  id="fn"
                  className="input"
                  value={form.first_name}
                  onChange={(e) => upd("first_name", e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="mn">
                {t.prfMiddleName}
              </label>
              <input
                id="mn"
                className="input"
                value={form.middle_name}
                onChange={(e) => upd("middle_name", e.target.value)}
              />
            </div>

            {/* ИИН только на показ (решение владельца): он печатается
                в сертификате и в реестре академии, поэтому опечатку
                исправляет админ, а не сам учитель. Заглушку не рисуем —
                строки без значения здесь и так нет */}
            {iinFilled(user.iin) && (
              <div className="field">
                <span className="label">{t.iinLabel}</span>
                <strong className="mono">{user.iin}</strong>
                <span className="hint">{t.iinLocked}</span>
              </div>
            )}

            <Note kind="muted">
              <span className="small">{t.prfNameNote}</span>
            </Note>

            <div className="field">
              <label className="label" htmlFor="em">
                {t.prfEmail} <span className="label-optional">· {t.optional}</span>
              </label>
              <input
                id="em"
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
                placeholder="name@mail.kz"
              />
              <span className="hint">{t.prfEmailHint}</span>
            </div>

            {/* Школа, должность и предмет — обычные текстовые поля без справочников */}
            <div className="field">
              <label className="label" htmlFor="sc">
                {t.prfSchool} <span className="label-optional">· {t.optional}</span>
              </label>
              <input
                id="sc"
                className="input"
                value={form.school}
                onChange={(e) => upd("school", e.target.value)}
                placeholder={t.prfSchoolPh}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="ps">
                {t.prfPosition} <span className="label-optional">· {t.optional}</span>
              </label>
              <input
                id="ps"
                className="input"
                value={form.position}
                onChange={(e) => upd("position", e.target.value)}
                placeholder={t.prfPositionPh}
              />
            </div>

            <div className="p-two">
              <div className="field">
                <label className="label" htmlFor="rg">
                  {t.prfRegion}
                </label>
                <select
                  id="rg"
                  className="input"
                  value={form.region}
                  onChange={(e) => upd("region", e.target.value)}
                >
                  <option value="">{t.prfNotChosen}</option>
                  {/* Регион мог прийти из старых данных и не совпасть со справочником */}
                  {form.region && !regions.includes(form.region) && (
                    <option value={form.region}>{form.region}</option>
                  )}
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="ct">
                  {t.prfCity}
                </label>
                <input
                  id="ct"
                  className="input"
                  value={form.city}
                  onChange={(e) => upd("city", e.target.value)}
                />
              </div>
            </div>

            <div className="p-two">
              <div className="field">
                <label className="label" htmlFor="sj">
                  {t.prfSubject} <span className="label-optional">· {t.optional}</span>
                </label>
                <input
                  id="sj"
                  className="input"
                  value={form.subject}
                  onChange={(e) => upd("subject", e.target.value)}
                  placeholder="Математика"
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="ex">
                  {t.prfExperience}
                </label>
                <input
                  id="ex"
                  className="input"
                  inputMode="numeric"
                  value={form.experience}
                  onChange={(e) => upd("experience", e.target.value)}
                />
              </div>
            </div>
          </section>

          <div className="stack g20">
            {/* Настройки */}
            <section className="card card-pad stack g14">
              <h2 className="h3">{t.prfSettings}</h2>
              <div className="stack g8">
                <span className="label">{t.language}</span>
                <div className="segmented" style={{ alignSelf: "flex-start" }}>
                  <button data-active={lang === "ru"} onClick={() => setLang("ru")}>
                    Русский
                  </button>
                  <button data-active={lang === "kz"} onClick={() => setLang("kz")}>
                    Қазақша
                  </button>
                </div>
                <span className="hint">{t.prfLangHint}</span>
              </div>
            </section>

            {/* Аккаунт */}
            <section className="card card-pad stack g14">
              <h2 className="h3">{t.prfAccount}</h2>
              <div className="row between g12">
                <div className="row g10">
                  <span style={{ color: "var(--text-2)" }}>
                    <IconPhone size={20} />
                  </span>
                  <div className="stack">
                    <strong className="small">{phoneFmt(user.phone)}</strong>
                    <span className="caption muted-3">{t.prfPhoneHint}</span>
                  </div>
                </div>
              </div>

              <hr className="divider" />

              {/* Устройства: ограничения на число входов нет — список нужен,
                  чтобы человек сам увидел лишнее и закрыл доступ */}
              <div className="stack g10">
                <strong className="small">{t.secDevices}</strong>

                {sessions.loading && (
                  <div className="stack g8">
                    <Skeleton h={40} r={10} />
                    <Skeleton h={40} r={10} />
                  </div>
                )}
                {sessions.error && (
                  <div className="row between g10">
                    <span className="small muted">{t.loadError}</span>
                    <Button variant="ghost" size="sm" onClick={sessions.reload}>
                      {t.retry}
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
                        {deviceLabel(s.user_agent, t)}
                      </span>
                      <span className="caption muted-3">
                        {s.is_current ? t.prfNow : dayTime(s.last_seen_at, lang)}
                      </span>
                    </div>
                    {s.is_current ? (
                      <Badge kind="done">{t.prfThisDevice}</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => revokeSession(s)}>
                        {t.prfExit}
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  variant="secondary"
                  block
                  disabled={sessions.loading || onlyCurrent}
                  onClick={revokeOthers}
                >
                  {t.prfLogoutOthers}
                </Button>
              </div>

              {/* Админка — на своём домене, поэтому ссылка полным адресом */}
              {user.is_admin && (
                <>
                  <hr className="divider" />
                  <LinkButton href={routes.admin()} variant="ghost" block>
                    {t.prfOpenAdmin}
                    <IconChevronRight size={16} />
                  </LinkButton>
                </>
              )}

              <hr className="divider" />
              <button
                className="btn btn-danger-soft btn-block"
                onClick={() => setLogout(true)}
              >
                <IconLogout size={17} />
                {t.logout}
              </button>
            </section>
          </div>
        </div>

        {/* Кнопка сохранения — только при изменениях */}
        {dirty && (
          <div className="desktop-only" style={{ position: "sticky", bottom: 24 }}>
            <div className="row g10">
              <Button size="lg" loading={saving} onClick={save}>
                {t.save}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setForm(formFromUser(user))}>
                {t.prfDiscard}
              </Button>
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <div className="sticky-cta mobile-only">
          <div className="sticky-cta-inner row g8">
            <Button variant="secondary" onClick={() => setForm(formFromUser(user))}>
              {t.prfDiscard}
            </Button>
            <Button block size="lg" loading={saving} onClick={save}>
              {t.save}
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={logout}
        onClose={() => setLogout(false)}
        title={t.prfLogoutTitle}
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              onClick={async () => {
                await apiLogout();
                router.push(routes.home);
              }}
            >
              {t.prfExit}
            </Button>
            <Button variant="secondary" block onClick={() => setLogout(false)}>
              {t.cancel}
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">{t.prfLogoutText}</p>
      </Sheet>

      <style>{`
        .profile-grid { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        .p-two { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 560px) { .p-two { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .profile-grid { grid-template-columns: 1.3fr 1fr; gap: 24px; } }
      `}</style>
    </TeacherShell>
  );
}
