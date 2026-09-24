"use client";

/**
 * Тело «Моих уроков»: поиск, список, «показать ещё», пустые состояния
 * и ошибки — без кадра страницы (`TEACHER_AI_BRIEF`, раздел 4.3, последний
 * абзац; задача `v596tj`). Кадром — `Shell`, заголовком, `AccessUntil`
 * и кнопкой «Новый урок» сверху — владеет тот, кто панель показывает:
 * сейчас это `LessonsScreen`, скоро ещё и рабочее место с чатом слева.
 *
 * Ручки списка на сервере пока нет — `listKits` тогда отдаёт `null`, и панель
 * показывает комплекты, открытые на этом устройстве (`recent.ts`), с честной
 * строкой, что общий список появится позже. Не «ошибка» и не тупик: экран
 * комплекта говорит «страницу можно закрыть», и найти урок потом надо где-то.
 *
 * Копию панель не делает: «Копия» ведёт в новый разговор по прошлому
 * комплекту, заказ там собирает экран чата.
 *
 * `compact` — боковая колонка рабочего места шириной ~360px: список и там,
 * и на странице в одну колонку («карточка» — это `stack`, а не сетка), гап
 * между поиском и списком там теснее, чтобы не съедать высоту зря.
 */

import { useEffect, useRef, useState } from "react";
import { isApiError, useLoad, useMe, type LessonKit } from "@lms/api";
import { Button, Empty, LinkButton, Note } from "@lms/ui";
import { IconClose, IconPlus, IconSearch, IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../../access";
import { getKit, listKits, type LessonKitListItem, type LessonKitsPage } from "../../api";
import { forgetKit, recentKitIds } from "../../recent";
import { useRoutes } from "../../host";
import { LessonCard, LessonCardSkeleton } from "./LessonCard";

const PER_PAGE = 20;
/* Запрос уходит, когда учитель перестал печатать, а не на каждую букву */
const SEARCH_DELAY_MS = 300;

/* `null` внутри — «ручки нет»; обёртка, чтобы не путать его с «ещё грузится» */
interface Result {
  page: LessonKitsPage | null;
  /** Комплекты с этого устройства — только когда ручки нет */
  local?: LessonKitListItem[];
}

/** Комплекты по номерам с этого устройства; чужой или удалённый (`404`) забываем. */
async function loadLocal(userId: number | null): Promise<LessonKitListItem[]> {
  if (userId === null) return [];
  const kits = await Promise.all(
    recentKitIds(userId).map(async (id) => {
      try {
        return await getKit(id);
      } catch (e) {
        if (isApiError(e) && e.status === 404) {
          forgetKit(userId, id);
          return null;
        }
        throw e;
      }
    }),
  );
  return kits
    .filter((k): k is LessonKit => k !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function LessonsPanel({ compact }: { compact?: boolean }): React.JSX.Element {
  const { t } = useLang();
  const routes = useRoutes();
  const { handle } = useLessonAiAccess();
  const toast = useToast();
  const userId = useMe().me?.id ?? null;

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
      listKits({ q: q || undefined, page: 1, per_page: PER_PAGE })
        .then(async (page): Promise<Result> => (page ? { page } : { page: null, local: await loadLocal(userId) }))
        .catch((e) => {
          handle(e);
          throw e;
        }),
    [q, userId],
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

  const data = list.data;

  /* Первая загрузка: данных ещё нет вовсе */
  if (!data && !list.error) {
    return (
      <div className="stack g12" aria-busy="true">
        <LessonCardSkeleton />
        <LessonCardSkeleton />
        <LessonCardSkeleton />
      </div>
    );
  }

  /* Ручки нет — поиск рисовать не для чего: на устройстве уроков немного */
  if (data && data.page === null) {
    const local = data.local ?? [];
    return local.length === 0 ? (
      <div className="card">
        <Empty
          icon={<IconSparkle size={38} />}
          title={t.laLessonsUnavailableTitle}
          text={t.laLessonsUnavailableText}
          action={newLesson}
        />
      </div>
    ) : (
      <div className="stack g12">
        <Note kind="muted">
          <span className="small">{t.laLessonsLocalNote}</span>
        </Note>
        {local.map((item) => (
          <LessonCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const page = data?.page ?? null;
  const items = page ? [...page.items, ...(more.q === q ? more.items : [])] : [];
  const hasMore = page !== null && items.length < page.total;
  /* Свежий запрос ещё в пути — старый список остаётся, но приглушён */
  const stale = list.loading;

  /* Без поиска и без уроков — поле поиска ни к чему, зовём в первый урок */
  if (!list.error && !stale && page && page.total === 0 && !q) {
    return (
      <div className="card">
        <Empty
          icon={<IconSparkle size={38} />}
          title={t.laLessonsEmptyTitle}
          text={t.laLessonsEmptyText}
          action={newLesson}
        />
      </div>
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

  /* Гап — единственное, чем компактный режим отличается от страницы: сама
     колонка уже в одну карточку в ширину в обоих случаях (`.stack`, не сетка),
     поиск занимает всю ширину сам (`.input { width: 100% }`), а кнопка «Копия»
     карточки не обрезается — строка футера переносится (`row wrap`) */
  return (
    <div className={`stack ${compact ? "g12" : "g20"}`}>
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
    </div>
  );
}
