"use client";

/**
 * Каталог «/courses» — раздел 5.2 брифа.
 *
 * Каталог открытый: смотреть можно без входа, доступ к содержимому выдаёт
 * админ после заявки. Русская и казахская версии курса показываются одной
 * карточкой — они связаны общим groupId.
 */

import { useMemo, useState } from "react";
import { catalogCourses, categories, groupLangs, type Course, type Lang } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { PublicShell, TeacherShell } from "@/components/layout/Shell";
import { CourseCard } from "@/components/course/CourseCard";
import { Button, CourseCardSkeleton, Empty, Note, Sheet } from "@lms/ui";
import { IconCheck, IconClose, IconFilter, IconSearch } from "@lms/ui/icons";

type Sort = "new" | "start" | "rating";
type Hours = "any" | "short" | "mid" | "long";
type CourseLang = "any" | Lang;
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
  const { t, lang, authed, ready } = useStore();

  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<string[]>([]);
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

  /**
   * Одна карточка на языковую группу. Открывается версия на языке
   * интерфейса; если её нет — единственная существующая.
   */
  const grouped = useMemo(() => {
    const seen = new Set<string>();
    const out: Course[] = [];
    for (const c of catalogCourses) {
      if (seen.has(c.groupId)) continue;
      seen.add(c.groupId);
      const versions = catalogCourses.filter((x) => x.groupId === c.groupId);
      out.push(versions.find((x) => x.lang === lang) ?? versions[0]);
    }
    return out;
  }, [lang]);

  const result = useMemo(() => {
    let list = grouped.filter((c) => {
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const inGroup = catalogCourses
          .filter((x) => x.groupId === c.groupId)
          .some((x) => x.title.toLowerCase().includes(q));
        if (!inGroup && !c.category.toLowerCase().includes(q)) return false;
      }
      if (cats.length && !cats.includes(c.category)) return false;
      if (courseLang !== "any" && !groupLangs(c).includes(courseLang)) return false;
      if (hours === "short" && c.hours >= 24) return false;
      if (hours === "mid" && (c.hours < 24 || c.hours > 48)) return false;
      if (hours === "long" && c.hours <= 48) return false;

      /* По умолчанию показываем идущие и запланированные вперемешку;
         закрытый набор скрыт из выдачи, но доступен по прямой ссылке
         и по отдельному фильтру. */
      if (enroll === "default") return c.status !== "closed";
      if (enroll === "open") return c.status === "open";
      if (enroll === "planned") return c.status === "planned";
      return c.status === "closed";
    });

    list = list.slice().sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "start") {
        /* Сначала те, у кого есть дата старта — по возрастанию */
        if (a.startsAt && b.startsAt) return a.startsAt.localeCompare(b.startsAt);
        if (a.startsAt) return -1;
        if (b.startsAt) return 1;
        return b.publishedAt.localeCompare(a.publishedAt);
      }
      return b.publishedAt.localeCompare(a.publishedAt);
    });
    return list;
  }, [grouped, query, cats, courseLang, hours, enroll, sort]);

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const filtersBody = (
    <div className="stack g24">
      <div className="stack g10">
        <strong className="small">Категория</strong>
        <div className="stack g2">
          {categories.map((c) => (
            <label key={c} className="check">
              <input type="checkbox" checked={cats.includes(c)} onChange={() => toggleCat(c)} />
              <span className="check-box">
                <IconCheck size={14} />
              </span>
              <span className="check-label">{c}</span>
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
                  color: "#fff",
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
              {cats.map((c) => (
                <button key={c} className="chip" data-active onClick={() => toggleCat(c)}>
                  {c}
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

          {!ready ? (
            <div className="grid-courses">
              {Array.from({ length: 6 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
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
              {result.map((c) => (
                <CourseCard key={c.groupId} course={c} showState={authed} />
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
