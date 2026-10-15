"use client";

/**
 * Сверка одной программы «/curriculum/:id» — разделы 3 и 3.1
 * `TEACHER_AI_BRIEF`, сессия L2.
 *
 * Экран рассчитан на одного человека за один-два присеста, а не на
 * распределённую работу редакции: вычитывает владелец лично. Отсюда
 * устройство — слева дерево разделов, справа две вкладки, и открывается
 * первой та, ради которой экран и существует.
 *
 * **Подозрения** — то, что машина нашла до человека. Половина из них
 * не ошибки разбора, а свойства самого приказа: цель без четверти, дыра
 * в нумерации, оборванная на запятой формулировка. Их не чинят — их
 * помечают разобранными, поэтому у каждого вида подозрения стоит
 * человеческая подсказка, а у трёх самых частых «нормальных» — отдельная
 * оговорка. Пугать красным там, где всё в порядке, — способ заставить
 * человека разбирать ровные строки зря.
 *
 * **Цели** — постраничный список с фильтрами. Правка нужна ровно там, где
 * приказ пришёл неполным: математические знаки (≠, ∩, ∪, ∅, ≥) вставлены
 * в него картинками, и на их месте стоит `[img]`.
 *
 * Данные: `GET /admin/curriculum/programs/{id}` (программа с деревом),
 * `.../issues` и `.../objectives` (свои пагинации и фильтры), действия —
 * `POST|DELETE /admin/curriculum/issues/{id}/resolve`,
 * `PATCH /admin/curriculum/objectives/{id}` и публикация.
 *
 * Публикация закрыта, пока есть неразобранные **ошибки**; предупреждения
 * ей не мешают, и это сказано на экране — иначе человек будет разбирать
 * их ради выката.
 */

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type CurriculumIssue,
  type CurriculumIssuesPage,
  type CurriculumProgram,
  type CurriculumProgramCard,
  type LearningObjective,
  type LearningObjectivePatch,
  type LearningObjectivesPage,
} from "@lms/api";
import { dayTime } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { fieldErrors } from "@/lib/fieldErrors";
import {
  CurriculumStatusBadge,
  IMG_MARK,
  MATH_SIGNS,
  ObjectiveText,
  SeverityBadge,
  useIssueHint,
} from "@/components/admin/curriculumApi";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Breadcrumbs, Button, Empty, LinkButton, Note, Sheet } from "@lms/ui";
import {
  IconAlert,
  IconArrowLeft,
  IconCheckCircle,
  IconEdit,
  IconExternal,
  IconInfo,
  IconLock,
  IconSearch,
} from "@lms/ui/icons";

const PER_PAGE = 20;

type Tab = "issues" | "objectives";

/** Фильтры вкладки «Цели». Живут в экране: их меняет и дерево слева. */
interface ObjFilters {
  q: string;
  grade: number | "all";
  subsection: string | null;
  has_image: boolean;
  edited: boolean;
  page: number;
}

const NO_FILTERS: ObjFilters = {
  q: "",
  grade: "all",
  subsection: null,
  has_image: false,
  edited: false,
  page: 1,
};

