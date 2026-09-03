"use client";

/**
 * Заявки на курсы «/leads» — раздел 5.26 брифа.
 *
 * Сюда падает всё, что учитель нажал «Записаться». Платёжных форм нет:
 * админ звонит, принимает деньги вне платформы и открывает доступ руками.
 * Главное действие прямо в строке — «Открыть доступ».
 *
 * Данные — `GET /admin/leads` с серверной пагинацией и фильтрами: `status`
 * и `course_id` принимают списки через запятую — фильтры экрана с мультивыбором
 * (свой MultiSelect, не нативный select), `q` — один параметр на ФИО и телефон
 * в любом виде. Метка «напоминание» — `reminded_at`.
 *
 * Площадок две, админка одна на обе и по умолчанию показывает обе. Фильтр
 * площадки живёт в адресе (`?platform=`) — им делятся ссылкой и он переживает
 * перезагрузку; остальные фильтры экрана остались в состоянии.
 *
 * Вида два — список и канбан (просьба владельца 20.08.2026), переключатель
 * помнится в localStorage. Канбан — колонки по статусам, до 100 заявок одним
 * запросом; карточка переносится перетаскиванием. Бросок в «Доступ выдан»
 * открывает модалку выдачи (прямой PATCH в granted сервер запрещает),
 * в «Отказ» — окно с обязательной причиной. На тач-экранах перетаскивания
 * нет — статус меняется из списка или с карточки заявки.
 *
 * На мобильном фильтры собраны за одной кнопкой, окно выезжает снизу.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type AdminLead,
  type AdminLeadsPage,
  type CatalogOut,
  type LeadStatus,
  type Platform,
} from "@lms/api";
import { dayMonth, price as fmtPrice } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { isOpenLead, LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "@/components/admin/leadsApi";
import { DeclineLeadSheet, LeadStatusPicker, PhoneActions } from "@/components/admin/LeadStatus";
import { MultiOptions, MultiSelect } from "@/components/admin/MultiSelect";
import {
  PlatformChip,
  PlatformFilter,
  PlatformFilterBoundary,
  usePlatformFilter,
} from "@/components/admin/platforms";
import { Waiting } from "@/components/admin/Waiting";
import { GrantLeadSheet } from "@/components/admin/GrantLead";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Button, Empty, Note, Sheet, StatusBadge } from "@lms/ui";
import { IconChevronRight, IconFilter, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;
/* Потолок канбана — предел per_page на сервере */
const KANBAN_LIMIT = 100;

type LeadsView = "list" | "kanban";
const VIEW_KEY = "admin_leads_view";

const STATUS_OPTIONS = LEAD_STATUS_ORDER.map((s) => ({
  value: s,
  label: LEAD_STATUS_LABEL[s],
}));

export default function LeadsPage() {
  /* Фильтр площадки читается из адреса, а useSearchParams требует границы
     Suspense: без неё статический маршрут не собирается */
  return (
    <PlatformFilterBoundary>
      <Leads />
    </PlatformFilterBoundary>
  );
}

