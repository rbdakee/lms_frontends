"use client";

import { useEffect, useState } from "react";

/** Домен-заглушка для серверного рендера и печатного макета до гидрации. */
const FALLBACK_HOST = "lms.kz";

/**
 * Настоящий адрес, на котором открыт прототип.
 * Нужен, чтобы «Скопировать ссылку для проверки» и QR на сертификате вели
 * на этот же сайт — localhost, preview-ссылку Vercel или боевой домен,
 * а не на захардкоженный lms.kz.
 *
 * Читается после монтирования: на сервере window нет, и без этого
 * разъезжается гидрация.
 */
export function useOrigin() {
  const [origin, setOrigin] = useState(`https://${FALLBACK_HOST}`);
  const [host, setHost] = useState(FALLBACK_HOST);

  useEffect(() => {
    setOrigin(window.location.origin);
    setHost(window.location.host);
  }, []);

  /** Полная ссылка на страницу проверки конкретного сертификата. */
  const verifyUrl = (number: string) => `${origin}/verify/${number}`;

  /** Короткий адрес без протокола — для печати на сертификате. */
  const verifyHost = `${host}/verify`;

  return { origin, host, verifyUrl, verifyHost };
}
