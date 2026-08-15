"use client";

/**
 * Экран проверки сертификата — раздел 5.12 брифа.
 * Общий для двух маршрутов: /verify (ввод руками)
 * и /verify/:number (открытие по QR — сразу результат).
 * Проверяющий — директор, отдел образования, комиссия. Ему нужен один ответ
 * «да» или «нет» крупно, без регистрации. Ошибка называется «не найден»,
 * а не «поддельный»: девять из десяти случаев — опечатка.
 */

import { useEffect, useState } from "react";
import { certRegistry } from "@lms/prototype/data";
import { Footer, PublicShell } from "@/components/layout/Shell";
import { Button, LinkButton, Note } from "@lms/ui";
import {
  IconAlert,
  IconCheckCircle,
  IconMail,
  IconQr,
  IconSearch,
  IconShield,
} from "@lms/ui/icons";

/** Приводит ввод к канону: регистр и дефисы можно не соблюдать. */
function normalize(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = clean.match(/^([A-Z]{2})(\d{4})(\d{6})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : clean;
}

export function VerifyPanel({ preset = "" }: { preset?: string }) {
  const [value, setValue] = useState(preset);
  const [checked, setChecked] = useState<null | { ok: boolean; number: string }>(null);
  const [loading, setLoading] = useState(false);

  const check = (raw: string) => {
    const number = normalize(raw);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setChecked({ ok: !!certRegistry[number], number });
    }, 500);
  };

  /* Открытие по QR: /verify/KZ-2026-004821 — сразу результат, без формы */
  useEffect(() => {
    if (preset) check(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const record = checked?.ok ? certRegistry[checked.number] : null;

  return (
    <PublicShell>
      <div className="page section" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }} className="stack g24">
          {/* ===== Результат: подлинный ===== */}
          {checked?.ok && record ? (
            <>
              <div
                className="card card-pad stack g20"
                style={{ borderColor: "#bbf7d0", borderWidth: 1.5, padding: "28px 20px" }}
              >
                <div className="stack g12" style={{ alignItems: "center", textAlign: "center" }}>
                  <span
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 999,
                      background: "var(--success)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconCheckCircle size={40} />
                  </span>
                  <div className="stack g4">
                    <h1 className="h1" style={{ color: "#15803d" }}>
                      Сертификат подлинный
                    </h1>
                    <span className="small muted">
                      Выдан платформой LMS · запись в реестре есть
                    </span>
                  </div>
                </div>

                <hr className="divider" />

                <dl className="verify-rows">
                  {[
                    ["ФИО", record.holder],
                    ["Курс", record.course],
                    ["Объём", `${record.hours} академических часов`],
                    ["Дата выдачи", record.date],
                    ["Номер", checked.number],
                  ].map(([k, v]) => (
                    <div key={k} className="verify-row">
                      <dt className="small muted">{k}</dt>
                      <dd className={k === "Номер" ? "mono" : ""} style={{ fontWeight: 600 }}>
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <Note kind="muted" icon={<IconShield size={18} />}>
                <span className="small">
                  Персональные данные, кроме ФИО, не показываем. Если данные на бумаге
                  отличаются от этих — документ подделан.
                </span>
              </Note>

              <Button
                variant="secondary"
                size="lg"
                block
                onClick={() => {
                  setChecked(null);
                  setValue("");
                }}
              >
                Проверить другой номер
              </Button>
            </>
          ) : checked && !checked.ok ? (
            /* ===== Результат: не найден ===== */
            <>
              <div
                className="card card-pad stack g16"
                style={{ borderColor: "#fecaca", borderWidth: 1.5, padding: "28px 20px" }}
              >
                <div className="stack g12" style={{ alignItems: "center", textAlign: "center" }}>
                  <span
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 999,
                      background: "var(--danger-bg)",
                      color: "var(--danger)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconAlert size={38} />
                  </span>
                  <div className="stack g4">
                    <h1 className="h1" style={{ color: "#991b1b" }}>
                      Сертификат не найден
                    </h1>
                    <span className="small muted">
                      Номера <span className="mono">{checked.number}</span> в реестре нет
                    </span>
                  </div>
                </div>
              </div>

              <div className="card card-pad stack g12">
                <h2 className="h3">Что можно сделать</h2>
                <ul className="stack g10" style={{ paddingLeft: 20 }}>
                  <li className="small">
                    Сверьте символы: в номере только латиница и цифры — «O» часто путают
                    с нулём, «З» с тройкой.
                  </li>
                  <li className="small">
                    Отсканируйте QR-код с сертификата — он подставит номер сам.
                  </li>
                  <li className="small">
                    Если номер точно верный, напишите нам — проверим вручную:{" "}
                    <a href="mailto:help@lms.kz" style={{ color: "var(--primary)" }}>
                      help@lms.kz
                    </a>
                  </li>
                </ul>
              </div>

              <div className="row g10 wrap">
                <Button
                  size="lg"
                  block
                  onClick={() => {
                    setChecked(null);
                  }}
                >
                  Проверить ещё раз
                </Button>
                <a href="mailto:help@lms.kz" className="btn btn-secondary btn-lg">
                  <IconMail size={18} />
                  Написать в поддержку
                </a>
              </div>
            </>
          ) : (
            /* ===== Форма ввода ===== */
            <>
              <div className="stack g10" style={{ textAlign: "center", alignItems: "center" }}>
                <span
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    background: "var(--primary-bg)",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconShield size={30} />
                </span>
                <h1 className="h1">Проверка сертификата</h1>
                <p className="body muted pretty" style={{ maxWidth: 480 }}>
                  Введите номер с сертификата — покажем, кому и за какой курс он выдан.
                  Регистрация не нужна.
                </p>
              </div>

              <div className="card card-pad stack g16">
                <div className="field">
                  <label className="label" htmlFor="num">
                    Номер сертификата
                  </label>
                  <input
                    id="num"
                    className="input mono"
                    style={{ fontSize: 18, height: 56, letterSpacing: "0.06em" }}
                    placeholder="KZ-2026-004821"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && value.trim() && check(value)}
                    autoComplete="off"
                  />
                  <span className="hint">
                    Номер напечатан под подписью, формат KZ-ГОД-6 цифр. Регистр и дефисы
                    можно не соблюдать.
                  </span>
                </div>

                <Button
                  size="lg"
                  block
                  loading={loading}
                  disabled={!value.trim()}
                  onClick={() => check(value)}
                  icon={loading ? undefined : <IconSearch size={18} />}
                >
                  Проверить
                </Button>
              </div>

              <div className="card card-pad row g14">
                <span
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconQr size={28} />
                </span>
                <p className="small muted pretty grow">
                  На бумажном сертификате есть QR-код — камера телефона откроет эту
                  страницу с готовым результатом.
                </p>
              </div>

              <Note kind="muted">
                <span className="small">
                  Для прототипа: рабочие номера{" "}
                  <button
                    className="mono"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 700,
                    }}
                    onClick={() => {
                      setValue("KZ-2026-004821");
                      check("KZ-2026-004821");
                    }}
                  >
                    KZ-2026-004821
                  </button>{" "}
                  и{" "}
                  <button
                    className="mono"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 700,
                    }}
                    onClick={() => {
                      setValue("KZ-2026-003107");
                      check("KZ-2026-003107");
                    }}
                  >
                    KZ-2026-003107
                  </button>
                  . Любой другой номер покажет состояние «не найден».
                </span>
              </Note>
            </>
          )}

          {checked && (
            <p className="caption muted-3" style={{ textAlign: "center" }}>
              Проверено 5 августа 2026, 14:03
            </p>
          )}
        </div>
      </div>

      <Footer />

      <style>{`
        .verify-rows { display: flex; flex-direction: column; gap: 12px; margin: 0; }
        .verify-row { display: grid; grid-template-columns: 1fr; gap: 2px; }
        .verify-row dd { margin: 0; }
        @media (min-width: 480px) {
          .verify-row { grid-template-columns: 140px 1fr; gap: 12px; align-items: baseline; }
        }
      `}</style>
    </PublicShell>
  );
}
