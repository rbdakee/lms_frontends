"use client";

/**
 * Комплект на экране: первая загрузка, тихое перечитывание и опрос.
 *
 * Не `useLoad`: тому перечитать — значит снова показать скелетон, а комплект
 * перечитывается посреди работы — после правки задачи (ключи пересобрались)
 * и по опросу, пока материалы собираются. Экран при этом не должен мигать,
 * а открытые правки блоков — теряться.
 *
 * Опрос. Генерация асинхронная (`TEACHER_AI_BRIEF`, раздел 7), задание —
 * на каждый материал отдельно, и `GET /lesson_ai/kits/{id}` отдаёт статус
 * каждого: экран показывает готовое, пока остальное пишется. Правила:
 * - спрашиваем, только пока комплект `generating`. Из банка комплект бывает
 *   готов сразу (L7) — тогда опроса нет вовсе;
 * - сначала часто, потом реже: план собирается 10–20 секунд, полный
 *   комплект — минуты, а открытых вкладок у учителей сотни;
 * - следующий запрос — после ответа предыдущего, а не по таймеру поверх
 *   медленного сервера; в скрытой вкладке не спрашиваем, вернулся — сразу;
 * - сбой сети на опросе не стирает экран: остаётся последний ответ, над ним
 *   «проверяем снова», и опрос продолжается.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, NETWORK_ERROR, useMe, type LessonKit } from "@lms/api";
import { useLessonAiAccess } from "../../access";
import { getKit } from "../../api";
import { rememberKit } from "../../recent";

const FAST_MS = 3_000;
const SLOW_MS = 8_000;
/** Сколько опрашиваем часто — дальше комплект явно собирается не один план */
const FAST_FOR_MS = 60_000;

export interface KitState {
  kit: LessonKit | null;
  /** Ошибка первой загрузки; тихое перечитывание её не ставит */
  error: ApiError | null;
  /** Первая загрузка заново, со скелетоном — кнопка «Повторить» */
  reload: () => void;
  /** Перечитать без скелетона. `false` — не получилось, на экране старый комплект */
  refresh: () => Promise<boolean>;
  /** Положить комплект, пришедший откуда-то ещё */
  setKit: (kit: LessonKit) => void;
  /** Опрос не достучался до сервера — на экране последний ответ, пробуем снова */
  pollFailing: boolean;
}

export function useKit(kitId: string): KitState {
  const { handle } = useLessonAiAccess();
  const userId = useMe().me?.id ?? null;
  const [kit, setKitState] = useState<LessonKit | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pollFailing, setPollFailing] = useState(false);
  /* Номер запроса: ответ устаревшего не должен затереть свежий */
  const seq = useRef(0);

  const load = useCallback(
    async (quiet: boolean): Promise<boolean> => {
      const my = ++seq.current;
      if (!quiet) {
        setKitState(null);
        setError(null);
      }
      try {
        const fresh = await getKit(kitId);
        if (seq.current === my) setKitState(fresh);
        return true;
      } catch (e) {
        /* Ответ обогнал свежий запрос — это не сбой сети, судить будет свежий */
        if (seq.current !== my) return true;
        if (handle(e)) return false;
        if (!quiet) {
          setError(
            e instanceof ApiError ? e : new ApiError(0, { code: NETWORK_ERROR, message: "" }),
          );
        }
        return false;
      }
    },
    [kitId, handle],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  /* Открытый комплект — в «Мои уроки» этого устройства, пока нет списка с сервера */
  const loadedId = kit?.id ?? null;
  useEffect(() => {
    if (userId !== null && loadedId !== null) rememberKit(userId, loadedId);
  }, [userId, loadedId]);

  const reload = useCallback(() => {
    load(false);
  }, [load]);
  const refresh = useCallback(() => load(true), [load]);
  const setKit = useCallback((k: LessonKit) => setKitState(k), []);

  const generating = kit?.status === "generating";
  /* Счётчик ответов опроса, удачных и нет: от него заводится следующий тик */
  const [polls, setPolls] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!generating) return;
    const delay = Date.now() - startedAt.current < FAST_FOR_MS ? FAST_MS : SLOW_MS;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    const poll = async () => {
      const ok = await load(true);
      if (!alive) return;
      setPollFailing(!ok);
      setPolls((n) => n + 1);
    };
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") void poll();
        else schedule();
      }, delay);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (timer) clearTimeout(timer);
      void poll();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [generating, polls, load]);

  return { kit, error, reload, refresh, setKit, pollFailing };
}
