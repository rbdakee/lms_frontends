"use client";

/**
 * Список курсов «/courses» — раздел 5.16 брифа.
 *
 * Строка списка — версия курса, а не группа: русскую и казахскую правят
 * по отдельности, столбец «RU · ҚАЗ» только показывает, что соседняя версия
 * существует. Данные — `GET /admin/courses`: фильтры `status`, `lang`, `q`
 * и пагинация серверные, в браузере ничего не отбирается.
 *
 * Заявки в работе, доступы и завершивших считает сервер тем же способом,
 * что экраны «Заявки» и «Отчёт», — иначе числа разъедутся.
 *
 * На узких экранах таблица превращается в карточки, а не в горизонтальный скролл.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  isApiError,
  qs,
  useLoad,
  type AdminCourse,
  type AdminCourseCard,
  type AdminCoursesPage,
  type CourseLang,
  type CourseStatus,
} from "@lms/api";
import { day, plural, price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import {
  changedAgo,
  courseLangs,
  COURSE_STATUS_LABEL,
  COURSE_STATUS_ORDER,
} from "@/components/admin/courseStatus";
import { NewCourseSheet } from "@/components/admin/NewCourse";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Cover, Empty, Sheet, StatusBadge } from "@lms/ui";
import {
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconChart,
  IconLayers,
  IconMore,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@lms/ui/icons";

const PER_PAGE = 20;

const courseWord = (n: number) => plural(n, "курс", "курса", "курсов");

export default function AdminCoursesPage() {
  const { lang, toast } = useStore();
  const router = useRouter();

  const [query, setQuery] = useState("");
  /* Поиск уходит на сервер — печать не должна слать запрос на каждую букву */
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | CourseStatus>("all");
  const [courseLang, setCourseLang] = useState<"all" | CourseLang>("all");
  const [page, setPage] = useState(1);

  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);
  const [hiding, setHiding] = useState<AdminCourse | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const courses = useLoad(
    () =>
      api<AdminCoursesPage>(
        `/admin/courses${qs({
          page,
          per_page: PER_PAGE,
          status: status === "all" ? undefined : status,
          lang: courseLang === "all" ? undefined : courseLang,
          q,
        })}`,
      ),
    [page, status, courseLang, q],
  );

  const items = courses.data?.items ?? [];
  const total = courses.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = status !== "all" || courseLang !== "all" || q !== "";

  const resetFilters = () => {
    setQuery("");
    setQ("");
    setStatus("all");
    setCourseLang("all");
    setPage(1);
  };

  /** PATCH и DELETE отвечают редактором курса — в строке живут не все его поля */
  const patchRow = (id: number, updated: AdminCourseCard) =>
    courses.setData((d) =>
      d
        ? {
            ...d,
            items: d.items.map((c) =>
              c.id === id
                ? { ...c, status: updated.status, updated_at: updated.updated_at }
                : c,
            ),
          }
        : d,
    );

  const duplicate = async (c: AdminCourse) => {
    if (busyId) return;
    setBusyId(c.id);
    setMenuFor(null);
    try {
      const copy = await api<AdminCourseCard>(`/admin/courses/${c.id}/duplicate`, {
        method: "POST",
      });
      toast("Копия создана — черновик, в каталоге её пока нет", "success");
      router.push(`/courses/${copy.id}/edit`);
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось скопировать курс", "error");
      setBusyId(null);
    }
  };

  /* Скрытый курс возвращается в черновик: показать его сразу людям —
     это публикация, а она идёт из редактора и проверяет готовность */
  const toggleHidden = async (c: AdminCourse) => {
    if (busyId) return;
    const next: CourseStatus = c.status === "hidden" ? "draft" : "hidden";
    setBusyId(c.id);
    setMenuFor(null);
    try {
      const updated = await api<AdminCourseCard>(`/admin/courses/${c.id}`, {
        method: "PATCH",
        json: { status: next },
      });
      patchRow(c.id, updated);
      toast(
        next === "hidden"
          ? "Курс скрыт — он не открывается ни в каталоге, ни у тех, кому выдан доступ"
          : "Курс вернулся в черновики — опубликуйте его из редактора",
        "success",
      );
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось поменять статус", "error");
    } finally {
      setHiding(null);
      setBusyId(null);
    }
  };

  const remove = async (c: AdminCourse) => {
    if (busyId) return;
    setBusyId(c.id);
    try {
      await api<void>(`/admin/courses/${c.id}`, { method: "DELETE" });
      setDeleting(null);
      toast("Курс удалён вместе с программой", "success");
      courses.reload();
    } catch (e) {
      /* 409 course_in_use приходит с готовой строкой и числами — показываем её */
      toast(isApiError(e) ? e.message : "Не удалось удалить курс", "error");
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const actions = (c: AdminCourse) => {
    const hidden = c.status === "hidden";
    const links = [
      { label: "Редактировать", icon: IconEdit, href: `/courses/${c.id}/edit` },
      { label: "Программа курса", icon: IconEdit, href: `/courses/${c.id}/edit?tab=program` },
      { label: "Заявки на курс", icon: IconChart, href: "/leads" },
      { label: "Отчёт", icon: IconChart, href: `/reports/${c.id}` },
    ];
    return (
      <div style={{ position: "relative" }}>
        <button
          className="btn btn-icon"
          style={{ minHeight: 36, width: 36 }}
          onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}
          aria-label="Действия"
        >
          <IconMore size={18} />
        </button>
        {menuFor === c.id && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 40 }}
              onClick={() => setMenuFor(null)}
            />
            <div
              className="card"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                zIndex: 50,
                minWidth: 190,
                padding: 6,
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {links.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="admin-nav-item"
                    onClick={() => setMenuFor(null)}
                  >
                    <Icon size={17} />
                    {a.label}
                  </Link>
                );
              })}
              <MenuButton icon={IconCopy} onClick={() => duplicate(c)}>
                Дублировать
              </MenuButton>
              <MenuButton
                icon={hidden ? IconEye : IconEyeOff}
                onClick={() => {
                  /* Предупреждаем только там, где есть что ломать: снятие скрытия
                     безобидно, а черновик и так не существует для площадки —
                     hidden ничего к этому не добавит */
                  if (hidden || c.status === "draft") {
                    toggleHidden(c);
                    return;
                  }
                  setMenuFor(null);
                  setHiding(c);
                }}
              >
                {hidden ? "Показать" : "Скрыть"}
              </MenuButton>
              <MenuButton
                icon={IconTrash}
                danger
                onClick={() => {
                  setMenuFor(null);
                  setDeleting(c);
                }}
              >
                Удалить
              </MenuButton>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <AdminShell
      title="Курсы"
      subtitle={
        courses.data
          ? `${total} ${courseWord(total)} ${hasFilters ? "по фильтру" : "всего"}`
          : "Черновики и скрытые версии видит только админ"
      }
      actions={
        <Button size="sm" icon={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          <span className="hide-sm">Создать курс</span>
        </Button>
      }
    >
      <div className="stack g16">
        <div className="row wrap g10">
          <div className="input-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              placeholder="Поиск по названию"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input"
            style={{ width: "auto", minWidth: 190 }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="all">Все статусы</option>
            {COURSE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {COURSE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: "auto", minWidth: 150 }}
            value={courseLang}
            onChange={(e) => {
              setCourseLang(e.target.value as typeof courseLang);
              setPage(1);
            }}
          >
            <option value="all">Оба языка</option>
            <option value="ru">Русский</option>
            <option value="kz">Қазақша</option>
          </select>
        </div>

        {courses.loading ? (
          <div className="card card-pad row center" style={{ minHeight: 200 }}>
            <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
          </div>
        ) : courses.error ? (
          <div className="card">
            <Empty
              title="Не удалось загрузить"
              text="Проверьте интернет и попробуйте ещё раз."
              action={
                <Button variant="secondary" onClick={courses.reload}>
                  Повторить
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <Empty
              icon={hasFilters ? <IconSearch size={34} /> : <IconLayers size={34} />}
              title={hasFilters ? "Курсы не нашли" : "Курсов пока нет"}
              text={
                hasFilters
                  ? "Измените запрос или снимите фильтры — черновики и скрытые версии тоже в списке."
                  : "Первый курс заведётся черновиком: в каталоге его не будет, пока вы не откроете набор."
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={resetFilters}>
                    Сбросить фильтры
                  </Button>
                ) : (
                  <Button onClick={() => setCreating(true)}>Создать курс</Button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Таблица — широкие экраны */}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 84 }}>Обложка</th>
                    <th>Название</th>
                    <th>Язык</th>
                    <th>Цена</th>
                    <th>Статус</th>
                    <th>Старт</th>
                    <th>Уроков</th>
                    <th>Заявок в работе</th>
                    <th>Доступ выдан</th>
                    <th>Завершили</th>
                    <th>Изменён</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} style={busyId === c.id ? { opacity: 0.5 } : undefined}>
                      <td>
                        {/* Миниатюра без глифа: в 64 пикселя он не помещается */}
                        <Cover src={c.cover} glyph={false} style={{ width: 64, borderRadius: 8 }} />
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <Link href={`/courses/${c.id}/edit`} className="stack g4">
                          <strong className="small pretty">{c.title}</strong>
                          <span className="caption muted-3">
                            {c.modules_count}{" "}
                            {plural(c.modules_count, "модуль", "модуля", "модулей")}
                          </span>
                        </Link>
                      </td>
                      <td className="caption muted nowrap">{courseLangs(c)}</td>
                      <td className="small nowrap">{fmtPrice(c.price ?? undefined, lang)}</td>
                      <td>
                        <StatusBadge status={COURSE_STATUS_LABEL[c.status as CourseStatus]} />
                      </td>
                      <td className="caption muted-3 nowrap">
                        {c.starts_at ? day(c.starts_at, lang) : "—"}
                      </td>
                      <td className="small">{c.lessons_count}</td>
                      <td>
                        {c.open_leads_count > 0 ? (
                          <Link
                            href="/leads"
                            className="small"
                            style={{ color: "var(--primary)", fontWeight: 700 }}
                          >
                            {c.open_leads_count}
                          </Link>
                        ) : (
                          <span className="small muted-3">—</span>
                        )}
                      </td>
                      <td className="small">{c.students_count || "—"}</td>
                      <td className="small">{c.completed_count || "—"}</td>
                      <td className="caption muted-3 nowrap">{changedAgo(c.updated_at, lang)}</td>
                      <td style={{ width: 52 }}>{actions(c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Карточки — узкие экраны */}
            <div className="table-mobile-cards">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="card card-pad stack g10"
                  style={busyId === c.id ? { opacity: 0.5 } : undefined}
                >
                  <div className="row between g10" style={{ alignItems: "flex-start" }}>
                    <Cover src={c.cover} glyph={false} style={{ width: 56, borderRadius: 8 }} />
                    <Link href={`/courses/${c.id}/edit`} className="grow">
                      <strong className="small pretty">{c.title}</strong>
                    </Link>
                    <StatusBadge status={COURSE_STATUS_LABEL[c.status as CourseStatus]} />
                  </div>
                  <div className="row wrap g8">
                    <strong className="small">{fmtPrice(c.price ?? undefined, lang)}</strong>
                    {c.starts_at && (
                      <>
                        <span className="dot-sep">·</span>
                        <span className="caption muted">старт {day(c.starts_at, lang)}</span>
                      </>
                    )}
                  </div>
                  <div className="caption muted">
                    {courseLangs(c)} · {c.modules_count}{" "}
                    {plural(c.modules_count, "модуль", "модуля", "модулей")} · {c.lessons_count}{" "}
                    {plural(c.lessons_count, "урок", "урока", "уроков")}
                  </div>
                  <div className="row between wrap g10">
                    <span className="caption muted">
                      {c.open_leads_count > 0
                        ? `${c.open_leads_count} ${plural(c.open_leads_count, "заявка", "заявки", "заявок")} в работе`
                        : "заявок в работе нет"}
                    </span>
                    <span className="caption muted-3">
                      {c.students_count ? `${c.students_count} с доступом` : "нет доступов"} · изм.{" "}
                      {changedAgo(c.updated_at, lang)}
                    </span>
                  </div>
                  <div className="row g8">
                    <Link href={`/courses/${c.id}/edit`} className="btn btn-secondary btn-sm grow">
                      <IconEdit size={15} />
                      Редактировать
                    </Link>
                    <Link
                      href={`/reports/${c.id}`}
                      className="btn btn-secondary btn-sm"
                      aria-label="Отчёт по курсу"
                    >
                      <IconChart size={15} />
                    </Link>
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

      <NewCourseSheet open={creating} onClose={() => setCreating(false)} />

      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Удалить курс?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              loading={busyId !== null && busyId === deleting?.id}
              onClick={() => deleting && remove(deleting)}
            >
              Удалить
            </Button>
            <Button variant="secondary" block onClick={() => setDeleting(null)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          «{deleting?.title}» удалится вместе со всей программой — модулями, уроками, тестами
          и заданиями. Курс, которого кто-то уже коснулся, сервер удалить не даст: доступ,
          заявка или сертификат останавливают удаление. Такой курс скрывают.
        </p>
      </Sheet>

      {/* Скрытие обратимо, но пока курс скрыт, он закрыт и для тех, кому доступ
          уже выдан, — тост об этом сказать не успевает, поэтому окно */}
      <Sheet
        open={hiding !== null}
        onClose={() => setHiding(null)}
        title="Скрыть курс?"
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              loading={busyId !== null && busyId === hiding?.id}
              onClick={() => hiding && toggleHidden(hiding)}
            >
              Скрыть курс
            </Button>
            <Button variant="secondary" block onClick={() => setHiding(null)}>
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g10">
          {hiding !== null && hiding.students_count > 0 && (
            <p className="body pretty">
              <strong>
                Доступ к курсу выдан {hiding.students_count}{" "}
                {plural(hiding.students_count, "участнику", "участникам", "участникам")} —
                курс закроется и для них.
              </strong>{" "}
              Сами доступы при этом целы, возвращать их вручную не придётся.
            </p>
          )}
          <p className="body muted pretty">
            «{hiding?.title}» пропадёт не только из каталога. Пока курс скрыт, не открываются
            страница курса, уроки и их материалы, тесты и попытки, задания, завершение курса
            и выдача сертификата — в том числе у тех, кому доступ уже выдан.
          </p>
          <p className="body muted pretty">
            Уже выданные сертификаты остаются действительными: проверка по номеру на курс
            не смотрит. Прогресс, попытки и сданные работы тоже никуда не денутся.
          </p>
          <p className="body muted pretty">
            Обратно курс сам не вернётся: «Показать» переводит его в черновики. Чтобы курс
            снова открылся, поставьте ему «Идёт набор» или «Набор закрыт» — это делается
            в редакторе курса.
          </p>
        </div>
      </Sheet>

      <style>{`@media (max-width: 560px) { .hide-sm { display: none; } }`}</style>
    </AdminShell>
  );
}

/** Пункт меню-кнопка — в разметке их три, а классы у них одни и те же. */
function MenuButton({
  icon: Icon,
  danger,
  onClick,
  children,
}: {
  icon: (p: { size?: number }) => React.JSX.Element;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="admin-nav-item"
      style={{
        color: danger ? "var(--danger)" : undefined,
        width: "100%",
        border: "none",
        background: "none",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Icon size={17} />
      {children}
    </button>
  );
}
