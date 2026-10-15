"use client";

/**
 * Справочник учебной программы «/curriculum» — раздел 3 `TEACHER_AI_BRIEF`,
 * сессия L2.
 *
 * Владелец импортировал официальную школьную программу (приказ № 399,
 * математика 1–4 класс, две языковые редакции) и вычитывает её лично.
 * Этот экран — вход в вычитку: какие программы загружены, сколько
 * у каждой подозрений и сколько из них ошибок. Пока ошибки не разобраны,
 * программу нельзя открыть в работу, поэтому число ошибок стоит в строке,
 * а не прячется внутри.
 *
 * Данные — `GET /admin/curriculum/programs` с серверной пагинацией
 * и фильтрами `lang` и `status`. Фильтра по предмету на экране нет, хотя
 * параметр у эндпоинта есть: предмет в первой волне ровно один
 * (математика), справочника предметов эндпоинтом не отдаётся, а селект
 * из одного пункта читается как сломанный. Вернётся вместе со вторым
 * предметом — познанием мира.
 *
 * Площадки у справочника нет вовсе: государственная программа одна на обе
 * (`TEACHER_AI_BRIEF`, раздел 8), поэтому и фильтра площадки здесь нет.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  api,
  qs,
  useLoad,
  type CurriculumLang,
  type CurriculumProgram,
  type CurriculumProgramsPage,
  type CurriculumStatus,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { CurriculumStatusBadge } from "@/components/admin/curriculumApi";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Empty, LinkButton } from "@lms/ui";
import { IconBook, IconChevronRight, IconExternal, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;

/** «Все» — не значение фильтра, а его отсутствие. */
type LangFilter = CurriculumLang | "all";
type StatusFilter = CurriculumStatus | "all";

