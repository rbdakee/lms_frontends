"use client";

/**
 * Сертификаты «/certificates» — раздел 4 `CERTIFICATES_BRIEF`.
 *
 * Третья очередь админа рядом с заявками и проверкой работ: учитель просит
 * документ, а выписывает его админ руками, вводя регистрационный номер
 * академии. Поэтому по умолчанию открыта вкладка «Ждут выдачи» — то, ради
 * чего экран и открывают; «Выданные» и «Отозванные» нужны, когда ищут
 * конкретный документ, а «Все» — когда не помнят, в каком он состоянии.
 * Отдельной таблицы заявок нет: это та же строка сертификата до выдачи,
 * отсюда и три вкладки вместо двух списков.
 *
 * Данные — `GET /admin/certificates` с серверной пагинацией и фильтрами:
 * `status` (вкладка; на «Все» параметр не шлётся вовсе), `platform` и `q` —
 * один параметр на ФИО, ИИН и оба номера, ищет сервер. Сортировка тоже
 * серверная — по дате заявки, свежие сверху. Счётчик очереди от фильтров
 * не зависит и считается отдельным запросом.
 *
 * Площадок две, экран по умолчанию показывает обе. Фильтр площадки живёт
 * в адресе (`?platform=`) — так во всей админке: им делятся ссылкой и он
 * переживает перезагрузку. Вкладка и поиск остались в состоянии экрана.
 *
 * **ИИН — самые чувствительные персональные данные, что у нас есть.**
 * Он показывается только здесь и только через `IinValue`: ни в адрес
 * страницы, ни в параметры навигации, ни в логи он не уходит.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  qs,
  useLoad,
  type AdminCertificate,
  type AdminCertificatesPage,
  type CertificateStatus,
  type Platform,
} from "@lms/api";
import { dayMonth } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import {
  CertificateStatusBadge,
  certTeacherName,
  IinValue,
} from "@/components/admin/certificatesApi";
import {
  PlatformChip,
  PlatformFilter,
  PlatformFilterBoundary,
  usePlatformFilter,
} from "@/components/admin/platforms";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Empty, LinkButton } from "@lms/ui";
import { IconCheckCircle, IconChevronRight, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;

/** «Все» — не состояние документа, а отсутствие фильтра по нему. */
type TabValue = CertificateStatus | "all";

export default function CertificatesPage() {
  /* Фильтр площадки читается из адреса, а useSearchParams требует границы
     Suspense: без неё статический маршрут не собирается */
  return (
    <PlatformFilterBoundary>
      <Certificates />
    </PlatformFilterBoundary>
  );
}

