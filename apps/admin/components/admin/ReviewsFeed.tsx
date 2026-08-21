"use client";

/**
 * Лента отзывов по всей платформе — `GET /admin/reviews`.
 *
 * Премодерации нет: отзыв виден на странице курса сразу, админ отвечает или
 * удаляет постфактум. Очереди «неопубликованных» здесь не бывает, а удаление
 * и есть модерация.
 *
 * Пагинация и фильтры серверные — клиенту фильтровать нечего: он видит одну
 * страницу, а не всю ленту.
 *
 * Прототипная карточка `Moderation.tsx` осталась карточке курса до её сессии.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type AdminCoursesPage,
  type AdminReview,
  type AdminReviewsPage,
  type ReviewReplyIn,
} from "@lms/api";
import { dayTime, dayYear } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { Avatar, Button, Empty, Sheet, Stars } from "@lms/ui";
import { IconFilter, IconMessage, IconStar, IconTrash } from "@lms/ui/icons";

const PER_PAGE = 20;
/** Тот же лимит, что у сервера: 422 при 2000+ символов. */
const TEXT_MAX = 2000;

export function ReviewsFeed({
  onTotal,
}: {
  /** Счётчик для шапки экрана. `filtered` — чтобы шапка не выдавала
      отфильтрованное число за «сколько отзывов на платформе» */
  onTotal: (total: number, filtered: boolean) => void;
}) {
  const toast = useToast();

  const [courseId, setCourseId] = useState<"all" | number>("all");
  const [rating, setRating] = useState<"all" | number>("all");
  const [page, setPage] = useState(1);
  /* Мобильный: курс и оценка за одной кнопкой-иконкой, окно выезжает снизу —
     как на курсах и заявках */
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = useLoad(
    () =>
      api<AdminReviewsPage>(
        `/admin/reviews${qs({
          page,
          per_page: PER_PAGE,
          course_id: courseId === "all" ? undefined : courseId,
          rating: rating === "all" ? undefined : rating,
        })}`,
      ),
    [page, courseId, rating],
  );
  /* Курсы для фильтра берём у админки, а не из каталога: отзыв мог остаться
     у курса, снятого с публикации, — в каталоге такого курса уже нет */
  const courses = useLoad(
    () => api<AdminCoursesPage>(`/admin/courses${qs({ per_page: 100 })}`),
    [],
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = courseId !== "all" || rating !== "all";
  /* Счётчик на кнопке-иконке — сколько фильтров выставлено */
  const mobileFilters = (courseId !== "all" ? 1 : 0) + (rating !== "all" ? 1 : 0);

  /* Счётчик в шапке экрана — тот же `total`, что и у ленты */
  useEffect(() => {
    if (list.data) onTotal(list.data.total, filtered);
  }, [list.data, filtered, onTotal]);

  const resetFilters = () => {
    setCourseId("all");
    setRating("all");
    setPage(1);
  };

  /** Ответ пришёл с сервера целым отзывом — им и перерисовываем строку. */
  const replaceReview = (updated: AdminReview) => {
    list.setData((d) =>
      d ? { ...d, items: d.items.map((r) => (r.id === updated.id ? updated : r)) } : d,
    );
  };

  /* Страницу после удаления перечитываем целиком: вычеркнуть строку мало —
     на странице осталось бы 19 отзывов из 20, и пагинация поехала бы. Если
     строка была на странице последней, уходим на предыдущую: иначе экран
     останется пустым, а кнопок пагинации на нём уже не будет */
  const afterDelete = () => {
    if (items.length === 1 && page > 1) setPage((p) => p - 1);
    else list.reload();
  };

  /** Отзыва уже нет на сервере — убираем строку, чтобы не отвечать в пустоту. */
  const dropReview = (id: number) => {
    list.setData((d) =>
      d
        ? { ...d, items: d.items.filter((r) => r.id !== id), total: Math.max(0, d.total - 1) }
        : d,
    );
  };

  return (
    <div className="stack g16" style={{ maxWidth: 860 }}>
      {/* ===== Фильтры: на десктопе строкой, на мобильном — кнопка-иконка
          и окно снизу ===== */}
      <div className="row g10">
        <div className="row wrap g10 reviews-filters-inline">
          <select
            className="input"
            style={{ width: "auto", minWidth: 220 }}
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value === "all" ? "all" : Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="all">Все курсы</option>
            {(courses.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: "auto", minWidth: 150 }}
            value={rating}
            onChange={(e) => {
              setRating(e.target.value === "all" ? "all" : Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="all">Любая оценка</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="secondary"
          className="reviews-filter-btn"
          aria-label="Фильтры"
          icon={<IconFilter size={17} />}
          onClick={() => setFiltersOpen(true)}
        >
          {mobileFilters > 0 ? mobileFilters : null}
        </Button>
      </div>

      {list.loading && !list.data ? (
        <div className="card card-pad row center" style={{ minHeight: 200 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      ) : list.error ? (
        <div className="card">
          <Empty
            title="Не удалось загрузить"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={list.reload}>
                Повторить
              </Button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <Empty
            icon={<IconStar size={38} />}
            title={filtered ? "Отзывов не нашли" : "Отзывов пока нет"}
            text={
              filtered
                ? "По выбранным фильтрам отзывов нет."
                : "Отзыв можно оставить только после завершения курса — первые появятся здесь сами."
            }
            action={
              filtered ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {items.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              onReplied={replaceReview}
              onGone={dropReview}
              onDeleted={afterDelete}
              onError={(e) => {
                if (isApiError(e) && e.status > 0) toast(e.message, "error");
                else toast("Не удалось соединиться с сервером", "error");
              }}
            />
          ))}

          {pages > 1 && (
            <div className="row center g10">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </Button>
              <span className="small muted-3">
                Страница {page} из {pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}

      {/* Фильтры на мобильном. Значения общие со строкой фильтров и
          применяются сразу — «Готово» просто закрывает окно */}
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Фильтры"
        footer={
          <div className="stack g8">
            <Button block size="lg" onClick={() => setFiltersOpen(false)}>
              Готово
            </Button>
            {mobileFilters > 0 && (
              <Button variant="secondary" block onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            )}
          </div>
        }
      >
        <div className="stack g14">
          <div className="field">
            <label className="label">Курс</label>
            <select
              className="input"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value === "all" ? "all" : Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="all">Все курсы</option>
              {(courses.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Оценка</label>
            <select
              className="input"
              value={rating}
              onChange={(e) => {
                setRating(e.target.value === "all" ? "all" : Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="all">Любая оценка</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </div>
        </div>
      </Sheet>

      <style>{`
        .reviews-filter-btn { display: none; }
        @media (max-width: 899px) {
          .reviews-filters-inline { display: none; }
          .reviews-filter-btn { display: inline-flex; flex-shrink: 0; }
        }
      `}</style>
    </div>
  );
}

/* ============ Отзыв — без премодерации ============ */

/** Инициалы для аватара считает фронт: сервер отдаёт ФИО тремя полями. */
function initialsOf(teacher: AdminReview["teacher"]): string {
  return ((teacher.first_name[0] ?? "") + (teacher.last_name[0] ?? "")).toUpperCase() || "??";
}

function teacherName(teacher: AdminReview["teacher"]): string {
  return [teacher.last_name, teacher.first_name, teacher.middle_name].filter(Boolean).join(" ");
}

function ReviewItem({
  review,
  onReplied,
  onDeleted,
  onGone,
  onError,
}: {
  review: AdminReview;
  onReplied: (updated: AdminReview) => void;
  onDeleted: () => void;
  onGone: (id: number) => void;
  onError: (e: unknown) => void;
}) {
  const { lang } = useLang();
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [answering, setAnswering] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const body: ReviewReplyIn = { text };
      /* Повторный вызов меняет ответ — отдельной ручки правки нет */
      const updated = await api<AdminReview>(`/admin/reviews/${review.id}/reply`, {
        method: "POST",
        json: body,
      });
      setDraft("");
      setAnswering(false);
      onReplied(updated);
      toast("Ответ опубликован под отзывом", "success");
    } catch (e) {
      /* Отзыв успел удалить другой админ — строке в ленте больше не место */
      if (isApiError(e, "not_found")) {
        toast(e.message, "error");
        onGone(review.id);
        return;
      }
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api<void>(`/admin/reviews/${review.id}`, { method: "DELETE" });
      setConfirm(false);
      toast("Отзыв удалён со страницы курса", "success");
      onDeleted();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad stack g12">
      <div className="row g10">
        <Avatar initials={initialsOf(review.teacher)} size={38} tone="neutral" />
        <div className="grow stack g2" style={{ minWidth: 0 }}>
          <Link
            href={`/teachers/${review.teacher.id}`}
            className="small"
            style={{ fontWeight: 600, color: "var(--primary)" }}
          >
            {teacherName(review.teacher)}
          </Link>
          <span className="caption muted-3 pretty">
            {[review.teacher.school, review.teacher.city].filter(Boolean).join(" · ")}
          </span>
        </div>
        <Stars value={review.rating} />
      </div>

      <p className="body pretty">{review.text}</p>

      <span className="caption muted-3 pretty">
        {review.course.title} · {dayTime(review.created_at, lang)}
        {/* Отзыв могли переписать — без метки админ отвечал бы на текст,
            которого на странице курса уже нет */}
        {review.updated_at && ` · изменён ${dayYear(review.updated_at, lang)}`}
      </span>

      {review.reply && (
        <div
          className="stack g4"
          style={{ borderLeft: "3px solid var(--primary)", paddingLeft: 12 }}
        >
          <strong className="caption" style={{ color: "var(--primary)" }}>
            Ответ администратора
          </strong>
          <p className="small pretty">{review.reply.text}</p>
          <span className="caption muted-3">{dayTime(review.reply.created_at, lang)}</span>
        </div>
      )}

      {answering ? (
        <div className="stack g10">
          <textarea
            className="input"
            style={{ minHeight: 80 }}
            placeholder="Ответ появится под отзывом на странице курса"
            maxLength={TEXT_MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row g8">
            <Button size="sm" loading={busy} disabled={!draft.trim()} onClick={send}>
              Опубликовать ответ
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAnswering(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="row g8 wrap">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconMessage size={15} />}
            onClick={() => {
              setDraft(review.reply?.text ?? "");
              setAnswering(true);
            }}
          >
            {review.reply ? "Изменить ответ" : "Ответить"}
          </Button>
          <Button
            variant="danger-soft"
            size="sm"
            icon={<IconTrash size={15} />}
            onClick={() => setConfirm(true)}
          >
            Удалить
          </Button>
        </div>
      )}

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Удалить отзыв?"
        footer={
          <div className="stack g8">
            <Button variant="danger" block size="lg" loading={busy} onClick={remove}>
              Удалить
            </Button>
            <Button variant="secondary" block onClick={() => setConfirm(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          Отзыв пропадёт со страницы курса и перестанет влиять на среднюю оценку.
          Премодерации нет — отзывы публикуются сразу, поэтому удаление и есть модерация.
        </p>
      </Sheet>
    </div>
  );
}
