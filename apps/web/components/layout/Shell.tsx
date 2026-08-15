"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type SVGProps } from "react";
import { useStore } from "@lms/prototype";
import { adminContacts, notifications, type NotifType } from "@lms/prototype/data";
import { Avatar, Badge } from "@lms/ui";
import {
  IconBell,
  IconCalendar,
  IconCatalog,
  IconCertificate,
  IconCheckCircle,
  IconChevronDown,
  IconChevronRight,
  IconClose,
  IconGraduation,
  IconHome,
  IconInfo,
  IconKey,
  IconLogout,
  IconMail,
  IconMenu,
  IconSettings,
  IconShield,
  IconSparkle,
  IconUser,
  LogoMark,
} from "@lms/ui/icons";

/* ============ Логотип ============ */

/** Логотип всегда ведёт на лендинг — из любого раздела, включая админку. */
export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <Link href="/" className="logo" aria-label="LMS — на лендинг">
      <span className="logo-mark">
        <LogoMark size={20} />
      </span>
      {subtitle ? (
        <span className="stack" style={{ lineHeight: 1.2 }}>
          <span className="logo-text" style={{ fontSize: 15 }}>
            LMS
          </span>
          <span className="caption muted-3">{subtitle}</span>
        </span>
      ) : (
        <span className="logo-text">LMS</span>
      )}
    </Link>
  );
}

/* ============ Переключатель языка ============ */

export function LangSwitch() {
  const { lang, setLang } = useStore();
  return (
    <div className="lang-switch" role="group" aria-label="Язык интерфейса">
      <button data-active={lang === "ru"} onClick={() => setLang("ru")}>
        РУС
      </button>
      <button data-active={lang === "kz"} onClick={() => setLang("kz")}>
        ҚАЗ
      </button>
    </div>
  );
}

/* ============ Колокольчик с выпадающей панелью ============ */

function NotificationsBell() {
  const { readNotifications, markAllRead, t } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !readNotifications.includes(n.id));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const icons: Record<NotifType, ReactNode> = {
    access: <IconKey size={18} />,
    task: <IconCheckCircle size={18} />,
    answer: <IconMail size={18} />,
    certificate: <IconSparkle size={18} />,
    course: <IconCatalog size={18} />,
    starting: <IconCalendar size={18} />,
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn btn-icon bell"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${t.navNotifications}${unread.length ? `, непрочитанных: ${unread.length}` : ""}`}
      >
        <IconBell />
        {unread.length > 0 && <span className="bell-dot">{unread.length}</span>}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "min(380px, calc(100vw - 32px))",
            boxShadow: "var(--shadow-lg)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <div className="row between g12" style={{ padding: "12px 14px" }}>
            <strong style={{ fontSize: 15 }}>{t.navNotifications}</strong>
            {unread.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                Прочитать все
              </button>
            )}
          </div>
          <hr className="divider" />
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {notifications.slice(0, 4).map((n) => {
              const isUnread = !readNotifications.includes(n.id);
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="row g10"
                  style={{
                    padding: "12px 14px",
                    alignItems: "flex-start",
                    borderBottom: "1px solid #f1f5f9",
                    background: isUnread ? "var(--primary-bg)" : undefined,
                  }}
                >
                  <span style={{ color: "var(--primary)", marginTop: 1 }}>{icons[n.type]}</span>
                  <span className="grow">
                    <span className="small" style={{ display: "block", lineHeight: "20px" }}>
                      {n.text}
                    </span>
                    <span className="caption muted-3">{n.time}</span>
                  </span>
                  {isUnread && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "var(--primary)",
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="row center small"
            style={{ padding: "12px", color: "var(--primary)", fontWeight: 700 }}
          >
            Все уведомления
          </Link>
        </div>
      )}
    </div>
  );
}

/* ============ Общая навигация шапки ============ */

type NavItem = {
  href: string;
  label: string;
  icon: (p: SVGProps<SVGSVGElement> & { size?: number }) => ReactNode;
  /** Префиксы маршрутов, при которых пункт считается активным */
  match?: string[];
};

/**
 * Одна и та же навигация для публичной части и кабинета: пилюли с иконками,
 * отбитые от логотипа. Меняется только состав пунктов — каркас шапки
 * остаётся тем же, поэтому переход «витрина ↔ кабинет» не выглядит скачком.
 */