function Certificates() {
  const { t, lang } = useLang();

  const [tab, setTab] = useState<TabValue>("requested");
  /* Что человек печатает и что ушло на сервер — разные значения: запрос
     уходит через паузу, иначе список дёргался бы на каждую букву */
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  /* Площадка — единственный фильтр экрана, который живёт в адресе */
  const [platform, setPlatform] = usePlatformFilter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const list = useLoad(
    () =>
      api<AdminCertificatesPage>(
        `/admin/certificates${qs({
          page,
          per_page: PER_PAGE,
          status: tab === "all" ? undefined : tab,
          q,
          platform,
        })}`,
      ),
    [page, tab, q, platform],
  );
  /* Сколько заявок ждёт всего — цифра в шапке и в счётчике меню: она
     не должна меняться от того, какую вкладку открыли */
  const queue = useLoad(
    () => api<AdminCertificatesPage>(`/admin/certificates${qs({ status: "requested", per_page: 1 })}`),
    [],
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const queueTotal = queue.data?.total ?? 0;
  /* Пустая очередь — хорошая новость; пусто из-за фильтров — другой текст */
  const filtered = tab !== "requested" || q !== "" || platform !== null;

  const TABS: { value: TabValue; label: string }[] = [
    { value: "requested", label: t.crtTabRequested },
    { value: "issued", label: t.crtTabIssued },
    { value: "revoked", label: t.crtTabRevoked },
    { value: "all", label: t.crtTabAll },
  ];

  /* Смена площадки сужает выборку — страница снова первая, как у остальных
     фильтров. Отдельная обёртка нужна потому, что `setPlatform` пишет
     в адрес и о странице ничего не знает */
  const changePlatform = (next: Platform | null) => {
    setPlatform(next);
    setPage(1);
  };

  const resetFilters = () => {
    setTab("requested");
    setQuery("");
    setQ("");
    setPlatform(null);
    setPage(1);
  };

  /* У каждого состояния своя дата: у заявки выдачи ещё не было,
     у отозванного документа важна дата отзыва */
  const dateLabel = (c: AdminCertificate) =>
    c.status === "issued"
      ? t.crtIssuedOn(dayMonth(c.issued_at, lang))
      : c.status === "revoked"
        ? t.crtRevokedOn(dayMonth(c.revoked_at, lang))
        : t.crtRequestedOn(dayMonth(c.requested_at, lang));

  /* Пометка стоит только у выданных: у заявки и у отозванного проставлять
     номер академии нечего и некуда */
  const noRegNumber = (c: AdminCertificate) => c.status === "issued" && !c.registration_number;

  /* Пусто без фильтров объясняется по вкладке: «заявок нет» на «Выданных»
     звучало бы как ответ не на тот вопрос */
  const emptyTitle =
    tab === "issued"
      ? t.crtIssuedEmptyTitle
      : tab === "revoked"
        ? t.crtRevokedEmptyTitle
        : t.crtQueueEmptyTitle;
  const emptyText =
    tab === "issued"
      ? t.crtIssuedEmptyText
      : tab === "revoked"
        ? t.crtRevokedEmptyText
        : t.crtQueueEmptyText;

  return (
    <AdminShell
      title={t.crtTitle}
      subtitle={`${t.crtInQueue(queueTotal)} · ${t.crtByFilter(total)}`}
    >
      <div className="stack g16">
        {/* ===== Фильтры. Окна снизу здесь нет: фильтров всего три и все
            помещаются — вкладки прокручиваются сами, поиск тянется
            на всю ширину, чипы площадки переносятся ===== */}
        <div className="tabs" role="group" aria-label={t.crtColStatus}>
          {TABS.map((o) => (
            <button
              key={o.value}
              type="button"
              data-active={tab === o.value}
              onClick={() => {
                setTab(o.value);
                setPage(1);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="row wrap g10">
          <div className="input-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            {/* Поиск идёт по ФИО, ИИН и обоим номерам — разбирает запрос сервер */}
            <input
              className="input"
              placeholder={t.crtSearch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <PlatformFilter value={platform} onChange={changePlatform} />
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
              icon={filtered ? <IconSearch size={34} /> : <IconCheckCircle size={38} />}
              title={filtered ? t.crtNoMatchTitle : emptyTitle}
              text={filtered ? t.crtNoMatchText : emptyText}
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
                    <th>{t.crtColTeacher}</th>
                    <th>{t.crtColIin}</th>
                    <th>{t.crtColCourse}</th>
                    <th>{t.crtColHours}</th>
                    <th>{t.crtColDate}</th>
                    <th>{t.crtColStatus}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td style={{ maxWidth: 240 }}>
                        <Link href={`/certificates/${c.id}`} className="small" style={{ fontWeight: 600 }}>
                          {certTeacherName(c.teacher)}
                        </Link>
                      </td>
                      <td>
                        <IinValue iin={c.teacher.iin} />
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span className="small muted pretty">{c.course_title}</span>
                      </td>
                      <td>
                        <span className="small nowrap">{t.crtHours(c.hours)}</span>
                      </td>
                      <td>
                        <div className="stack g2">
                          <span className="caption muted-3 nowrap">{dateLabel(c)}</span>
                          {/* Площадка у сертификата своя: документ подписан
                              брендом той площадки, где его получили */}
                          <span>
                            <PlatformChip platform={c.platform} />
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="stack g2">
                          <span>
                            <CertificateStatusBadge status={c.status} />
                          </span>
                          {noRegNumber(c) && (
                            <span className="caption muted-3">{t.crtNoRegNumber}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ width: 130 }}>
                        <LinkButton href={`/certificates/${c.id}`} variant="secondary" size="sm">
                          {t.crtOpen}
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
              {items.map((c) => (
                <Link
                  key={c.id}
                  href={`/certificates/${c.id}`}
                  className="card card-pad card-link stack g12"
                >
                  <div className="row g10">
                    <span className="grow stack g2" style={{ minWidth: 0 }}>
                      <span className="small" style={{ fontWeight: 700 }}>
                        {certTeacherName(c.teacher)}
                      </span>
                      <span className="caption muted-3 pretty">{c.course_title}</span>
                    </span>
                    <CertificateStatusBadge status={c.status} />
                  </div>

                  <div className="row wrap g8">
                    <IinValue iin={c.teacher.iin} />
                    <span className="caption muted-3">{dateLabel(c)}</span>
                    <PlatformChip platform={c.platform} />
                    {noRegNumber(c) && <span className="caption muted-3">{t.crtNoRegNumber}</span>}
                  </div>
                </Link>
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
