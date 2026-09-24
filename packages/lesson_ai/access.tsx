"use client";

/**
 * Доступ к «Жоспару» глазами экрана.
 *
 * Продукт закрыт двумя разными замками, и оба — не «ошибка» для учителя:
 *
 * - `503 lesson_ai_off` — продукта нет вовсе (выключен на сервере): пункт
 *   меню не рисуется, а открытый по ссылке экран говорит «недоступен»;
 * - `403 lesson_ai_no_access` — доступ не выдан, снят или истёк: вместо чата
 *   экран «как получить доступ» (`SESSION_L7_QA.md`, раздел для L8).
 *
 * Второй приходит с **любой** ручки продукта — доступ могут снять посреди
 * работы. Поэтому ворота отдают экранам `handle(e)`: экран зовёт его в каждом
 * `catch`, и если отказ про доступ, ворота сами переключаются на экран
 * доступа, а экран не рисует у себя «что-то пошло не так».
 *
 * Цена и срок доступа владельцем ещё не решены (`TEACHER_AI_BRIEF`, «Ждём
 * от владельца»): экран не называет ни цены, ни срока, а отправляет к
 * администратору. Дата окончания показывается, только если сервер её прислал,
 * — если доступ станет бессрочным, строка пропадёт сама.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isApiError, useLoad, useMe, type LessonAccessStatus } from "@lms/api";
import { ContactAdmin } from "@lms/course";
import { Button, Empty, Note, Skeleton } from "@lms/ui";
import { dayYear } from "@lms/ui/i18n";
import { IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { LESSON_AI_NAME } from "./name";
import { LESSON_AI_NO_ACCESS, LESSON_AI_OFF, getAccess } from "./api";
import { useChrome, useRoutes } from "./host";

/* ============ Пункт меню ============ */

/*
 * Ответ `GET /lesson_ai/access` на пункт меню кэшируется на вкладку: шапка
 * перерисовывается на каждом экране кабинета, и спрашивать сервер каждый раз
 * незачем — включают и выключают продукт не посреди сессии учителя.
 */
let menuCache: { userId: number; show: boolean } | null = null;

/**
 * Показывать ли «Жоспар» в меню площадки.
 *
 * Показывается и тому, у кого доступа нет: там его ждёт экран «как получить
 * доступ», а не пустота. Прячется только выключенный продукт — и на время,
 * пока сервер не ответил, чтобы пункт не мигал у тех, у кого его не будет.
 */
