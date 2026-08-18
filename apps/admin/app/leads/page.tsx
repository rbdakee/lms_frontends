"use client";

/**
 * Заявки на курсы «/leads» — раздел 5.26 брифа.
 *
 * Сюда падает всё, что учитель нажал «Записаться». Платёжных форм нет:
 * админ звонит, принимает деньги вне платформы и открывает доступ руками.
 * Главное действие прямо в строке — «Открыть доступ».
 *
 * Данные — `GET /admin/leads` с серверной пагинацией и фильтрами: `status`
 * (включая псевдостатус `open` — «В работе»), `course_id`, `q` — один
 * параметр на ФИО и телефон в любом виде. Метка «напоминание» — `reminded_at`.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  qs,
  useLoad,
  type AdminLead,
  type AdminLeadsPage,
  type CatalogOut,
  type LeadStatus,
} from "@lms/api";
import { dayMonth, phoneFmt, price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { isOpenLead, LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "@/components/admin/leadsApi";
import { LeadStatusPicker, PhoneActions } from "@/components/admin/LeadStatus";
import { Waiting } from "@/components/admin/Waiting";
import { GrantLeadSheet } from "@/components/admin/GrantLead";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Button, Empty, StatusBadge } from "@lms/ui";
import { IconChevronRight, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;

export default function LeadsPage() {
  const { lang } = useStore();

  const [query, setQuery] = useState("");
  /* Поиск уходит на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState<"all" | number>("all");
  const [status, setStatus] = useState<"all" | "open" | LeadStatus>("all");
  const [page, setPage] = useState(1);
  const [granting, setGranting] = useState<AdminLead | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const leads = useLoad(
    () =>
      api<AdminLeadsPage>(
        `/admin/leads${qs({
          page,
          per_page: PER_PAGE,
          status: status === "all" ? undefined : status,
          course_id: courseId === "all" ? undefined : courseId,
          q,
        })}`,
      ),
    [page, status, courseId, q],
  );
  /* Счётчик «новых» не зависит от фильтров списка — отдельный запрос */
  const fresh = useLoad(
    () => api<AdminLeadsPage>(`/admin/leads${qs({ status: "new", per_page: 1 })}`),
    [],
  );
  /* Фильтр по курсу — все версии из каталога */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);

  const items = leads.data?.items ?? [];
  const total = leads.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const newCount = fresh.data?.total ?? 0;
  const hasFilters = status !== "all" || courseId !== "all" || q !== "";
  const courseOptions = (catalog.data?.items ?? []).flatMap((g) => g.versions);

  const refresh = () => {
    leads.reload();
    fresh.reload();
  };

  /** PATCH вернул заявку — подставляем её на место старой без перезапроса */
  const replaceLead = (updated: AdminLead) => {
    leads.setData((d) =>
      d ? { ...d, items: d.items.map((l) => (l.id === updated.id ? updated : l)) } : d,
    );
    fresh.reload();
  };

  const teacherName = (l: AdminLead) =>
    [l.teacher.last_name, l.teacher.first_name, l.teacher.middle_name]
      .filter(Boolean)
      .join(" ");
  const initials = (l: AdminLead) =>
    ((l.teacher.first_name[0] ?? "") + (l.teacher.last_name[0] ?? "")).toUpperCase() || "??";

  return (
    <AdminShell
      title="Заявки на курсы"
      subtitle={`${total} по фильтру · ${newCount} новых · оплата принимается вне платформы`}
    >
      <div className="stack g16">
        {/* ===== Фильтры ===== */}
        <div className="row wrap g10">
          <div className="input-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              placeholder="Поиск по ФИО или телефону"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input"
            style={{ width: "auto", minWidth: 190 }}
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value === "all" ? "all" : Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="all">Все курсы</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: "auto", minWidth: 170 }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="all">Все статусы</option>
            <option value="open">В работе</option>
            {LEAD_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button
            variant={status === "new" ? "primary" : "secondary"}
            onClick={() => {
              setStatus(status === "new" ? "all" : "new");
              setPage(1);
            }}
          >
            Только новые · {newCount}
          </Button>
        </div>

        {leads.loading ? (
          <div className="card card-pad row center" style={{ minHeight: 200 }}>
            <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
          </div>
        ) : leads.error ? (
          <div className="card">
            <Empty
              title="Не удалось загрузить"
              text="Проверьте интернет и попробуйте ещё раз."
              action={
                <Button variant="secondary" onClick={leads.reload}>
                  Повторить
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconSearch size={34} />}
              title={hasFilters ? "Заявок не нашли" : "Заявок пока нет"}
              text={
                hasFilters
                  ? "Попробуйте снять фильтры или очистить поиск."
                  : "Как только учитель нажмёт «Записаться», заявка появится здесь."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setCourseId("all");
                      setStatus("all");
                      setPage(1);
                    }}
                  >
                    Сбросить фильтры
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
                    <th>Учитель</th>
                    <th>Телефон</th>
                    <th>Курс и цена</th>
                    <th>Заявка</th>
                    <th>Статус</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id}>
                      <td style={{ maxWidth: 240 }}>
                        <Link href={`/leads/${l.id}`} className="row g10">
                          <Avatar initials={initials(l)} size={34} tone="neutral" />
                          <span className="stack g2" style={{ minWidth: 0 }}>
                            <span className="small" style={{ fontWeight: 600 }}>
                              {teacherName(l)}
                            </span>
                            <span className="caption muted-3">{l.teacher.region}</span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <div className="stack g6">
                          <span className="small mono nowrap">{phoneFmt(l.teacher.phone)}</span>
                          <PhoneActions phone={l.teacher.phone} />
                        </div>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div className="stack g2">
                          <span className="small">{l.course.title}</span>
                          <strong className="caption">
                            {fmtPrice(l.price_snapshot ?? undefined, lang)}
                          </strong>
                        </div>
                      </td>
                      <td>
                        <div className="stack g2">
                          <span className="caption muted-3 nowrap">
                            {dayMonth(l.created_at, lang)}
                          </span>
                          {isOpenLead(l.status) && <Waiting days={l.waiting_days} redAfter={2} />}
                          {l.reminded_at && (
                            <span className="caption" style={{ color: "var(--warning)" }}>
                              напоминание
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ minWidth: 170 }}>
                        <LeadStatusPicker
                          lead={l}
                          onGrant={() => setGranting(l)}
                          onChanged={replaceLead}
                        />
                      </td>
                      <td style={{ width: 160 }}>
                        <div className="stack g6">
                          {isOpenLead(l.status) && (
                            <Button size="sm" onClick={() => setGranting(l)}>
                              Открыть доступ
                            </Button>
                          )}
                          <Link href={`/leads/${l.id}`} className="btn btn-ghost btn-sm">
                            Заявка
                            <IconChevronRight size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== Мобильный: карточки, а не горизонтальный скролл ===== */}
            <div className="table-mobile-cards">
              {items.map((l) => (
                <div key={l.id} className="card card-pad stack g12">
                  <div className="row g10">
                    <Avatar initials={initials(l)} size={42} tone="neutral" />
                    <Link
                      href={`/leads/${l.id}`}
                      className="grow stack g2"
                      style={{ minWidth: 0 }}
                    >
                      <span className="small" style={{ fontWeight: 700 }}>
                        {teacherName(l)}
                      </span>
                      <span className="caption muted-3">
                        {[l.teacher.school, l.teacher.region].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                    <StatusBadge status={LEAD_STATUS_LABEL[l.status as LeadStatus]} />
                  </div>

                  <div className="stack g2">
                    <span className="small pretty">{l.course.title}</span>
                    <div className="row wrap g8">
                      <strong className="small">
                        {fmtPrice(l.price_snapshot ?? undefined, lang)}
                      </strong>
                      <span className="dot-sep">·</span>
                      <span className="caption muted-3">{dayMonth(l.created_at, lang)}</span>
                      {isOpenLead(l.status) && (
                        <>
                          <span className="dot-sep">·</span>
                          <Waiting days={l.waiting_days} redAfter={2} />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="row g8">
                    <span className="small mono grow nowrap">{phoneFmt(l.teacher.phone)}</span>
                    <PhoneActions phone={l.teacher.phone} />
                  </div>

                  <LeadStatusPicker
                    lead={l}
                    onGrant={() => setGranting(l)}
                    onChanged={replaceLead}
                  />

                  {isOpenLead(l.status) && (
                    <Button block size="lg" onClick={() => setGranting(l)}>
                      Открыть доступ
                    </Button>
                  )}
                  <Link href={`/leads/${l.id}`} className="btn btn-secondary btn-block">
                    Открыть заявку
                    <IconChevronRight size={16} />
                  </Link>
                </div>
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

        <p className="caption muted-3 pretty">
          Повторный клик «Записаться» по тому же курсу новую заявку не создаёт — ставит
          на существующей метку «напоминание».
        </p>
      </div>

      {granting && (
        <GrantLeadSheet
          lead={granting}
          open
          onClose={() => setGranting(null)}
          onGranted={refresh}
        />
      )}
    </AdminShell>
  );
}
