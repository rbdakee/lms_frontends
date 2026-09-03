"use client";

/**
 * Каталог «/courses» — раздел 5.2 брифа.
 *
 * Каталог открытый: смотреть можно без входа, доступ к содержимому выдаёт
 * админ после заявки. Данные — `GET /courses`: группировку по языкам делает
 * сервер (одна карточка на `group_id`), фильтры, поиск и сортировка остаются
 * клиентскими. Подписи категорий — из `GET /dictionaries` по `category_id`.
 */

import { useMemo, useState } from "react";
import {
  api,
  categoryTitle,
  useDictionaries,
  useLoad,
  useMe,
  type CatalogGroup,
  type CatalogOut,
  type MyCourses,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { type UiLang } from "@lms/ui/i18n";
import { PublicShell, TeacherShell } from "@/components/layout/Shell";
import { CourseCard, pickVersion, type AccessState } from "@lms/course";
import { Button, CourseCardSkeleton, Empty, Note, Sheet } from "@lms/ui";
import { IconCheck, IconClose, IconFilter, IconSearch } from "@lms/ui/icons";

type Sort = "new" | "start" | "rating";
type Hours = "any" | "short" | "mid" | "long";
type CourseLang = "any" | UiLang;
type Enroll = "default" | "open" | "planned" | "closed";

const HOURS_LABEL: Record<Exclude<Hours, "any">, string> = {
  short: "До 24 часов",
  mid: "24–48 часов",
  long: "Больше 48 часов",
};

const ENROLL_LABEL: Record<Exclude<Enroll, "default">, string> = {
  open: "Идёт набор",
  planned: "Запланированные",
  closed: "Набор закрыт",
};

export default function CatalogPage() {
  const { t, lang } = useLang();
  const { me } = useMe();
  const authed = Boolean(me);

  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);
  const dictionaries = useDictionaries();
  /* Бейджи «Доступ открыт» и «Заявка отправлена» на карточках — из /me/courses */
  const mine = useLoad<MyCourses | null>(
    () => (me ? api<MyCourses>("/me/courses") : Promise.resolve(null)),
    [me?.id],
  );

  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<number[]>([]);
  const [courseLang, setCourseLang] = useState<CourseLang>("any");
  const [hours, setHours] = useState<Hours>("any");
  const [enroll, setEnroll] = useState<Enroll>("default");
  const [sort, setSort] = useState<Sort>("new");
  const [sheet, setSheet] = useState(false);

  const activeFilters =
    cats.length +
    (courseLang !== "any" ? 1 : 0) +
    (hours !== "any" ? 1 : 0) +
    (enroll !== "default" ? 1 : 0);

  const resetAll = () => {
    setCats([]);
    setCourseLang("any");
    setHours("any");
    setEnroll("default");
  };

  const groups = useMemo(() => catalog.data?.items ?? [], [catalog.data]);
  const categories = dictionaries.data?.categories ?? [];

  const accessOf = useMemo(() => {
    const granted = new Set(mine.data?.items.map((c) => c.id) ?? []);
    const requested = new Set(mine.data?.leads.map((l) => l.course.id) ?? []);
    return (group: CatalogGroup): AccessState => {
      if (group.versions.some((v) => granted.has(v.id))) return "granted";
      if (group.versions.some((v) => requested.has(v.id))) return "requested";
      return "none";
    };
  }, [mine.data]);

  const result = useMemo(() => {
    let list = groups.filter((g) => {
      const shown = pickVersion(g, lang);
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const inTitles = g.versions.some((v) => v.title.toLowerCase().includes(q));
        const inCategory = categoryTitle(categories, shown.category_id)
          .toLowerCase()
          .includes(q);
        if (!inTitles && !inCategory) return false;
      }
      if (cats.length && !cats.includes(shown.category_id)) return false;
      if (courseLang !== "any" && !g.langs.includes(courseLang)) return false;
      if (hours === "short" && shown.hours >= 24) return false;
      if (hours === "mid" && (shown.hours < 24 || shown.hours > 48)) return false;
      if (hours === "long" && shown.hours <= 48) return false;

      /* По умолчанию показываем идущие и запланированные вперемешку;
         закрытый набор скрыт из выдачи, но доступен по прямой ссылке
         и по отдельному фильтру. */
      if (enroll === "default") return shown.status !== "closed";
      return shown.status === enroll;
    });

    /* «Новые» — порядок сервера (свежие группы сверху), сортировка стабильная */
    if (sort === "rating") {
      /* Рейтинг групповой; курсы без отзывов — в конец */
      list = list.slice().sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sort === "start") {
      /* Сначала те, у кого есть дата старта — по возрастанию */
      list = list.slice().sort((a, b) => {
        const sa = pickVersion(a, lang).starts_at;
        const sb = pickVersion(b, lang).starts_at;
        if (sa && sb) return sa.localeCompare(sb);
        if (sa) return -1;
        if (sb) return 1;
        return 0;
      });
    }
    return list;
  }, [groups, categories, query, cats, courseLang, hours, enroll, sort, lang]);

  const toggleCat = (id: number) =>
    setCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filtersBody = (
    <div className="stack g24">
      <div className="stack g10">
        <strong className="small">Категория</strong>
        <div className="stack g2">
          {categories.map((c) => (
            <label key={c.id} className="check">
              <input
                type="checkbox"
                checked={cats.includes(c.id)}
                onChange={() => toggleCat(c.id)}
              />
              <span className="check-box">
                <IconCheck size={14} />
              </span>
              <span className="check-label">{c.title}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="stack g10">
        <strong className="small">Статус набора</strong>
        <div className="row wrap g8">
          {(
            [
              ["default", "Идущие и запланированные"],
              ["open", ENROLL_LABEL.open],
              ["planned", ENROLL_LABEL.planned],
              ["closed", ENROLL_LABEL.closed],
            ] as [Enroll, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              className="chip"
              data-active={enroll === v || undefined}
              onClick={() => setEnroll(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="stack g10">
        <strong className="small">Язык курса</strong>
        <div className="row wrap g8">
          {(
            [
              ["any", "Любой"],
              ["ru", "Русский"],
              ["kz", "Қазақша"],
            ] as [CourseLang, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              className="chip"
              data-active={courseLang === v || undefined}
              onClick={() => setCourseLang(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="stack g10">
        <strong className="small">Объём курса</strong>
        <div className="row wrap g8">
          {(
            [
              ["any", "Любой"],
              ["short", HOURS_LABEL.short],
              ["mid", HOURS_LABEL.mid],
              ["long", HOURS_LABEL.long],
            ] as [Hours, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              className="chip"
              data-active={hours === v || undefined}
              onClick={() => setHours(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const content = (
    <div className="page section" style={{ paddingTop: 16 }}>
      <div className="stack g8" style={{ marginBottom: 20 }}>
        <h1 className="h1">Каталог курсов</h1>
        <p className="body muted">Курсы на русском и казахском языках</p>
      </div>

      {/* Липкий поиск */}
      <div className="catalog-search">
        <div className="row g8">
          <div className="input-wrap grow">
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              placeholder="Поиск по курсам"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Поиск по курсам"
            />
          </div>
          <button
            className="btn btn-secondary catalog-filter-btn"
            onClick={() => setSheet(true)}
            style={{ flexShrink: 0 }}
          >
            <IconFilter size={18} />
            {t.filters}
            {activeFilters > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: "var(--primary)",
                  color: "var(--text-on-fill)",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="catalog-layout">
        {/* Боковые фильтры — десктоп */}
        <aside className="catalog-side">
          <div className="card card-pad stack g20" style={{ position: "sticky", top: 88 }}>
            <div className="row between">
              <strong>{t.filters}</strong>
              {activeFilters > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={resetAll}>
                  {t.reset}
                </button>
              )}
            </div>
            {filtersBody}
          </div>
        </aside>

        <div className="stack g16 grow" style={{ minWidth: 0 }}>
          <div className="row between wrap g12">
            <span className="small muted">{t.found(result.length)}</span>
            <div className="segmented">
              <button data-active={sort === "new"} onClick={() => setSort("new")}>
                {t.sortNew}
              </button>
              <button data-active={sort === "start"} onClick={() => setSort("start")}>
                {t.sortStart}
              </button>
              <button data-active={sort === "rating"} onClick={() => setSort("rating")}>
                {t.sortRating}
              </button>
            </div>
          </div>

          {/* Активные фильтры чипами */}
          {activeFilters > 0 && (
            <div className="row wrap g8">
              {cats.map((id) => (
                <button key={id} className="chip" data-active onClick={() => toggleCat(id)}>
                  {categoryTitle(categories, id)}
                  <IconClose size={14} />
                </button>
              ))}
              {enroll !== "default" && (
                <button className="chip" data-active onClick={() => setEnroll("default")}>
                  {ENROLL_LABEL[enroll]}
                  <IconClose size={14} />
                </button>
              )}
              {courseLang !== "any" && (
                <button className="chip" data-active onClick={() => setCourseLang("any")}>
                  {courseLang === "ru" ? "Русский" : "Қазақша"}
                  <IconClose size={14} />
                </button>
              )}
              {hours !== "any" && (
                <button className="chip" data-active onClick={() => setHours("any")}>
                  {HOURS_LABEL[hours]}
                  <IconClose size={14} />
                </button>
              )}
            </div>
          )}

          {!authed && (
            <Note kind="info">
              Смотреть каталог можно без входа. Чтобы оставить заявку на курс, войдите
              по номеру телефона — имя и телефон возьмём из профиля, заполнять ничего не нужно.
            </Note>
          )}

          {catalog.loading ? (
            <div className="grid-courses">
              {Array.from({ length: 6 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : catalog.error ? (
            <div className="card">
              <Empty
                title={t.loadError}
                text={t.loadErrorText}
                action={
                  <Button variant="secondary" onClick={catalog.reload}>
                    {t.retry}
                  </Button>
                }
              />
            </div>
          ) : groups.length === 0 ? (
            <div className="card">
              <Empty title={t.emptyCatalogTitle} text={t.emptyCatalogText} />
            </div>
          ) : result.length === 0 ? (
            <div className="card">
              <Empty
                icon={<IconSearch size={36} />}
                title={t.nothingFound}
                text={
                  query
                    ? `По запросу «${query}»${activeFilters ? " с выбранными фильтрами" : ""} курсов нет. Попробуйте изменить запрос или убрать фильтры.`
                    : "С выбранными фильтрами курсов нет. Попробуйте убрать часть условий."
                }
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      resetAll();
                      setQuery("");
                    }}
                  >
                    {t.resetFilters}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid-courses">
              {result.map((g) => (
                <CourseCard key={g.group_id} group={g} access={accessOf(g)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Шторка фильтров — мобильный */}
      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t.filters}
        footer={
          <div className="row g8">
            <Button variant="secondary" onClick={resetAll} style={{ flexShrink: 0 }}>
              {t.reset}
            </Button>
            <Button block onClick={() => setSheet(false)}>
              {t.showCourses(result.length)}
            </Button>
          </div>
        }
      >
        {filtersBody}
      </Sheet>

      <style>{`
        .catalog-layout { display: flex; gap: 24px; align-items: flex-start; }
        .catalog-side { display: none; width: 268px; flex-shrink: 0; }
        /* Поиск липнет к верху при скролле — фон во всю ширину поля страницы */
        .catalog-search {
          position: sticky;
          top: var(--header-h);
          z-index: 30;
          background: var(--bg);
          padding: 8px 16px 12px;
          margin: 0 -16px;
        }
        @media (min-width: 768px) {
          .catalog-search { padding: 8px 24px 12px; margin: 0 -24px; }
        }
        @media (min-width: 1024px) {
          .catalog-side { display: block; }
          .catalog-filter-btn { display: none; }
        }
      `}</style>
    </div>
  );

  return authed ? (
    <TeacherShell>{content}</TeacherShell>
  ) : (
    <PublicShell>{content}</PublicShell>
  );
}
