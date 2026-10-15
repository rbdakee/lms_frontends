"use client";

/* Значок предмета на чипе. Размер задан атрибутами, чтобы чипы не прыгали, пока
   картинка грузится; не загрузилась — чип остаётся без неё (скрываем, а не
   показываем битую иконку). Картинка декоративная: название предмета рядом. */

import { useState } from "react";
import { API_URL } from "@lms/api";

export function SubjectIcon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={`${API_URL}${url}`}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ flex: "none" }}
    />
  );
}
