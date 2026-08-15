"use client";

/**
 * Список курсов «/courses» — раздел 5.16 брифа.
 *
 * Кроме содержимого курса тут видно всё, что связано с набором: цена,
 * статус, дата старта и сколько заявок в работе. «Заявок в работе» считается
 * по тем же данным, что и экран «Заявки», — иначе числа разъедутся.
 *
 * На узких экранах таблица превращается в карточки, а не в горизонтальный скролл.
 */

import Link from "next/link";
import { useState } from "react";
import { adminCourses, type CourseStatus } from "@lms/prototype/data";
import { day, price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { COURSE_STATUS_LABEL, COURSE_STATUS_ORDER } from "@/components/admin/courseStatus";
import { isOpenLead, useLeads } from "@/components/admin/leads";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Empty, StatusBadge } from "@lms/ui";
import {
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconChart,
  IconMore,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@lms/ui/icons";

export default function AdminCoursesPage() {
  const { lang } = useStore();
  const leads = useLeads();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | CourseStatus>("all");
  const [menuFor, setMenuFor] = useState<string | null>(null);

  /** Заявки в работе по курсу — новые, «связались» и «оплачено» */
  const openLeads = (courseId: string) =>
    leads.filter((l) => l.courseId === courseId && isOpenLead(l.status)).length;

  const list = adminCourses.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (query.trim() && !c.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const count = (s: CourseStatus) => adminCourses.filter((c) => c.status === s).length;
  const published = adminCourses.filter(
    (c) => c.status === "open" || c.status === "planned" || c.status === "closed",
  ).length;

  const actions = (id: string) => (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn-icon"
        style={{ minHeight: 36, width: 36 }}
        onClick={() => setMenuFor(menuFor === id ? null : id)}
        aria-label="Действия"
      >
        <IconMore size={18} />
      </button>
      {menuFor === id && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setMenuFor(null)}
          />
          <div
            className="card"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 4px)",
              zIndex: 50,
              minWidth: 190,
              padding: 6,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {[
              { label: "Карточка курса", icon: IconEye, href: `/courses/${id}` },
              { label: "Редактировать", icon: IconEdit, href: `/courses/${id}/edit` },
              {
                label: "Программа курса",
                icon: IconEdit,
                href: `/courses/${id}/edit?tab=program`,
              },
              { label: "Заявки на курс", icon: IconChart, href: "/leads" },
              { label: "Дублировать", icon: IconCopy },
              { label: "Отчёт", icon: IconChart, href: `/reports/${id}` },
              { label: "Скрыть", icon: IconEyeOff },
              { label: "Удалить", icon: IconTrash, danger: true },
            ].map((a) => {
              const Icon = a.icon;
              const cls = "admin-nav-item";
              const style = a.danger ? { color: "var(--danger)" } : undefined;
              return a.href ? (
                <Link key={a.label} href={a.href} className={cls} style={style}>
                  <Icon size={17} />
                  {a.label}
                </Link>
              ) : (
                <button
                  key={a.label}
                  className={cls}
                  style={{
                    ...style,
                    width: "100%",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => setMenuFor(null)}
                >
                  <Icon size={17} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <AdminShell
      title="Курсы"
      subtitle={`${adminCourses.length} курсов · ${published} опубликовано · ${count("draft")} в черновиках`}
      actions={
        <Link href="/courses/digital-literacy/edit" className="btn btn-primary btn-sm">
          <IconPlus size={16} />
          <span className="hide-sm">Создать курс</span>
        </Link>
      }
    >
      <div className="stack g16">
        <div className="row wrap g10">
          <div className="input-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              placeholder="Поиск по названию"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input"
            style={{ width: "auto", minWidth: 210 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">Все статусы · {adminCourses.length}</option>
            {COURSE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {COURSE_STATUS_LABEL[s]} · {count(s)}
              </option>
            ))}
          </select>
        </div>

        {list.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconSearch size={34} />}
              title="Курсы не найдены"
              text="Измените запрос или сбросьте фильтр по статусу."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Сбросить
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Таблица — широкие экраны */}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Язык</th>
                    <th>Цена</th>
                    <th>Статус</th>
                    <th>Старт</th>
                    <th>Уроков</th>
                    <th>Заявок в работе</th>
                    <th>Доступ выдан</th>
                    <th>Завершили</th>
                    <th>Изменён</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => {
                    const active = openLeads(c.id);
                    return (
                      <tr key={c.id}>
                        <td style={{ maxWidth: 300 }}>
                          <Link href={`/courses/${c.id}`} className="stack g4">
                            <strong className="small pretty">{c.title}</strong>
                            <span className="caption muted-3">{c.modules} модуля</span>
                          </Link>
                        </td>
                        <td className="caption muted nowrap">{c.langs}</td>
                        <td className="small nowrap">{fmtPrice(c.price, lang)}</td>
                        <td>
                          <StatusBadge status={COURSE_STATUS_LABEL[c.status]} />
                        </td>
                        <td className="caption muted-3 nowrap">
                          {c.startsAt ? day(c.startsAt, lang) : "—"}
                        </td>
                        <td className="small">{c.lessons}</td>
                        <td>
                          {active > 0 ? (
                            <Link
                              href="/leads"
                              className="small"
                              style={{ color: "var(--primary)", fontWeight: 700 }}
                            >
                              {active}
                            </Link>
                          ) : (
                            <span className="small muted-3">—</span>
                          )}
                        </td>
                        <td className="small">{c.enrolled || "—"}</td>
                        <td className="small">{c.finished || "—"}</td>
                        <td className="caption muted-3 nowrap">{c.changed}</td>
                        <td style={{ width: 52 }}>{actions(c.id)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Карточки — узкие экраны */}
            <div className="table-mobile-cards">
              {list.map((c) => {
                const active = openLeads(c.id);
                return (
                  <div key={c.id} className="card card-pad stack g10">
                    <div className="row between g10" style={{ alignItems: "flex-start" }}>
                      <Link href={`/courses/${c.id}`} className="grow">
                        <strong className="small pretty">{c.title}</strong>
                      </Link>
                      <StatusBadge status={COURSE_STATUS_LABEL[c.status]} />
                    </div>
                    <div className="row wrap g8">
                      <strong className="small">{fmtPrice(c.price, lang)}</strong>
                      {c.startsAt && (
                        <>
                          <span className="dot-sep">·</span>
                          <span className="caption muted">старт {day(c.startsAt, lang)}</span>
                        </>
                      )}
                    </div>
                    <div className="caption muted">
                      {c.langs} · {c.modules} модуля · {c.lessons} уроков
                    </div>
                    <div className="row between wrap g10">
                      <span className="caption muted">
                        {active > 0 ? `${active} заявок в работе` : "заявок в работе нет"}
                      </span>
                      <span className="caption muted-3">
                        {c.enrolled ? `${c.enrolled} с доступом` : "нет доступов"} · изм. {c.changed}
                      </span>
                    </div>
                    <div className="row g8">
                      <Link
                        href={`/courses/${c.id}/edit`}
                        className="btn btn-secondary btn-sm grow"
                      >
                        <IconEdit size={15} />
                        Редактировать
                      </Link>
                      <Link href={`/reports/${c.id}`} className="btn btn-secondary btn-sm">
                        <IconChart size={15} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`@media (max-width: 560px) { .hide-sm { display: none; } }`}</style>
    </AdminShell>
  );
}
