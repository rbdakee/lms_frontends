"use client";

/**
 * Каркас админки — десктоп-первым, но открывается с планшета и телефона.
 * На узких экранах боковое меню превращается в шторку.
 *
 * Вход по коду у админки свой — `/login` на её домене, чтобы за кодом
 * не уходить в приложение учителя. Права — `is_admin` у пользователя. Каркас
 * проверяет `GET /me` и не пускает гостей и учителей без прав — права при этом
 * проверяются и на сервере, гейт здесь только чтобы не показывать пустые экраны
 * с ошибками 403.
 *
 * Профиль и выход у админки свои: раньше и то и другое было только
 * в приложении учителя и держалось на общей куке.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api, useLoad, useMe, userInitials, type AdminOverview } from "@lms/api";
import { web } from "@/lib/urls";
import { Avatar, Empty, Sheet } from "@lms/ui";
import {
  IconChart,
  IconChevronRight,
  IconExternal,
  IconInbox,
  IconLayers,
  IconLogout,
  IconLock,
  IconMail,
  IconMenu,
  IconMessage,
  IconSettings,
  IconShield,
  IconStar,
  IconUser,
  IconUsers,
} from "@lms/ui/icons";
import logo from "@lms/ui/logo.png";

interface NavItem {
  href: string;
  label: string;
  icon: (p: { size?: number }) => React.JSX.Element;
  exact?: boolean;
  badge?: "leads" | "queue" | "questions";
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Обзор",
    items: [
      { href: "/", label: "Дашборд", icon: IconChart, exact: true },
      /* Отчёт считается по версии курса, поэтому без курса в адресе экран
         открывается со списком версий — отсюда ссылка без id */
      { href: "/reports", label: "Отчёты", icon: IconChart },
    ],
  },
  {
    group: "Контент",
    items: [{ href: "/courses", label: "Курсы", icon: IconLayers }],
  },
  {
    group: "Требует внимания",
    items: [
      { href: "/leads", label: "Заявки", icon: IconMail, badge: "leads" },
      { href: "/submissions", label: "Проверка работ", icon: IconInbox, badge: "queue" },
      { href: "/questions", label: "Вопросы", icon: IconMessage, badge: "questions" },
      { href: "/reviews", label: "Отзывы", icon: IconStar },
    ],
  },
  {
    group: "Люди",
    items: [{ href: "/teachers", label: "Учителя", icon: IconUsers }],
  },
  {
    group: "Система",
    items: [
      /* `exact` у настроек: без него страница администраторов подсвечивала бы
         оба пункта разом — она лежит внутри `/settings` */
      { href: "/settings", label: "Настройки", icon: IconSettings, exact: true },
      { href: "/settings/admins", label: "Администраторы", icon: IconShield },
    ],
  },
];

/**
 * Счётчики есть у трёх очередей, которые кто-то действительно ждёт:
 * заявки, проверка работ и вопросы без ответа. Все три считает сервер
 * и отдаёт одним `GET /admin/overview` — тем же ответом, из которого
 * рисуется дашборд, иначе числа меню и плиток разъезжаются.
 *
 * Колокольчика в админке нет: уведомления админа живут в Telegram-боте (5.15).
 */
