"use client";

/**
 * «Мои уроки» — свои комплекты, поиск и копия как основа следующего
 * (`TEACHER_AI_BRIEF`, раздел 4.3, последний абзац).
 *
 * Ручки списка на сервере пока нет — `listKits` тогда отдаёт `null`, и экран
 * говорит «список скоро появится», а не «ошибка»: комплекты целы, просто
 * перечислить их сервер ещё не умеет (подробнее — в `api.ts`).
 *
 * Копию экран не делает: «Копия» ведёт в новый разговор по прошлому
 * комплекту, заказ там собирает экран чата.
 */

import { useEffect, useRef, useState } from "react";
import { useLoad } from "@lms/api";
import { Button, Empty, LinkButton } from "@lms/ui";
import { IconClose, IconPlus, IconSearch, IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { AccessUntil, useLessonAiAccess } from "../access";
import { listKits, type LessonKitListItem, type LessonKitsPage } from "../api";
import { useChrome, useRoutes } from "../host";
import { LESSON_AI_NAME } from "../name";
import { LessonCard, LessonCardSkeleton } from "../components/lessons/LessonCard";

const PER_PAGE = 20;
/* Запрос уходит, когда учитель перестал печатать, а не на каждую букву */
const SEARCH_DELAY_MS = 300;

/* `null` внутри — «ручки нет»; обёртка, чтобы не путать его с «ещё грузится» */
interface Result {
  page: LessonKitsPage | null;
}

export function LessonsScreen() {
  const { t } = useLang();
  const routes = useRoutes();
  const { Shell } = useChrome();
  const { handle } = useLessonAiAccess();
  const toast = useToast();

  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  /* Догруженные страницы привязаны к запросу: сменился поиск — они чужие */
  const [more, setMore] = useState<{ q: string; items: LessonKitListItem[] }>({ q: "", items: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const qRef = useRef(q);
  qRef.current = q;

  useEffect(() => {
    const next = input.trim();
    const timer = setTimeout(() => setQ(next), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input]);

  /* Новый поиск начинается с первой страницы */
  useEffect(() => setMore({ q, items: [] }), [q]);

  /* Устаревший ответ свежий не перетрёт: `useLoad` отбрасывает всё, кроме последнего */
  const list = useLoad<Result>(
    () =>
      listKits({ q: q || undefined, page: 1, per_page: PER_PAGE }).then(
        (page) => ({ page }),
        (e) => {
          handle(e);
          throw e;
        },
      ),
    [q],
  );

  const clearSearch = () => {
    setInput("");
    setQ("");
  };

  const newLesson = (
    <LinkButton href={routes.home} icon={<IconPlus size={18} />}>
      {t.laNewLesson}
    </LinkButton>
  );

  const header = (
    <div className="row between wrap g12" style={{ alignItems: "flex-end" }}>
      <div className="stack g4" style={{ minWidth: 0 }}>
        <span className="caption muted-3">{LESSON_AI_NAME}</span>
        <h1 className="h1">{t.laMyLessons}</h1>
        <AccessUntil />
      </div>
      {newLesson}
    </div>
  );

  const frame = (body: React.ReactNode) => (
    <Shell>
      <div className="page section stack g20" style={{ paddingTop: 20, maxWidth: 820 }}>
        {header}
        {body}
      </div>
    </Shell>
  );

  const data = list.data;

  /* Первая загрузка: данных ещё нет вовсе */
  if (!data && !list.error) {
    return frame(
      <div className="stack g12" aria-busy="true">
        <LessonCardSkeleton />
        <LessonCardSkeleton />
        <LessonCardSkeleton />
      </div>,
    );
  }

  /* Ручки нет — поиск рисовать не для чего, искать не в чем */
  if (data && data.page === null) {
    return frame(
      <div className="card">
        <Empty
          icon={<IconSparkle size={38} />}
          title={t.laLessonsUnavailableTitle}
          text={t.laLessonsUnavailableText}
          action={newLesson}
        />
      </div>,
    );
  }

  const page = data?.page ?? null;
  const items = page ? [...page.items, ...(more.q === q ? more.items : [])] : [];
  const hasMore = page !== null && items.length < page.total;
  /* Свежий запрос ещё в пути — старый список остаётся, но приглушён */
  const stale = list.loading;

  /* Без поиска и без уроков — поле поиска ни к чему, зовём в первый урок */
  if (!list.error && !stale && page && page.total === 0 && !q) {
    return frame(
      <div className="card">
        <Empty
          icon={<IconSparkle size={38} />}
          title={t.laLessonsEmptyTitle}
          text={t.laLessonsEmptyText}
          action={newLesson}
        />
      </div>,
    );
  }

  const loadMore = async () => {
    const forQ = q;
    setLoadingMore(true);
    try {
      const next = await listKits({
        q: forQ || undefined,
        page: Math.floor(items.length / PER_PAGE) + 1,
        per_page: PER_PAGE,
      });
      /* Пока грузилось, учитель поменял поиск — эта страница уже не нужна */
      if (!next || qRef.current !== forQ) return;
      setMore((m) => ({
        q: forQ,
        items: [...(m.q === forQ ? m.items : []), ...next.items],
      }));
    } catch (e) {
      if (handle(e)) return;
      toast(t.laLessonsMoreError, "error");
    } finally {
      setLoadingMore(false);
    }
  };

  return frame(
    <>
      <div className="stack g8">
        <div className="input-wrap">
          <span className="input-icon">
            <IconSearch size={19} />
          </span>
          <input
            className="input"
            enterKeyHint="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.laLessonsSearch}
            aria-label={t.laLessonsSearch}
            style={{ paddingRight: input ? 48 : undefined }}
          />
          {input && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearSearch}
              aria-label={t.laLessonsClearSearch}
              style={{ position: "absolute", right: 4, minWidth: 40, padding: 0 }}
            >
              <IconClose size={16} />
            </button>
          )}
        </div>
        {page && page.total > 0 && (
          <span className="caption muted-3" aria-live="polite">
            {t.laLessonsCount(page.total)}
          </span>
        )}
      </div>

      {list.error ? (
        <div className="card">
          <Empty
            title={t.loadError}
            text={t.loadErrorText}
            action={
              <Button variant="secondary" onClick={list.reload}>
                {t.retry}
              </Button>
            }
          />
        </div>
      ) : items.length === 0 && !stale ? (
        <div className="card">
          <Empty
            icon={<IconSearch size={36} />}
            title={t.laLessonsNoMatchTitle}
            text={t.laLessonsNoMatchText}
            action={
              <Button variant="secondary" onClick={clearSearch}>
                {t.laLessonsClearSearch}
              </Button>
            }
          />
        </div>
      ) : (
        <div
          className="stack g12"
          aria-busy={stale}
          style={{ opacity: stale ? 0.55 : 1, transition: "opacity 0.15s" }}
        >
          {items.length === 0 ? (
            <>
              <LessonCardSkeleton />
              <LessonCardSkeleton />
            </>
          ) : (
            items.map((item) => <LessonCard key={item.id} item={item} />)
          )}
          {hasMore && !stale && (
            <Button variant="secondary" block loading={loadingMore} onClick={loadMore}>
              {t.showMore}
            </Button>
          )}
        </div>
      )}
    </>,
  );
}
