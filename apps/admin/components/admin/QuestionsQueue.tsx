"use client";

/**
 * Очередь вопросов от учителей — `GET /admin/questions`.
 *
 * Один и тот же блок стоит на экране «Вопросы» и вкладкой в карточке курса:
 * там он привязан к курсу параметром `course_id`. Экран открывается с
 * фильтром «только без ответа» — это и есть очередь.
 *
 * Вопрос — тред ровно в два уровня: вопрос и плоский список ответов.
 * «Без ответа» — пустой `replies`, отдельного статуса у вопроса нет.
 * Отвечает админ тем же `POST /lessons/{id}/questions` с `parent_id`,
 * что и учитель, — `lesson.id` для этого и лежит в элементе списка.
 *
 * Площадок две, админка одна на обе и по умолчанию показывает обе. Фильтр
 * площадки живёт в адресе (`?platform=`) и есть только в сводной очереди:
 * в карточке курса вопросы и так сужены курсом, а адрес там принадлежит
 * карточке. Метка площадки в строке нужна в обоих случаях.
 *
 * Удалить (`DELETE /admin/thread_messages/{id}`) можно любое сообщение — и вопрос,
 * и ответ. Корневой вопрос уносит из выдачи и ответы под ним: тред без вопроса
 * нечитаем, поэтому список после такого удаления перечитывается целиком.
 */

import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type AdminQuestion,
  type AdminQuestionsPage,
  type CatalogOut,
  type Platform,
  type ThreadQuestion,
} from "@lms/api";
import { dayTime } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import {
  PlatformChip,
  PlatformFilter,
  usePlatformFilter,
} from "@/components/admin/platforms";
import { Avatar, Badge, Button, Empty, Sheet } from "@lms/ui";
import { IconCheckCircle, IconFilter, IconSearch, IconTrash } from "@lms/ui/icons";

const PER_PAGE = 20;
/** Тот же лимит текста, что и у учителя (CONTRACT: 422 при 2000+ символов). */
const TEXT_MAX = 2000;

