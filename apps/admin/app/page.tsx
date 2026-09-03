"use client";

/**
 * Рабочий стол админа «/» — раздел 5.15 брифа.
 *
 * Это не аналитика: сверху три плитки того, что требует действия, под ними
 * три списка тех же сущностей, внизу три справочных числа. Графиков по неделям,
 * периодов, дельт «+312» и «обновлено 2 минуты назад» здесь нет и не будет —
 * ради них пришлось бы хранить историю и агрегаты (раздел 9а).
 *
 * Всё это приходит одним `GET /admin/overview`: счётчики, по пять свежих
 * элементов в каждом списке и справочные числа. Тем же ответом живут бейджи
 * меню — иначе числа в меню и на плитках разъезжаются.
 *
 * Площадок две, экран показывает обе. Фильтр площадки здесь один на весь
 * экран (`PLATFORMS_BRIEF`, решение 9: общие числа плюс фильтр, а не две
 * колонки всюду) и живёт в адресе — им делятся ссылкой. Исключение одно:
 * «Учителей» сервер считает по обеим площадкам всегда, потому что аккаунт
 * один на обе (решение 11), и под фильтром это сказано прямо.
 */

import Link from "next/link";
import { api, qs, useLoad, type AdminOverview } from "@lms/api";
import { dayTime, fmt, price as fmtPrice } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import {
  PlatformChip,
  PlatformFilter,
  PlatformFilterBoundary,
  usePlatformFilter,
} from "@/components/admin/platforms";
import { Waiting } from "@/components/admin/Waiting";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Button, Empty } from "@lms/ui";
import {
  IconCertificate,
  IconChevronRight,
  IconInbox,
  IconLayers,
  IconMail,
  IconMessage,
  IconUsers,
} from "@lms/ui/icons";
import type { ReactNode } from "react";

/** Порог, после которого «ждёт N дней» краснеет: у заявок свой, у работ свой. */
const LEAD_RED_AFTER = 2;
const SUBMISSION_RED_AFTER = 3;

/** ФИО учителя собирает фронт: сервер отдаёт его тремя полями. */
type Teacher = { last_name: string; first_name: string; middle_name: string };
const teacherName = (t: Teacher) =>
  [t.last_name, t.first_name, t.middle_name].filter(Boolean).join(" ");
const teacherInitials = (t: Teacher) =>
  ((t.first_name[0] ?? "") + (t.last_name[0] ?? "")).toUpperCase() || "??";

export default function AdminDashboard() {
  /* Фильтр площадки читается из адреса, а useSearchParams требует границы
     Suspense: без неё статический маршрут не собирается */
  return (
    <PlatformFilterBoundary>
      <Dashboard />
    </PlatformFilterBoundary>
  );
}

