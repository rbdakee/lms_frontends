"use client";

/**
 * Профиль «/profile» — раздел 5.13 брифа.
 * Кнопка «Сохранить» появляется только при изменениях.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { regions, sessions } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { admin } from "@/lib/urls";
import { TeacherShell } from "@/components/layout/Shell";
import { Avatar, Badge, Button, LinkButton, Note, Sheet } from "@lms/ui";
import {
  IconCamera,
  IconChevronRight,
  IconDevice,
  IconLogout,
  IconPhone,
  IconSettings,
} from "@lms/ui/icons";

export default function ProfilePage() {
  const router = useRouter();
  const {
    t,
    profile,
    set,
    setLang,
    lang,
    initials,
    fullName,
    resetDemo,
    toast,
    revokedSessions,
    revokeSession,
    revokeOtherSessions,
  } = useStore();

  const [form, setForm] = useState(profile);
  const [logout, setLogout] = useState(false);
  const [reset, setReset] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(profile),
    [form, profile],
  );

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    set({ profile: form });
    toast("Изменения сохранены", "success");
  };

  return (
    <TeacherShell>
      <div className={`page section stack g24 ${dirty ? "has-sticky-cta" : ""}`} style={{ paddingTop: 20 }}>
        <h1 className="h1">{t.navProfile}</h1>

        {/* Шапка профиля */}
        <div className="card card-pad row g16 wrap">
          <Avatar initials={initials} size={72} />
          <div className="grow stack g6" style={{ minWidth: 200 }}>
            <strong style={{ fontSize: 18, letterSpacing: "-0.01em" }} className="pretty">
              {fullName || "Заполните ФИО"}
            </strong>
            <span className="small muted pretty">
              {[profile.school, profile.region, profile.subject].filter(Boolean).join(" · ") ||
                "Школа и предмет не указаны"}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={<IconCamera size={16} />}
              onClick={() => toast("Открылась бы камера или выбор файла")}
              style={{ alignSelf: "flex-start", marginTop: 4 }}
            >
              Изменить фото
            </Button>
          </div>
        </div>

        <div className="profile-grid">
          {/* Личные данные */}
          <section className="card card-pad stack g16">
            <h2 className="h3">Личные данные</h2>

            <div className="p-two">
              <div className="field">
                <label className="label" htmlFor="ln">
                  Фамилия
                </label>
                <input
                  id="ln"
                  className="input"
                  value={form.lastName}
                  onChange={(e) => upd("lastName", e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="fn">
                  Имя
                </label>
                <input
                  id="fn"
                  className="input"
                  value={form.firstName}
                  onChange={(e) => upd("firstName", e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="mn">
                Отчество
              </label>
              <input
                id="mn"
                className="input"
                value={form.middleName}
                onChange={(e) => upd("middleName", e.target.value)}
              />
            </div>

            <Note kind="muted">
              <span className="small">
                ФИО печатается в сертификате — проверьте написание перед завершением курса.
              </span>
            </Note>

            <div className="field">
              <label className="label" htmlFor="em">
                Email <span className="label-optional">· необязательно</span>
              </label>
              <input
                id="em"
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
                placeholder="name@mail.kz"
              />
              <span className="hint">
                Пригодится, чтобы не потерять доступ и получать письма о проверке работ
              </span>
            </div>

            {/* Школа, должность и предмет — обычные текстовые поля без справочников */}
            <div className="field">
              <label className="label" htmlFor="sc">
                Школа <span className="label-optional">· необязательно</span>
              </label>
              <input
                id="sc"
                className="input"
                value={form.school}
                onChange={(e) => upd("school", e.target.value)}
                placeholder="КГУ «Средняя школа №27»"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="ps">
                Должность <span className="label-optional">· необязательно</span>
              </label>
              <input
                id="ps"
                className="input"
                value={form.position}
                onChange={(e) => upd("position", e.target.value)}
                placeholder="Учитель математики"
              />
            </div>

            <div className="p-two">
              <div className="field">
                <label className="label" htmlFor="rg">
                  Регион
                </label>
                <select
                  id="rg"
                  className="input"
                  value={form.region}
                  onChange={(e) => upd("region", e.target.value)}
                >
                  <option value="">Не выбрано</option>
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="ct">
                  Город или село
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
                  Предмет <span className="label-optional">· необязательно</span>
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
                  Стаж, лет
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
              <h2 className="h3">Настройки</h2>
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
                <span className="hint">
                  Меняет язык интерфейса. Курсы остаются на своём языке — курс может быть
                  на RU, на KZ или на обоих.
                </span>
              </div>
            </section>

            {/* Аккаунт */}
            <section className="card card-pad stack g14">
              <h2 className="h3">Аккаунт</h2>
              <div className="row between g12">
                <div className="row g10">
                  <span style={{ color: "var(--text-2)" }}>
                    <IconPhone size={20} />
                  </span>
                  <div className="stack">
                    <strong className="small">{profile.phone}</strong>
                    <span className="caption muted-3">вход по SMS</span>
                  </div>
                </div>
              </div>

              <hr className="divider" />

              {/* Устройства: ограничения на число входов нет — список нужен,
                  чтобы человек сам увидел лишнее и закрыл доступ */}
              <div className="stack g10">
                <strong className="small">{t.secDevices}</strong>
                {sessions.map((s) => {
                  const revoked = revokedSessions.includes(s.id);
                  return (
                    <div key={s.id} className="row g10" style={{ alignItems: "flex-start" }}>
                      <span style={{ color: revoked ? "var(--text-3)" : "var(--text-2)", marginTop: 2 }}>
                        <IconDevice size={20} />
                      </span>
                      <div className="grow stack g2" style={{ minWidth: 0 }}>
                        <span className="small" style={{ fontWeight: 600 }}>
                          {s.device} · {s.browser}
                        </span>
                        <span className="caption muted-3">
                          {revoked ? "выход выполнен" : `${s.where} · ${s.when}`}
                        </span>
                      </div>
                      {s.current ? (
                        <Badge kind="done">Это устройство</Badge>
                      ) : revoked ? (
                        <Badge kind="locked">Отключено</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            revokeSession(s.id);
                            toast("Выход выполнен на этом устройстве", "success");
                          }}
                        >
                          Выйти
                        </Button>
                      )}
                    </div>
                  );
                })}
                <Button
                  variant="secondary"
                  block
                  disabled={sessions.filter((s) => !s.current).every((s) => revokedSessions.includes(s.id))}
                  onClick={() => {
                    revokeOtherSessions();
                    toast("Вышли на всех других устройствах", "success");
                  }}
                >
                  Выйти на других устройствах
                </Button>
              </div>

              <hr className="divider" />
              <button
                className="btn btn-danger-soft btn-block"
                onClick={() => setLogout(true)}
              >
                <IconLogout size={17} />
                {t.logout}
              </button>
            </section>

            {/* Служебный блок прототипа */}
            <section className="card card-pad stack g12" style={{ background: "#fbfcff" }}>
              <div className="row g10">
                <span style={{ color: "var(--text-2)" }}>
                  <IconSettings size={20} />
                </span>
                <h2 className="h3">Управление прототипом</h2>
              </div>
              <p className="small muted pretty">
                Сбрасывает демо-данные: записи на курсы, прогресс, результаты тестов
                и сертификаты. Нужно для проверки пустых состояний.
              </p>
              <div className="stack g8">
                <Button variant="secondary" block onClick={() => setReset(true)}>
                  Сбросить прототип
                </Button>
                <LinkButton href={admin()} variant="ghost" block>
                  Открыть админку
                  <IconChevronRight size={16} />
                </LinkButton>
              </div>
            </section>
          </div>
        </div>

        {/* Кнопка сохранения — только при изменениях */}
        {dirty && (
          <div className="desktop-only" style={{ position: "sticky", bottom: 24 }}>
            <div className="row g10">
              <Button size="lg" onClick={save}>
                {t.save}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setForm(profile)}>
                Отменить
              </Button>
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <div className="sticky-cta mobile-only">
          <div className="sticky-cta-inner row g8">
            <Button variant="secondary" onClick={() => setForm(profile)}>
              Отменить
            </Button>
            <Button block size="lg" onClick={save}>
              {t.save}
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={logout}
        onClose={() => setLogout(false)}
        title="Выйти из аккаунта?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              onClick={() => {
                set({ authed: false });
                router.push("/");
              }}
            >
              Выйти
            </Button>
            <Button variant="secondary" block onClick={() => setLogout(false)}>
              {t.cancel}
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          Прогресс и сертификаты сохранятся. Чтобы вернуться, войдите по номеру телефона.
        </p>
      </Sheet>

      <Sheet
        open={reset}
        onClose={() => setReset(false)}
        title="Сбросить прототип"
        footer={
          <div className="stack g8">
            <Button
              block
              onClick={() => {
                resetDemo("default");
                setReset(false);
                toast("Демо-данные восстановлены", "success");
              }}
            >
              Вернуть демо-состояние
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => {
                resetDemo("empty");
                setReset(false);
                router.push("/");
              }}
            >
              Состояние нового пользователя
            </Button>
          </div>
        }
      >
        <div className="stack g10">
          <p className="small muted pretty">
            <strong>Демо-состояние</strong> — учитель в середине курса: 12 из 18 уроков,
            одно задание зачтено, одно на доработку, есть сертификат.
          </p>
          <p className="small muted pretty">
            <strong>Новый пользователь</strong> — пустые экраны: нет курсов, сертификатов
            и профиля. Выход из аккаунта, старт с лендинга.
          </p>
        </div>
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
