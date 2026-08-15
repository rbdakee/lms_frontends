"use client";

/**
 * Рабочий стол админа «/» — раздел 5.15 брифа.
 *
 * Это не аналитика: сверху три плитки того, что требует действия, под ними
 * три списка тех же сущностей, внизу три справочных числа. Графиков по неделям,
 * периодов, дельт «+312» и «обновлено 2 минуты назад» здесь нет и не будет —
 * ради них пришлось бы хранить историю и агрегаты (раздел 9а).
 */

import Link from "next/link";
import {
  adminQuestions,
  adminSubmissions,
  getCourse,
  getTeacher,
  platformTotals,
} from "@lms/prototype/data";
import { fmt, price as fmtPrice } from "@lms/ui/i18n";
import { useModeration, useStore } from "@lms/prototype";
import { useLeads } from "@/components/admin/leads";
import { Waiting } from "@/components/admin/Waiting";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar } from "@lms/ui";
import { IconChevronRight, IconInbox, IconMail, IconMessage } from "@lms/ui/icons";
import type { ReactNode } from "react";

export default function AdminDashboard() {
  const { lang } = useStore();
  const { replyCount } = useModeration();
  const leads = useLeads();

  const newLeads = leads.filter((l) => l.status === "new");
  const queue = adminSubmissions;
  const openQuestions = adminQuestions.filter((q) => replyCount(q.id) === 0);

  /* Свежие сверху: чем меньше ждёт, тем новее */
  const freshLeads = [...newLeads].sort((a, b) => a.waiting - b.waiting).slice(0, 4);
  const freshQueue = [...queue].sort((a, b) => a.waiting - b.waiting).slice(0, 4);

  return (
    <AdminShell title="Дашборд" subtitle="Что требует действия прямо сейчас">
      <div className="stack g24">
        {/* ===== Три плитки: кликабельные, с красным счётчиком ===== */}
        <div className="dash-tiles">
          <Tile
            href="/leads"
            icon={<IconMail size={22} />}
            count={newLeads.length}
            label="новых заявок"
            hint="учителя нажали «Записаться»"
          />
          <Tile
            href="/submissions"
            icon={<IconInbox size={22} />}
            count={queue.length}
            label="работ ждут проверки"
            hint="задания с зачётом и доработкой"
          />
          <Tile
            href="/questions"
            icon={<IconMessage size={22} />}
            count={openQuestions.length}
            label="вопросов без ответа"
            hint="под уроками курсов"
          />
        </div>

        {/* ===== Три списка тех же сущностей ===== */}
        <div className="dash-three">
          <section className="card card-pad stack g12">
            <div className="row between g8">
              <h2 className="h3">Новые заявки</h2>
              <Link href="/leads" className="btn btn-ghost btn-sm">
                Все · {newLeads.length}
              </Link>
            </div>
            {freshLeads.length === 0 ? (
              <p className="small muted">Новых заявок нет — все разобраны.</p>
            ) : (
              <div className="stack g12">
                {freshLeads.map((l) => {
                  const teacher = getTeacher(l.teacherId);
                  const course = getCourse(l.courseId);
                  return (
                    <Link key={l.id} href={`/leads/${l.id}`} className="row g10">
                      <Avatar initials={teacher?.initials ?? "??"} size={36} tone="neutral" />
                      <div className="grow stack g2" style={{ minWidth: 0, lineHeight: 1.3 }}>
                        <span className="small clamp-2" style={{ fontWeight: 600 }}>
                          {teacher?.name}
                        </span>
                        <span className="caption muted-3 clamp-2">
                          {course?.title} · {fmtPrice(l.price ?? course?.price, lang)}
                        </span>
                      </div>
                      <Waiting days={l.waiting} redAfter={2} short />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card card-pad stack g12">
            <div className="row between g8">
              <h2 className="h3">Работы на проверке</h2>
              <Link href="/submissions" className="btn btn-ghost btn-sm">
                Все · {queue.length}
              </Link>
            </div>
            <div className="stack g12">
              {freshQueue.map((s) => (
                <Link
                  key={s.id}
                  href={`/submissions/${s.id}`}
                  className="row between g10"
                  style={{ alignItems: "flex-start" }}
                >
                  <div className="stack g2 grow" style={{ minWidth: 0, lineHeight: 1.35 }}>
                    <span className="small clamp-2" style={{ fontWeight: 600 }}>
                      {s.task}
                    </span>
                    <span className="caption muted-3 clamp-2">
                      {s.teacher} · {s.course}
                    </span>
                  </div>
                  <Waiting days={s.waiting} short />
                </Link>
              ))}
            </div>
          </section>

          <section className="card card-pad stack g12">
            <div className="row between g8">
              <h2 className="h3">Вопросы без ответа</h2>
              <Link href="/questions" className="btn btn-ghost btn-sm">
                Все · {openQuestions.length}
              </Link>
            </div>
            {openQuestions.length === 0 ? (
              <p className="small muted">Все вопросы разобраны.</p>
            ) : (
              <div className="stack g12">
                {openQuestions.map((q) => (
                  <Link key={q.id} href="/questions" className="stack g2">
                    <span className="small pretty" style={{ fontWeight: 600 }}>
                      {q.text}
                    </span>
                    <span className="caption muted-3 clamp-2">
                      {q.teacher} · {q.lesson} · {q.time}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===== Три справочных числа — просто строка, без оформления ===== */}
        <div className="row wrap g14 small muted" style={{ paddingTop: 4 }}>
          <span>
            Учителей: <strong style={{ color: "var(--text)" }}>{fmt(platformTotals.teachers)}</strong>
          </span>
          <span className="dot-sep">·</span>
          <span>
            Курсов опубликовано:{" "}
            <strong style={{ color: "var(--text)" }}>{platformTotals.publishedCourses}</strong>
          </span>
          <span className="dot-sep">·</span>
          <span>
            Выдано сертификатов:{" "}
            <strong style={{ color: "var(--text)" }}>{fmt(platformTotals.certificates)}</strong>
          </span>
        </div>
      </div>

      <style>{`
        .dash-tiles { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .dash-three { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 700px) { .dash-tiles { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 900px) { .dash-three { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </AdminShell>
  );
}

/* ============ Плитка «требует действия» ============ */

function Tile({
  href,
  icon,
  count,
  label,
  hint,
}: {
  href: string;
  icon: ReactNode;
  count: number;
  label: string;
  hint: string;
}) {
  const hot = count > 0;
  return (
    <Link href={href} className="card card-link card-pad row g14" style={{ minHeight: 88 }}>
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: hot ? "var(--danger-bg)" : "#f1f5f9",
          color: hot ? "var(--danger)" : "var(--text-3)",
        }}
      >
        {icon}
      </span>
      <div className="grow stack g2" style={{ minWidth: 0 }}>
        <span className="row g8" style={{ alignItems: "baseline" }}>
          <strong
            style={{
              fontSize: 26,
              lineHeight: "30px",
              letterSpacing: "-0.02em",
              color: hot ? "var(--danger)" : "var(--text-3)",
            }}
          >
            {count}
          </strong>
          <span className="small" style={{ fontWeight: 700 }}>
            {label}
          </span>
        </span>
        <span className="caption muted-3">{hint}</span>
      </div>
      <IconChevronRight size={18} className="muted-3" />
    </Link>
  );
}
