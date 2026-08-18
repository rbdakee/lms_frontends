"use client";

/**
 * Карточка заявки «/leads/:id» — раздел 5.26 брифа.
 *
 * Всё, что нужно перед звонком: кто это, что за курс, заметка админа.
 * Главное действие — «Открыть доступ»: после него курс появляется у учителя.
 *
 * Точечного `GET /admin/leads/{id}` в контракте пока нет — заявка ищется
 * по страницам списка (`findLead`), пожелание записано владельцу. История
 * заявки в модели данных тоже отсутствует — блок сведён к «создана /
 * напоминание / текущий статус». «Другие курсы учителя» вернутся вместе
 * с карточкой учителя (сессия 7).
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, isApiError, useLoad, type AdminLead, type LeadStatus } from "@lms/api";
import { dayTime, phoneFmt, price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { findLead, isOpenLead, LEAD_STATUS_LABEL } from "@/components/admin/leadsApi";
import { LeadStatusPicker, PhoneActions } from "@/components/admin/LeadStatus";
import { Waiting } from "@/components/admin/Waiting";
import { GrantLeadSheet } from "@/components/admin/GrantLead";
import { web } from "@/lib/urls";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  Avatar,
  Breadcrumbs,
  Button,
  Empty,
  LinkButton,
  Note,
  StatusBadge,
} from "@lms/ui";
import { IconCheck } from "@lms/ui/icons";

export default function LeadCardPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, toast } = useStore();

  const lead = useLoad(() => findLead(Number(id)), [id]);

  const [granting, setGranting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  if (lead.loading) {
    return (
      <AdminShell title="Заявка">
        <div className="card card-pad row center" style={{ minHeight: 200 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  if (lead.error) {
    return (
      <AdminShell title="Заявка">
        <div className="card">
          <Empty
            title="Не удалось загрузить"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={lead.reload}>
                Повторить
              </Button>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const l = lead.data;
  if (!l) {
    return (
      <AdminShell title="Заявка не найдена">
        <div className="card">
          <Empty
            title="Заявка не найдена"
            text="Возможно, ссылка устарела."
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

  const teacherName = [l.teacher.last_name, l.teacher.first_name, l.teacher.middle_name]
    .filter(Boolean)
    .join(" ");
  const noteText = note ?? l.note ?? "";

  const replaceLead = (updated: AdminLead) => lead.setData(updated);

  const saveNote = async () => {
    setSavingNote(true);
    try {
      const updated = await api<AdminLead>(`/admin/leads/${l.id}`, {
        method: "PATCH",
        json: { note: noteText.trim() || null },
      });
      replaceLead(updated);
      setNote(null);
      toast("Заметка сохранена");
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось сохранить заметку", "error");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <AdminShell
      title={teacherName || "Заявка"}
      subtitle={`Заявка на «${l.course.title}» · ${dayTime(l.created_at, lang)}`}
    >
      <div className="stack g16">
        <Breadcrumbs
          items={[{ label: "Заявки", href: "/leads" }, { label: teacherName || `№${l.id}` }]}
        />

        <div className="lead-two">
          {/* ===== Учитель ===== */}
          <aside className="stack g16">
            <div className="card card-pad stack g14">
              <div className="row g12">
                <Avatar
                  initials={
                    ((l.teacher.first_name[0] ?? "") + (l.teacher.last_name[0] ?? "")).toUpperCase() ||
                    "??"
                  }
                  size={54}
                  tone="neutral"
                />
                <div className="grow stack g4" style={{ minWidth: 0 }}>
                  <strong className="pretty">{teacherName}</strong>
                  <span className="caption muted-3">{l.teacher.subject}</span>
                </div>
              </div>

              <hr className="divider" />

              <dl className="stack g10" style={{ margin: 0 }}>
                {(
                  [
                    ["Школа", l.teacher.school],
                    ["Регион", l.teacher.region],
                    ["Телефон", phoneFmt(l.teacher.phone)],
                  ] as [string, string][]
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
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

              <PhoneActions phone={l.teacher.phone} />
            </div>
          </aside>

          {/* ===== Заявка ===== */}
          <section className="stack g16">
            <div className="card card-pad stack g14">
              <div className="row between wrap g10">
                <div className="stack g4" style={{ minWidth: 0 }}>
                  <span className="caption muted">Курс</span>
                  {/* Страница курса живёт в приложении учителя — там и смотрим */}
                  <a href={web(`/courses/${l.course.id}`)} className="pretty">
                    <strong>{l.course.title}</strong>
                  </a>
                </div>
                <StatusBadge status={LEAD_STATUS_LABEL[l.status as LeadStatus]} />
              </div>

              <div className="row wrap g14">
                <div className="stack g2">
                  <span className="caption muted">Цена на момент заявки</span>
                  <strong style={{ fontSize: 20, letterSpacing: "-0.01em" }}>
                    {fmtPrice(l.price_snapshot ?? undefined, lang)}
                  </strong>
                </div>
                <div className="stack g2">
                  <span className="caption muted">Заявка</span>
                  <strong className="small">{dayTime(l.created_at, lang)}</strong>
                </div>
                {isOpenLead(l.status) && (
                  <div className="stack g2">
                    <span className="caption muted">Ожидание</span>
                    <Waiting days={l.waiting_days} redAfter={2} />
                  </div>
                )}
              </div>

              {l.reminded_at && (
                <Note kind="warning">
                  <span className="small">
                    Учитель нажал «Записаться» повторно ({dayTime(l.reminded_at, lang)}) —
                    новая заявка не создалась, у этой обновилась метка.
                  </span>
                </Note>
              )}

              <div className="stack g10">
                <span className="caption muted">Статус заявки</span>
                <LeadStatusPicker
                  lead={l}
                  onGrant={() => setGranting(true)}
                  onChanged={replaceLead}
                />
              </div>

              {l.status === "granted" ? (
                <Note kind="success">
                  <span className="small">
                    Доступ открыт — курс у учителя в «Моих курсах».{" "}
                    <a href={web("/my")} style={{ color: "var(--primary)", fontWeight: 700 }}>
                      Посмотреть кабинет
                    </a>
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

            {/* Хронология: полной истории статусов в модели данных пока нет */}
            <div className="card card-pad stack g12">
              <h2 className="h3">Хронология</h2>
              <ol className="stack g12" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {(
                  [
                    { label: "Заявка создана", when: dayTime(l.created_at, lang) },
                    ...(l.reminded_at
                      ? [{ label: "Напоминание от учителя", when: dayTime(l.reminded_at, lang) }]
                      : []),
                    {
                      label: `Текущий статус: ${LEAD_STATUS_LABEL[l.status as LeadStatus]}`,
                      when: "",
                    },
                  ] as { label: string; when: string }[]
                ).map((h, i, arr) => (
                  <li key={i} className="row g10" style={{ alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        marginTop: 6,
                        flexShrink: 0,
                        background: i === arr.length - 1 ? "var(--primary)" : "var(--border)",
                      }}
                    />
                    <div className="stack g2 grow" style={{ minWidth: 0 }}>
                      <span className="small" style={{ fontWeight: 600 }}>
                        {h.label}
                      </span>
                      {h.when && <span className="caption muted-3">{h.when}</span>}
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
                  loading={savingNote}
                  disabled={note === null || note === (l.note ?? "")}
                  onClick={saveNote}
                >
                  Сохранить заметку
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <GrantLeadSheet
        lead={l}
        open={granting}
        onClose={() => setGranting(false)}
        onGranted={lead.reload}
      />

      <style>{`
        .lead-two { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
        @media (min-width: 1024px) { .lead-two { grid-template-columns: 340px 1fr; gap: 24px; } }
      `}</style>
    </AdminShell>
  );
}
