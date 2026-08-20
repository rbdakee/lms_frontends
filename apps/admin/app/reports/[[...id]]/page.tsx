"use client";

/**
 * Отчёт по курсу «/reports/:course_id» — раздел 5.23 брифа.
 *
 * `GET /admin/reports/{course_id}` считается в момент запроса и нигде
 * не хранится: сводка и воронка приходят целиком, участники — постраничным
 * списком внутри того же ответа, потому что на большом курсе их сотни.
 *
 * Отчёт всегда про версию курса, поэтому адрес без курса — не ошибка,
 * а выбор версии: пункт меню «Отчёты» ведёт именно сюда.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type AdminReport,
  type CatalogOut,
  type ReportCertificateState,
  type ReportParticipant,
} from "@lms/api";
import { dayTime } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Empty, Note, Progress, type BadgeKind } from "@lms/ui";
import { IconChart, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;

/**
 * Порог «заметного отвала» — доля от предыдущего шага, а не абсолютное число:
 * на курсе с тридцатью участниками сотня потерянных не наберётся никогда,
 * а пятая часть группы — уже повод посмотреть на элемент программы.
 */
const DROP_SHARE = 0.2;

export default function ReportPage() {
  const { t, lang } = useStore();
  const router = useRouter();
  /* Сегмент необязательный: «/reports» — это выбор курса, «/reports/2» — отчёт */
  const params = useParams<{ id?: string[] }>();
  const raw = params.id?.[0];
  const parsed = Number(raw);
  const courseId = Number.isInteger(parsed) ? parsed : undefined;

  const [query, setQuery] = useState("");
  /* Поиск по ФИО уходит на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const report = useLoad(
    () =>
      courseId === undefined
        ? Promise.resolve(null)
        : api<AdminReport>(
            `/admin/reports/${courseId}${qs({ page, per_page: PER_PAGE, q })}`,
          ),
    [courseId, page, q],
  );
  /* Список версий для переключателя курса наверху экрана */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);
  const courseOptions = (catalog.data?.items ?? []).flatMap((g) => g.versions);

  const data = report.data;
  const notFound = isApiError(report.error, "not_found");

  /* Кнопка «Выбрать курс» в пустом состоянии подводит взгляд к списку
     наверху: фокусирует его и, где браузер умеет, раскрывает */
  const pickerRef = useRef<HTMLSelectElement>(null);
  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      /* без showPicker остаётся фокус — этого достаточно */
    }
  };

  const picker = (
    <select
      ref={pickerRef}
      className="input"
      style={{ width: "auto", minWidth: 200 }}
      aria-label={t.repCourseField}
      value={courseId ?? ""}
      onChange={(e) => {
        setQuery("");
        setQ("");
        setPage(1);
        router.push(e.target.value ? `/reports/${e.target.value}` : "/reports");
      }}
    >
      <option value="">{t.repPickTitle}</option>
      {courseOptions.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </select>
  );

  return (
    <AdminShell
      title={data ? `${t.repTitle} · ${data.course.title}` : t.repTitle}
      subtitle={data ? t.repGeneratedAt(dayTime(data.generated_at, lang)) : undefined}
      /* Кнопки «Скачать CSV» нет: эндпоинта выгрузки нет, а неработающая
         кнопка — лишний шум (решение владельца 20.08.2026) */
      actions={picker}
    >
      {courseId === undefined ? (
        <div className="card">
          <Empty
            icon={<IconChart size={38} />}
            title={t.repPickTitle}
            text={t.repPickText}
            action={<Button onClick={openPicker}>{t.repPickBtn}</Button>}
          />
        </div>
      ) : report.loading && !data ? (
        <div className="card card-pad row center" style={{ minHeight: 240 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      ) : report.error || !data ? (
        <div className="card">
          <Empty
            title={notFound ? t.courseNotFound : t.loadError}
            text={notFound ? undefined : t.loadErrorText}
            action={
              notFound ? undefined : (
                <Button variant="secondary" onClick={report.reload}>
                  {t.retry}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="stack g24">
          <Summary data={data} />
          <Funnel data={data} />
          <Participants
            data={data}
            query={query}
            onQuery={setQuery}
            page={page}
            onPage={setPage}
          />
        </div>
      )}

      <style>{`
        .report-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 700px) { .report-kpis { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1200px) { .report-kpis { grid-template-columns: repeat(7, 1fr); } }
      `}</style>
    </AdminShell>
  );
}

/* ============ Сводка ============ */

/** Средние приходят `null`, когда считать не по кому: это прочерк, а не ноль. */
const dash = (v: number | null, suffix = "") => (v === null ? "—" : `${v}${suffix}`);

function Summary({ data }: { data: AdminReport }) {
  const { t } = useStore();
  const s = data.summary;
  const kpis: [string, string][] = [
    [String(s.granted), t.repGranted],
    [String(s.started), t.repStarted],
    [String(s.completed), t.repCompleted],
    [dash(s.avg_progress_percent, "%"), t.repAvgProgress],
    [dash(s.avg_final_score, "%"), t.repAvgFinal],
    [String(s.certificates), t.repCerts],
    [
      s.avg_days_to_complete === null ? "—" : t.repDays(s.avg_days_to_complete),
      t.repAvgDays,
    ],
  ];
  return (
    <div className="report-kpis">
      {kpis.map(([value, label]) => (
        <div key={label} className="card card-pad stack g4" style={{ padding: 14 }}>
          <strong style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{value}</strong>
          <span className="caption muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ============ Воронка ============ */

/**
 * Сервер отдаёт все видимые элементы программы — какие подсветить, решает
 * экран. Пояснительных выводов сервер не даёт, поэтому текст под воронкой
 * считается здесь и называет только самый заметный отвал.
 */
function Funnel({ data }: { data: AdminReport }) {
  const { t } = useStore();
  const items = data.funnel;

  if (items.length === 0) {
    return (
      <section className="card card-pad stack g8">
        <h2 className="h3">{t.repFunnel}</h2>
        <span className="caption muted">{t.repFunnelEmpty}</span>
      </section>
    );
  }

  const max = Math.max(...items.map((f) => f.reached), 1);
  const drops = items.map((f, i) => {
    const prev = i > 0 ? items[i - 1].reached : 0;
    const lost = i > 0 ? Math.max(0, prev - f.reached) : 0;
    const share = prev > 0 ? lost / prev : 0;
    return { lost, share, big: share >= DROP_SHARE && lost > 0 };
  });
  /* Самый резкий шаг — по доле, а не по числу: иначе большой курс всегда
     перебивает маленький и подсказка становится бесполезной */
  const worst = drops.reduce(
    (best, d, i) => (d.big && d.share > (drops[best]?.share ?? 0) ? i : best),
    -1,
  );

  return (
    <section className="card card-pad stack g16">
      <div className="stack g4">
        <h2 className="h3">{t.repFunnel}</h2>
        <span className="caption muted">{t.repFunnelHint}</span>
      </div>

      <div className="stack g12">
        {items.map((f, i) => {
          const d = drops[i];
          return (
            <div key={`${f.kind}-${f.id}`} className="stack g6">
              <div className="row between g10">
                <span className="small pretty" style={{ fontWeight: 600 }}>
                  {f.number}. {f.title}
                </span>
                <span className="row g8 nowrap">
                  {d.big && <Badge kind="rework">−{d.lost}</Badge>}
                  <span className="caption muted-3">{f.reached}</span>
                </span>
              </div>
              <div className="progress progress-thick">
                <div
                  className="progress-bar"
                  style={{
                    width: `${Math.round((f.reached / max) * 100)}%`,
                    background: d.big ? "var(--warning)" : "var(--primary)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {worst >= 0 && (
        <Note kind="warning">
          {t.repBiggestDrop(
            items[worst].title,
            drops[worst].lost,
            Math.round(drops[worst].share * 100),
          )}
        </Note>
      )}
    </section>
  );
}

/* ============ Участники ============ */

const CERT_KIND: Record<ReportCertificateState, BadgeKind> = {
  issued: "accepted",
  ready: "done",
  in_progress: "progress",
};

function Participants({
  data,
  query,
  onQuery,
  page,
  onPage,
}: {
  data: AdminReport;
  query: string;
  onQuery: (v: string) => void;
  page: number;
  onPage: (p: number) => void;
}) {
  const { t } = useStore();
  const { items, total } = data.participants;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const certLabel: Record<ReportCertificateState, string> = {
    issued: t.repCertIssued,
    ready: t.repCertReady,
    in_progress: t.repCertProgress,
  };

  /** «92 · —»: баллы по тестам модулей в порядке программы, `null` — не сдавал. */
  const quizScores = (p: ReportParticipant) =>
    p.module_quizzes.length === 0
      ? "—"
      : p.module_quizzes.map((mq) => (mq.score === null ? "—" : String(mq.score))).join(" · ");

  const finalText = (p: ReportParticipant) => {
    const { state, score } = p.final_quiz;
    if (state === "passed") return score === null ? "—" : `${score}%`;
    if (state === "failed")
      return score === null ? t.repFinalFailed : `${score}% · ${t.repFinalFailed}`;
    if (state === "in_progress") return t.repFinalInProgress;
    return t.repFinalNotStarted;
  };

  const name = (p: ReportParticipant) =>
    [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(" ");

  return (
    <section className="stack g14">
      <div className="row between wrap g12">
        <h2 className="h3">{t.repParticipants(total)}</h2>
        <div className="input-wrap" style={{ maxWidth: 320, flex: 1, minWidth: 200 }}>
          <span className="input-icon">
            <IconSearch size={19} />
          </span>
          <input
            className="input"
            placeholder={t.repSearchName}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <Empty
            icon={<IconSearch size={34} />}
            title={query ? t.repNoMatch : t.repNobodyTitle}
            text={query ? undefined : t.repNobodyText}
          />
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.repFio}</th>
                  <th>{t.repSchool}</th>
                  <th>{t.repProgress}</th>
                  <th>{t.repModuleQuizzes}</th>
                  <th>{t.repFinalQuiz}</th>
                  <th>{t.repCertificate}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.user_id}>
                    <td style={{ maxWidth: 260 }}>
                      <span className="small" style={{ fontWeight: 600 }}>
                        {name(p)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      <div className="stack g2">
                        <span className="small">{p.school}</span>
                        <span className="caption muted-3">{p.region}</span>
                      </div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="row g8">
                        <Progress value={p.progress_percent} />
                        <span className="caption nowrap" style={{ fontWeight: 700 }}>
                          {p.progress_percent}%
                        </span>
                      </div>
                    </td>
                    <td className="small nowrap">{quizScores(p)}</td>
                    <td className="small nowrap">{finalText(p)}</td>
                    <td>
                      <Badge kind={CERT_KIND[p.certificate]}>{certLabel[p.certificate]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-mobile-cards">
            {items.map((p) => (
              <div key={p.user_id} className="card card-pad stack g10">
                <div className="row between wrap g10" style={{ alignItems: "flex-start" }}>
                  <strong className="small pretty grow">{name(p)}</strong>
                  <Badge kind={CERT_KIND[p.certificate]}>{certLabel[p.certificate]}</Badge>
                </div>
                <span className="caption muted">
                  {p.school} · {p.region} · {t.repFinalQuiz.toLowerCase()} {finalText(p)}
                </span>
                <div className="row g10">
                  <Progress value={p.progress_percent} />
                  <strong className="caption nowrap">{p.progress_percent}%</strong>
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="row center g10">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
              >
                {t.back}
              </Button>
              <span className="small muted-3">{t.pageOf(page, pages)}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => onPage(page + 1)}
              >
                {t.forward}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
