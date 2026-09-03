"use client";

/**
 * Каталог второй площадки — «/courses».
 *
 * Данные, правила и переходы те же, что у первой площадки: `GET /courses`
 * (группировку по языкам делает сервер — одна карточка на `group_id`),
 * `GET /dictionaries` для подписей категорий и `GET /me/courses` у вошедшего
 * ради бейджей «Доступ открыт» и «Заявка отправлена». Поиск, фильтры
 * и сортировка остаются клиентскими: каталог маленький и без пагинации.
 *
 * Карточка курса — общий `CourseCard` из `packages/course`, своей копии
 * у площадки нет и быть не должно. Поэтому непохожесть делается всем, что
 * вокруг карточки, и у каждого отличия своя причина:
 *
 * - **Фильтры полкой, а не колонкой.** У первой площадки слева стоит
 *   колонка фильтров в 268 px, здесь её нет вовсе: категории — чипами
 *   в липкой полке под заголовком, остальное — в шторке `Sheet`, которая
 *   открывается на любой ширине, а не только на телефоне. Освободившаяся
 *   колонка уходит выдаче: на широком экране карточка становится в полтора
 *   раза шире, и это первое, что видно при переключении между площадками.
 * - **Липнет полка, а не поиск.** Поле поиска стоит один раз в шапке
 *   экрана, в узкой колонке: каталог без пагинации, экран короткий,
 *   а под рукой при просмотре выдачи нужнее переключение категории.
 * - **Сортировка — подчёркнутые вкладки.** Сегментированный переключатель
 *   занят первой площадкой; здесь та же тройка стоит вкладками, и линия
 *   вкладок заодно отбивает выдачу от панели — на белом фоне работает
 *   кайма, а не заливка.
 * - **Полка, сортировка и счётчик появляются только у загруженного
 *   каталога.** Пока идут скелетоны, пришла ошибка сети или каталог пуст,
 *   управлять нечем: экран остаётся из заголовка, поиска и одного `Empty`.
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
import { IconClose, IconFilter, IconSearch } from "@lms/ui/icons";

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

/**
 * Группа фильтра с одним выбранным значением. Три группы в шторке устроены
 * одинаково, и описывать их данными дешевле, чем повторять разметку трижды.
 */