export function useLessonAiInMenu(): boolean {
  const { me } = useMe();
  const userId = me?.id ?? null;
  const [show, setShow] = useState(() => menuCache !== null && menuCache.userId === userId && menuCache.show);

  useEffect(() => {
    if (userId === null) {
      setShow(false);
      return;
    }
    if (menuCache?.userId === userId) {
      setShow(menuCache.show);
      return;
    }
    let alive = true;
    getAccess().then(
      () => {
        menuCache = { userId, show: true };
        if (alive) setShow(true);
      },
      (e) => {
        /* Выключен — запоминаем. Сеть или что-то ещё — не запоминаем:
           на следующем экране спросим снова */
        if (isApiError(e, LESSON_AI_OFF)) menuCache = { userId, show: false };
        if (alive) setShow(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [userId]);

  return show;
}

/* ============ Ворота продукта ============ */

interface AccessCtx {
  /** Последний день доступа (по Алматы, включительно); `null` — без срока. */
  expiresOn: string | null;
  /**
   * Разобрать отказ любой ручки продукта. `true` — отказ про доступ или
   * выключенный продукт, ворота уже переключились, экрану показывать нечего.
   */
  handle: (e: unknown) => boolean;
}

const Ctx = createContext<AccessCtx | null>(null);

export function useLessonAiAccess(): AccessCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Экран «Жоспара» должен стоять внутри <LessonAiGate>");
  return ctx;
}

/**
 * Пускает на экран продукта только того, у кого есть доступ. Гостя отправляет
 * на вход с возвратом, выключенный продукт и отсутствие доступа показывает
 * своими экранами в кадре площадки.
 */
export function LessonAiGate({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const { me, status } = useMe();
  const routes = useRoutes();
  const { Shell } = useChrome();
  const router = useRouter();
  /* Отказ посреди работы важнее первого ответа: он свежее */
  const [closed, setClosed] = useState<"off" | "lost" | null>(null);

  const access = useLoad<LessonAccessStatus | null>(
    () => (me ? getAccess() : Promise.resolve(null)),
    [me?.id],
  );

  useEffect(() => {
    if (status !== "guest") return;
    router.replace(routes.login(window.location.pathname + window.location.search));
  }, [status, router, routes]);

  const handle = useCallback((e: unknown) => {
    if (isApiError(e, LESSON_AI_NO_ACCESS)) {
      setClosed("lost");
      return true;
    }
    if (isApiError(e, LESSON_AI_OFF)) {
      setClosed("off");
      return true;
    }
    return false;
  }, []);

  if (closed === "off" || access.error?.code === LESSON_AI_OFF) {
    return (
      <Shell>
        <div className="page section">
          <Empty icon={<IconSparkle size={38} />} title={t.laOffTitle} text={t.laOffText} />
        </div>
      </Shell>
    );
  }

  if (closed === "lost" || access.data?.has_access === false) {
    return (
      <Shell>
        <NoAccess lost={closed === "lost"} />
      </Shell>
    );
  }

  if (access.error) {
    return (
      <Shell>
        <div className="page section">
          {/* Текст сервера сюда не идёт: он по-русски и для разработчика,
              а учителю важно одно — повторить */}
          <Empty
            title={t.loadError}
            text={t.loadErrorText}
            action={
              <Button variant="secondary" onClick={access.reload}>
                {t.retry}
              </Button>
            }
          />
        </div>
      </Shell>
    );
  }

  if (!access.data) {
    return (
      <Shell>
        <div className="page section stack g12" aria-label={t.laChecking}>
          <Skeleton w="40%" h={28} />
          <Skeleton w="80%" h={16} />
          <Skeleton w="100%" h={120} r={16} />
        </div>
      </Shell>
    );
  }

  return (
    <Ctx.Provider value={{ expiresOn: access.data.expires_on, handle }}>{children}</Ctx.Provider>
  );
}

/** «Как получить доступ»: к администратору, без цены и срока — их решает владелец. */
function NoAccess({ lost }: { lost: boolean }) {
  const { t } = useLang();
  return (
    <div className="page section">
      <div className="card card-pad stack g16" style={{ maxWidth: 560, margin: "0 auto" }}>
        <span style={{ color: "var(--primary)" }}>
          <IconSparkle size={36} />
        </span>
        <h1 className="h2">{t.laNoAccessTitle(LESSON_AI_NAME)}</h1>
        {lost && <Note kind="warning">{t.laAccessLost}</Note>}
        <p className="muted pretty">{t.laTagline}.</p>
        <p className="pretty">{t.laNoAccessText}</p>
        {/* Сервер не говорит, выдавался ли доступ раньше, — поэтому строка для тех,
            у кого он кончился, стоит всегда; при снятии посреди работы её заменяет плашка */}
        {!lost && <p className="small muted pretty">{t.laNoAccessRenew}</p>}
        <ContactAdmin />
        <span className="caption muted-3">{t.laNoAccessCourses}</span>
      </div>
    </div>
  );
}

/** «Доступ открыт по 31 декабря включительно» — только если срок есть. */
export function AccessUntil() {
  const { t, lang } = useLang();
  const { expiresOn } = useLessonAiAccess();
  if (!expiresOn) return null;
  return <span className="caption muted-3">{t.laAccessUntil(dayYear(expiresOn, lang))}</span>;
}