export default function CurriculumProgramPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang: uiLang } = useLang();

  const program = useLoad(
    () => api<CurriculumProgramCard>(`/admin/curriculum/programs/${id}`),
    [id],
  );

  const [tab, setTab] = useState<Tab>("issues");
  /* Что печатают и что ушло на сервер — разные значения: запрос идёт через
     паузу, иначе список дёргался бы на каждую букву */
  const [objQuery, setObjQuery] = useState("");
  const [obj, setObj] = useState<ObjFilters>(NO_FILTERS);

  useEffect(() => {
    const id = setTimeout(() => {
      setObj((prev) => ({ ...prev, q: objQuery.trim(), page: 1 }));
    }, 300);
    return () => clearTimeout(id);
  }, [objQuery]);

  /* Спиннер во весь экран — только пока данных нет вовсе: после отметки
     «разобрано» программа перечитывается ради счётчиков, и мигать всем
     экраном ради двух чисел незачем */
  if (program.loading && !program.data) {
    return (
      <AdminShell title={t.curTitle}>
        <div className="card card-pad row center" style={{ minHeight: 200 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  const p = program.data;
  if (program.error || !p) {
    const missing = program.error?.status === 404;
    return (
      <AdminShell title={t.curTitle}>
        <div className="card">
          <Empty
            title={missing ? t.curNotFound : t.loadError}
            text={missing ? t.curNotFoundText : t.loadErrorText}
            action={
              missing ? (
                <LinkButton href="/curriculum" variant="secondary">
                  {t.curToList}
                </LinkButton>
              ) : (
                <Button variant="secondary" onClick={program.reload}>
                  {t.retry}
                </Button>
              )
            }
          />
        </div>
      </AdminShell>
    );
  }

  const published = p.status === "published";

  /** Подраздел из дерева фильтрует цели — у подозрений такого фильтра нет. */
  const pickSubsection = (code: string | null) => {
    setObj((prev) => ({ ...prev, subsection: code, page: 1 }));
    setTab("objectives");
  };

  /**
   * Из подозрения — к самой цели. «Вместо знака стоит [img]» без перехода
   * к тексту заставляло бы искать код руками в списке из 244 строк.
   */
  const goToObjective = (code: string) => {
    setObjQuery(code);
    setObj({ ...NO_FILTERS, q: code });
    setTab("objectives");
  };

  /* Язык обучения программы, номер приказа и дата последнего события над ней:
     три вещи, по которым две языковые редакции одного приказа не путаются */
  const subtitle = [
    p.lang === "kz" ? t.curLangKz : t.curLangRu,
    t.curOrderNo(p.order_number),
    published
      ? t.curPublishedAt(dayTime(p.published_at, uiLang))
      : t.curImportedAt(dayTime(p.imported_at, uiLang)),
  ].join(" · ");

  return (
    <AdminShell
      title={`${p.subject_title}, ${t.curGrades(p.grade_from, p.grade_to)}`}
      subtitle={subtitle}
      actions={
        <div className="row g8">
          {/* Приказ открывается в одно нажатие и в новой вкладке: вычитка —
              это сверка с первоисточником */}
          <a
            href={p.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <IconExternal size={16} />
            <span className="hide-sm">{t.curSource}</span>
          </a>
          <LinkButton href="/curriculum" variant="ghost" size="sm">
            <IconArrowLeft size={16} />
            <span className="hide-sm">{t.curToList}</span>
          </LinkButton>
        </div>
      }
    >
      <div className="stack g16">
        <Breadcrumbs
          items={[{ label: t.curTitle, href: "/curriculum" }, { label: p.subject_title }]}
        />

        <PublishCard program={p} onChanged={program.setData} />

        <div className="cur-layout">
          {/* ===== Дерево разделов ===== */}
          <aside className="cur-tree card" aria-label={t.curTree}>
            <button
              type="button"
              className="cur-tree-item"
              data-active={obj.subsection === null && tab === "objectives"}
              onClick={() => pickSubsection(null)}
            >
              <span className="grow">{t.curAllObjectives}</span>
              <span className="caption muted-3">{p.objectives_count}</span>
            </button>

            {p.sections.map((s) => (
              <div key={s.id}>
                <div className="cur-tree-group">
                  {s.code}. {s.title}
                </div>
                {s.subsections.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    className="cur-tree-item"
                    data-active={obj.subsection === sub.code && tab === "objectives"}
                    onClick={() => pickSubsection(sub.code)}
                  >
                    <span className="mono caption muted-3">{sub.code}</span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      {sub.title}
                    </span>
                    <span className="caption muted-3">{sub.objectives_count}</span>
                  </button>
                ))}
              </div>
            ))}
          </aside>

          {/* ===== Вкладки ===== */}
          <div className="stack g14" style={{ minWidth: 0 }}>
            <div className="tabs" role="group">
              <button type="button" data-active={tab === "issues"} onClick={() => setTab("issues")}>
                {t.curTabIssues}
                {p.issues_open > 0 && <span className="cur-tab-count">{p.issues_open}</span>}
              </button>
              <button
                type="button"
                data-active={tab === "objectives"}
                onClick={() => setTab("objectives")}
              >
                {t.curTabObjectives}
              </button>
            </div>

            {tab === "issues" ? (
              <IssuesTab
                programId={p.id}
                onResolved={program.reload}
                onOpenObjective={goToObjective}
              />
            ) : (
              <ObjectivesTab
                program={p}
                filters={obj}
                onQuery={setObjQuery}
                query={objQuery}
                onFilters={setObj}
                locked={published}
                onConflict={program.reload}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        .cur-layout {
          display: grid;
          grid-template-columns: 286px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }
        .cur-tree { padding: 8px; max-height: calc(100dvh - 260px); overflow-y: auto; }
        .cur-tree-item { display: flex; align-items: center; gap: 8px; width: 100%;
                         border: none; background: none; cursor: pointer; text-align: left;
                         padding: 7px 10px; border-radius: 10px; color: var(--text-2);
                         font-size: 13.5px; line-height: 1.35; }
        .cur-tree-item:hover { background: var(--surface-subtle); }
        .cur-tree-item[data-active="true"] { background: var(--primary-bg);
                                             color: var(--primary-pressed); font-weight: 700; }
        .cur-tree-group { font-size: 11px; font-weight: 800; color: var(--text-3);
                          text-transform: uppercase; letter-spacing: 0.06em;
                          padding: 14px 10px 4px; }
        .cur-tab-count { margin-left: 6px; font-size: 12px; color: var(--text-3); }
        /* Ошибка и предупреждение отличаются полосой слева, а не заливкой:
           красный фон на трети списка читается как «всё сломалось» */
        .cur-issue { border-left: 3px solid var(--warning-line); }
        .cur-issue[data-severity="error"] { border-left-color: var(--danger); }
        .cur-issue[data-resolved="true"] { border-left-color: var(--border);
                                           background: var(--surface-subtle); }
        .cur-img { background: var(--danger-bg); color: var(--danger); border-radius: 5px;
                   padding: 0 4px; font-weight: 700; font-size: 0.92em;
                   font-family: ui-monospace, "SF Mono", Menlo, monospace; }
        .cur-sign { font-size: 16px; min-width: 42px; justify-content: center; }
        @media (max-width: 1000px) {
          .cur-layout { grid-template-columns: minmax(0, 1fr); }
          .cur-tree { max-height: 260px; }
        }
        @media (max-width: 700px) { .hide-sm { display: none; } }
      `}</style>
    </AdminShell>
  );
}

/* ============ Публикация ============ */

/**
 * «Открыть в работу» неактивна, пока есть неразобранные ошибки, и рядом
 * сказано, сколько осталось. Про предупреждения сказано отдельно: они
 * публикации не мешают, и не сказать этого значит отправить человека
 * разбирать их зря.
 */
function PublishCard({
  program,
  onChanged,
}: {
  program: CurriculumProgramCard;
  onChanged: (fn: (prev: CurriculumProgramCard | null) => CurriculumProgramCard | null) => void;
}) {
  const { t, lang } = useLang();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const published = program.status === "published";
  const warnings = Math.max(0, program.issues_open - program.errors_open);
  const blocked = program.errors_open > 0;

  /* Обе ручки отвечают программой **в форме элемента списка** — без дерева
     разделов. Поэтому ответ подмешивается в то, что уже на экране,
     а не подменяет его: иначе дерево слева исчезло бы после публикации. */
  const run = async (action: "publish" | "unpublish") => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api<CurriculumProgram>(
        `/admin/curriculum/programs/${program.id}/${action}`,
        { method: "POST" },
      );
      onChanged((prev) => (prev ? { ...prev, ...updated } : prev));
      setConfirmOff(false);
      toast(action === "publish" ? t.curPublishToast : t.curUnpublishToast, "success");
    } catch (e) {
      setConfirmOff(false);
      toast(isApiError(e) ? e.message : t.curActionError, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card card-pad stack g12">
      <div className="row between wrap g10">
        <div className="stack g2 grow" style={{ minWidth: 220 }}>
          <span className="caption muted-3 pretty">{program.title}</span>
          <a
            href={program.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="small row g6"
            style={{ alignItems: "center" }}
          >
            <span>{program.order_date_text}</span>
            <IconExternal size={14} />
          </a>
        </div>
        <CurriculumStatusBadge status={program.status} />
      </div>

      {published ? (
        <>
          <Note kind="success">{t.curPublishedNote}</Note>
          <div className="row wrap g10">
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmOff(true)}>
              {t.curUnpublish}
            </Button>
            <span className="caption muted-3">
              {t.curPublishedAt(dayTime(program.published_at, lang))}
            </span>
          </div>
        </>
      ) : (
        <>
          <Note kind="muted">{t.curPublishHint}</Note>
          <div className="row wrap g10" style={{ alignItems: "center" }}>
            <Button
              disabled={blocked || busy}
              loading={busy}
              icon={<IconCheckCircle size={17} />}
              onClick={() => run("publish")}
            >
              {t.curPublish}
            </Button>
            {blocked ? (
              <span className="small row g6" style={{ color: "var(--danger)" }}>
                <IconAlert size={15} />
                {t.curPublishBlocked(program.errors_open)}
              </span>
            ) : (
              <span className="small muted">{t.curPublishReady}</span>
            )}
          </div>
          {/* Предупреждения публикации не мешают — это надо видеть до того,
              как человек начнёт разбирать их ради кнопки */}
          {warnings > 0 && (
            <span className="caption muted-3 pretty">{t.curPublishWarningsOk(warnings)}</span>
          )}
        </>
      )}

      <Sheet
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        title={t.curUnpublishTitle}
        footer={
          <div className="stack g8">
            <Button block size="lg" loading={busy} onClick={() => run("unpublish")}>
              {t.curUnpublish}
            </Button>
            <Button variant="secondary" block onClick={() => setConfirmOff(false)}>
              {t.cancel}
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">{t.curUnpublishText}</p>
      </Sheet>
    </section>
  );
}

/* ============ Вкладка «Подозрения» ============ */

function IssuesTab({
  programId,
  onResolved,
  onOpenObjective,
}: {
  programId: number;
  onResolved: () => void;
  onOpenObjective: (code: string) => void;
}) {
  const { t } = useLang();
  const [onlyErrors, setOnlyErrors] = useState(false);
  /* Неразобранные первыми: экран открывают, чтобы разобрать оставшееся,
     а не чтобы перечитать уже принятые решения */
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [page, setPage] = useState(1);

  const list = useLoad(
    () =>
      api<CurriculumIssuesPage>(
        `/admin/curriculum/programs/${programId}/issues${qs({
          page,
          per_page: PER_PAGE,
          severity: onlyErrors ? "error" : undefined,
          resolved: unresolvedOnly ? false : undefined,
        })}`,
      ),
    [programId, page, onlyErrors, unresolvedOnly],
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = onlyErrors || unresolvedOnly;

  /* Ответ ручки — подозрение целиком: строка перерисовывается им, а список
     не перечитывается. Иначе разобранная строка исчезала бы из-под курсора,
     и передумать было бы нечем. Счётчики программы при этом обновляются —
     от них зависит кнопка публикации. */
  const replace = (updated: CurriculumIssue) => {
    list.setData((prev) =>
      prev ? { ...prev, items: prev.items.map((x) => (x.id === updated.id ? updated : x)) } : prev,
    );
    onResolved();
  };

  return (
    <div className="stack g14">
      <div className="row wrap g8">
        <button
          type="button"
          className="chip"
          data-active={onlyErrors}
          onClick={() => {
            setOnlyErrors((v) => !v);
            setPage(1);
          }}
        >
          {t.curOnlyErrors}
        </button>
        <button
          type="button"
          className="chip"
          data-active={unresolvedOnly}
          onClick={() => {
            setUnresolvedOnly((v) => !v);
            setPage(1);
          }}
        >
          {t.curUnresolvedOnly}
        </button>
      </div>

      {list.loading && !list.data ? (
        <div className="card card-pad row center" style={{ minHeight: 160 }}>
          <span className="spinner" style={{ width: 24, height: 24, color: "var(--primary)" }} />
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
            icon={<IconCheckCircle size={38} />}
            title={filtered ? t.curIssuesNoMatchTitle : t.curIssuesEmptyTitle}
            text={filtered ? t.curIssuesNoMatchText : t.curIssuesEmptyText}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOnlyErrors(false);
                    setUnresolvedOnly(false);
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
          <div className="stack g10">
            {items.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onReplace={replace}
                onOpenObjective={onOpenObjective}
              />
            ))}
          </div>

          {pages > 1 && (
            <div className="row center g10">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((x) => x - 1)}
              >
                {t.back}
              </Button>
              <span className="small muted-3">{t.pageOf(page, pages)}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((x) => x + 1)}
              >
                {t.forward}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onReplace,
  onOpenObjective,
}: {
  issue: CurriculumIssue;
  onReplace: (updated: CurriculumIssue) => void;
  onOpenObjective: (code: string) => void;
}) {
  const { t, lang } = useLang();
  const toast = useToast();
  const { title, hint, often_ok } = useIssueHint(issue.kind);
  const [busy, setBusy] = useState(false);

  const resolved = issue.resolved_at !== null;
  /* `null` у подозрений, которые относятся к программе целиком */
  const code = issue.objective_code;

  /* Повторный вызов на уже разобранном сервер отдаёт той же строкой,
     а не ошибкой: двойной клик не должен пугать */
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api<CurriculumIssue>(`/admin/curriculum/issues/${issue.id}/resolve`, {
        method: resolved ? "DELETE" : "POST",
      });
      onReplace(updated);
    } catch (e) {
      toast(isApiError(e) ? e.message : t.curResolveError, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="card card-pad stack g8 cur-issue"
      data-severity={issue.severity}
      data-resolved={resolved || undefined}
    >
      <div className="row wrap g8" style={{ alignItems: "center" }}>
        <SeverityBadge severity={issue.severity} />
        {code !== null ? (
          /* Код ведёт к самой цели: оттуда её и правят */
          <button
            type="button"
            className="btn btn-ghost btn-sm mono"
            onClick={() => onOpenObjective(code)}
          >
            {code}
          </button>
        ) : (
          <span className="caption muted-3">{t.curWholeProgram}</span>
        )}
        <strong className="small grow pretty" style={{ minWidth: 160 }}>
          {title}
        </strong>
      </div>

      <p className="small muted pretty" style={{ margin: 0 }}>
        {hint}
      </p>

      {/* Свойство приказа, а не ошибка разбора: такое помечают разобранным */}
      {often_ok && (
        <div className="row g6 caption muted-3 pretty" style={{ alignItems: "flex-start" }}>
          <IconInfo size={14} />
          <span>{t.curOftenOk}</span>
        </div>
      )}

      {/* Сообщение сервера как есть: что именно нашла машина, знает она */}
      <div className="stack g2">
        <span className="caption muted-3">{t.curMessageFromMachine}</span>
        <span className="caption pretty">{issue.message}</span>
      </div>

      <div className="row between wrap g10" style={{ alignItems: "center" }}>
        <Button
          variant={resolved ? "ghost" : "secondary"}
          size="sm"
          loading={busy}
          onClick={toggle}
        >
          {resolved ? t.curUnresolve : t.curResolve}
        </Button>
        {resolved && issue.resolved_by && (
          <span className="caption muted-3">
            {t.curResolvedBy(issue.resolved_by, dayTime(issue.resolved_at, lang))}
          </span>
        )}
      </div>
    </article>
  );
}

/* ============ Вкладка «Цели» ============ */

function ObjectivesTab({
  program,
  filters,
  query,
  onQuery,
  onFilters,
  locked,
  onConflict,
}: {
  program: CurriculumProgramCard;
  filters: ObjFilters;
  query: string;
  onQuery: (v: string) => void;
  onFilters: (fn: (prev: ObjFilters) => ObjFilters) => void;
  locked: boolean;
  onConflict: () => void;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState<LearningObjective | null>(null);

  const list = useLoad(
    () =>
      api<LearningObjectivesPage>(
        `/admin/curriculum/programs/${program.id}/objectives${qs({
          page: filters.page,
          per_page: PER_PAGE,
          grade: filters.grade === "all" ? undefined : filters.grade,
          subsection: filters.subsection ?? undefined,
          q: filters.q,
          has_image: filters.has_image ? true : undefined,
          edited: filters.edited ? true : undefined,
        })}`,
      ),
    [
      program.id,
      filters.page,
      filters.grade,
      filters.subsection,
      filters.q,
      filters.has_image,
      filters.edited,
    ],
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered =
    filters.q !== "" ||
    filters.grade !== "all" ||
    filters.subsection !== null ||
    filters.has_image ||
    filters.edited;

  const patch = (next: Partial<ObjFilters>) =>
    onFilters((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));

  const resetFilters = () => {
    onQuery("");
    onFilters(() => NO_FILTERS);
  };

  /* Ответ `PATCH` — цель целиком, в форме элемента списка: строка
     перерисовывается им, список не перечитывается */
  const replace = (updated: LearningObjective) =>
    list.setData((prev) =>
      prev ? { ...prev, items: prev.items.map((x) => (x.id === updated.id ? updated : x)) } : prev,
    );

  const grades: number[] = [];
  for (let g = program.grade_from; g <= program.grade_to; g++) grades.push(g);

  const subsection = program.sections
    .flatMap((s) => s.subsections)
    .find((s) => s.code === filters.subsection);

  return (
    <div className="stack g14">
      {/* ===== Фильтры ===== */}
      <div className="stack g10">
        <div className="input-wrap" style={{ maxWidth: 420 }}>
          <span className="input-icon">
            <IconSearch size={19} />
          </span>
          <input
            className="input"
            placeholder={t.curObjSearch}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>

        <div className="row wrap g8">
          <button
            type="button"
            className="chip"
            data-active={filters.grade === "all"}
            onClick={() => patch({ grade: "all" })}
          >
            {t.curGradeAll}
          </button>
          {grades.map((g) => (
            <button
              key={g}
              type="button"
              className="chip"
              data-active={filters.grade === g}
              onClick={() => patch({ grade: g })}
            >
              {t.curGradeN(g)}
            </button>
          ))}
        </div>

        <div className="row wrap g8">
          <button
            type="button"
            className="chip"
            data-active={filters.has_image}
            onClick={() => patch({ has_image: !filters.has_image })}
          >
            {t.curOnlyImage}
          </button>
          <button
            type="button"
            className="chip"
            data-active={filters.edited}
            onClick={() => patch({ edited: !filters.edited })}
          >
            {t.curOnlyEdited}
          </button>
          {/* Подраздел выбирают деревом слева — здесь его только видно и снимают */}
          {subsection && (
            <button
              type="button"
              className="chip"
              data-active
              onClick={() => patch({ subsection: null })}
            >
              {t.curSubsectionChip(subsection.code, subsection.title)} ✕
            </button>
          )}
        </div>
      </div>

      {locked && (
        <Note kind="muted" icon={<IconLock size={18} />}>
          <div className="stack g4">
            <strong className="small">{t.curEditLocked}</strong>
            <span className="small pretty">{t.curEditLockedHint}</span>
          </div>
        </Note>
      )}

      {list.loading && !list.data ? (
        <div className="card card-pad row center" style={{ minHeight: 160 }}>
          <span className="spinner" style={{ width: 24, height: 24, color: "var(--primary)" }} />
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
            icon={<IconSearch size={34} />}
            title={filtered ? t.curObjEmptyTitle : t.curObjEmptyProgramTitle}
            text={filtered ? t.curObjEmptyText : t.curObjEmptyProgramText}
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
          <div className="stack g10">
            {items.map((o) => (
              <ObjectiveRow
                key={o.id}
                objective={o}
                locked={locked}
                onEdit={() => setEditing(o)}
              />
            ))}
          </div>

          {pages > 1 && (
            <div className="row center g10">
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => patch({ page: filters.page - 1 })}
              >
                {t.back}
              </Button>
              <span className="small muted-3">{t.pageOf(filters.page, pages)}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page >= pages}
                onClick={() => patch({ page: filters.page + 1 })}
              >
                {t.forward}
              </Button>
            </div>
          )}
        </>
      )}

      {editing && (
        <EditObjective
          key={editing.id}
          objective={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replace(updated);
            setEditing(null);
          }}
          onConflict={() => {
            setEditing(null);
            onConflict();
          }}
        />
      )}
    </div>
  );
}

function ObjectiveRow({
  objective,
  locked,
  onEdit,
}: {
  objective: LearningObjective;
  locked: boolean;
  onEdit: () => void;
}) {
  const { t, lang } = useLang();
  const o = objective;

  return (
    <article className="card card-pad stack g8">
      <div className="row wrap g8" style={{ alignItems: "center" }}>
        <strong className="mono small">{o.code}</strong>
        {o.quarters.length > 0 ? (
          <span className="caption muted-3 nowrap">
            {t.curQuartersLabel}: {o.quarters.join(", ")}
          </span>
        ) : (
          <Badge kind="progress">{t.curNoQuarters}</Badge>
        )}
        {/* Пометка приказа: `**` — «реализуется частично» */}
        {o.marker !== "" && (
          <Badge kind="neutral">
            {o.marker} {t.curMarkerPartly}
          </Badge>
        )}
        {o.has_image && <Badge kind="rework">{IMG_MARK}</Badge>}
        {o.edited_at !== null && <Badge kind="done">{t.curEditedBadge}</Badge>}
        <span className="grow" />
        {!locked && (
          <Button variant="ghost" size="sm" icon={<IconEdit size={15} />} onClick={onEdit}>
            {t.curEdit}
          </Button>
        )}
      </div>

      <p className="small" style={{ margin: 0 }}>
        <ObjectiveText text={o.text} />
      </p>

      <div className="row wrap g8">
        <span className="caption muted-3">
          {o.subsection_code} · {o.subsection_title}
        </span>
        {o.edited_at !== null && (
          <span className="caption muted-3">{t.curEditedAt(dayTime(o.edited_at, lang))}</span>
        )}
      </div>
    </article>
  );
}

/**
 * Правка формулировки. Меняется только текст: код, класс и подраздел цели
 * заданы приказом и не правятся.
 *
 * Кнопки со знаками — не украшение: ради них правка и существует. Знак
 * вставляется на место курсора, потому что `[img]` стоит в середине фразы,
 * а не в конце.
 */
function EditObjective({
  objective,
  onClose,
  onSaved,
  onConflict,
}: {
  objective: LearningObjective;
  onClose: () => void;
  onSaved: (updated: LearningObjective) => void;
  onConflict: () => void;
}) {
  const { t } = useLang();
  const toast = useToast();
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(objective.text);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const changed = text.trim() !== objective.text.trim();

  const insert = (sign: string) => {
    const el = area.current;
    if (!el) return;
    const from = el.selectionStart;
    const to = el.selectionEnd;
    const next = text.slice(0, from) + sign + text.slice(to);
    setText(next);
    setError("");
    /* Курсор после вставки — за знаком: следом набирают дальше */
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from + sign.length, from + sign.length);
    });
  };

  const save = async () => {
    if (!changed || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api<LearningObjective>(
        `/admin/curriculum/objectives/${objective.id}`,
        { method: "PATCH", json: { text: text.trim() } satisfies LearningObjectivePatch },
      );
      onSaved(updated);
      toast(t.curSavedToast, "success");
    } catch (e) {
      /* 409 — программу успели опубликовать в другой вкладке: экран должен
         перейти в состояние «правка закрыта», а не показать отказ и остаться
         с формой, которая уже неверна */
      if (isApiError(e) && e.status === 409) {
        toast(e.message, "error");
        onConflict();
        return;
      }
      const fields = fieldErrors(e);
      setError(fields.text ?? (isApiError(e) ? e.message : t.curSaveError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t.curEditTitle}
      wide
      footer={
        <div className="stack g8">
          <Button block size="lg" disabled={!changed} loading={busy} onClick={save}>
            {t.curSaveObjective}
          </Button>
          <Button variant="secondary" block onClick={onClose}>
            {t.cancel}
          </Button>
        </div>
      }
    >
      <div className="stack g14">
        <div className="row wrap g8" style={{ alignItems: "center" }}>
          <strong className="mono small">{objective.code}</strong>
          <span className="caption muted-3">
            {objective.subsection_code} · {objective.subsection_title}
          </span>
        </div>

        <Note kind="muted">{t.curEditHint}</Note>

        {objective.has_image && <Note kind="warning">{t.curImgHint}</Note>}

        <div className="field">
          <label className="label" htmlFor="cur-text">
            {t.curEditField}
          </label>
          <textarea
            id="cur-text"
            ref={area}
            className={`input${error ? " input-error" : ""}`}
            style={{ minHeight: 140, resize: "vertical" }}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
          />
          {error && <span className="error-text">{error}</span>}
        </div>

        <div className="stack g6">
          <span className="caption muted-3">{t.curSigns}</span>
          <div className="row wrap g6">
            {MATH_SIGNS.map((sign) => (
              <button
                key={sign}
                type="button"
                className="btn btn-secondary btn-sm cur-sign"
                onClick={() => insert(sign)}
              >
                {sign}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