export default function CurriculumPage() {
  const { t } = useLang();

  const [lang, setLangFilter] = useState<LangFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const list = useLoad(
    () =>
      api<CurriculumProgramsPage>(
        `/admin/curriculum/programs${qs({
          page,
          per_page: PER_PAGE,
          lang: lang === "all" ? undefined : lang,
          status: status === "all" ? undefined : status,
        })}`,
      ),
    [page, lang, status],
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = lang !== "all" || status !== "all";

  const resetFilters = () => {
    setLangFilter("all");
    setStatus("all");
    setPage(1);
  };

  const LANGS: { value: LangFilter; label: string }[] = [
    { value: "all", label: t.curAll },
    { value: "ru", label: t.curLangRu },
    { value: "kz", label: t.curLangKz },
  ];
  const STATUSES: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t.curAll },
    { value: "loaded", label: t.curStLoaded },
    { value: "published", label: t.curStPublished },
  ];

  return (
    <AdminShell
      title={t.curTitle}
      /* Счётчик прошлой удачной загрузки при ошибке врал бы: `useLoad`
         данные не чистит */
      subtitle={
        list.error ? undefined : filtered ? t.curByFilter(total) : t.curPrograms(total)
      }
    >
      <div className="stack g16">
        {/* ===== Фильтры. Обоих значений закрытый список, чипы помещаются
            в строку и на телефоне — окна снизу не нужно ===== */}
        <div className="row wrap g16">
          <FilterRow label={t.curFilterLang}>
            {LANGS.map((o) => (
              <button
                key={o.value}
                type="button"
                className="chip"
                data-active={lang === o.value}
                onClick={() => {
                  setLangFilter(o.value);
                  setPage(1);
                }}
              >
                {o.label}
              </button>
            ))}
          </FilterRow>
          <FilterRow label={t.curFilterStatus}>
            {STATUSES.map((o) => (
              <button
                key={o.value}
                type="button"
                className="chip"
                data-active={status === o.value}
                onClick={() => {
                  setStatus(o.value);
                  setPage(1);
                }}
              >
                {o.label}
              </button>
            ))}
          </FilterRow>
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
              icon={filtered ? <IconSearch size={34} /> : <IconBook size={38} />}
              title={filtered ? t.curNoMatchTitle : t.curEmptyTitle}
              text={filtered ? t.curNoMatchText : t.curEmptyText}
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
                    <th>{t.curColSubject}</th>
                    <th>{t.curColLang}</th>
                    <th>{t.curColGrades}</th>
                    <th>{t.curColOrder}</th>
                    <th>{t.curColStatus}</th>
                    <th>{t.curColObjectives}</th>
                    <th>{t.curColIssues}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td style={{ maxWidth: 300 }}>
                        <div className="stack g2">
                          <Link
                            href={`/curriculum/${p.id}`}
                            className="small"
                            style={{ fontWeight: 600 }}
                          >
                            {p.subject_title}
                          </Link>
                          <span className="caption muted-3 clamp-2">{p.title}</span>
                        </div>
                      </td>
                      <td>
                        <LangChip lang={p.lang} />
                      </td>
                      <td>
                        <span className="small nowrap">{t.curGrades(p.grade_from, p.grade_to)}</span>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <OrderCell program={p} />
                      </td>
                      <td>
                        <CurriculumStatusBadge status={p.status} />
                      </td>
                      <td>
                        <span className="small">{p.objectives_count}</span>
                      </td>
                      <td>
                        <IssueCounts program={p} />
                      </td>
                      <td style={{ width: 120 }}>
                        <LinkButton href={`/curriculum/${p.id}`} variant="secondary" size="sm">
                          {t.curOpen}
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
              {items.map((p) => (
                <div key={p.id} className="card card-pad stack g12">
                  <div className="row g10">
                    <Link
                      href={`/curriculum/${p.id}`}
                      className="grow stack g2"
                      style={{ minWidth: 0 }}
                    >
                      <span className="small" style={{ fontWeight: 700 }}>
                        {p.subject_title} · {t.curGrades(p.grade_from, p.grade_to)}
                      </span>
                      <span className="caption muted-3 pretty">{p.title}</span>
                    </Link>
                    <CurriculumStatusBadge status={p.status} />
                  </div>

                  <div className="row wrap g8">
                    <LangChip lang={p.lang} />
                    <span className="caption muted-3">{t.curObjectivesN(p.objectives_count)}</span>
                    <IssueCounts program={p} />
                  </div>

                  <OrderCell program={p} />
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
    </AdminShell>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="stack g6">
      <span className="caption muted-3">{label}</span>
      <div className="row wrap g8">{children}</div>
    </div>
  );
}

/** Язык обучения программы. Не язык интерфейса — у справочника он свой. */
function LangChip({ lang }: { lang: CurriculumLang }) {
  const { t } = useLang();
  return <Badge kind="neutral">{lang === "kz" ? t.curLangKz : t.curLangRu}</Badge>;
}

/**
 * Приказ и ссылка на него в «Әділет». Открывается в одно нажатие и в новой
 * вкладке: вычитка — это сверка с первоисточником, и уходить с экрана
 * ради неё человек не должен.
 */
function OrderCell({ program }: { program: CurriculumProgram }) {
  const { t } = useLang();
  return (
    <div className="stack g2">
      <span className="small nowrap">{t.curOrderNo(program.order_number)}</span>
      <a
        href={program.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="caption row g4"
        style={{ alignItems: "center" }}
      >
        <span className="clamp-2">{program.order_date_text}</span>
        <IconExternal size={13} />
      </a>
    </div>
  );
}

/**
 * Ошибки и предупреждения врозь: ошибки держат публикацию, предупреждения —
 * нет. Складывать их в одно число значит скрывать, разберётся программа
 * сегодня или нет.
 */
function IssueCounts({ program }: { program: CurriculumProgram }) {
  const { t } = useLang();
  const warnings = Math.max(0, program.issues_open - program.errors_open);

  if (program.issues_open === 0) {
    return <span className="caption muted-3 nowrap">{t.curAllResolved}</span>;
  }
  return (
    <div className="row wrap g6">
      {program.errors_open > 0 && (
        <Badge kind="rework">{t.curErrorsN(program.errors_open)}</Badge>
      )}
      {warnings > 0 && <Badge kind="progress">{t.curWarningsN(warnings)}</Badge>}
    </div>
  );
}
