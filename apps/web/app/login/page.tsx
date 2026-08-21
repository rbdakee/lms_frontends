"use client";

/**
 * Вход по телефону — раздел 5.4 брифа. Шаг 1: номер. Шаг 2: код из WhatsApp.
 *
 * Живой API: `POST /auth/request_code` → таймер повтора из `retry_after_sec`,
 * `POST /auth/verify_code` → пользователь и кука сессии. Три состояния ошибок
 * кода: `wrong_code` (осталось N попыток), `code_expired`, `too_many_attempts`
 * (ввод заблокирован, таймер). В dev код пишется в лог контейнера `api` (SMS_PROVIDER=log).
 *
 * `?next=` — куда вернуть после входа: страница курса присылает сюда учителя,
 * нажавшего «Записаться» без входа, и заявка отправляется после возвращения.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, isApiError, useMe, type User } from "@lms/api";
import { useToast } from "@lms/ui/toast";
import { LangSwitch, Logo } from "@/components/layout/Shell";
import { Button, Note } from "@lms/ui";
import { IconArrowLeft, IconCheck, IconInfo } from "@lms/ui/icons";

/**
 * Ввод телефона живёт в «пространстве цифр»: в состоянии лежат ровно 10 цифр
 * номера без кода страны, а маска — производная от них. Всё редактирование
 * (в том числе Backspace) пересчитывается на цифрах, поэтому каретка не залипает
 * на разделителях «)», «-» и пробелах: маска сразу вернула бы их обратно.
 */

/** «+7 (707) 123-45-67» → «7071234567» (без кода страны) */
function phoneDigits(raw: string) {
  return raw.replace(/\D/g, "").replace(/^8/, "7").replace(/^7/, "").slice(0, 10);
}

