"use client";

/**
 * Каркас админки — десктоп-первым, но открывается с планшета и телефона.
 * На узких экранах боковое меню превращается в шторку.
 *
 * Отдельного входа в админку нет: тот же вход по SMS на domain.kz, права —
 * `is_admin` у пользователя. Каркас проверяет `GET /me` и не пускает гостей
 * и учителей без прав — права при этом проверяются и на сервере, гейт здесь
 * только чтобы не показывать пустые экраны с ошибками 403.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  api,
  qs,
  useLoad,
  useMe,
  userInitials,
  type AdminLeadsPage,
  type AdminSubmissionsPage,
} from "@lms/api";
import { web } from "@/lib/urls";
import { Avatar, Empty, Sheet } from "@lms/ui";
import {
  IconChart,
  IconChevronRight,
  IconInbox,
  IconLayers,
  IconLogout,
  IconLock,
  IconMail,
  IconMenu,
  IconMessage,
  IconSettings,
  IconStar,
  IconUsers,
  LogoMark,
} from "@lms/ui/icons";

interface NavItem {
  href: string;
  label: string;
  icon: (p: { size?: number }) => React.JSX.Element;
  exact?: boolean;
  badge?: "leads" | "queue";
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Обзор",
    items: [
      { href: "/", label: "Дашборд", icon: IconChart, exact: true },
      { href: "/reports/digital-literacy", label: "Отчёты", icon: IconChart },
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
      { href: "/questions", label: "Вопросы", icon: IconMessage },
      { href: "/reviews", label: "Отзывы", icon: IconStar },
    ],
  },
  {
    group: "Люди",
    items: [{ href: "/teachers", label: "Учителя", icon: IconUsers }],
  },
  {
    group: "Система",
    items: [{ href: "/settings", label: "Настройки", icon: IconSettings }],
  },
];

/**
 * Счётчики есть только у «Заявок» и «Проверки работ» — это две очереди,
 * которые действительно кто-то ждёт. Обе считает сервер: `total` при
 * `status=new` у заявок и при `status=pending` у работ; сами списки для
 * этого не тянем — `per_page: 1`. У вопросов и отзывов счётчиков нет:
 * колокольчика в админке тоже нет, уведомления админа живут
 * в Telegram-боте (5.15).
 */
function useBadgeValue() {
  const newLeads = useLoad(
    () => api<AdminLeadsPage>(`/admin/leads${qs({ status: "new", per_page: 1 })}`),
    [],
  );
  const queue = useLoad(
    () => api<AdminSubmissionsPage>(`/admin/submissions${qs({ status: "pending", per_page: 1 })}`),
    [],
  );
  return (key?: string) => {
    if (key === "leads") return newLeads.data?.total ?? 0;
    if (key === "queue") return queue.data?.total ?? 0;
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
                ? "Отдельного входа в админку нет. Войдите по SMS в приложении учителя — если у аккаунта есть права администратора, админка откроется."
                : "У этого аккаунта нет прав администратора. Если они должны быть — напишите владельцу платформы."
          }
          action={
            guest ? (
              <a href={web("/login")} className="btn btn-primary">
                Войти на {new URL(web("/")).host}
              </a>
            ) : (
              <a href={web("/my")} className="btn btn-secondary">
                Кабинет учителя
              </a>
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
  const { me } = useMe();

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
          aria-label="LMS — на лендинг"
        >
          <span className="logo-mark" style={{ width: 32, height: 32, borderRadius: 9 }}>
            <LogoMark size={18} />
          </span>
          <span className="stack" style={{ lineHeight: 1.2 }}>
            <strong style={{ fontSize: 15 }}>LMS · Админ</strong>
            <span className="caption muted-3">Институт повышения</span>
          </span>
        </Link>

        <NavList />

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <hr className="divider" style={{ marginBottom: 12 }} />
          <div className="row g10" style={{ padding: "4px 8px" }}>
            <Avatar initials={userInitials(me)} size={34} tone="neutral" />
            <div className="stack grow" style={{ minWidth: 0, lineHeight: 1.25 }}>
              <strong className="small">{adminName}</strong>
              <span className="caption muted-3">администратор</span>
            </div>
          </div>
          <Link href={web("/my")} className="admin-nav-item" style={{ marginTop: 6 }}>
            <IconLogout size={19} />
            <span>Кабинет учителя</span>
          </Link>
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
            <span className="logo-mark" style={{ width: 32, height: 32, borderRadius: 9 }}>
              <LogoMark size={18} />
            </span>
            <span className="stack" style={{ lineHeight: 1.2 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>LMS · Админ</span>
              <span className="caption muted-3">на лендинг</span>
            </span>
          </Link>
        }
      >
        <div className="stack g2">
          <NavList onNavigate={() => setMenu(false)} />
          <Link
            href={web("/my")}
            onClick={() => setMenu(false)}
            className="admin-nav-item"
            style={{ marginTop: 12 }}
          >
            <IconLogout size={19} />
            <span className="grow">Кабинет учителя</span>
            <IconChevronRight size={16} />
          </Link>
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