function Dashboard() {
  const { t, lang } = useLang();
  const [platform, setPlatform] = usePlatformFilter();
  const overview = useLoad(
    () => api<AdminOverview>(`/admin/overview${qs({ platform })}`),
    [platform],
  );

  /* Чипы стоят и в загрузке, и в ошибке: иначе выбранную площадку нельзя
     было бы сменить, не правя адрес руками */
  const filter = <PlatformFilter value={platform} onChange={setPlatform} />;

  /* Гасим экран только на первой загрузке: переключение чипа перезапрашивает
     сводку целиком, и спиннер вместо всех чисел на каждый клик читался бы
     как «всё пропало» */
  if (overview.loading && !overview.data) {
    return (
      <AdminShell title={t.dashTitle} subtitle={t.dashSubtitle}>
        <div className="stack g24">
          {filter}
          <div className="card card-pad row center" style={{ minHeight: 240 }}>
            <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
          </div>
        </div>
      </AdminShell>
    );
  }

  if (overview.error || !overview.data) {
    return (
      <AdminShell title={t.dashTitle} subtitle={t.dashSubtitle}>
        <div className="stack g24">
          {filter}
          <div className="card">
            <Empty
              title={t.loadError}
              text={t.loadErrorText}
              action={
                <Button variant="secondary" onClick={overview.reload}>
                  {t.retry}
                </Button>
              }
            />
          </div>
        </div>
      </AdminShell>
    );
  }

  const d = overview.data;

  return (
    <AdminShell title={t.dashTitle} subtitle={t.dashSubtitle}>
      <div className="stack g24">
        {filter}

        {/* ===== Три плитки: кликабельные, с красным счётчиком ===== */}
        <div className="dash-tiles">
          <Tile
            href="/leads"
            icon={<IconMail size={22} />}
            count={d.leads_count}
            label={t.dashLeads}
            hint={t.dashLeadsHint}
          />
          <Tile
            href="/submissions"
            icon={<IconInbox size={22} />}
            count={d.submissions_count}
            label={t.dashSubs}
            hint={t.dashSubsHint}
          />
          <Tile
            href="/questions"
            icon={<IconMessage size={22} />}
            count={d.questions_count}
            label={t.dashQuestions}
            hint={t.dashQuestionsHint}
          />
        </div>

        {/* ===== Три списка тех же сущностей, по пять свежих ===== */}
        <div className="dash-three">
          <Panel title={t.dashLeadsList} href="/leads" total={d.leads_count}>
            {d.leads.length === 0 ? (
              <p className="small muted">{t.dashNoLeads}</p>
            ) : (
              <div className="stack g12">
                {d.leads.map((l) => (
                  <Link key={l.id} href={`/leads/${l.id}`} className="row g10">
                    <Avatar initials={teacherInitials(l.teacher)} size={36} tone="neutral" />
                    <div className="grow stack g2" style={{ minWidth: 0, lineHeight: 1.3 }}>
                      <span className="small clamp-2" style={{ fontWeight: 600 }}>
                        {teacherName(l.teacher)}
                      </span>
                      <span className="row wrap g6">
                        <span className="caption muted-3 clamp-2">
                          {l.course.title} · {fmtPrice(l.price_snapshot ?? undefined, lang)}
                        </span>
                        <PlatformChip platform={l.platform} />
                      </span>
                    </div>
                    <Waiting days={l.waiting_days} redAfter={LEAD_RED_AFTER} short />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t.dashQueueList} href="/submissions" total={d.submissions_count}>
            {d.submissions.length === 0 ? (
              <p className="small muted">{t.dashNoQueue}</p>
            ) : (
              <div className="stack g12">
                {d.submissions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/submissions/${s.id}`}
                    className="row between g10"
                    style={{ alignItems: "flex-start" }}
                  >
                    <div className="stack g2 grow" style={{ minWidth: 0, lineHeight: 1.35 }}>
                      <span className="small clamp-2" style={{ fontWeight: 600 }}>
                        {s.task.title}
                      </span>
                      <span className="row wrap g6">
                        <span className="caption muted-3 clamp-2">
                          {teacherName(s.teacher)} · {s.course.title}
                        </span>
                        <PlatformChip platform={s.platform} />
                      </span>
                    </div>
                    <Waiting days={s.waiting_days} redAfter={SUBMISSION_RED_AFTER} short />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t.dashQuestionsList} href="/questions" total={d.questions_count}>
            {d.questions.length === 0 ? (
              <p className="small muted">{t.dashNoQuestions}</p>
            ) : (
              <div className="stack g12">
                {d.questions.map((q) => (
                  <Link key={q.id} href="/questions" className="stack g2">
                    <span className="small pretty" style={{ fontWeight: 600 }}>
                      {q.text}
                    </span>
                    <span className="row wrap g6">
                      <span className="caption muted-3 clamp-2">
                        {teacherName(q.teacher)} · {t.qaLesson(q.lesson.number, q.lesson.title)} ·{" "}
                        {dayTime(q.created_at, lang)}
                      </span>
                      <PlatformChip platform={q.platform} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ===== Три справочных числа — виджеты, как плитки сверху, но
            в спокойном синем: это справка, а не «требует действия» ===== */}
        <div className="dash-tiles">
          {/* Аккаунт один на обе площадки (решение 11), поэтому учителей
              сервер считает по обеим всегда — под фильтром это надо сказать
              вслух, иначе число выглядит враньём рядом с отфильтрованными */}
          <Stat
            icon={<IconUsers size={20} />}
            value={fmt(d.totals.teachers)}
            /* Единственное число сводки, которое фильтр не слушает: аккаунт
               один на обе площадки, и «учитель площадки» — понятие, которого
               в договорённости нет. Под фильтром это надо сказать вслух */
            label={platform ? `${t.dashTeachers} · ${t.pfBothAlways}` : t.dashTeachers}
          />
          <Stat
            icon={<IconLayers size={20} />}
            value={String(d.totals.courses_published)}
            label={t.dashCourses}
          />
          <Stat
            icon={<IconCertificate size={20} />}
            value={fmt(d.totals.certificates)}
            label={t.dashCerts}
          />
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

/* ============ Список под плиткой ============ */

function Panel({
  title,
  href,
  total,
  children,
}: {
  title: string;
  href: string;
  total: number;
  children: ReactNode;
}) {
  const { t } = useLang();
  return (
    <section className="card card-pad stack g12">
      <div className="row between g8">
        <h2 className="h3">{title}</h2>
        <Link href={href} className="btn btn-ghost btn-sm">
          {t.dashAll(total)}
        </Link>
      </div>
      {children}
    </section>
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
    /* display: flex — инлайном: .card-link объявлен в CSS ниже .row и его
       display: block перебивал флекс, плитка складывалась в столбик,
       а шеврон падал под текст и не читался как «сюда можно нажать» */
    <Link
      href={href}
      className="card card-link card-pad row g14"
      style={{ minHeight: 88, display: "flex" }}
    >
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

/* ============ Справочное число внизу ============ */

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="card card-pad row g14" style={{ minHeight: 72 }}>
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--primary-bg)",
          color: "var(--primary)",
        }}
      >
        {icon}
      </span>
      <div className="grow stack g2" style={{ minWidth: 0 }}>
        <strong style={{ fontSize: 22, lineHeight: "26px", letterSpacing: "-0.02em" }}>
          {value}
        </strong>
        <span className="caption muted-3">{label}</span>
      </div>
    </div>
  );
}