/** «7071234567» → «+7 (707) 123-45-67» */
function maskPhone(d: string) {
  let out = "+7";
  if (d.length) out += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

/**
 * Позиция каретки в маске так, чтобы слева от неё осталось ровно `count` цифр
 * номера. Разделители после цифры проглатываются — каретка встаёт там, куда
 * попадёт следующая цифра, а не перед закрывающей скобкой.
 */
function caretAfterDigits(masked: string, count: number) {
  const open = masked.indexOf("(");
  if (count <= 0 || open < 0) return masked.length;
  let seen = 0;
  for (let i = open + 1; i < masked.length; i++) {
    if (!/\d/.test(masked[i])) continue;
    if (++seen < count) continue;
    let j = i + 1;
    while (j < masked.length && !/\d/.test(masked[j])) j++;
    return j;
  }
  return masked.length;
}

/** Ошибка на шаге кода. `blocked` — ввод заблокирован (`too_many_attempts`). */
type CodeError =
  | { kind: "wrong"; attempts_left: number }
  | { kind: "expired" }
  | { kind: "blocked" }
  | { kind: "other"; message: string };

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { me, setMe } = useMe();

  const [step, setStep] = useState<1 | 2>(1);
  /** Только 10 цифр номера, без «+7» — маска строится из них */
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(true);
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState<CodeError | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  /** Секунды до повторной отправки кода — из `retry_after_sec` */
  const [seconds, setSeconds] = useState(0);
  /** Секунды до разблокировки ввода после `too_many_attempts` */
  const [blockSeconds, setBlockSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInput = useRef<HTMLInputElement | null>(null);

  const phoneValid = phone.length === 10;

  /* Уже вошёл и просто открыл /login — на экране входа делать нечего.
     Проверка шага отличает этот случай от только что успешного входа,
     где редиректом управляет submitCode (там есть ?next=). */
  useEffect(() => {
    if (me && step === 1) router.replace("/my");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, router]);

  /** Куда поставить каретку после ближайшей перерисовки поля */
  const caretAt = useRef<number | null>(null);

  // Каретку возвращаем синхронно после коммита DOM: React перерисовывает
  // маску целиком и иначе увёл бы её в конец строки.
  useLayoutEffect(() => {
    if (caretAt.current === null) return;
    phoneInput.current?.setSelectionRange(caretAt.current, caretAt.current);
    caretAt.current = null;
  });

  /** Пишет цифры в состояние и запоминает место каретки — после `keep`-й цифры */
  const applyPhone = (next: string, keep: number) => {
    caretAt.current = caretAfterDigits(maskPhone(next), keep);
    setPhone(next);
  };

  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    const next = phoneDigits(raw);
    const keep = phoneDigits(raw.slice(0, caret)).length;

    // Ввод, который не добавил цифр (буква, лишний разделитель): состояние
    // не изменится, перерисовки не будет — возвращаем маску в поле руками.
    if (next === phone) {
      const pos = caretAfterDigits(maskPhone(phone), keep);
      el.value = maskPhone(phone);
      el.setSelectionRange(pos, pos);
      return;
    }
    setPhoneError(null);
    applyPhone(next, keep);
  };

  /**
   * Backspace и Delete обрабатываем сами: браузер стёр бы разделитель, маска
   * тут же вернула бы его — и удаление вставало бы намертво перед «)».
   */
  const onPhoneKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace" && e.key !== "Delete") return;
    const el = e.currentTarget;
    const { selectionStart: from, selectionEnd: to } = el;
    if (from === null || to === null || from !== to) return; // выделение — обычное поведение

    const left = phoneDigits(el.value.slice(0, from)).length;
    const index = e.key === "Backspace" ? left - 1 : left;
    e.preventDefault();
    if (index < 0 || index >= phone.length) return;
    applyPhone(phone.slice(0, index) + phone.slice(index + 1), index);
  };

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds > 0]);

  useEffect(() => {
    if (blockSeconds <= 0) return;
    const id = setInterval(
      () =>
        setBlockSeconds((s) => {
          /* Таймер вышел — ввод снова открыт */
          if (s <= 1) setError(null);
          return s - 1;
        }),
      1000,
    );
    return () => clearInterval(id);
  }, [blockSeconds > 0]);

  useEffect(() => {
    if (step === 2) inputs.current[0]?.focus();
  }, [step]);

  const sendCode = async () => {
    if (!phoneValid || !agree || loading) return;
    setLoading(true);
    setPhoneError(null);
    try {
      const { retry_after_sec } = await api<{ retry_after_sec: number }>(
        "/auth/request_code",
        { method: "POST", json: { phone: maskPhone(phone), consent: agree } },
      );
      setStep(2);
      setSeconds(retry_after_sec);
      setBlockSeconds(0);
      setCode(["", "", "", ""]);
      setError(null);
    } catch (e) {
      if (isApiError(e, "rate_limited")) {
        /* Код уже отправлен — идём вводить его, таймер повтора из ответа */
        setStep(2);
        setSeconds(e.retryAfterSec || 60);
        setCode(["", "", "", ""]);
        setError(null);
        toast(e.message, "info");
      } else if (isApiError(e, "too_many_attempts")) {
        setStep(2);
        setSeconds(0);
        setError({ kind: "blocked" });
        setBlockSeconds(e.retryAfterSec || 600);
      } else if (isApiError(e)) {
        setPhoneError(e.message);
      } else {
        setPhoneError("Не удалось соединиться с сервером");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (value: string[]) => {
    const entered = value.join("");
    if (entered.length < 4 || loading) return;
    setLoading(true);
    try {
      const user = await api<User>("/auth/verify_code", {
        method: "POST",
        json: { phone: maskPhone(phone), code: entered },
      });
      setMe(user);
      /* «Записаться» без входа: после входа возвращаем на страницу курса.
         Новичка сначала ведём в онбординг — заявке нужны ФИО из профиля. */
      const next = new URLSearchParams(window.location.search).get("next");
      if (!user.onboarding_done) {
        router.push(next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding");
      } else {
        router.push(next ?? "/my");
      }
      return;
    } catch (e) {
      if (isApiError(e, "wrong_code")) {
        setError({ kind: "wrong", attempts_left: e.attemptsLeft });
      } else if (isApiError(e, "code_expired")) {
        setError({ kind: "expired" });
      } else if (isApiError(e, "too_many_attempts")) {
        setError({ kind: "blocked" });
        setBlockSeconds(e.retryAfterSec || 600);
      } else {
        setError({
          kind: "other",
          message: e instanceof Error ? e.message : "Что-то пошло не так",
        });
      }
      setCode(["", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      const next = [...code];
      next[i] = "";
      setCode(next);
      return;
    }
    // Вставили сразу 4 цифры: код копируется кнопкой в самом сообщении
    if (clean.length > 1) {
      const filled = clean.slice(0, 4).split("");
      const next = ["", "", "", ""].map((_, idx) => filled[idx] ?? "");
      setCode(next);
      setError(null);
      inputs.current[Math.min(filled.length, 3)]?.focus();
      void submitCode(next);
      return;
    }
    const next = [...code];
    next[i] = clean;
    setCode(next);
    setError(null);
    if (i < 3) inputs.current[i + 1]?.focus();
    else void submitCode(next);
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const blocked = error?.kind === "blocked";
  const blockMinutes = Math.max(1, Math.ceil(blockSeconds / 60));

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header className="page row between" style={{ height: 64, flexShrink: 0 }}>
        {step === 1 ? (
          <Logo />
        ) : (
          <button
            className="btn btn-icon"
            onClick={() => {
              setStep(1);
              setError(null);
            }}
            aria-label="Изменить номер"
          >
            <IconArrowLeft />
          </button>
        )}
        <LangSwitch />
      </header>

      <main
        className="page grow"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 24 }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div className="login-card stack g20">
            {step === 1 ? (
              <>
                <div className="stack g8">
                  <h1 className="h1">Вход</h1>
                  <p className="body muted pretty">
                    Введите номер телефона — отправим код в WhatsApp. Пароль не нужен.
                  </p>
                </div>

                <div className="field">
                  <label className="label" htmlFor="phone">
                    Номер телефона
                  </label>
                  <input
                    id="phone"
                    ref={phoneInput}
                    className={`input ${phoneError ? "input-error" : ""}`}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={maskPhone(phone)}
                    onChange={onPhoneChange}
                    onKeyDown={onPhoneKey}
                    placeholder="+7 (___) ___-__-__"
                  />
                  {phoneError && <span className="error-text">{phoneError}</span>}
                </div>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <span className="check-box">
                    <IconCheck size={14} />
                  </span>
                  <span className="check-label small">
                    Согласен(-на) с{" "}
                    <span style={{ color: "var(--primary)" }}>условиями использования</span> и
                    обработкой персональных данных
                  </span>
                </label>

                <Button
                  block
                  size="lg"
                  onClick={sendCode}
                  loading={loading}
                  disabled={!phoneValid || !agree}
                >
                  Получить код
                </Button>

                <div className="row center">
                  <Link href="mailto:help@lms.kz" className="btn btn-ghost btn-sm">
                    Не приходит код?
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="stack g8">
                  <h1 className="h1">Введите код из WhatsApp</h1>
                  <p className="body muted">
                    Отправили на <strong style={{ color: "var(--text)" }}>{maskPhone(phone)}</strong>
                    {" · "}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 0, minHeight: 0, display: "inline" }}
                      onClick={() => setStep(1)}
                    >
                      Изменить номер
                    </button>
                  </p>
                </div>

                <div className="row center g10">
                  {code.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputs.current[i] = el;
                      }}
                      className={`input ${error && error.kind !== "expired" ? "input-error" : ""}`}
                      style={{
                        width: 58,
                        height: 62,
                        textAlign: "center",
                        fontSize: 24,
                        fontWeight: 800,
                        padding: 0,
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      value={c}
                      disabled={blocked}
                      onChange={(e) => onDigit(i, e.target.value)}
                      onKeyDown={(e) => onKey(i, e)}
                      aria-label={`Цифра ${i + 1}`}
                    />
                  ))}
                </div>

                {error?.kind === "wrong" && (
                  <div className="error-text row center">
                    Неверный код. Осталось {error.attempts_left}{" "}
                    {error.attempts_left === 1 ? "попытка" : "попытки"}
                  </div>
                )}

                {error?.kind === "expired" && (
                  <Note kind="warning">
                    Код устарел — он действует 5 минут. Запросите новый.
                  </Note>
                )}

                {blocked && (
                  <Note kind="danger">
                    Ввод кода заблокирован. Попробуйте через{" "}
                    <strong>
                      {blockMinutes} {blockMinutes === 1 ? "минуту" : blockMinutes < 5 ? "минуты" : "минут"}
                    </strong>{" "}
                    или напишите нам — поможем войти.
                  </Note>
                )}

                {error?.kind === "other" && <Note kind="danger">{error.message}</Note>}

                {!error && (
                  <div className="row center g6 caption muted-3">
                    <IconInfo size={15} />
                    Скопируйте код из WhatsApp — он подставится сам
                  </div>
                )}

                <Button
                  block
                  size="lg"
                  loading={loading}
                  disabled={code.join("").length < 4 || blocked}
                  onClick={() => void submitCode(code)}
                >
                  Войти
                </Button>

                <div className="row center">
                  {seconds > 0 ? (
                    <span className="small muted-3">
                      Отправить код повторно через{" "}
                      {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
                    </span>
                  ) : (
                    <button className="btn btn-ghost btn-sm" disabled={loading} onClick={sendCode}>
                      Отправить новый код
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="row center" style={{ marginTop: 20 }}>
            <Link href="/" className="btn btn-ghost btn-sm">
              На главную
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        .login-card { padding: 4px 0; }
        @media (min-width: 640px) {
          .login-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--r-card);
            box-shadow: var(--shadow);
            padding: 28px;
          }
        }
      `}</style>
    </div>
  );
}