function Leads() {
  const { lang } = useLang();
  const toast = useToast();

  const [query, setQuery] = useState("");
  /* Поиск уходит на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [courseIds, setCourseIds] = useState<number[]>([]);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  /* Площадка — единственный фильтр экрана, который живёт в адресе */
  const [platform, setPlatform] = usePlatformFilter();
  const [page, setPage] = useState(1);
  const [granting, setGranting] = useState<AdminLead | null>(null);
  /* Отказ с канбана: бросили карточку в колонку «Отказ» — причина обязательна */
  const [declining, setDeclining] = useState<AdminLead | null>(null);
  /* Мобильный: все фильтры за одной кнопкой, окно выезжает снизу — как меню */
  const [filtersOpen, setFiltersOpen] = useState(false);
  /* Перетаскивание: что тащим и над какой колонкой висим */
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);

  /* Стартуем со списка и читаем сохранённый выбор эффектом, а не в useState:
     на сервере localStorage нет, и разный первый кадр дал бы ошибку гидратации */
  const [view, setView] = useState<LeadsView>("list");
  useEffect(() => {
    if (localStorage.getItem(VIEW_KEY) === "kanban") setView("kanban");
  }, []);
  const switchView = (v: LeadsView) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  /* Массивы фильтров в deps ходят строками: новый массив на каждый рендер
     перезапускал бы загрузку бесконечно */
  const statusParam = statuses.join(",");
  const courseParam = courseIds.join(",");

  const leads = useLoad(
    () =>
      api<AdminLeadsPage>(
        `/admin/leads${qs({
          page,
          per_page: PER_PAGE,
          status: statusParam || undefined,
          course_id: courseParam || undefined,
          platform,
          q,
        })}`,
      ),
    [page, statusParam, courseParam, platform, q],
  );
  /* Счётчик «новых» в подзаголовке не зависит от фильтров — отдельный запрос */
  const fresh = useLoad(
    () => api<AdminLeadsPage>(`/admin/leads${qs({ status: "new", per_page: 1 })}`),
    [],
  );
  /* Канбану нужны все статусы разом — своя выборка одним запросом, без
     пагинации. Поиск и курс действуют, фильтр статуса не нужен: статусы
     и есть колонки. В списке не грузим ничего */
  const kanban = useLoad(
    () =>
      view === "kanban"
        ? api<AdminLeadsPage>(
            `/admin/leads${qs({
              per_page: KANBAN_LIMIT,
              course_id: courseParam || undefined,
              platform,
              q,
            })}`,
          )
        : Promise.resolve(null),
    [view, courseParam, platform, q],
  );
  /* Фильтр по курсу — все версии из каталога */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);

  const items = leads.data?.items ?? [];
  const total = leads.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const newCount = fresh.data?.total ?? 0;
  const hasFilters =
    statuses.length > 0 || courseIds.length > 0 || platform !== null || q !== "";
  const courseOptions = (catalog.data?.items ?? [])
    .flatMap((g) => g.versions)
    .map((c) => ({ value: c.id, label: c.title }));

  const refresh = () => {
    leads.reload();
    fresh.reload();
    if (view === "kanban") kanban.reload();
  };

  /** PATCH вернул заявку — подставляем её на место старой без перезапроса.
      В канбане смена статуса тем самым переносит карточку в свою колонку */
  const replaceLead = (updated: AdminLead) => {
    const swap = (d: AdminLeadsPage | null) =>
      d ? { ...d, items: d.items.map((l) => (l.id === updated.id ? updated : l)) } : d;
    leads.setData(swap);
    kanban.setData(swap);
    fresh.reload();
  };

  const moveLead = async (l: AdminLead, status: LeadStatus) => {
    try {
      const updated = await api<AdminLead>(`/admin/leads/${l.id}`, {
        method: "PATCH",
        json: { status },
      });
      replaceLead(updated);
      toast(`Статус заявки: ${LEAD_STATUS_LABEL[status]}`);
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось изменить статус", "error");
    }
  };

  /** Бросили карточку в колонку. «Доступ выдан» и «Отказ» прямым PATCH
      нельзя: выдача идёт через модалку доступа, отказ требует причину */
  const dropLead = (l: AdminLead, target: LeadStatus) => {
    if (l.status === target) return;
    if (target === "granted") return setGranting(l);
    if (target === "declined") return setDeclining(l);
    void moveLead(l, target);
  };

  /* Смена площадки сужает выборку — страница снова первая, как у остальных
     фильтров. Отдельная обёртка нужна потому, что `setPlatform` пишет
     в адрес и о странице ничего не знает */
  const changePlatform = (next: Platform | null) => {
    setPlatform(next);
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setCourseIds([]);
    setStatuses([]);
    setPlatform(null);
    setPage(1);
  };

  /* Счётчик на мобильной кнопке «Фильтры» — по группам, а не по значениям.
     Статус считается только в списке: канбан его не применяет */
  const activeFilters =
    (q !== "" ? 1 : 0) +
    (courseIds.length > 0 ? 1 : 0) +
    (platform !== null ? 1 : 0) +
    (view === "list" && statuses.length > 0 ? 1 : 0);

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
        {/* ===== Фильтры: на десктопе — строкой, на мобильном — одна кнопка
            и окно снизу. Внешний ряд не переносится — иначе переключатель
            видов уезжал бы под фильтры ===== */}
        <div className="row g10" style={{ alignItems: "flex-start" }}>
          <div className="row wrap g10 grow leads-filters-inline" style={{ minWidth: 0 }}>
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
            <MultiSelect
              placeholder="Все курсы"
              options={courseOptions}
              value={courseIds}
              minWidth={190}
              onChange={(next) => {
                setCourseIds(next);
                setPage(1);
              }}
            />
            {/* Фильтр статуса — только в списке: в канбане статусы
                и так разложены по колонкам */}
            {view === "list" && (
              <MultiSelect
                placeholder="Все статусы"
                options={STATUS_OPTIONS}
                value={statuses}
                onChange={(next) => {
                  setStatuses(next);
                  setPage(1);
                }}
              />
            )}
            {/* Площадка действует в обоих видах: это не статус, колонок
                канбана она не задаёт */}
            <PlatformFilter value={platform} onChange={changePlatform} />
          </div>
          <Button
            variant="secondary"
            className="leads-filter-btn"
            icon={<IconFilter size={17} />}
            onClick={() => setFiltersOpen(true)}
          >
            Фильтры{activeFilters > 0 ? ` · ${activeFilters}` : ""}
          </Button>
          <div className="segmented" style={{ marginLeft: "auto", flexShrink: 0 }}>
            <button data-active={view === "list"} onClick={() => switchView("list")}>
              Список
            </button>
            <button data-active={view === "kanban"} onClick={() => switchView("kanban")}>
              Канбан
            </button>
          </div>
        </div>

        {view === "kanban" ? (
          kanban.loading ? (
            <div className="card card-pad row center" style={{ minHeight: 200 }}>
              <span
                className="spinner"
                style={{ width: 26, height: 26, color: "var(--primary)" }}
              />
            </div>
          ) : kanban.error || !kanban.data ? (
            <div className="card">
              <Empty
                title="Не удалось загрузить"
                text="Проверьте интернет и попробуйте ещё раз."
                action={
                  <Button variant="secondary" onClick={kanban.reload}>
                    Повторить
                  </Button>
                }
              />
            </div>
          ) : kanban.data.items.length === 0 ? (
            <div className="card">
              <Empty
                icon={<IconSearch size={34} />}
                title={q || courseIds.length ? "Заявок не нашли" : "Заявок пока нет"}
                text={
                  q || courseIds.length
                    ? "Попробуйте снять фильтры или очистить поиск."
                    : "Как только учитель нажмёт «Записаться», заявка появится здесь."
                }
              />
            </div>
          ) : (
            <>
              {kanban.data.total > kanban.data.items.length && (
                <Note kind="info">
                  <span className="small">
                    Показаны первые {kanban.data.items.length} из {kanban.data.total}{" "}
                    заявок — сузьте поиском или фильтром курса.
                  </span>
                </Note>
              )}
              <div className="kanban">
                {LEAD_STATUS_ORDER.map((s) => {
                  const col = kanban.data!.items.filter((l) => l.status === s);
                  return (
                    <section
                      key={s}
                      className="kanban-col stack g10"
                      data-drag-over={dragOver === s || undefined}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOver !== s) setDragOver(s);
                      }}
                      onDragLeave={(e) => {
                        /* dragleave стреляет и на детях — уходим, только
                           когда курсор реально покинул колонку */
                        if (!e.currentTarget.contains(e.relatedTarget as Node))
                          setDragOver((cur) => (cur === s ? null : cur));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        const id = Number(e.dataTransfer.getData("text/plain"));
                        const l = kanban.data!.items.find((x) => x.id === id);
                        if (l) dropLead(l, s);
                      }}
                    >
                      <div className="row between g8" style={{ paddingInline: 2 }}>
                        <strong className="small">{LEAD_STATUS_LABEL[s]}</strong>
                        <span className="caption muted-3">{col.length}</span>
                      </div>
                      {col.length === 0 ? (
                        <span
                          className="caption muted-3"
                          style={{ padding: "14px 2px", textAlign: "center" }}
                        >
                          Пусто
                        </span>
                      ) : (
                        col.map((l) => (
                          <div
                            key={l.id}
                            className="card card-pad stack g10"
                            /* Доступ выдан — заявке дальше деваться некуда,
                               перетаскивать её из колонки уже нельзя */
                            draggable={l.status !== "granted"}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", String(l.id));
                              e.dataTransfer.effectAllowed = "move";
                              setDragId(l.id);
                            }}
                            onDragEnd={() => {
                              setDragId(null);
                              setDragOver(null);
                            }}
                            style={{
                              cursor: l.status === "granted" ? "default" : "grab",
                              opacity: dragId === l.id ? 0.5 : undefined,
                            }}
                          >
                            {/* Без города: для работы с заявкой он не нужен */}
                            <Link href={`/leads/${l.id}`} className="row g10" draggable={false}>
                              <Avatar initials={initials(l)} size={34} tone="neutral" />
                              <span className="stack g2 grow" style={{ minWidth: 0 }}>
                                <span className="small" style={{ fontWeight: 700 }}>
                                  {teacherName(l)}
                                </span>
                              </span>
                            </Link>
                            <div className="stack g2">
                              <span className="caption pretty">{l.course.title}</span>
                              <div className="row wrap g6">
                                <strong className="caption">
                                  {fmtPrice(l.price_snapshot ?? undefined, lang)}
                                </strong>
                                <span className="dot-sep">·</span>
                                <span className="caption muted-3">
                                  {dayMonth(l.created_at, lang)}
                                </span>
                                <PlatformChip platform={l.platform} />
                                {l.reminded_at && (
                                  <span className="caption" style={{ color: "var(--warning)" }}>
                                    напоминание
                                  </span>
                                )}
                              </div>
                              {isOpenLead(l.status) && (
                                <Waiting days={l.waiting_days} redAfter={2} />
                              )}
                            </div>
                            {/* Доступ выдан — связываться больше незачем:
                                остаются ФИО, курс, цена и дата запроса */}
                            {l.status !== "granted" && (
                              <PhoneActions phone={l.teacher.phone} />
                            )}
                            {isOpenLead(l.status) && (
                              <Button size="sm" block onClick={() => setGranting(l)}>
                                Открыть доступ
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </section>
                  );
                })}
              </div>
              <style>{`
                .kanban {
                  display: grid;
                  grid-auto-flow: column;
                  grid-auto-columns: minmax(250px, 1fr);
                  gap: 12px;
                  align-items: start;
                  overflow-x: auto;
                  padding-bottom: 6px;
                }
                /* min-width: 0 — обязателен: без него колонка расте́т под
                   min-content карточки, карточка распирает сетку, и весь
                   экран уезжает в горизонтальный скролл */
                .kanban-col {
                  background: #f1f5f9;
                  border-radius: 14px;
                  padding: 10px;
                  min-width: 0;
                }
                .kanban-col[data-drag-over] {
                  background: var(--primary-bg);
                  outline: 2px dashed var(--primary);
                  outline-offset: -2px;
                }
                .kanban-col .card { min-width: 0; }
                /* «Позвонить» и «WhatsApp» делят ряд поровну и переносятся,
                   когда не влезают, а не вылезают за края карточки */
                .kanban-col .card .row { flex-wrap: wrap; }
                .kanban-col .card .row .btn { flex: 1 1 auto; }
              `}</style>
            </>
          )
        ) : leads.loading ? (
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
                  <Button variant="secondary" onClick={resetFilters}>
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
                        {/* Номер и WhatsApp рисует PhoneActions: на ПК номер
                            текстом, кнопки «Позвонить» на десктопе нет */}
                        <PhoneActions phone={l.teacher.phone} />
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
                          {/* Площадка — свойство заявки, а не курса: курс
                              бывает общим, а пришла заявка с одного сайта */}
                          <span>
                            <PlatformChip platform={l.platform} />
                          </span>
                          {isOpenLead(l.status) && <Waiting days={l.waiting_days} redAfter={2} />}
                          {l.reminded_at && (
                            <span className="caption" style={{ color: "var(--warning)" }}>
                              напоминание
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ minWidth: 150 }}>
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
                      <PlatformChip platform={l.platform} />
                      {isOpenLead(l.status) && (
                        <>
                          <span className="dot-sep">·</span>
                          <Waiting days={l.waiting_days} redAfter={2} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Номер-ссылка с трубкой и WhatsApp — внутри PhoneActions */}
                  <PhoneActions phone={l.teacher.phone} />

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

      {/* Фильтры на мобильном. Значения общие со строкой фильтров и
          применяются сразу — «Готово» просто закрывает окно */}
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Фильтры"
        footer={
          <div className="stack g8">
            <Button block size="lg" onClick={() => setFiltersOpen(false)}>
              Готово
            </Button>
            {activeFilters > 0 && (
              <Button variant="secondary" block onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            )}
          </div>
        }
      >
        <div className="stack g14">
          <div className="field">
            <label className="label">Поиск</label>
            <div className="input-wrap">
              <span className="input-icon">
                <IconSearch size={19} />
              </span>
              <input
                className="input"
                placeholder="ФИО или телефон"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Курсы</label>
            <MultiOptions
              options={courseOptions}
              value={courseIds}
              onChange={(next) => {
                setCourseIds(next);
                setPage(1);
              }}
            />
          </div>
          {view === "list" && (
            <div className="field">
              <label className="label">Статусы</label>
              <MultiOptions
                options={STATUS_OPTIONS}
                value={statuses}
                onChange={(next) => {
                  setStatuses(next);
                  setPage(1);
                }}
              />
            </div>
          )}
          {/* Без подписи «Площадка»: чипы сами начинаются со слова «Все
              площадки», а при одной площадке фильтр не рисуется вовсе —
              подпись осталась бы висеть над пустотой */}
          <PlatformFilter value={platform} onChange={changePlatform} />
        </div>
      </Sheet>

      {declining && (
        <DeclineLeadSheet
          lead={declining}
          onClose={() => setDeclining(null)}
          onDone={(updated) => {
            setDeclining(null);
            replaceLead(updated);
          }}
        />
      )}

      {granting && (
        <GrantLeadSheet
          lead={granting}
          open
          onClose={() => setGranting(null)}
          onGranted={refresh}
        />
      )}

      <style>{`
        .leads-filter-btn { display: none; }
        @media (max-width: 899px) {
          .leads-filters-inline { display: none; }
          .leads-filter-btn { display: inline-flex; }
        }
      `}</style>
    </AdminShell>
  );
}
