"use client";

/** Вход по телефону — раздел 5.4 брифа. Шаг 1: номер. Шаг 2: код из SMS. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@lms/prototype";
import { LangSwitch, Logo } from "@/components/layout/Shell";
import { Button, Note } from "@lms/ui";
import { IconArrowLeft, IconCheck, IconInfo } from "@lms/ui/icons";

const DEMO_CODE = "4812";

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

export default function LoginPage() {
  const router = useRouter();
  const { set, onboarded, toast } = useStore();

  const [step, setStep] = useState<1 | 2>(1);
  /** Только 10 цифр номера, без «+7» — маска строится из них */
  const [phone, setPhone] = useState("7071234567");
  const [agree, setAgree] = useState(true);
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState<null | "wrong" | "expired" | "blocked">(null);
  const [attempts, setAttempts] = useState(3);
  const [seconds, setSeconds] = useState(59);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInput = useRef<HTMLInputElement | null>(null);

  const phoneValid = phone.length === 10;

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
    if (step !== 2 || seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [step, seconds]);

  useEffect(() => {
    if (step === 2) inputs.current[0]?.focus();
  }, [step]);

  const sendCode = () => {
    if (!phoneValid || !agree) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setSeconds(59);
      setCode(["", "", "", ""]);
      setError(null);
      toast(`Код отправлен. Для прототипа: ${DEMO_CODE}`, "info");
    }, 600);
  };

  const submitCode = (value: string[]) => {
    const entered = value.join("");
    if (entered.length < 4) return;
    if (entered === DEMO_CODE) {
      setLoading(true);
      setTimeout(() => {
        set({ authed: true });
        router.push(onboarded ? "/my" : "/onboarding");
      }, 500);
      return;
    }
    const left = attempts - 1;
    setAttempts(left);
    setError(left <= 0 ? "blocked" : "wrong");
    setCode(["", "", "", ""]);
    inputs.current[0]?.focus();
  };

  const onDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      const next = [...code];
      next[i] = "";
      setCode(next);
      return;
    }
    // Автоподстановка кода из SMS: вставили сразу 4 цифры
    if (clean.length > 1) {
      const filled = clean.slice(0, 4).split("");
      const next = ["", "", "", ""].map((_, idx) => filled[idx] ?? "");
      setCode(next);
      setError(null);
      inputs.current[Math.min(filled.length, 3)]?.focus();
      submitCode(next);
      return;
    }
    const next = [...code];
    next[i] = clean;
    setCode(next);
    setError(null);
    if (i < 3) inputs.current[i + 1]?.focus();
    else submitCode(next);
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

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
              setAttempts(3);
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
                    Введите номер телефона — отправим SMS с кодом. Пароль не нужен.
                  </p>
                </div>

                <div className="field">
                  <label className="label" htmlFor="phone">
                    Номер телефона
                  </label>
                  <input
                    id="phone"
                    ref={phoneInput}
                    className="input"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={maskPhone(phone)}
                    onChange={onPhoneChange}
                    onKeyDown={onPhoneKey}
                    placeholder="+7 (___) ___-__-__"
                  />
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
                  <h1 className="h1">Введите код из SMS</h1>
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
                      className={`input ${error && error !== "expired" ? "input-error" : ""}`}
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
                      disabled={error === "blocked"}
                      onChange={(e) => onDigit(i, e.target.value)}
                      onKeyDown={(e) => onKey(i, e)}
                      aria-label={`Цифра ${i + 1}`}
                    />
                  ))}
                </div>

                {error === "wrong" && (
                  <div className="error-text row center">
                    Неверный код. Осталось {attempts} {attempts === 1 ? "попытка" : "попытки"}
                  </div>
                )}

                {error === "expired" && (
                  <Note kind="warning">
                    Код устарел — он действует 5 минут. Запросите новый.
                  </Note>
                )}

                {error === "blocked" && (
                  <Note kind="danger">
                    Ввод кода заблокирован на <strong>10 минут</strong>. Если не получается
                    войти — напишите нам, поможем.
                  </Note>
                )}

                {!error && (
                  <div className="row center g6 caption muted-3">
                    <IconInfo size={15} />
                    Код подставится из SMS автоматически
                  </div>
                )}

                <Button
                  block
                  size="lg"
                  loading={loading}
                  disabled={code.join("").length < 4 || error === "blocked"}
                  onClick={() => submitCode(code)}
                >
                  Войти
                </Button>

                <div className="row center">
                  {seconds > 0 ? (
                    <span className="small muted-3">
                      Отправить код повторно через 0:{seconds.toString().padStart(2, "0")}
                    </span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSeconds(59);
                        setError(null);
                        setAttempts(3);
                        setCode(["", "", "", ""]);
                        toast(`Новый код: ${DEMO_CODE}`, "info");
                      }}
                    >
                      Отправить новый код
                    </button>
                  )}
                </div>

                <Note kind="muted" icon={<IconInfo size={18} />}>
                  <span className="small">
                    Прототип: код <strong className="mono">{DEMO_CODE}</strong>. Любой другой
                    код покажет состояние ошибки.
                  </span>
                </Note>
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
