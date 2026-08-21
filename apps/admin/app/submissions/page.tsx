"use client";

/**
 * Очередь проверки работ «/submissions» — раздел 5.21 брифа.
 *
 * Плоский список, а не карточки курсов: сводки по курсу у API нет, а очередь
 * и есть очередь — сверху тот, кто ждёт дольше всех (сортирует сервер).
 * Состав курса и кто на каком уроке остановился остались на своём месте —
 * на вкладке «Участники» карточки курса.
 *
 * Данные — `GET /admin/submissions` с серверной пагинацией и фильтрами:
 * `status` (по умолчанию `pending` — это и есть очередь) и `course_id`.
 * Счётчик очереди не зависит от фильтров — считается отдельным запросом.
 */

import Link from "next/link";
import { useState } from "react";
import {
  api,
  qs,
  useLoad,
  type AdminSubmissionsPage,
  type CatalogOut,
} from "@lms/api";
import { dayMonth } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import {
  SubmissionStatusBadge,
  TeacherAvatar,
  teacherName,
  type SubmissionStatus,
} from "@/components/admin/submissionsApi";
import { Waiting } from "@/components/admin/Waiting";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Empty, LinkButton, Sheet } from "@lms/ui";
import { IconCheckCircle, IconChevronRight, IconFilter, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;

/** Порог краснеющего ожидания у работ — три дня (у заявок он свой, два). */
const RED_AFTER_DAYS = 3;

type StatusFilter = SubmissionStatus | "all";

export default function SubmissionsPage() {
  const { t, lang } = useStore();

  const [status, setStatus] = useState<StatusFilter>("pending");
  const [courseId, setCourseId] = useState<"all" | number>("all");
  const [page, setPage] = useState(1);
  /* Мобильный: статус и курс за одной кнопкой-иконкой, окно выезжает снизу —
     как на курсах и заявках */
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = useLoad(
    () =>
      api<AdminSubmissionsPage>(
        `/admin/submissions${qs({
          page,
          per_page: PER_PAGE,
          status,
          course_id: courseId === "all" ? undefined : courseId,
        })}`,
      ),
    [page, status, courseId],
  );
  /* Сколько работ ждёт всего — цифра в шапке и в счётчике меню */
  const queue = useLoad(
    () => api<AdminSubmissionsPage>(`/admin/submissions${qs({ status: "pending", per_page: 1 })}`),
    [],
  );
  /* Фильтр по курсу — все версии из каталога, как в заявках */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const queueTotal = queue.data?.total ?? 0;
  /* Пустая очередь — это хорошая новость; пусто из-за фильтров — другой текст */
  const filtered = status !== "pending" || courseId !== "all";
  /* Счётчик на кнопке-иконке: очередь «ждут проверки» — это состояние
     по умолчанию, а не фильтр, и в счёт не идёт */
  const mobileFilters = (status !== "pending" ? 1 : 0) + (courseId !== "all" ? 1 : 0);
  const courseOptions = (catalog.data?.items ?? []).flatMap((g) => g.versions);

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "pending", label: t.subFilterPending },
    { value: "rework", label: t.subFilterRework },
    { value: "accepted", label: t.subFilterAccepted },
    { value: "all", label: t.subFilterAll },
  ];

  const resetFilters = () => {
    setStatus("pending");
    setCourseId("all");
    setPage(1);
  };

  return (
    <AdminShell
      title={t.subTitle}
      subtitle={`${t.subInQueue(queueTotal)} · ${t.subByFilter(total)}`}
    >
      <div className="stack g16">
        {/* ===== Фильтры: на десктопе строкой, на мобильном — кнопка-иконка
            и окно снизу ===== */}
        <div className="row g10">
          <div className="row wrap g10 subs-filters-inline">
            <select
              className="input"
              style={{ width: "auto", minWidth: 190 }}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className="input"
              style={{ width: "auto", minWidth: 190 }}
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value === "all" ? "all" : Number(e.target.value));
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
          <Button
            variant="secondary"
            className="subs-filter-btn"
            aria-label={t.filters}
            icon={<IconFilter size={17} />}
            onClick={() => setFiltersOpen(true)}
          >
            {mobileFilters > 0 ? mobileFilters : null}
          </Button>
        </div>

        {list.loading ? (
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
              icon={filtered ? <IconSearch size={34} /> : <IconCheckCircle size={38} />}
              title={filtered ? t.subNoMatchTitle : t.subQueueEmptyTitle}
              text={filtered ? t.subNoMatchText : t.subQueueEmptyText}
              action={
                filtered ? (
                  <Button variant="secondary" onClick={resetFilters}>
                    {t.resetFilters}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* ===== Десктоп: таблица ===== */}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.subTeacher}</th>
                    <th>{t.subTask}</th>
                    <th>{t.subCourse}</th>
                    <th>{t.subSent}</th>
                    <th>{t.subStatus}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id}>
                      <td style={{ maxWidth: 240 }}>
                        <Link href={`/submissions/${s.id}`} className="row g10">
                          <TeacherAvatar teacher={s.teacher} />
                          <span className="small" style={{ fontWeight: 600, minWidth: 0 }}>
                            {teacherName(s.teacher)}
                          </span>
                        </Link>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div className="stack g4">
                          <span className="small pretty">{s.task.title}</span>
                          {s.attempt_number > 1 && (
                            <span>
                              <Badge kind="rework">{t.subReworkTag}</Badge>
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: 240 }}>
                        <span className="small muted pretty">{s.course.title}</span>
                      </td>
                      <td>
                        <div className="stack g2">
                          <span className="caption muted-3 nowrap">
                            {dayMonth(s.created_at, lang)}
                          </span>
                          {s.status === "pending" && (
                            <Waiting days={s.waiting_days} redAfter={RED_AFTER_DAYS} />
                          )}
                        </div>
                      </td>
                      <td>
                        <SubmissionStatusBadge status={s.status} />
                      </td>
                      <td style={{ width: 130 }}>
                        <LinkButton href={`/submissions/${s.id}`} variant="secondary" size="sm">
                          {t.subCheck}
                          <IconChevronRight size={15} />
                        </LinkButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== Мобильный: карточки, а не горизонтальный скролл ===== */}
            <div className="table-mobile-cards">
              {items.map((s) => (
                <Link key={s.id} href={`/submissions/${s.id}`} className="card card-pad card-link stack g12">
                  <div className="row g10">
                    <TeacherAvatar teacher={s.teacher} size={42} />
                    <span className="grow stack g2" style={{ minWidth: 0 }}>
                      <span className="small" style={{ fontWeight: 700 }}>
                        {teacherName(s.teacher)}
                      </span>
                      <span className="caption muted-3 pretty">{s.course.title}</span>
                    </span>
                    <SubmissionStatusBadge status={s.status} />
                  </div>

                  <span className="small pretty">{s.task.title}</span>

                  <div className="row wrap g8">
                    <span className="caption muted-3">{dayMonth(s.created_at, lang)}</span>
                    {s.status === "pending" && (
                      <>
                        <span className="dot-sep">·</span>
                        <Waiting days={s.waiting_days} redAfter={RED_AFTER_DAYS} />
                      </>
                    )}
                    {s.attempt_number > 1 && <Badge kind="rework">{t.subReworkTag}</Badge>}
                  </div>
                </Link>
              ))}
            </div>

            {/* ===== Пагинация ===== */}
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
            <label className="label">{t.subStatus}</label>
            <select
              className="input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">{t.subCourse}</label>
            <select
              className="input"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value === "all" ? "all" : Number(e.target.value));
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
        </div>
      </Sheet>

      <style>{`
        .subs-filter-btn { display: none; }
        @media (max-width: 899px) {
          .subs-filters-inline { display: none; }
          .subs-filter-btn { display: inline-flex; flex-shrink: 0; }
        }
      `}</style>
    </AdminShell>
  );
}
