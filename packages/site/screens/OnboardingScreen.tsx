"use client";

/**
 * Онбординг — раздел 5.5 брифа.
 * Шаг 1: обязательны только фамилия и имя. Фото необязательное — без него
 * показываем инициалы, чтобы загрузка не стояла в критическом пути входа.
 * Шаг 2: можно пропустить.
 *
 * Сохранение — `PATCH /me`: шлём только изменённые поля, `null` для строки —
 * «стереть». Успешный PATCH отмечает `onboarding_done` на сервере.
 * `?next=` — куда идти после завершения (заявка на курс, начатая до входа).
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, isApiError, useDictionaries, useMe, type User } from "@lms/api";
import { useToast } from "@lms/ui/toast";
import { buildPatch, formFromUser, type UserForm } from "../lib/userForm";
import { useChrome, useRoutes } from "../host";
import { Button, Note, Progress } from "@lms/ui";
import { IconArrowLeft, IconCamera, IconInfo, IconUpload, IconUser } from "@lms/ui/icons";

export function OnboardingScreen() {
  const router = useRouter();
  const { me, status } = useMe();
  const routes = useRoutes();

  /* Гостю здесь делать нечего — сначала вход */
  useEffect(() => {
    if (status === "guest") router.replace(routes.login());
  }, [status, router]);

  if (!me) return null;
  return <OnboardingForm user={me} />;
}

function OnboardingForm({ user }: { user: User }) {
  const router = useRouter();
  const { setMe } = useMe();
  const toast = useToast();
  const dictionaries = useDictionaries();
  const routes = useRoutes();
  const { Logo } = useChrome();

  const [step, setStep] = useState<1 | 2>(1);
  const [photo, setPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(() => formFromUser(user));

  const upd = (k: keyof UserForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const step1Valid = form.last_name.trim() && form.first_name.trim();

  const finish = async (skipped: boolean) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      /* PATCH нужен даже без изменений: он отмечает onboarding_done */
      const updated = await api<User>("/me", {
        method: "PATCH",
        json: buildPatch(user, form),
      });
      setMe(updated);
      toast(skipped ? "Профиль можно дозаполнить позже" : "Профиль сохранён", "success");
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next ?? routes.my);
    } catch (e) {
      setError(isApiError(e) ? e.message : "Не удалось сохранить — попробуйте ещё раз");
      setSaving(false);
    }
  };

  const initials =
    ((form.first_name[0] ?? "") + (form.last_name[0] ?? "")).toUpperCase() || "";
  const regions = dictionaries.data?.regions ?? [];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header className="page row between g12" style={{ height: 64, flexShrink: 0 }}>
        {step === 2 ? (
          <button className="btn btn-icon" onClick={() => setStep(1)} aria-label="Назад">
            <IconArrowLeft />
          </button>
        ) : (
          <Logo />
        )}
        <span className="caption muted-3">Шаг {step} из 2</span>
      </header>

      <div className="page" style={{ marginBottom: 20 }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <Progress value={step === 1 ? 50 : 100} />
        </div>
      </div>

      <main className="page grow" style={{ paddingBottom: 40 }}>
        <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
          <div className="onb-card stack g20">
            {step === 1 ? (
              <>
                <div className="stack g8">
                  <h1 className="h1">Давайте познакомимся</h1>
                  <Note kind="info">
                    ФИО будет напечатано в сертификате — проверьте написание.
                  </Note>
                </div>

                <div className="row g16 wrap" style={{ alignItems: "center" }}>
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 999,
                      background: photo ? "var(--primary)" : "var(--surface-muted)",
                      color: photo ? "var(--text-on-fill)" : "var(--text-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 30,
                      fontWeight: 800,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {initials || <IconUser size={34} />}
                  </div>
                  <div className="stack g8 grow" style={{ minWidth: 180 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      Фото <span className="label-optional">· необязательно</span>
                    </span>
                    <div className="row g8 wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<IconUpload size={16} />}
                        onClick={() => {
                          setPhoto(true);
                          toast("Фото загружено", "success");
                        }}
                      >
                        Загрузить фото
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<IconCamera size={16} />}
                        onClick={() => {
                          setPhoto(true);
                          toast("Снимок сделан", "success");
                        }}
                      >
                        Сделать снимок
                      </Button>
                    </div>
                    <span className="caption muted-3">
                      Без фото показываем инициалы — {initials || "например, АН"}.
                      В сертификате фото нет.
                    </span>
                  </div>
                </div>

                <div className="stack g14">
                  <div className="field">
                    <label className="label" htmlFor="ln">
                      Фамилия
                    </label>
                    <input
                      id="ln"
                      className="input"
                      value={form.last_name}
                      onChange={(e) => upd("last_name", e.target.value)}
                      placeholder="Нурланова"
                    />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="fn">
                      Имя
                    </label>
                    <input
                      id="fn"
                      className="input"
                      value={form.first_name}
                      onChange={(e) => upd("first_name", e.target.value)}
                      placeholder="Айгуль"
                    />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="mn">
                      Отчество <span className="label-optional">· если есть</span>
                    </label>
                    <input
                      id="mn"
                      className="input"
                      value={form.middle_name}
                      onChange={(e) => upd("middle_name", e.target.value)}
                      placeholder="Сериковна"
                    />
                  </div>
                </div>

                <Button block size="lg" disabled={!step1Valid} onClick={() => setStep(2)}>
                  Продолжить
                </Button>
              </>
            ) : (
              <>
                <div className="stack g8">
                  <h1 className="h1">Немного о работе</h1>
                  <p className="body muted pretty">
                    Все поля необязательные — можно заполнить позже в профиле.
                  </p>
                </div>

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

                <div className="field">
                  <label className="label" htmlFor="sc">
                    Школа
                  </label>
                  <input
                    id="sc"
                    className="input"
                    value={form.school}
                    onChange={(e) => upd("school", e.target.value)}
                    placeholder="КГУ «Средняя школа №27»"
                  />
                </div>

                <div className="onb-two">
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
                      <option value="">Выберите регион</option>
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
                      placeholder="Алматы"
                    />
                  </div>
                </div>

                <div className="onb-two">
                  {/* Должность — обычное текстовое поле, справочника нет */}
                  <div className="field">
                    <label className="label" htmlFor="ps">
                      Должность
                    </label>
                    <input
                      id="ps"
                      className="input"
                      value={form.position}
                      onChange={(e) => upd("position", e.target.value)}
                      placeholder="Учитель математики"
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
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="sj">
                    Предмет
                  </label>
                  <input
                    id="sj"
                    className="input"
                    value={form.subject}
                    onChange={(e) => upd("subject", e.target.value)}
                    placeholder="Математика"
                  />
                </div>

                {error && <Note kind="danger">{error}</Note>}

                <div className="stack g10">
                  <Button block size="lg" loading={saving} onClick={() => finish(false)}>
                    Сохранить и начать
                  </Button>
                  <Button variant="secondary" block disabled={saving} onClick={() => finish(true)}>
                    Пропустить
                  </Button>
                </div>

                <div className="row center g6 caption muted-3">
                  <IconInfo size={15} />
                  Без этих полей всё работает — их можно заполнить в профиле
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .onb-card { padding: 4px 0 24px; }
        .onb-two { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) {
          .onb-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--r-card);
            box-shadow: var(--shadow);
            padding: 28px;
          }
          .onb-two { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
