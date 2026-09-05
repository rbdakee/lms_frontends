"use client";

/**
 * Экран проверки сертификата — раздел 5.12 брифа.
 * Общий для двух маршрутов: /verify (ввод руками)
 * и /verify/:number (открытие по QR — сразу результат).
 *
 * Проверяющий — директор, отдел образования, комиссия. Ему нужен один ответ
 * крупно и без регистрации: `GET /verify/{number}` публичный. Исходов три —
 * подлинный, отозванный и «в реестре нет»; последний называется «не найден»,
 * а не «поддельный»: девять из десяти случаев — опечатка.
 *
 * Номер нормализует сервер: регистр и дефисы соблюдать не нужно.
 */

import { useCallback, useEffect, useState } from "react";
import { api, isApiError, NETWORK_ERROR, type Verify } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { dayTime, dayYear } from "@lms/ui/i18n";
import { useBrand, useChrome, useContacts } from "../host";
import { Button, Note } from "@lms/ui";
import {
  IconAlert,
  IconCheckCircle,
  IconMail,
  IconQr,
  IconSearch,
  IconShield,
} from "@lms/ui/icons";

/** Что показываем после ответа сервера: документ, «нет в реестре» или отказ. */
type Result =
  | { kind: "found"; cert: Verify }
  | { kind: "missing"; number: string }
  | { kind: "error"; text: string };

