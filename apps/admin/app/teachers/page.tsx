"use client";

/**
 * Список учителей «/teachers» — раздел 5.22 брифа.
 *
 * Данные — `GET /admin/teachers` с серверной пагинацией и фильтрами: `region`,
 * `course_id` и `q` — один параметр на ФИО и телефон в любом виде
 * (цифры нормализует сервер, `8 707 123` находит `+7707123…`).
 *
 * Фильтра по школе на экране нет, хотя параметр у эндпоинта есть: сервер
 * сравнивает школу целиком, а не по части названия, и справочника школ
 * не существует — в онбординге школа набирается руками. Поле поиска, которое
 * находит что-то лишь при посимвольном совпадении с «КГУ «Школа-лицей №27»»,
 * читается как сломанное. Вернётся, когда `school` начнёт искать по подстроке.
 *
 * Здесь персональные данные, поэтому поиск и фильтры живут в состоянии экрана
 * и **не** уходят в адрес страницы: ссылка со списком учителей не должна
 * пересылаться и оседать в истории браузера.
 *
 * «Последний вход» и «активность» не показываем — чтобы они были правдой,
 * пришлось бы писать в базу на каждое движение учителя.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  qs,
  useDictionaries,
  useLoad,
  type AdminCoursesPage,
  type AdminTeacher,
  type AdminTeachersPage,
} from "@lms/api";
import { fmt, phoneFmt } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Button, Empty, Sheet, StatusBadge } from "@lms/ui";
import { IconChevronRight, IconFilter, IconSearch } from "@lms/ui/icons";

const PER_PAGE = 20;

/** ФИО целиком: это админка, учителя здесь видно по имени. */
function teacherName(t: AdminTeacher): string {
  return [t.last_name, t.first_name, t.middle_name].filter(Boolean).join(" ");
}

/** Инициалы считает фронт — сервер отдаёт три поля ФИО, а не готовую строку. */
function initialsOf(t: AdminTeacher): string {
  return ((t.first_name[0] ?? "") + (t.last_name[0] ?? "")).toUpperCase() || "??";
}

