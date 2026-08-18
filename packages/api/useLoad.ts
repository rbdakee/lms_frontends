"use client";

/**
 * Загрузка данных экрана: три обязательных состояния из правил фронтенда —
 * загрузка, ошибка сети с кнопкой «Повторить», данные (в том числе пустые).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, NETWORK_ERROR } from "./client";

interface Load<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
  /** Точечно поправить данные после мутации, не перечитывая всё. */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): Load<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  /* Номер запроса: ответ устаревшего запроса не должен затереть свежий */
  const seq = useRef(0);

  const run = useCallback(() => {
    const my = ++seq.current;
    setLoading(true);
    setError(null);
    fn().then(
      (d) => {
        if (seq.current !== my) return;
        setData(d);
        setLoading(false);
      },
      (e) => {
        if (seq.current !== my) return;
        setError(
          e instanceof ApiError
            ? e
            : new ApiError(0, { code: NETWORK_ERROR, message: "Не удалось загрузить" }),
        );
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