export function VerifyScreen({ preset }: { preset: string }) {
  const { t, lang } = useLang();
  const { Footer, PublicShell } = useChrome();
  const { mail } = useContacts();
  /* Документ выдала та площадка, на которой его проверяют: экран общий,
     а имя в подписи — своё у каждой */
  const brand = useBrand();
  const [value, setValue] = useState(preset);
  const [result, setResult] = useState<Result | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /* Пришли по QR — форму не показываем даже мельком: ответ уже в пути */
  const [presetPending, setPresetPending] = useState(Boolean(preset.trim()));

  const check = useCallback(
    async (raw: string) => {
      const number = raw.trim();
      if (!number) return;
      setLoading(true);
      let next: Result;
      try {
        next = { kind: "found", cert: await api<Verify>(`/verify/${encodeURIComponent(number)}`) };
      } catch (e) {
        if (isApiError(e, "not_found")) next = { kind: "missing", number };
        else if (isApiError(e, "rate_limited"))
          next = { kind: "error", text: t.vfTooOften(e.retryAfterSec) };
        else if (isApiError(e, NETWORK_ERROR)) next = { kind: "error", text: t.loadErrorText };
        else next = { kind: "error", text: isApiError(e) ? e.message : t.loadErrorText };
      }
      setResult(next);
      setCheckedAt(new Date().toISOString());
      setLoading(false);
    },
    [t],
  );

  /* Открытие по QR: /verify/KZ-2026-XB7K2M — результат сразу, без нажатия */
  useEffect(() => {
    if (!preset.trim()) return;
    void check(preset).finally(() => setPresetPending(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const reset = (keepValue = false) => {
    setResult(null);
    setCheckedAt(null);
    if (!keepValue) setValue("");
  };

  const cert = result?.kind === "found" ? result.cert : null;
  const revoked = cert?.status === "revoked";

  /** Строки документа — только то, что напечатано на бумаге. */
  const rows: { label: string; value: string; mono?: boolean }[] = cert
    ? [
        { label: t.vfHolder, value: cert.holder_name },
        { label: t.vfCourse, value: cert.course_title },
        { label: t.vfHours, value: t.academicHours(cert.hours) },
        { label: t.vfIssued, value: dayYear(cert.issued_at, lang) },
        { label: t.vfNumber, value: cert.number, mono: true },
        /* Номер академии комиссии полезнее нашего, но у документов до 04.09.2026
           его ещё нет: пустую строку показывать нечем — строки тогда просто нет */
        ...(cert.registration_number
          ? [{ label: t.vfRegNumber, value: cert.registration_number, mono: true }]
          : []),
      ]
    : [];

  return (
    <PublicShell>
      <div className="page section" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }} className="stack g24">
          {cert ? (
            /* ===== Результат: подлинный или отозванный ===== */
            <>
              <div
                className="card card-pad stack g20"
                style={{
                  borderColor: revoked ? "var(--revoked-line)" : "var(--success-line)",
                  borderWidth: 1.5,
                  padding: "28px 20px",
                }}
              >
                <div className="stack g12" style={{ alignItems: "center", textAlign: "center" }}>
                  <span
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 999,
                      background: revoked ? "var(--warning-bg)" : "var(--success)",
                      color: revoked ? "var(--warning-text)" : "var(--text-on-fill)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {revoked ? <IconAlert size={38} /> : <IconCheckCircle size={40} />}
                  </span>
                  <div className="stack g4">
                    <h1 className="h1" style={{ color: revoked ? "var(--warning-text)" : "var(--success-strong)" }}>
                      {revoked ? t.vfRevoked : t.vfValid}
                    </h1>
                    <span className="small muted">
                      {revoked ? t.vfRevokedSub : t.vfValidSub(brand[lang].name)}
                    </span>
                    {revoked && cert.revoked_at && (
                      <span className="small" style={{ color: "var(--warning-text)", fontWeight: 600 }}>
                        {t.vfRevokedOn(dayYear(cert.revoked_at, lang))}
                      </span>
                    )}
                  </div>
                </div>

                <hr className="divider" />

                <dl className="verify-rows">
                  {rows.map((r) => (
                    <div key={r.label} className="verify-row">
                      <dt className="small muted">{r.label}</dt>
                      <dd className={r.mono ? "mono" : ""} style={{ fontWeight: 600 }}>
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <Note kind="muted" icon={<IconShield size={18} />}>
                <span className="small">{t.vfPrivacy}</span>
              </Note>

              <Button variant="secondary" size="lg" block onClick={() => reset()}>
                {t.vfAnother}
              </Button>
            </>
          ) : result?.kind === "missing" ? (
            /* ===== Результат: номера в реестре нет ===== */
            <>
              <div
                className="card card-pad stack g16"
                style={{ borderColor: "var(--danger-line)", borderWidth: 1.5, padding: "28px 20px" }}
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
                    <h1 className="h1" style={{ color: "var(--danger-text)" }}>
                      {t.vfNotFound}
                    </h1>
                    <span className="small muted">
                      <span className="mono">{result.number}</span> {t.vfNotFoundSub}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card card-pad stack g12">
                <h2 className="h3">{t.vfWhatToDo}</h2>
                <ul className="stack g10" style={{ paddingLeft: 20 }}>
                  <li className="small">{t.vfTip1}</li>
                  <li className="small">{t.vfTip2}</li>
                  <li className="small">
                    {t.vfTip3}{" "}
                    <a href={`mailto:${mail}`} style={{ color: "var(--primary)" }}>
                      {mail}
                    </a>
                  </li>
                </ul>
              </div>

              <div className="row g10 wrap">
                <Button size="lg" block onClick={() => reset(true)}>
                  {t.vfAgain}
                </Button>
                <a href={`mailto:${mail}`} className="btn btn-secondary btn-lg">
                  <IconMail size={18} />
                  {t.vfSupport}
                </a>
              </div>
            </>
          ) : presetPending ? (
            /* ===== Ответ по ссылке из QR ещё не пришёл ===== */
            <div
              className="card card-pad stack g12"
              style={{ alignItems: "center", padding: 40 }}
            >
              <span className="spinner" style={{ width: 28, height: 28, color: "var(--primary)" }} />
              <strong>{t.vfTitle}</strong>
              <span className="small mono muted-3">{preset.trim()}</span>
            </div>
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
                <h1 className="h1">{t.vfTitle}</h1>
                <p className="body muted pretty" style={{ maxWidth: 480 }}>
                  {t.vfLead}
                </p>
              </div>

              <div className="card card-pad stack g16">
                <div className="field">
                  <label className="label" htmlFor="num">
                    {t.vfNumberLabel}
                  </label>
                  <input
                    id="num"
                    className="input mono"
                    style={{ fontSize: 18, height: 56, letterSpacing: "0.06em" }}
                    placeholder="KZ-2026-XB7K2M"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void check(value)}
                    autoComplete="off"
                  />
                  <span className="hint">{t.vfHint}</span>
                </div>

                {/* Обрыв сети или лимит проверок: форму не прячем — повторяют здесь же */}
                {result?.kind === "error" && (
                  <Note kind="danger">
                    <span className="small">{result.text}</span>
                  </Note>
                )}

                <Button
                  size="lg"
                  block
                  loading={loading}
                  disabled={!value.trim()}
                  onClick={() => void check(value)}
                  icon={loading ? undefined : <IconSearch size={18} />}
                >
                  {t.vfCheck}
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
                <p className="small muted pretty grow">{t.vfQr}</p>
              </div>
            </>
          )}

          {checkedAt && result?.kind !== "error" && (
            <p className="caption muted-3" style={{ textAlign: "center" }}>
              {t.vfCheckedAt(dayTime(checkedAt, lang))}
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
