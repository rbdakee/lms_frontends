"use client";

/**
 * Вход в админку — тот же вход по коду, что у учителя, но на своём домене:
 * за кодом больше не нужно уходить в клиентское приложение.
 *
 * Куку `sid` ставит API, и она одна на оба фронта (в бою — `COOKIE_DOMAIN=.domain.kz`),
 * поэтому вход отсюда открывает и кабинет учителя, и наоборот.
 *
 * Онбординга здесь нет: ФИО, школа и регион нужны заявке учителя, а админу — нет.
 * Права выдаёт сервер, экран лишь не ведёт дальше того, у кого `is_admin` false,
 * и предлагает войти другим номером.
 *
 * Ввод номера и кода повторяет `apps/web/app/login/page.tsx`. Это второе
 * повторение, а не третье: общий компонент завели бы раньше, чем стало видно,
 * чем экраны расходятся.
 *
 * В разработке код входа пишется в лог контейнера `api`.
 */

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, isApiError, useMe, type User } from "@lms/api";
import { useToast } from "@lms/ui/toast";
import { web } from "@/lib/urls";
import { Button, Empty, Note } from "@lms/ui";
import { IconArrowLeft, IconCheck, IconInfo, IconLock } from "@lms/ui/icons";
import logo from "@lms/ui/logo.png";

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
 * номера. Разделители после цифры проглатываются — каретка встаёт туда, куда
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

/**
 * Куда вернуть после входа. Берём из адреса, а не из состояния: сюда приводит
 * ссылка с закрытого экрана. Чужие адреса не пускаем — иначе ссылка вида
 * `/login?next=https://…` уводила бы админа с домена после успешного входа.
 */
function nextPath() {
  const raw = new URLSearchParams(window.location.search).get("next");
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

/** Ошибка на шаге кода. `blocked` — ввод заблокирован (`too_many_attempts`). */
type CodeError =
  | { kind: "wrong"; attempts_left: number }
  | { kind: "expired" }
  | { kind: "blocked" }
  | { kind: "other"; message: string };

export default function AdminLoginPage() {
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
  /** Вход прошёл, но прав администратора у аккаунта нет */
  const [denied, setDenied] = useState(false);
  /** Секунды до повторной отправки кода — из `retry_after_sec` */
  const [seconds, setSeconds] = useState(0);
  /** Секунды до разблокировки ввода после `too_many_attempts` */
  const [blockSeconds, setBlockSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInput = useRef<HTMLInputElement | null>(null);

  const phoneValid = phone.length === 10;

  /* Админ уже вошёл и просто открыл /login — делать здесь нечего. Проверка шага
     отличает этот случай от только что успешного входа, где переходом
     управляет submitCode. Учителя без прав не уводим: он пришёл сюда
     как раз затем, чтобы войти другим номером. */
  useEffect(() => {
    if (me?.is_admin && step === 1) router.replace(nextPath());
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
      /* Вход состоялся в любом случае — кука уже стоит. Дальше пускает
         не экран, а `is_admin`: без прав показываем отказ здесь же,
         чтобы можно было сразу набрать другой номер. */
      if (user.is_admin) router.replace(nextPath());
      else setDenied(true);
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

  /** Вернуться к номеру — и с шага кода, и с отказа по правам */
  const backToPhone = () => {
    setStep(1);
    setDenied(false);
    setError(null);
    setCode(["", "", "", ""]);
  };

  const blocked = error?.kind === "blocked";
  const blockMinutes = Math.max(1, Math.ceil(blockSeconds / 60));

  return (
    <div className="row center" style={{ minHeight: "100dvh", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="row center g10" style={{ marginBottom: 20 }}>
          <img src={logo.src} alt="" className="logo-emblem" width={38} height={38} />
          <span className="stack" style={{ lineHeight: 1.2 }}>
            <strong style={{ fontSize: 13.5 }}>
              Академия педагогов
              <br />
              и психологов
            </strong>
            <span className="caption muted-3">панель управления</span>
          </span>
        </div>

        <div className="card stack g20" style={{ padding: 28 }}>
          {denied ? (
            <Empty
              icon={<IconLock size={36} />}
              title="Нет прав администратора"
              text="Вход выполнен, но у этого номера нет прав администратора. Войдите другим номером — или откройте кабинет учителя."
              action={
                <div className="row center g10">
                  <Button variant="primary" onClick={backToPhone}>
                    Войти другим номером
                  </Button>
                  <a href={web("/my")} className="btn btn-secondary">
                    Кабинет учителя
                  </a>
                </div>
              }
            />
          ) : step === 1 ? (
            <>
              <div className="stack g8">
                <h1 className="h1">Вход в админку</h1>
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
            </>
          ) : (
            <>
              <div className="row g10" style={{ alignItems: "flex-start" }}>
                <button className="btn btn-icon" onClick={backToPhone} aria-label="Изменить номер">
                  <IconArrowLeft />
                </button>
                <div className="stack g8 grow">
                  <h1 className="h1">Введите код из WhatsApp</h1>
                  <p className="body muted">
                    Отправили на <strong style={{ color: "var(--text)" }}>{maskPhone(phone)}</strong>
                  </p>
                </div>
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
                <Note kind="warning">Код устарел — он действует 5 минут. Запросите новый.</Note>
              )}

              {blocked && (
                <Note kind="danger">
                  Ввод кода заблокирован. Попробуйте через{" "}
                  <strong>
                    {blockMinutes}{" "}
                    {blockMinutes === 1 ? "минуту" : blockMinutes < 5 ? "минуты" : "минут"}
                  </strong>
                  .
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
                    Отправить код повторно через {Math.floor(seconds / 60)}:
                    {(seconds % 60).toString().padStart(2, "0")}
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
          <a href={web("/")} className="btn btn-ghost btn-sm">
            На сайт платформы
          </a>
        </div>
      </div>
    </div>
  );
}