function ChipGroup<T extends string>({
  title,
  value,
  options,
  onPick,
}: {
  title: string;
  value: T;
  options: [T, string][];
  onPick: (value: T) => void;
}) {
  return (
    <div className="stack g10">
      <strong className="small">{title}</strong>
      <div className="row wrap g8">
        {options.map(([v, label]) => (
          <button
            key={v}
            className="chip"
            data-active={value === v || undefined}
            aria-pressed={value === v}
            onClick={() => onPick(v)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

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

  /* Счётчик на кнопке считает только то, что спрятано в шторке: категории
     стоят чипами на виду, и приписывать их к «Фильтрам» значило бы обещать
     под кнопкой не тот выбор. Общее число нужно другому — строке сброса. */
  const sheetFilters =
    (courseLang !== "any" ? 1 : 0) + (hours !== "any" ? 1 : 0) + (enroll !== "default" ? 1 : 0);
  const activeFilters = cats.length + sheetFilters;

  const resetAll = () => {
    setCats([]);
    setCourseLang("any");
    setHours("any");
    setEnroll("default");
  };

  const groups = useMemo(() => catalog.data?.items ?? [], [catalog.data]);
  const categories = dictionaries.data?.categories ?? [];
  /* Полка фильтров и сортировка нужны только тогда, когда есть что сужать */
  const hasCatalog = !catalog.loading && !catalog.error && groups.length > 0;

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

  const content = (
    <div className="page section">
      {/* Шапка экрана: заголовок, подпись и поиск — узкой колонкой,
          чтобы строка читалась, а выдача под ней шла во всю ширину */}
      <div className="p2-cat-head stack g16">
        <div className="stack g6">
          <h1 className="h1">Каталог курсов</h1>
          <p className="body muted">Курсы на русском и казахском языках</p>
        </div>

        <div className="input-wrap">
          <span className="input-icon">
            <IconSearch size={20} />
          </span>
          <input
            className="input p2-cat-search"
            placeholder="Поиск по курсам"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск по курсам"
          />
        </div>

        {!authed && (
          <Note kind="info">
            Смотреть каталог можно без входа. Чтобы оставить заявку на курс, войдите
            по номеру телефона — имя и телефон возьмём из профиля, заполнять ничего не нужно.
          </Note>
        )}
      </div>

      {hasCatalog && (
        <>
          {/* Полка фильтров: категории на виду, остальное — в шторке */}
          <div className="p2-cat-bar">
            <div className="p2-cat-bar-in">
              <div className="p2-cat-cats" role="group" aria-label="Категория">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className="chip"
                    data-active={cats.includes(c.id) || undefined}
                    aria-pressed={cats.includes(c.id)}
                    onClick={() => toggleCat(c.id)}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
              <button className="btn btn-secondary p2-cat-more" onClick={() => setSheet(true)}>
                <IconFilter size={18} />
                {t.filters}
                {sheetFilters > 0 && <span className="caption p2-cat-count">{sheetFilters}</span>}
              </button>
            </div>
          </div>

          <div className="p2-cat-tools stack g12">
            {/* Активные фильтры — снимаются по крестику, включая категории:
                на телефоне полка прокручивается вбок, и выбранная категория
                легко оказывается за её краем */}
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
                <button className="btn btn-ghost btn-sm" onClick={resetAll}>
                  {t.reset}
                </button>
              </div>
            )}

            <div className="p2-cat-sort">
              <div className="tabs grow">
                {(
                  [
                    ["new", t.sortNew],
                    ["start", t.sortStart],
                    ["rating", t.sortRating],
                  ] as [Sort, string][]
                ).map(([v, label]) => (
                  <button
                    key={v}
                    data-active={sort === v}
                    aria-pressed={sort === v}
                    onClick={() => setSort(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="small muted nowrap p2-cat-found">{t.found(result.length)}</span>
            </div>
          </div>
        </>
      )}

      <div className="p2-cat-results">
        {catalog.loading ? (
          <div className="p2-cat-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : catalog.error ? (
          <div className="card-flat p2-cat-state">
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
          <div className="card-flat p2-cat-state">
            <Empty title={t.emptyCatalogTitle} text={t.emptyCatalogText} />
          </div>
        ) : result.length === 0 ? (
          <div className="card-flat p2-cat-state">
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
          <div className="p2-cat-grid">
            {result.map((g) => (
              <CourseCard key={g.group_id} group={g} access={accessOf(g)} />
            ))}
          </div>
        )}
      </div>

      {/* Шторка с остальными фильтрами — на любой ширине, а не только
          на телефоне: колонки фильтров у этой площадки нет.
          «Сбросить» здесь чистит и категории — иначе одна и та же надпись
          в шторке и над выдачей означала бы разное. */}
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
        <div className="stack g24">
          <ChipGroup<Enroll>
            title="Статус набора"
            value={enroll}
            options={[
              ["default", "Идущие и запланированные"],
              ["open", ENROLL_LABEL.open],
              ["planned", ENROLL_LABEL.planned],
              ["closed", ENROLL_LABEL.closed],
            ]}
            onPick={setEnroll}
          />
          <ChipGroup<CourseLang>
            title="Язык курса"
            value={courseLang}
            options={[
              ["any", "Любой"],
              ["ru", "Русский"],
              ["kz", "Қазақша"],
            ]}
            onPick={setCourseLang}
          />
          <ChipGroup<Hours>
            title="Объём курса"
            value={hours}
            options={[
              ["any", "Любой"],
              ["short", HOURS_LABEL.short],
              ["mid", HOURS_LABEL.mid],
              ["long", HOURS_LABEL.long],
            ]}
            onPick={setHours}
          />
        </div>
      </Sheet>

      <style>{`
        /* Шапка держится узкой колонкой: заголовок и подпись читаются
           строкой нормальной длины, а сетка под ними идёт во всю ширину */
        .p2-cat-head { max-width: 620px; margin-bottom: 24px; }
        .p2-cat-search { height: 52px; }

        /* Полка липнет под шапкой. Шапка второй площадки на широком экране
           в две полки: к её высоте прибавляется ряд разделов (46 px и линия),
           иначе полка фильтров уедет под навигацию. */
        .p2-cat-bar {
          position: sticky;
          top: var(--header-h);
          z-index: 30;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          margin: 0 -16px;
          padding: 10px 16px;
        }
        .p2-cat-bar-in { display: flex; align-items: center; gap: 10px; }
        .p2-cat-cats {
          display: flex;
          gap: 8px;
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
          /* обводка чипа под фокусом не срезается краем прокрутки */
          padding: 2px 0;
        }
        .p2-cat-cats::-webkit-scrollbar { display: none; }
        .p2-cat-cats > .chip { flex-shrink: 0; }
        .p2-cat-more { flex-shrink: 0; }
        .p2-cat-count {
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--primary);
          color: var(--text-on-fill);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .p2-cat-tools { margin-top: 20px; }
        /* Счётчик стоит на одной линии с вкладками и продолжает их черту:
           линия отбивает панель от выдачи вместо ещё одной карточки */
        .p2-cat-sort { display: flex; align-items: stretch; gap: 12px; }
        .p2-cat-found {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border);
        }

        .p2-cat-results { margin-top: 20px; }
        .p2-cat-state { padding-block: 12px; }
        /* Своя плотность: колонки шире, чем у первой площадки, потому что
           места больше на всю колонку фильтров */
        .p2-cat-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }

        @media (min-width: 560px) {
          .p2-cat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 768px) {
          .p2-cat-bar { margin: 0 -24px; padding: 12px 24px; }
        }
        @media (min-width: 1024px) {
          .p2-cat-bar { top: calc(var(--header-h) + 47px); }
          /* Категорий немного, на широком экране они встают в строку-две;
             горизонтальная прокрутка мышью там неудобна */
          .p2-cat-cats { flex-wrap: wrap; overflow: visible; }
          .p2-cat-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; }
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