function NavLinks({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav className="desktop-only navbar" aria-label={label}>
      {items.map((l) => {
        const Icon = l.icon;
        const active = (l.match ?? [l.href]).some(
          (m) => pathname === m || (m !== "/" && pathname.startsWith(m + "/")),
        );
        return (
          <Link key={l.href} href={l.href} className="navlink" data-active={active}>
            <Icon size={18} strokeWidth={active ? 2.1 : 1.75} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ============ Публичная шапка (лендинг, каталог, проверка) ============ */

export function PublicHeader() {
  const { t, authed } = useStore();
  const [menu, setMenu] = useState(false);

  const links: NavItem[] = [
    { href: "/courses", label: t.navCatalog, icon: IconCatalog },
    { href: "/verify", label: t.navVerify, icon: IconShield },
    { href: "/#faq", label: t.navFaq, icon: IconInfo },
  ];

  return (
    <header className="appbar">
      <div className="page appbar-inner">
        <Logo />
        <NavLinks items={links} label="Разделы сайта" />
        <div className="grow" />
        <div className="row g8">
          {/* Вход в кабинет: главное действие для вошедшего. На мобильном
              остаётся здесь же — таб-панели в публичной части нет. */}
          {authed && (
            <Link
              href="/my"
              className="btn btn-primary btn-sm cabinet-btn"
              style={{ minHeight: 40 }}
            >
              <IconUser size={17} />
              <span className="cabinet-btn-label">{t.navHome}</span>
            </Link>
          )}

          {/* Правая зона у вошедшего одинакова с кабинетом: колокольчик и
              аватар не пропадают при переходе — шапка не «прыгает». */}
          {authed ? (
            <div className="desktop-only row g6">
              <NotificationsBell />
              <UserMenu />
            </div>
          ) : (
            <>
              <div className="desktop-only">
                <LangSwitch />
              </div>
              <div className="desktop-only g8">
                <Link href="/login" className="btn btn-secondary btn-sm" style={{ minHeight: 40 }}>
                  {t.login}
                </Link>
                <Link href="/login" className="btn btn-primary btn-sm" style={{ minHeight: 40 }}>
                  {t.start}
                </Link>
              </div>
            </>
          )}

          <button
            className="btn btn-icon mobile-only"
            onClick={() => setMenu(true)}
            aria-label="Меню"
          >
            <IconMenu />
          </button>
        </div>
      </div>

      {menu && (
        <div className="overlay" onClick={() => setMenu(false)} style={{ alignItems: "flex-start" }}>
          <div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: "0 0 20px 20px", animation: "none" }}
          >
            <div className="sheet-head">
              <Logo />
              <button className="btn btn-icon" onClick={() => setMenu(false)} aria-label="Закрыть">
                <IconClose />
              </button>
            </div>
            <div className="sheet-body stack g4">
              {links.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenu(false)}
                    className="row g12"
                    style={{ minHeight: 52, fontSize: 16, fontWeight: 600 }}
                  >
                    <Icon size={20} className="muted" />
                    {l.label}
                  </Link>
                );
              })}
              <hr className="divider" style={{ margin: "8px 0" }} />
              <Link
                href={authed ? "/my" : "/login"}
                onClick={() => setMenu(false)}
                className="btn btn-primary btn-block btn-lg"
              >
                {authed && <IconUser size={18} />}
                {authed ? t.navHome : t.start}
              </Link>
              {!authed && (
                <Link
                  href="/login"
                  onClick={() => setMenu(false)}
                  className="btn btn-secondary btn-block"
                >
                  {t.login}
                </Link>
              )}
              <hr className="divider" style={{ margin: "8px 0" }} />
              <div className="row between g10">
                <span className="caption muted">{t.language}</span>
                <LangSwitch />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ============ Шапка кабинета учителя ============ */

export function TeacherHeader({ title }: { title?: string }) {
  const { t } = useStore();

  /** «Моё обучение» подсвечивается и внутри уроков, «Каталог» — на странице курса. */
  const links: NavItem[] = [
    { href: "/my", label: t.navHome, icon: IconHome, match: ["/my", "/learn"] },
    { href: "/courses", label: t.navCatalog, icon: IconCatalog },
    { href: "/certificates", label: t.navCerts, icon: IconCertificate },
  ];

  return (
    <header className="appbar">
      <div className="page appbar-inner">
        {/* Логотип — всегда на лендинг */}
        <div className="desktop-only" style={{ alignItems: "center" }}>
          <Logo />
        </div>

        <NavLinks items={links} label="Разделы кабинета" />

        {/* Мобильная шапка: логотип или заголовок экрана */}
        <div className="mobile-only row g10 grow" style={{ minWidth: 0 }}>
          {title ? (
            <strong style={{ fontSize: 17, letterSpacing: "-0.01em" }} className="clamp-2">
              {title}
            </strong>
          ) : (
            <Logo />
          )}
        </div>

        <div className="grow desktop-only" />
        <div className="row g6">
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/* ============ Меню пользователя ============ */

function UserMenu() {
  const { t, initials, fullName, profile, lang, setLang, set } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { href: "/profile", label: t.navProfile, icon: IconUser },
    { href: "/certificates", label: t.navCerts, icon: IconCertificate },
    { href: "/notifications", label: t.navNotifications, icon: IconBell },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="user-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Меню пользователя"
      >
        <Avatar initials={initials} size={32} />
        <span className="user-btn-name desktop-only">{profile.firstName || "Профиль"}</span>
        <IconChevronDown size={16} className="user-btn-chevron desktop-only" data-open={open} />
      </button>

      {open && (
        <div className="card usermenu" role="menu">
          <div className="row g10" style={{ padding: "14px 14px 12px" }}>
            <Avatar initials={initials} size={40} />
            <div className="stack grow" style={{ minWidth: 0, lineHeight: 1.3 }}>
              <strong className="small clamp-2">{fullName || "Заполните профиль"}</strong>
              <span className="caption muted-3">{profile.phone}</span>
            </div>
          </div>
          <hr className="divider" />

          <div style={{ padding: 6 }}>
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="usermenu-item"
                >
                  <Icon size={18} />
                  <span className="grow">{it.label}</span>
                  <IconChevronRight size={15} className="muted-3" />
                </Link>
              );
            })}
          </div>

          <hr className="divider" />
          <div className="row between g10" style={{ padding: "10px 14px" }}>
            <span className="caption muted">{t.language}</span>
            <div className="lang-switch">
              <button data-active={lang === "ru"} onClick={() => setLang("ru")}>
                РУС
              </button>
              <button data-active={lang === "kz"} onClick={() => setLang("kz")}>
                ҚАЗ
              </button>
            </div>
          </div>

          <hr className="divider" />
          <div style={{ padding: 6 }}>
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="usermenu-item"
            >
              <IconSettings size={18} />
              <span className="grow">Админка</span>
              <IconChevronRight size={15} className="muted-3" />
            </Link>
            <button
              role="menuitem"
              className="usermenu-item"
              style={{ color: "var(--danger)", width: "100%", border: "none", background: "none", cursor: "pointer" }}
              onClick={() => {
                setOpen(false);
                set({ authed: false });
                router.push("/");
              }}
            >
              <IconLogout size={18} />
              <span className="grow" style={{ textAlign: "left" }}>
                {t.logout}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Нижняя таб-панель ============ */

export function TabBar() {
  const { t } = useStore();
  const pathname = usePathname();
  const tabs = [
    { href: "/my", label: t.navHome, icon: IconHome },
    { href: "/courses", label: t.navCatalog, icon: IconCatalog },
    { href: "/certificates", label: t.navCerts, icon: IconCertificate },
    { href: "/profile", label: t.navProfile, icon: IconUser },
  ];
  return (
    <nav className="tabbar" aria-label="Основная навигация">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} data-active={active}>
            <Icon size={22} strokeWidth={active ? 2.1 : 1.75} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ============ Каркас страницы учителя ============ */

export function TeacherShell({
  children,
  title,
  hasStickyCta,
  hideTabBar,
}: {
  children: ReactNode;
  title?: string;
  hasStickyCta?: boolean;
  hideTabBar?: boolean;
}) {
  return (
    <>
      <TeacherHeader title={title} />
      <main className={hasStickyCta ? "has-sticky-cta" : "has-tabbar"}>{children}</main>
      {!hideTabBar && <TabBar />}
    </>
  );
}

/* ============ Каркас публичной страницы ============ */

/**
 * Публичная часть таб-панель не показывает никогда — это навигация кабинета.
 * Вход в приватную часть — только через кнопку «Моё обучение» в шапке.
 */
export function PublicShell({
  children,
  hasStickyCta,
}: {
  children: ReactNode;
  hasStickyCta?: boolean;
}) {
  return (
    <>
      <PublicHeader />
      <main
        className={hasStickyCta ? "has-sticky-cta no-tabbar" : undefined}
        style={hasStickyCta ? undefined : { paddingBottom: 0 }}
      >
        {children}
      </main>
    </>
  );
}

/* ============ Подвал ============ */

export function Footer() {
  const { t } = useStore();
  return (
    <footer style={{ background: "#fff", borderTop: "1px solid var(--border)", marginTop: 24 }}>
      <div className="page section stack g32">
        <div className="footer-grid">
          <div className="stack g12 footer-brand" style={{ maxWidth: 320 }}>
            <Logo />
            <p className="small muted pretty">
              Курсы повышения квалификации для учителей — на русском и казахском языках.
              Сертификат с номером и проверкой по QR-коду.
            </p>
          </div>
          <div className="stack g10">
            <strong className="small">Обучение</strong>
            <Link href="/courses" className="small muted">
              Каталог курсов
            </Link>
            <Link href="/#how" className="small muted">
              Как это работает
            </Link>
            <Link href="/verify" className="small muted">
              {t.navVerify}
            </Link>
          </div>
          <div className="stack g10">
            <strong className="small">Помощь</strong>
            <Link href="/#faq" className="small muted">
              Частые вопросы
            </Link>
            <a href="mailto:help@lms.kz" className="small muted">
              Написать нам
            </a>
            <span className="small muted">Правила платформы</span>
          </div>
          {/* Контакты администратора из настроек платформы — те же, что в кнопке
              «Связаться с администратором» на странице курса */}
          <div className="stack g10">
            <strong className="small">Контакты администратора</strong>
            <a href={`tel:${adminContacts.phoneRaw}`} className="small muted">
              {adminContacts.phone}
            </a>
            <a href={adminContacts.whatsapp} className="small muted" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={adminContacts.telegram} className="small muted" target="_blank" rel="noreferrer">
              Telegram {adminContacts.telegramName}
            </a>
            <div style={{ marginTop: 4 }}>
              <LangSwitch />
            </div>
          </div>
        </div>
        <hr className="divider" />
        <div className="row between wrap g12">
          <span className="small muted-3">© 2026 LMS · Повышение квалификации учителей</span>
          <span className="row g10">
            <span className="small muted-3">Прототип · данные демонстрационные</span>
            <Link href="/map" className="small" style={{ color: "var(--primary)" }}>
              Карта экранов
            </Link>
          </span>
        </div>
      </div>
      <style>{`
        /* Колонки ссылок стоят рядом уже на телефоне — иначе подвал уезжает
           в одну длинную ленту, а по горизонтали остаётся пустота. */
        .footer-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 28px 20px;
        }
        .footer-brand { grid-column: 1 / -1; }
        @media (min-width: 560px) {
          .footer-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px 24px; }
        }
        @media (min-width: 900px) {
          .footer-grid {
            grid-template-columns: 1.4fr repeat(3, minmax(0, 1fr));
            gap: 32px;
          }
          .footer-brand { grid-column: auto; }
        }
      `}</style>
    </footer>
  );
}

/* ============ Хедер с кнопкой «назад» (плеер, тест, задание) ============ */

export function BackHeader({
  href,
  title,
  subtitle,
  right,
}: {
  href: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="appbar">
      <div className="page appbar-inner g10">
        <Link href={href} className="btn btn-icon" aria-label="Назад">
          <IconArrowLeftLocal />
        </Link>
        <div className="grow" style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              lineHeight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {subtitle && <div className="caption muted-3">{subtitle}</div>}
        </div>
        {right}
      </div>
    </header>
  );
}

function IconArrowLeftLocal() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 12H4" />
      <path d="m10 6-6 6 6 6" />
    </svg>
  );
}

/* ============ Индикатор «сертификат» в шапке лендинга ============ */

export function TrustRow() {
  return (
    <div className="row g8 small muted">
      <IconGraduation size={18} />
      <span>Сертификат с номером и QR-кодом</span>
      <Badge kind="accepted">Проверяется онлайн</Badge>
    </div>
  );
}