export function QuestionsQueue({
  courseId,
  standalone = false,
  onAnswered,
}: {
  /** Курс задан снаружи (вкладка карточки курса) — выбор курса тогда не нужен */
  courseId?: number;
  /** Сводная очередь «/questions», а не вкладка карточки курса.
      Признак отдельный от `courseId`: у курса на демо-данных числового id нет,
      и `courseId` там приходит пустым — по нему вкладку карточки от очереди
      не отличить. Фильтр площадки живёт в адресе, и класть его в адрес
      карточки курса, где уже есть свой `?tab=`, нельзя. */
  standalone?: boolean;
  /** Тред изменился — ответили или удалили сообщение: снаружи можно
      перечитать счётчик «без ответа» */
  onAnswered?: () => void;
}) {
  const { t } = useLang();
  const toast = useToast();

  const [onlyOpen, setOnlyOpen] = useState(true);
  const [query, setQuery] = useState("");
  /* Поиск уходит на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [course, setCourse] = useState<"all" | number>("all");
  /* Площадка — единственный фильтр очереди, который живёт в адресе: им
     делятся ссылкой, и он переживает перезагрузку */
  const [platform, setPlatform] = usePlatformFilter();
  const [page, setPage] = useState(1);
  /* Мобильный: поиск, курс и «только без ответа» за одной кнопкой-иконкой,
     окно выезжает снизу — как на курсах и заявках */
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const filterCourse = courseId ?? (course === "all" ? undefined : course);
  /* В карточке курса фильтра площадки нет вовсе: очередь там про один курс,
     а `?platform=` в адресе принадлежит карточке, а не встроенному блоку */
  const filterPlatform = standalone ? platform : null;

  const list = useLoad(
    () =>
      api<AdminQuestionsPage>(
        `/admin/questions${qs({
          page,
          per_page: PER_PAGE,
          answered: onlyOpen ? false : undefined,
          course_id: filterCourse,
          platform: filterPlatform,
          q,
        })}`,
      ),
    [page, onlyOpen, filterCourse, filterPlatform, q],
  );
  /* Выбор курса нужен, только когда курс не задан снаружи */
  const catalog = useLoad(
    () => (courseId ? Promise.resolve(null) : api<CatalogOut>("/courses")),
    [courseId],
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const courseOptions = (catalog.data?.items ?? []).flatMap((g) => g.versions);
  const filtered = q !== "" || course !== "all" || filterPlatform !== null;
  /* Счётчик на кнопке-иконке: «только без ответа» — состояние по умолчанию,
     в счёт идёт снятая галка, а не выставленная */
  const mobileFilters =
    (q !== "" ? 1 : 0) +
    (course !== "all" ? 1 : 0) +
    (filterPlatform !== null ? 1 : 0) +
    (onlyOpen ? 0 : 1);
  /* Пусто из-за фильтров, пустая очередь и «вопросов нет вовсе» — три разных
     сообщения: первое чинится сбросом, второе — хорошая новость */
  const emptyTitle = filtered
    ? t.qaNoMatchTitle
    : onlyOpen
      ? t.qaEmptyTitle
      : courseId
        ? t.qaCourseEmpty
        : t.qaEmptyTitle;

  /** Ответ пришёл с сервера — дописываем его в тред, не перечитывая список. */
  const addReply = (questionId: number, reply: ThreadQuestion) => {
    list.setData((d) =>
      d
        ? {
            ...d,
            items: d.items.map((it) =>
              it.id === questionId ? { ...it, replies: [...it.replies, reply] } : it,
            ),
          }
        : d,
    );
    onAnswered?.();
  };

  /* Корневой вопрос уносит с собой все ответы — страницу проще перечитать,
     чем чинить её руками. Если он был на странице последним, перечитывать
     нечего: уходим на предыдущую, иначе экран останется пустым, а пагинация
     на пустом экране уже не рисуется */
  const removeQuestion = () => {
    if (items.length === 1 && page > 1) setPage((p) => p - 1);
    else list.reload();
    onAnswered?.();
  };

  /** Удалён один ответ — вычёркиваем его из треда, не перечитывая список. */
  const removeReply = (questionId: number, replyId: number) => {
    list.setData((d) =>
      d
        ? {
            ...d,
            items: d.items.map((it) =>
              it.id === questionId
                ? { ...it, replies: it.replies.filter((r) => r.id !== replyId) }
                : it,
            ),
          }
        : d,
    );
    onAnswered?.();
  };

  const changePlatform = (next: Platform | null) => {
    setPlatform(next);
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setCourse("all");
    setOnlyOpen(true);
    /* Адрес чистим только там, где чипы площадки видны */
    if (standalone) setPlatform(null);
    setPage(1);
  };

  return (
    <div className="stack g14" style={{ maxWidth: 860 }}>
      {/* ===== Фильтры: на десктопе строкой, на мобильном — кнопка-иконка
          и окно снизу ===== */}
      <div className="row g10">
        <div className="row wrap g10 grow qa-filters-inline" style={{ minWidth: 0 }}>
          <div className="input-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              placeholder={t.qaSearch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {!courseId && (
            <select
              className="input"
              style={{ width: "auto", minWidth: 190 }}
              value={course}
              onChange={(e) => {
                setCourse(e.target.value === "all" ? "all" : Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="all">{t.subAllCourses}</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          {standalone && <PlatformFilter value={platform} onChange={changePlatform} />}
          <Button
            variant={onlyOpen ? "primary" : "secondary"}
            onClick={() => {
              setOnlyOpen((v) => !v);
              setPage(1);
            }}
          >
            {t.qaOnlyOpen}
          </Button>
        </div>
        <Button
          variant="secondary"
          className="qa-filter-btn"
          aria-label={t.filters}
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
            title={t.loadError}
            text={t.loadErrorText}
            action={
              <Button variant="secondary" onClick={list.reload}>
                {t.retry}
              </Button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <Empty
            icon={<IconCheckCircle size={38} />}
            title={emptyTitle}
            text={filtered ? t.qaNoMatchText : onlyOpen ? t.qaEmptyText : undefined}
            action={
              filtered ? (
                <Button variant="secondary" onClick={resetFilters}>
                  {t.resetFilters}
                </Button>
              ) : onlyOpen ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOnlyOpen(false);
                    setPage(1);
                  }}
                >
                  {t.qaShowAll}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {items.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              showCourse={!courseId}
              onReplied={addReply}
              onDeleted={removeQuestion}
              onReplyDeleted={removeReply}
              onError={(e) => {
                if (isApiError(e) && e.status > 0) toast(e.message, "error");
                else toast(t.qaSendError, "error");
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
                {t.back}
              </Button>
              <span className="small muted-3">{t.pageOf(page, pages)}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t.forward}
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
        title={t.filters}
        footer={
          <div className="stack g8">
            <Button block size="lg" onClick={() => setFiltersOpen(false)}>
              {t.ready}
            </Button>
            {mobileFilters > 0 && (
              <Button variant="secondary" block onClick={resetFilters}>
                {t.resetFilters}
              </Button>
            )}
          </div>
        }
      >
        <div className="stack g14">
          <div className="field">
            <label className="label">{t.search}</label>
            <div className="input-wrap">
              <span className="input-icon">
                <IconSearch size={19} />
              </span>
              <input
                className="input"
                placeholder={t.qaSearch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {!courseId && (
            <div className="field">
              <label className="label">{t.subCourse}</label>
              <select
                className="input"
                value={course}
                onChange={(e) => {
                  setCourse(e.target.value === "all" ? "all" : Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value="all">{t.subAllCourses}</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Без подписи «Площадка»: чипы сами начинаются со слова «Все
              площадки», а при одной площадке фильтр не рисуется вовсе */}
          {standalone && <PlatformFilter value={platform} onChange={changePlatform} />}
          <Button
            block
            variant={onlyOpen ? "primary" : "secondary"}
            onClick={() => {
              setOnlyOpen((v) => !v);
              setPage(1);
            }}
          >
            {t.qaOnlyOpen}
          </Button>
        </div>
      </Sheet>

      <style>{`
        .qa-filter-btn { display: none; }
        @media (max-width: 899px) {
          .qa-filters-inline { display: none; }
          .qa-filter-btn { display: inline-flex; flex-shrink: 0; }
        }
      `}</style>
    </div>
  );
}

/* ============ Вопрос — тред ============ */

/** Инициалы для аватара считает фронт: сервер отдаёт ФИО тремя полями. */
function initialsOf(teacher: AdminQuestion["teacher"]): string {
  return ((teacher.first_name[0] ?? "") + (teacher.last_name[0] ?? "")).toUpperCase() || "??";
}

function teacherName(teacher: AdminQuestion["teacher"]): string {
  return [teacher.last_name, teacher.first_name, teacher.middle_name].filter(Boolean).join(" ");
}

function QuestionCard({
  question,
  showCourse,
  onReplied,
  onDeleted,
  onReplyDeleted,
  onError,
}: {
  question: AdminQuestion;
  /** В карточке курса название курса не нужно — оно уже в шапке экрана */
  showCourse?: boolean;
  onReplied: (questionId: number, reply: ThreadQuestion) => void;
  onDeleted: () => void;
  onReplyDeleted: (questionId: number, replyId: number) => void;
  onError: (e: unknown) => void;
}) {
  const { t, lang } = useLang();
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  /* Что подтверждаем: корневой вопрос или конкретный ответ */
  const [removing, setRemoving] = useState<"question" | number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const created = await api<ThreadQuestion>(`/lessons/${question.lesson.id}/questions`, {
        method: "POST",
        json: { text, parent_id: question.id },
      });
      setDraft("");
      /* Отвеченный вопрос не выдёргиваем из-под руки: он остаётся на месте
         со своим ответом, а из очереди «без ответа» уйдёт при следующей загрузке */
      onReplied(question.id, created);
      toast(t.qaSent, "success");
    } catch (e) {
      onError(e);
    } finally {
      setSending(false);
    }
  };

  /** Удаляет сообщение треда: `null` — корневой вопрос, число — ответ. */
  const remove = async (replyId: number | null) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api<void>(`/admin/thread_messages/${replyId ?? question.id}`, {
        method: "DELETE",
      });
      setRemoving(null);
      if (replyId === null) {
        toast("Вопрос удалён вместе с ответами", "success");
        onDeleted();
      } else {
        toast("Ответ удалён", "success");
        onReplyDeleted(question.id, replyId);
      }
    } catch (e) {
      onError(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card card-pad stack g12">
      <div className="row g10">
        <Avatar initials={initialsOf(question.teacher)} size={38} tone="neutral" />
        <div className="grow stack g2" style={{ minWidth: 0 }}>
          <strong className="small">{teacherName(question.teacher)}</strong>
          <span className="caption muted-3 pretty">
            {t.qaLesson(question.lesson.number, question.lesson.title)} ·{" "}
            {dayTime(question.created_at, lang)}
          </span>
        </div>
        <PlatformChip platform={question.platform} />
        <Badge kind={question.replies.length ? "accepted" : "review"}>
          {question.replies.length ? t.qaInThread(question.replies.length) : t.qaNoAnswer}
        </Badge>
      </div>

      <p className="body pretty">{question.text}</p>
      {showCourse && <span className="caption muted-3">{question.course.title}</span>}

      {question.replies.length > 0 && (
        <div
          className="stack g12"
          style={{ borderLeft: "3px solid var(--border)", paddingLeft: 12 }}
        >
          {question.replies.map((r) => (
            <div key={r.id} className="stack g4">
              <div className="row g8 wrap">
                <strong
                  className="caption"
                  style={{ color: r.author_is_admin ? "var(--primary)" : "var(--text)" }}
                >
                  {r.author_name || (r.author_is_admin ? t.qAdmin : "")}
                </strong>
                {r.author_is_admin && <Badge kind="new">{t.qAdmin}</Badge>}
                <span className="caption muted-3 grow">{dayTime(r.created_at, lang)}</span>
                <Button
                  variant="danger-soft"
                  size="sm"
                  icon={<IconTrash size={14} />}
                  aria-label="Удалить ответ"
                  onClick={() => setRemoving(r.id)}
                />
              </div>
              <p className="small pretty">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="stack g10">
        <textarea
          className="input"
          style={{ minHeight: 80 }}
          placeholder={t.qaAnswerPlaceholder}
          maxLength={TEXT_MAX}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="row between wrap g10">
          <span className="caption muted-3">{t.qaWhoAnswers}</span>
          <div className="row g8">
            <Button
              variant="danger-soft"
              size="sm"
              icon={<IconTrash size={15} />}
              onClick={() => setRemoving("question")}
            >
              Удалить вопрос
            </Button>
            <Button size="sm" loading={sending} disabled={!draft.trim()} onClick={send}>
              {t.reply}
            </Button>
          </div>
        </div>
      </div>

      <Sheet
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing === "question" ? "Удалить вопрос?" : "Удалить ответ?"}
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              loading={deleting}
              onClick={() => remove(removing === "question" ? null : removing)}
            >
              Удалить
            </Button>
            <Button variant="secondary" block onClick={() => setRemoving(null)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          {removing === "question"
            ? "Вместе с вопросом из выдачи уйдут и все ответы под ним — тред без вопроса нечитаем. Отменить это нельзя."
            : "Ответ исчезнет из треда под уроком у всех, кто его видел. Отменить это нельзя."}
        </p>
      </Sheet>
    </div>
  );
}
