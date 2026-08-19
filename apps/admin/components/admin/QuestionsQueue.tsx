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
  type ThreadQuestion,
} from "@lms/api";
import { dayTime } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { Avatar, Badge, Button, Empty } from "@lms/ui";
import { IconCheckCircle, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;
/** Тот же лимит текста, что и у учителя (CONTRACT: 422 при 2000+ символов). */
const TEXT_MAX = 2000;

export function QuestionsQueue({
  courseId,
  onAnswered,
}: {
  /** Курс задан снаружи (вкладка карточки курса) — выбор курса тогда не нужен */
  courseId?: number;
  /** Ответ ушёл: снаружи можно перечитать счётчик «без ответа» */
  onAnswered?: () => void;
}) {
  const { t, toast } = useStore();

  const [onlyOpen, setOnlyOpen] = useState(true);
  const [query, setQuery] = useState("");
  /* Поиск уходит на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [course, setCourse] = useState<"all" | number>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const filterCourse = courseId ?? (course === "all" ? undefined : course);

  const list = useLoad(
    () =>
      api<AdminQuestionsPage>(
        `/admin/questions${qs({
          page,
          per_page: PER_PAGE,
          answered: onlyOpen ? false : undefined,
          course_id: filterCourse,
          q,
        })}`,
      ),
    [page, onlyOpen, filterCourse, q],
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
  const filtered = q !== "" || course !== "all";
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

  const resetFilters = () => {
    setQuery("");
    setCourse("all");
    setOnlyOpen(true);
    setPage(1);
  };

  return (
    <div className="stack g14" style={{ maxWidth: 860 }}>
      {/* ===== Фильтры ===== */}
      <div className="row wrap g10">
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
  onError,
}: {
  question: AdminQuestion;
  /** В карточке курса название курса не нужно — оно уже в шапке экрана */
  showCourse?: boolean;
  onReplied: (questionId: number, reply: ThreadQuestion) => void;
  onError: (e: unknown) => void;
}) {
  const { t, lang, toast } = useStore();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

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
                <span className="caption muted-3">{dayTime(r.created_at, lang)}</span>
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
          <Button size="sm" loading={sending} disabled={!draft.trim()} onClick={send}>
            {t.reply}
          </Button>
        </div>
      </div>
    </div>
  );
}
