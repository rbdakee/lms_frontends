"use client";

/**
 * Карточка заявки «/leads/:id» — раздел 5.26 брифа.
 *
 * Всё, что нужно перед звонком: кто это, какие у него ещё курсы (повторный
 * клиент или новый), что уже происходило по заявке и заметка админа.
 * Главное действие — «Открыть доступ»: после него курс появляется у учителя.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  getCourse,
  getTeacher,
  LEAD_STATUS_LABEL,
  teacherCourses,
} from "@lms/prototype/data";
import { price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import {
  DEMO_TEACHER_ID,
  isOpenLead,
  useLead,
  useLeadsOfTeacher,
} from "@/components/admin/leads";
import { LeadStatusPicker, PhoneActions } from "@/components/admin/LeadStatus";
import { Waiting } from "@/components/admin/Waiting";
import { GrantAccessSheet } from "@/components/admin/GrantAccess";
import { web } from "@/lib/urls";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Empty,
  LinkButton,
  Note,
  Progress,
  StatusBadge,
} from "@lms/ui";
import { IconCheck, IconChevronRight } from "@lms/ui/icons";

export default function LeadCardPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, grantAccess, setLeadStatus, toast } = useStore();
  const lead = useLead(id);
  const teacherLeads = useLeadsOfTeacher(lead?.teacherId ?? "");

  const [granting, setGranting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!lead) {
    return (
      <AdminShell title="Заявка не найдена">
        <div className="card">
          <Empty
            title="Заявка не найдена"
            text="Возможно, демо-состояние сбросили — заявка исчезла вместе с ним."
            action={
              <LinkButton href="/leads" variant="secondary">
                Ко всем заявкам
              </LinkButton>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const teacher = getTeacher(lead.teacherId);
  const course = getCourse(lead.courseId);
  const noteText = note ?? lead.note ?? "";
  const access = teacherCourses(lead.teacherId);
  const otherLeads = teacherLeads.filter((l) => l.id !== lead.id);

  const grant = () => {
    if (lead.teacherId === DEMO_TEACHER_ID) grantAccess(lead.courseId);
    setLeadStatus(lead.id, "granted");
    toast("Доступ открыт — курс появился у учителя, ему ушло уведомление", "success");
  };

  return (
    <AdminShell
      title={teacher?.name ?? "Заявка"}
      subtitle={`Заявка на «${course?.title}» · ${lead.created}`}
    >
      <div className="stack g16">
        <Breadcrumbs
          items={[
            { label: "Заявки", href: "/leads" },
            { label: teacher?.name ?? "Заявка" },
          ]}
        />

        <div className="lead-two">
          {/* ===== Учитель ===== */}
          <aside className="stack g16">
            <div className="card card-pad stack g14">
              <div className="row g12">
                <Avatar initials={teacher?.initials ?? "??"} size={54} tone="neutral" />
                <div className="grow stack g4" style={{ minWidth: 0 }}>
                  <strong className="pretty">{teacher?.name}</strong>
                  <span className="caption muted-3">{teacher?.subject}</span>
                </div>
              </div>

              <hr className="divider" />

              <dl className="stack g10" style={{ margin: 0 }}>
                {[
                  ["Школа", teacher?.school],
                  ["Регион", teacher?.region],
                  ["Телефон", teacher?.phone],
                  ["Email", teacher?.email],
                  ["Регистрация", teacher?.registered],
                ].map(([k, v]) => (
                  <div key={k} className="row between g10" style={{ alignItems: "flex-start" }}>
                    <dt className="caption muted nowrap">{k}</dt>
                    <dd
                      className="small"
                      style={{ margin: 0, textAlign: "right", fontWeight: 600 }}
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>

              <PhoneActions phoneRaw={teacher?.phoneRaw ?? ""} />

              <Link href={`/teachers/${lead.teacherId}`} className="btn btn-ghost btn-sm">
                Карточка учителя
                <IconChevronRight size={15} />
              </Link>
            </div>

            {/* Другие курсы — видно, повторный это клиент или новый */}
            <div className="card card-pad stack g12">
              <h2 className="h3">Другие курсы учителя</h2>
              {access.length === 0 && otherLeads.length === 0 ? (
                <p className="small muted pretty">
                  Курсов пока нет — это первая заявка, клиент новый.
                </p>
              ) : (
                <div className="stack g12">
                  {access.map(({ participant, course: c }) => (
                    <div key={c.id} className="stack g6">
                      <div className="row between wrap g8">
                        <span className="small pretty" style={{ fontWeight: 600 }}>
                          {c.title}
                        </span>
                        <Badge kind={participant.finished ? "done" : "progress"}>
                          {participant.finished ? "Пройден" : "В процессе"}
                        </Badge>
                      </div>
                      <Progress
                        value={Math.round((participant.lessonsDone / c.lessons) * 100)}
                      />
                      <span className="caption muted-3">
                        {participant.lessonsDone} из {c.lessons} уроков
                      </span>
                    </div>
                  ))}

                  {otherLeads.map((l) => (
                    <Link key={l.id} href={`/leads/${l.id}`} className="row between g10">
                      <span className="small pretty grow" style={{ minWidth: 0 }}>
                        {getCourse(l.courseId)?.title}
                      </span>
                      <StatusBadge status={LEAD_STATUS_LABEL[l.status]} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ===== Заявка ===== */}
          <section className="stack g16">
            <div className="card card-pad stack g14">
              <div className="row between wrap g10">
                <div className="stack g4" style={{ minWidth: 0 }}>
                  <span className="caption muted">Курс</span>
                  <Link href={`/courses/${lead.courseId}`} className="pretty">
                    <strong>{course?.title}</strong>
                  </Link>
                </div>
                <StatusBadge status={LEAD_STATUS_LABEL[lead.status]} />
              </div>

              <div className="row wrap g14">
                <div className="stack g2">
                  <span className="caption muted">Цена</span>
                  <strong style={{ fontSize: 20, letterSpacing: "-0.01em" }}>
                    {fmtPrice(lead.price ?? course?.price, lang)}
                  </strong>
                </div>
                <div className="stack g2">
                  <span className="caption muted">Заявка</span>
                  <strong className="small">{lead.created}</strong>
                </div>
                {isOpenLead(lead.status) && (
                  <div className="stack g2">
                    <span className="caption muted">Ожидание</span>
                    <Waiting days={lead.waiting} redAfter={2} />
                  </div>
                )}
              </div>

              {lead.reminded && (
                <Note kind="warning">
                  <span className="small">
                    Учитель нажал «Записаться» повторно — новая заявка не создалась,
                    обновилась дата в этой.
                  </span>
                </Note>
              )}

              {lead.declineReason && (
                <Note kind="muted">
                  <span className="small">Причина отказа: {lead.declineReason}</span>
                </Note>
              )}

              <div className="stack g10">
                <span className="caption muted">Статус заявки</span>
                <LeadStatusPicker lead={lead} onGrant={() => setGranting(true)} />
              </div>

              {lead.status === "granted" ? (
                <Note kind="success">
                  <span className="small">
                    Доступ открыт — курс у учителя в «Моих курсах».{" "}
                    <Link href={web("/my")} style={{ color: "var(--primary)", fontWeight: 700 }}>
                      Посмотреть кабинет
                    </Link>
                  </span>
                </Note>
              ) : (
                <Button
                  block
                  size="lg"
                  icon={<IconCheck size={18} />}
                  onClick={() => setGranting(true)}
                >
                  Открыть доступ
                </Button>
              )}
            </div>

            {/* История статусов */}
            <div className="card card-pad stack g12">
              <h2 className="h3">История заявки</h2>
              <ol className="stack g12" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {lead.history.map((h, i) => (
                  <li key={i} className="row g10" style={{ alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        marginTop: 6,
                        flexShrink: 0,
                        background:
                          i === lead.history.length - 1 ? "var(--primary)" : "var(--border)",
                      }}
                    />
                    <div className="stack g2 grow" style={{ minWidth: 0 }}>
                      <span className="small" style={{ fontWeight: 600 }}>
                        {LEAD_STATUS_LABEL[h.status]}
                      </span>
                      <span className="caption muted-3">
                        {h.date}
                        {h.by ? ` · ${h.by}` : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Заметка админа */}
            <div className="card card-pad stack g10">
              <h2 className="h3">Заметка администратора</h2>
              <textarea
                className="input"
                style={{ minHeight: 92 }}
                value={noteText}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Например: обещала оплатить после 20 августа, просила напомнить"
              />
              <div className="row between wrap g10">
                <span className="caption muted-3">Заметку видит только администратор</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toast("Заметка сохранена")}
                >
                  Сохранить заметку
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <GrantAccessSheet
        open={granting}
        onClose={() => setGranting(false)}
        teacherName={teacher?.name ?? ""}
        course={course}
        onGrant={() => grant()}
      />

      <style>{`
        .lead-two { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
        @media (min-width: 1024px) { .lead-two { grid-template-columns: 340px 1fr; gap: 24px; } }
      `}</style>
    </AdminShell>
  );
}