export default function TeachersPage() {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  /* Поиск и школа уходят на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [courseId, setCourseId] = useState<"all" | number>("all");
  const [page, setPage] = useState(1);
  /* Мобильный: поиск, регион и курс за одной кнопкой-иконкой, окно выезжает
     снизу — как на курсах и заявках */
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const teachers = useLoad(
    () =>
      api<AdminTeachersPage>(
        `/admin/teachers${qs({
          page,
          per_page: PER_PAGE,
          region: region === "all" ? undefined : region,
          course_id: courseId === "all" ? undefined : courseId,
          q,
        })}`,
      ),
    [page, region, courseId, q],
  );
  const dictionaries = useDictionaries();
  /* Фильтр по курсу берём из админского списка: там есть и черновики,
     которых в каталоге нет, а доступ к ним выдан быть может */
  const courses = useLoad(
    () => api<AdminCoursesPage>(`/admin/courses${qs({ per_page: 100 })}`),
    [],
  );

  const items = teachers.data?.items ?? [];
  const total = teachers.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = region !== "all" || courseId !== "all" || q !== "";
  /* Счётчик на кнопке-иконке — сколько фильтров выставлено; поиск на мобильном
     тоже спрятан за кнопкой и потому идёт в счёт */
  const mobileFilters =
    (q !== "" ? 1 : 0) + (region !== "all" ? 1 : 0) + (courseId !== "all" ? 1 : 0);

  const resetFilters = () => {
    setQuery("");
    setQ("");
    setRegion("all");
    setCourseId("all");
    setPage(1);
  };

  return (
    <AdminShell
      title="Учителя"
      subtitle={
        /* Счётчик прошлой удачной загрузки при ошибке врал бы: `useLoad`
           данные не чистит */
        teachers.error
          ? undefined
          : `${fmt(total)} ${hasFilters ? "по фильтру" : "зарегистрировано"}`
      }
      /* Кнопки «Скачать CSV» нет: эндпоинта выгрузки нет, а неработающая
         кнопка — лишний шум (решение владельца 20.08.2026) */
    >
      <div className="stack g16">
        {/* ===== Фильтры: на десктопе строкой, на мобильном — кнопка-иконка
            и окно снизу ===== */}
        <div className="row g10">
          <div className="row wrap g10 grow teachers-filters-inline" style={{ minWidth: 0 }}>
            <div className="input-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
              <span className="input-icon">
                <IconSearch size={19} />
              </span>
              <input
                className="input"
                placeholder="Поиск по ФИО или телефону"
                /* Сервер отбивает больше 100 символов как 422 — до него не доводим */
                maxLength={100}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="input"
              style={{ width: "auto", minWidth: 180 }}
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Все регионы</option>
              {(dictionaries.data?.regions ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="input"
              style={{ width: "auto", minWidth: 190 }}
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value === "all" ? "all" : Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="all">Все курсы</option>
              {(courses.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            className="teachers-filter-btn"
            aria-label="Фильтры"
            icon={<IconFilter size={17} />}
            onClick={() => setFiltersOpen(true)}
          >
            {mobileFilters > 0 ? mobileFilters : null}
          </Button>
        </div>

        {teachers.loading ? (
          <div className="card card-pad row center" style={{ minHeight: 200 }}>
            <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
          </div>
        ) : teachers.error ? (
          <div className="card">
            <Empty
              title="Не удалось загрузить"
              text="Проверьте интернет и попробуйте ещё раз."
              action={
                <Button variant="secondary" onClick={teachers.reload}>
                  Повторить
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconSearch size={34} />}
              title={hasFilters ? "Никого не нашли" : "Учителей пока нет"}
              text={
                hasFilters
                  ? "Попробуйте снять фильтры или очистить поиск."
                  : "Здесь появятся все, кто зарегистрировался на платформе."
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
                    <th>Школа · регион</th>
                    <th>Курсов</th>
                    <th>Завершил</th>
                    <th>Сертификатов</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td style={{ maxWidth: 280 }}>
                        <Link href={`/teachers/${row.id}`} className="row g10">
                          <Avatar initials={initialsOf(row)} size={34} tone="neutral" />
                          <span className="stack g2" style={{ minWidth: 0 }}>
                            <span className="small" style={{ fontWeight: 600 }}>
                              {/* Только что зарегистрировавшийся ещё без ФИО — зовём по номеру */}
                              {teacherName(row) || phoneFmt(row.phone)}
                            </span>
                            {row.is_blocked && <StatusBadge status="Заблокирован" />}
                          </span>
                        </Link>
                      </td>
                      <td className="small nowrap mono">{phoneFmt(row.phone)}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div className="stack g2">
                          <span className="small">{row.school}</span>
                          <span className="caption muted-3">{row.region}</span>
                        </div>
                      </td>
                      <td className="small">{row.courses_count}</td>
                      <td className="small">{row.completed_count}</td>
                      <td className="small">{row.certificates_count}</td>
                      <td style={{ width: 44 }}>
                        <Link
                          href={`/teachers/${row.id}`}
                          className="btn btn-icon"
                          style={{ minHeight: 34, width: 34 }}
                          aria-label="Открыть"
                        >
                          <IconChevronRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== Мобильный: карточки, а не горизонтальный скролл ===== */}
            <div className="table-mobile-cards">
              {items.map((row) => (
                <Link
                  key={row.id}
                  href={`/teachers/${row.id}`}
                  className="card card-link card-pad stack g10"
                >
                  <div className="row g10">
                    <Avatar initials={initialsOf(row)} size={40} tone="neutral" />
                    <div className="grow stack g2" style={{ minWidth: 0 }}>
                      <span className="small" style={{ fontWeight: 700 }}>
                        {teacherName(row) || phoneFmt(row.phone)}
                      </span>
                      <span className="caption muted-3">
                        {[row.school, row.region].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    {row.is_blocked ? (
                      <StatusBadge status="Заблокирован" />
                    ) : (
                      <IconChevronRight size={18} className="muted-3" />
                    )}
                  </div>
                  <span className="small mono">{phoneFmt(row.phone)}</span>
                  <div className="row wrap g12 caption muted">
                    <span>курсов: {row.courses_count}</span>
                    <span className="dot-sep">·</span>
                    <span>завершил {row.completed_count}</span>
                    <span className="dot-sep">·</span>
                    <span>сертификатов: {row.certificates_count}</span>
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
            {mobileFilters > 0 && (
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
                maxLength={100}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Регион</label>
            <select
              className="input"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Все регионы</option>
              {(dictionaries.data?.regions ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Курс</label>
            <select
              className="input"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value === "all" ? "all" : Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="all">Все курсы</option>
              {(courses.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Sheet>

      <style>{`
        .teachers-filter-btn { display: none; }
        @media (max-width: 899px) {
          .teachers-filters-inline { display: none; }
          .teachers-filter-btn { display: inline-flex; flex-shrink: 0; }
        }
      `}</style>
    </AdminShell>
  );
}
