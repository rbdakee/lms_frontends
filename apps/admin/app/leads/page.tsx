"use client";

/**
 * Заявки на курсы «/leads» — раздел 5.26 брифа.
 *
 * Сюда падает всё, что учитель нажал «Записаться». Платёжных форм нет:
 * админ звонит, принимает деньги вне платформы и открывает доступ руками.
 * Главное действие прямо в строке — «Открыть доступ».
 */

import Link from "next/link";
import { useState } from "react";
import { getCourse, getTeacher, LEAD_STATUS_LABEL, type LeadStatus } from "@lms/prototype/data";
import { price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { DEMO_TEACHER_ID, isOpenLead, useLeads, type LeadRow } from "@/components/admin/leads";
import { LeadStatusPicker, PhoneActions } from "@/components/admin/LeadStatus";
import { Waiting } from "@/components/admin/Waiting";
import { GrantAccessSheet } from "@/components/admin/GrantAccess";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Button, Empty, StatusBadge } from "@lms/ui";
import { IconChevronRight, IconSearch } from "@lms/ui/icons";

export default function LeadsPage() {
  const { lang, grantAccess, setLeadStatus, toast } = useStore();
  const leads = useLeads();

  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("all");
  const [status, setStatus] = useState<"all" | "open" | LeadStatus>("all");
  const [granting, setGranting] = useState<LeadRow | null>(null);

  const list = leads.filter((l) => {
    if (course !== "all" && l.courseId !== course) return false;
    if (status === "open" && !isOpenLead(l.status)) return false;
    if (status !== "all" && status !== "open" && l.status !== status) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const teacher = getTeacher(l.teacherId);
    return (
      (teacher?.name.toLowerCase().includes(q) ?? false) ||
      (teacher?.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")) && q.replace(/\D/g, "") !== "")
    );
  });

  const newCount = leads.filter((l) => l.status === "new").length;

  /** Курс появляется у учителя, заявка сама уходит в «Доступ выдан». */
  const grant = (lead: LeadRow, note: string) => {
    if (lead.teacherId === DEMO_TEACHER_ID) grantAccess(lead.courseId);
    setLeadStatus(lead.id, "granted");
    const who = getTeacher(lead.teacherId)?.name.split(" ")[0] ?? "учителю";
    toast(
      `Доступ открыт · ${who}${note ? " · заметка сохранена" : ""} — учителю ушло уведомление`,
      "success",
    );
  };

  /* Курсы, по которым вообще есть заявки — фильтровать по пустым бессмысленно */
  const leadCourseIds = Array.from(new Set(leads.map((l) => l.courseId)));

  return (
    <AdminShell
      title="Заявки на курсы"
      subtitle={`${leads.length} всего · ${newCount} новых · оплата принимается вне платформы`}
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
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="all">Все курсы</option>
            {leadCourseIds.map((id) => (
              <option key={id} value={id}>
                {getCourse(id)?.title}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: "auto", minWidth: 170 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">Все статусы</option>
            <option value="open">В работе</option>
            {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button
            variant={status === "new" ? "primary" : "secondary"}
            onClick={() => setStatus(status === "new" ? "all" : "new")}
          >
            Только новые · {newCount}
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconSearch size={34} />}
              title="Заявок не нашли"
              text="Попробуйте снять фильтры или очистить поиск."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setCourse("all");
                    setStatus("all");
                  }}
                >
                  Сбросить фильтры
                </Button>
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
                  {list.map((l) => {
                    const teacher = getTeacher(l.teacherId);
                    const c = getCourse(l.courseId);
                    return (
                      <tr key={l.id}>
                        <td style={{ maxWidth: 240 }}>
                          <Link href={`/leads/${l.id}`} className="row g10">
                            <Avatar initials={teacher?.initials ?? "??"} size={34} tone="neutral" />
                            <span className="stack g2" style={{ minWidth: 0 }}>
                              <span className="small" style={{ fontWeight: 600 }}>
                                {teacher?.name}
                              </span>
                              <span className="caption muted-3">{teacher?.region}</span>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <div className="stack g6">
                            <span className="small mono nowrap">{teacher?.phone}</span>
                            <PhoneActions phoneRaw={teacher?.phoneRaw ?? ""} />
                          </div>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <div className="stack g2">
                            <span className="small">{c?.title}</span>
                            <strong className="caption">{fmtPrice(l.price ?? c?.price, lang)}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="stack g2">
                            <span className="caption muted-3 nowrap">{l.created}</span>
                            {isOpenLead(l.status) && <Waiting days={l.waiting} redAfter={2} />}
                            {l.reminded && (
                              <span className="caption" style={{ color: "var(--warning)" }}>
                                напоминание
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ minWidth: 170 }}>
                          <LeadStatusPicker lead={l} onGrant={() => setGranting(l)} />
                        </td>
                        <td style={{ width: 160 }}>
                          <div className="stack g6">
                            {l.status !== "granted" && l.status !== "declined" && (
                              <Button size="sm" onClick={() => setGranting(l)}>
                                Открыть доступ
                              </Button>
                            )}
                            <Link
                              href={`/leads/${l.id}`}
                              className="btn btn-ghost btn-sm"
                            >
                              Заявка
                              <IconChevronRight size={15} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ===== Мобильный: карточки, а не горизонтальный скролл ===== */}
            <div className="table-mobile-cards">
              {list.map((l) => {
                const teacher = getTeacher(l.teacherId);
                const c = getCourse(l.courseId);
                return (
                  <div key={l.id} className="card card-pad stack g12">
                    <div className="row g10">
                      <Avatar initials={teacher?.initials ?? "??"} size={42} tone="neutral" />
                      <Link
                        href={`/leads/${l.id}`}
                        className="grow stack g2"
                        style={{ minWidth: 0 }}
                      >
                        <span className="small" style={{ fontWeight: 700 }}>
                          {teacher?.name}
                        </span>
                        <span className="caption muted-3">
                          {teacher?.school} · {teacher?.region}
                        </span>
                      </Link>
                      <StatusBadge status={LEAD_STATUS_LABEL[l.status]} />
                    </div>

                    <div className="stack g2">
                      <span className="small pretty">{c?.title}</span>
                      <div className="row wrap g8">
                        <strong className="small">{fmtPrice(l.price ?? c?.price, lang)}</strong>
                        <span className="dot-sep">·</span>
                        <span className="caption muted-3">{l.created}</span>
                        {isOpenLead(l.status) && (
                          <>
                            <span className="dot-sep">·</span>
                            <Waiting days={l.waiting} redAfter={2} />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="row g8">
                      <span className="small mono grow nowrap">{teacher?.phone}</span>
                      <PhoneActions phoneRaw={teacher?.phoneRaw ?? ""} />
                    </div>

                    <LeadStatusPicker lead={l} onGrant={() => setGranting(l)} />

                    {l.status !== "granted" && l.status !== "declined" && (
                      <Button block size="lg" onClick={() => setGranting(l)}>
                        Открыть доступ
                      </Button>
                    )}
                    <Link href={`/leads/${l.id}`} className="btn btn-secondary btn-block">
                      Открыть заявку
                      <IconChevronRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="caption muted-3 pretty">
          Повторный клик «Записаться» по тому же курсу новую заявку не создаёт — обновляет
          дату в существующей и помечает её напоминанием.
        </p>
      </div>

      {granting && (
        <GrantAccessSheet
          open
          onClose={() => setGranting(null)}
          teacherName={getTeacher(granting.teacherId)?.name ?? ""}
          course={getCourse(granting.courseId)}
          onGrant={(_courseId, _paid, note) => grant(granting, note)}
        />
      )}
    </AdminShell>
  );
}

