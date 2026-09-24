"use client";

/**
 * Доступ к «Жоспару» — «/lesson_ai/access».
 *
 * Все, кому доступ к помощнику выдавался хоть раз, свежие выдачи сверху
 * (`GET /admin/lesson_ai/access`, `backend/CONTRACT.md`, L7). Выдаётся доступ
 * из карточки учителя — там человек виден целиком; здесь сводка: у кого
 * действует, у кого истёк, кто сколько потратил.
 *
 * Расход — в долларах, оценка сверху по прайсу модели (скидка за кэш
 * не учитывается), так и подписано: это не счёт, а ориентир.
 *
 * Как и в списке учителей, поиск и фильтр живут в состоянии экрана и
 * в адрес не уходят: ссылка со списком ФИО и телефонов не должна оседать
 * в истории браузера.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, qs, useLoad, type LessonAccessItem, type LessonAccessPage, type LessonAccessState } from "@lms/api";
import { Button, Empty } from "@lms/ui";
import { dayTime, fmt, phoneFmt } from "@lms/ui/i18n";
import { IconChevronRight, IconSearch, IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { LessonAccessBadge, accessUntil } from "@/components/admin/LessonAiAccess";
import { AdminShell } from "@/components/layout/AdminShell";

const PER_PAGE = 20;
const STATES: LessonAccessState[] = ["active", "expired", "revoked"];

function teacherName(item: LessonAccessItem): string {
  const p = item.teacher;
  return [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(" ") || phoneFmt(p.phone);
}

export default function LessonAiAccessPage() {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  /* Поиск уходит на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [state, setState] = useState<LessonAccessState | "all">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const list = useLoad(
    () =>
      api<LessonAccessPage>(
        `/admin/lesson_ai/access${qs({
          status: state === "all" ? undefined : state,
          q,
          page,
          per_page: PER_PAGE,
        })}`,
      ),
    [state, q, page],
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = state !== "all" || q !== "";

  const usage = (item: LessonAccessItem) =>
    item.usage.kits === 0 && !item.usage.cost_usd
      ? t.laAdmNoUsage
      : [
          t.laAdmKits(item.usage.kits),
          item.usage.cost_usd !== null ? t.laAdmCost(item.usage.cost_usd.toFixed(2)) : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <AdminShell title={t.laAdmTitle} subtitle={list.error ? undefined : t.laAdmCount(total)}>
      <div className="stack g16">
        {/* Где выдавать — прямо здесь: со списка кнопки выдачи нет, она в карточке учителя */}
        <span className="small muted pretty">
          {t.laAdmHint} {t.laAdmEmptyText}
        </span>

        <div className="row wrap g10">
          <div className="input-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              placeholder={t.laAdmSearch}
              maxLength={100}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="tabs">
            {(["all", ...STATES] as const).map((s) => (
              <button
                key={s}
                data-active={state === s}
                onClick={() => {
                  setState(s);
                  setPage(1);
                }}
              >
                {s === "all" ? t.laAdmFilterAll : t.laAdmState[s]}
              </button>
            ))}
          </div>
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
              icon={<IconSparkle size={34} />}
              title={hasFilters ? t.laAdmNoMatchTitle : t.laAdmEmptyTitle}
              text={q ? t.laAdmNoMatchText : hasFilters ? t.laAdmNoMatchStateText : t.laAdmEmptyText}
              action={
                hasFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setQ("");
                      setState("all");
                      setPage(1);
                    }}
                  >
                    {t.resetFilters}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.laAdmColTeacher}</th>
                    <th>{t.laAdmColAccess}</th>
                    <th>{t.laAdmColUntil}</th>
                    <th>{t.laAdmColPaid}</th>
                    <th title={t.laAdmCostHint}>{t.laAdmColUsage}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.teacher.id}>
                      <td style={{ maxWidth: 280 }}>
                        <Link href={`/teachers/${item.teacher.id}`} className="stack g2">
                          <span className="small" style={{ fontWeight: 600 }}>
                            {teacherName(item)}
                          </span>
                          <span className="caption muted-3 mono">{phoneFmt(item.teacher.phone)}</span>
                        </Link>
                      </td>
                      <td>
                        <div className="stack g4">
                          <LessonAccessBadge state={item.access.status} />
                          <span className="caption muted-3">
                            {item.access.status === "revoked" && item.access.revoked_at
                              ? t.laAdmRevokedAt(dayTime(item.access.revoked_at, lang))
                              : t.laAdmGrantedBy(
                                  item.access.granted_by?.name ?? "—",
                                  dayTime(item.access.granted_at, lang),
                                )}
                          </span>
                        </div>
                      </td>
                      <td className="small nowrap">{accessUntil(t, lang, item.access)}</td>
                      <td className="small" style={{ maxWidth: 200 }}>
                        {item.access.paid ? t.laAdmPaid : t.laAdmNotPaid}
                        {item.access.paid_note && (
                          <span className="caption muted-3 stack">{item.access.paid_note}</span>
                        )}
                      </td>
                      <td
                        className="small"
                        title={t.laAdmTokens(fmt(item.usage.tokens_in), fmt(item.usage.tokens_out))}
                      >
                        {usage(item)}
                      </td>
                      <td style={{ width: 44 }}>
                        <Link
                          href={`/teachers/${item.teacher.id}`}
                          className="btn btn-icon"
                          style={{ minHeight: 34, width: 34 }}
                          aria-label={teacherName(item)}
                        >
                          <IconChevronRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Мобильный: карточки, а не горизонтальный скролл */}
            <div className="table-mobile-cards">
              {items.map((item) => (
                <Link
                  key={item.teacher.id}
                  href={`/teachers/${item.teacher.id}`}
                  className="card card-link card-pad stack g8"
                >
                  <div className="row between g10">
                    <span className="small" style={{ fontWeight: 700 }}>
                      {teacherName(item)}
                    </span>
                    <LessonAccessBadge state={item.access.status} />
                  </div>
                  <span className="small mono">{phoneFmt(item.teacher.phone)}</span>
                  <div className="row wrap g8 caption muted">
                    <span>{accessUntil(t, lang, item.access)}</span>
                    <span className="dot-sep">·</span>
                    <span>{item.access.paid ? t.laAdmPaidFull : t.laAdmNotPaidFull}</span>
                    <span className="dot-sep">·</span>
                    <span>{usage(item)}</span>
                  </div>
                </Link>
              ))}
            </div>

            <span className="caption muted-3">{t.laAdmCostHint}</span>

            {pages > 1 && (
              <div className="row center g10">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t.back}
                </Button>
                <span className="small muted-3">
                  {page} / {pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t.next}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
