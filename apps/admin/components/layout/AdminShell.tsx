"use client";

/**
 * Каркас админки — десктоп-первым, но открывается с планшета и телефона.
 * На узких экранах боковое меню превращается в шторку.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { adminSubmissions } from "@lms/prototype/data";
import { useNewLeadsCount } from "@/components/admin/leads";
import { web } from "@/lib/urls";
import { Avatar, Sheet } from "@lms/ui";
import {
  IconChart,
  IconChevronRight,
  IconInbox,
  IconLayers,
  IconLogout,
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
 * которые действительно кто-то ждёт. У вопросов и отзывов их нет: колокольчика
 * в админке тоже нет, уведомления админа живут в Telegram-боте (5.15).
 */
function useBadgeValue() {
  const newLeads = useNewLeadsCount();
  return (key?: string) => {
    if (key === "leads") return newLeads;
    if (key === "queue") return adminSubmissions.length;
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
            <Avatar initials="АБ" size={34} tone="neutral" />
            <div className="stack grow" style={{ minWidth: 0, lineHeight: 1.25 }}>
              <strong className="small">Аскарова Б.</strong>
              <span className="caption muted-3">методист</span>
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