function useBadgeValue() {
  const overview = useLoad(() => api<AdminOverview>("/admin/overview"), []);
  return (key?: string) => {
    const d = overview.data;
    if (!d) return 0;
    if (key === "leads") return d.leads_count;
    if (key === "queue") return d.submissions_count;
    if (key === "questions") return d.questions_count;
    return 0;
  };
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const badgeValue = useBadgeValue();
  return (
    <>
      {NAV.map((group) => (
        <div key={group.group}>
          <div className="admin-nav-group">{group.group}</div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href.split("/").slice(0, 3).join("/"));
            const n = badgeValue(item.badge);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="admin-nav-item"
                data-active={active || undefined}
              >
                <Icon size={19} />
                <span className="grow">{item.label}</span>
                {n > 0 && <span className="admin-nav-badge">{n}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** Гость или учитель без прав — вежливый отказ вместо пустых экранов с 403. */
function AdminGate() {
  const { status, blocked_message } = useMe();
  const pathname = usePathname();
  /* Закрытый экран запоминается в адресе входа: после входа человек вернётся
     туда, куда шёл, а не на дашборд. */
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  if (status === "loading") {
    return (
      <div className="row center" style={{ minHeight: "100dvh" }}>
        <span className="spinner" style={{ width: 28, height: 28, color: "var(--primary)" }} />
      </div>
    );
  }

  const guest = status === "guest" || status === "error";
  return (
    <div className="row center" style={{ minHeight: "100dvh", padding: 16 }}>
      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        <Empty
          icon={<IconLock size={36} />}
          title={guest ? "Вход не выполнен" : "Нет доступа"}
          text={
            status === "blocked"
              ? blocked_message ?? "Доступ заблокирован."
              : guest
                ? "Войдите по коду — он придёт в WhatsApp на номер администратора."
                : "У этого аккаунта нет прав администратора. Если они должны быть — напишите владельцу платформы."
          }
          action={
            guest ? (
              <Link href={loginHref} className="btn btn-primary">
                Войти
              </Link>
            ) : (
              <div className="row center g10">
                <Link href={loginHref} className="btn btn-primary">
                  Войти другим номером
                </Link>
                <a href={web("/my")} className="btn btn-secondary">
                  Кабинет учителя
                </a>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const { me, logout } = useMe();
  const router = useRouter();

  /* Подтверждения нет намеренно: оно стоит на экране профиля, а здесь выход —
     то же, что пункт меню пользователя у учителя */
  const signOut = async () => {
    setMenu(false);
    await logout();
    router.push("/login");
  };

  if (!me?.is_admin) return <AdminGate />;

  const adminName =
    [me.last_name, me.first_name && `${me.first_name[0]}.`].filter(Boolean).join(" ") ||
    "Администратор";

  return (
    <div className="admin-shell">
      {/* Боковое меню — десктоп */}
      <aside className="admin-side">
        {/* Логотип — на лендинг: это уже другое приложение и другой домен */}
        <Link
          href={web("/")}
          className="row g10 admin-logo"
          style={{ padding: "6px 10px 10px" }}
          aria-label="Академия педагогов и психологов — на лендинг"
        >
          <img src={logo.src} alt="" className="logo-emblem" width={38} height={38} />
          <span className="stack" style={{ lineHeight: 1.2 }}>
            <strong style={{ fontSize: 13.5 }}>
              Академия педагогов
              <br />
              и психологов
            </strong>
            <span className="caption muted-3">Админка</span>
          </span>
        </Link>

        <NavList />

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <hr className="divider" style={{ marginBottom: 12 }} />
          {/* Сам блок с именем и ведёт в профиль — отдельного пункта не нужно */}
          <Link
            href="/profile"
            className="admin-nav-item"
            style={{ minHeight: 52, padding: "6px 8px" }}
          >
            <Avatar initials={userInitials(me)} size={34} tone="neutral" />
            <span className="stack grow" style={{ minWidth: 0, lineHeight: 1.25 }}>
              <strong className="small" style={{ color: "var(--text)" }}>
                {adminName}
              </strong>
              <span className="caption muted-3">администратор</span>
            </span>
            <IconChevronRight size={16} />
          </Link>
          {/* Кабинет учителя — другой домен, поэтому полный адрес, а не маршрут */}
          <a href={web("/my")} className="admin-nav-item">
            <IconExternal size={19} />
            <span>Кабинет учителя</span>
          </a>
          <button
            className="admin-nav-item"
            style={{
              color: "var(--danger)",
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
            onClick={signOut}
          >
            <IconLogout size={19} />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        {/* Шапка */}
        <header className="appbar">
          <div
            className="appbar-inner g12"
            style={{ padding: "0 16px", maxWidth: 1440, width: "100%" }}
          >
            <button
              className="btn btn-icon admin-burger"
              onClick={() => setMenu(true)}
              aria-label="Меню"
            >
              <IconMenu />
            </button>
            <div className="grow stack" style={{ minWidth: 0, lineHeight: 1.25 }}>
              <strong style={{ fontSize: 17, letterSpacing: "-0.01em" }} className="clamp-2">
                {title}
              </strong>
              {subtitle && <span className="caption muted-3">{subtitle}</span>}
            </div>
            {actions}
          </div>
        </header>

        <div className="admin-page">{children}</div>
      </div>

      <Sheet
        open={menu}
        onClose={() => setMenu(false)}
        title={
          <Link href={web("/")} className="row g10" onClick={() => setMenu(false)}>
            <img src={logo.src} alt="" className="logo-emblem" width={38} height={38} />
            <span className="stack" style={{ lineHeight: 1.2 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>
                Академия педагогов
                <br />
                и психологов
              </span>
              <span className="caption muted-3">Админка · на лендинг</span>
            </span>
          </Link>
        }
      >
        <div className="stack g2">
          <NavList onNavigate={() => setMenu(false)} />
          <Link
            href="/profile"
            onClick={() => setMenu(false)}
            className="admin-nav-item"
            style={{ marginTop: 12 }}
          >
            <IconUser size={19} />
            <span className="grow">Профиль</span>
            <IconChevronRight size={16} />
          </Link>
          {/* Кабинет учителя — другой домен, поэтому полный адрес, а не маршрут */}
          <a href={web("/my")} onClick={() => setMenu(false)} className="admin-nav-item">
            <IconExternal size={19} />
            <span className="grow">Кабинет учителя</span>
          </a>
          <button
            className="admin-nav-item"
            style={{
              color: "var(--danger)",
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
            onClick={signOut}
          >
            <IconLogout size={19} />
            <span className="grow" style={{ textAlign: "left" }}>
              Выйти
            </span>
          </button>
        </div>
      </Sheet>

      <style>{`
        .admin-burger { display: flex; }
        @media (min-width: 1024px) { .admin-burger { display: none; } }
      `}</style>
    </div>
  );
}

/* Плитки-показатели с дельтами «+312 за месяц» убраны вместе с прежним
   дашбордом — раздел 9а брифа: ради них пришлось бы хранить историю
   и агрегаты. Показатели по курсу остались в отчёте (5.23). */
