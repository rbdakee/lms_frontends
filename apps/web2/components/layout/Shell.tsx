"use client";

/**
 * Кадр второй площадки: шапка, навигация, колокольчик, подвал.
 *
 * Экраны у площадок общие, а кадр — нет: две площадки затевались ради разных
 * брендов, и повторённая раскладка обесценила бы второе приложение. Отличия
 * не косметические, у каждого своя причина:
 *
 * - **Шапка в один ряд, разделы — за бургером справа.** Решение владельца
 *   04.09.2026: полка с разделами под логотипом убрана совсем. Причина, по
 *   которой она когда-то появилась, никуда не делась — имя площадки длинное
 *   и в один ряд с навигацией не встаёт, — но закрыта теперь иначе:
 *   навигации в шапке нет вовсе, и месту для имени никто не мешает.
 *   Расхождение с брифом намеренное: раздел 5.1 держит «Курсы» и «Проверить
 *   сертификат» прямо в шапке.
 * - **Одна шапка на витрину и кабинет.** Набор разделов зависит от того,
 *   вошёл человек или нет, а не от того, какой экран его показывает: вошедший
 *   видит свой кабинет отовсюду, включая лендинг. Разное у каркасов — только
 *   таб-панель, подвал и отступ под липкую кнопку.
 * - **Меню одно на всё.** Разделы, аккаунт и язык лежат в одной шторке:
 *   два меню рядом — под бургером и под аватаром — заставляли гадать,
 *   в каком из них искать «Сертификаты». Таб-панель на телефоне осталась:
 *   она не меню, а короткий путь к четырём главным экранам кабинета.
 * - **Подвал в два блока.** Наверху контакты администратора: доступ к курсу
 *   на этой платформе открывают руками, и связь с админом важнее столбца
 *   ссылок. Внизу одна строка ссылок и копирайт.
 *
 * Дизайн-система одна на обе площадки: здесь только её классы и токены,
 * а локальным `<style>` написана та раскладка, которой в ней нет.
 * Название площадки не написано в разметке ни разу — оно приходит из
 * `@/lib/brand`, и меняется одной правкой в одном файле.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type SVGProps } from "react";
import {
  api,
  fullName,
  qs,
  useLoad,
  useMe,
  usePublicSettings,
  userInitials,
  waHref,
  type Notification,
  type NotificationsPage,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { dayTime, phoneFmt } from "@lms/ui/i18n";
import { BRAND } from "@/lib/brand";
import { admin } from "@/lib/urls";
import {
  markRead,
  notificationHref,
  NOTIF_ICONS,
  onNotificationsChanged,
} from "@lms/site";
import { useRoutes } from "@lms/site/host";
import { Avatar, Sheet, Skeleton } from "@lms/ui";
import {
  IconBell,
  IconCatalog,
  IconCertificate,
  IconHome,
  IconInfo,
  IconLogout,
  IconMenu,
  IconPhone,
  IconSettings,
  IconShield,
  IconUser,
  IconWhatsapp,
} from "@lms/ui/icons";

/* ============ Логотип ============ */

/**
 * Логотип всегда ведёт на лендинг — из любого раздела.
 *
 * Имя набрано в две строки: настоящее название площадки будет длинным,
 * а на телефоне рядом с ним стоят колокольчик, аватар и бургер. Сами строки
 * приходят из бренда площадки, в разметке их нет.
 */
export function Logo() {
  const { t, lang } = useLang();
  const brand = BRAND[lang];
  return (
    <Link href="/" className="logo" aria-label={t.shLogoAria(brand.name)}>
      <img src={BRAND.logoSrc} alt="" className="logo-emblem" width={44} height={44} />
      <span className="logo-text stack">
        <span>{brand.line1}</span>
        <span>{brand.line2}</span>
      </span>
    </Link>
  );
}

/* ============ Переключатель языка ============ */

export function LangSwitch() {
  const { t, lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label={t.language}>
      <button data-active={lang === "ru"} onClick={() => setLang("ru")}>
        РУС
      </button>
      <button data-active={lang === "kz"} onClick={() => setLang("kz")}>
        ҚАЗ
      </button>
    </div>
  );
}

/* ============ Разделы ============ */

type NavItem = {
  href: string;
  label: string;
  icon: (p: SVGProps<SVGSVGElement> & { size?: number }) => ReactNode;
  /** Префиксы маршрутов, при которых пункт считается активным */
  match?: string[];
};

/**
 * Разделы зависят от входа, а не от экрана: вошедший человек носит с собой
 * кабинет и видит его навигацию даже на лендинге. Гостю показывать «Моё
 * обучение» нечего, поэтому у него свой набор.
 */
function useNavItems(authed: boolean): NavItem[] {
  const { t } = useLang();
  return authed
    ? [
        { href: "/my", label: t.navHome, icon: IconHome, match: ["/my", "/learn"] },
        { href: "/courses", label: t.navCatalog, icon: IconCatalog },
        { href: "/certificates", label: t.navCerts, icon: IconCertificate },
      ]
    : [
        { href: "/courses", label: t.navCatalog, icon: IconCatalog },
        { href: "/verify", label: t.navVerify, icon: IconShield },
        { href: "/#faq", label: t.navFaq, icon: IconInfo },
      ];
}

function isActive(pathname: string, item: NavItem): boolean {
  return (item.match ?? [item.href]).some(
    (m) => pathname === m || (m !== "/" && pathname.startsWith(m + "/")),
  );
}

/* ============ Колокольчик с выпадающей панелью ============ */

/**
 * `GET /notifications?per_page=4` отдаёт и четыре свежих уведомления, и
 * `unread_count` — одним запросом на всю шапку. Счётчик нужен на каждом экране,
 * поэтому запрос идёт при входе, а не при открытии панели.
 *
 * Клик по уведомлению отмечает его прочитанным и здесь, и на `/notifications` —
 * это одно и то же действие, и вести себя оно должно одинаково.
 */
function NotificationsBell() {
  const { t, lang } = useLang();
  const { me } = useMe();
  /* Адреса уведомлений собирает общий пакет, а маршруты у площадки свои */
  const routes = useRoutes();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const feed = useLoad<NotificationsPage | null>(
    () =>
      me
        ? api<NotificationsPage>(`/notifications${qs({ page: 1, per_page: 4 })}`)
        : Promise.resolve(null),
    [me?.id],
  );

  /* Отметили прочитанным на экране уведомлений — гасим бейдж, не дожидаясь
     перехода по страницам */
  useEffect(() => onNotificationsChanged(feed.reload), [feed.reload]);

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

  const items = feed.data?.items ?? [];
  const unread = feed.data?.unread_count ?? 0;

  /* Точку гасим сразу: ответ на отметку — 204 без тела, ждать его незачем */
  const openItem = (item: Notification) => {
    setOpen(false);
    if (item.read_at) return;
    feed.setData((d) =>
      d
        ? {
            ...d,
            unread_count: Math.max(0, d.unread_count - 1),
            items: d.items.map((n) =>
              n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n,
            ),
          }
        : d,
    );
    void markRead({ ids: [item.id] });
  };

  const readAll = () => {
    feed.setData((d) =>
      d
        ? {
            ...d,
            unread_count: 0,
            items: d.items.map((n) =>
              n.read_at ? n : { ...n, read_at: new Date().toISOString() },
            ),
          }
        : d,
    );
    void markRead({ all: true });
  };

  return (
    <div ref={ref} className="bell-wrap">
      <button
        className="btn btn-icon bell"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t.shBellAria(unread)}
      >
        <IconBell />
        {unread > 0 && <span className="bell-dot">{unread}</span>}
      </button>

      {open && (
        <div className="card bell-menu">
          <div className="row between g12" style={{ padding: "12px 16px" }}>
            <strong className="small">{t.navNotifications}</strong>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={readAll}>
                {t.notifMarkAllShort}
              </button>
            )}
          </div>
          <hr className="divider" />
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {feed.loading ? (
              <div className="stack g8" style={{ padding: 16 }}>
                <Skeleton w="90%" h={14} />
                <Skeleton w="60%" h={12} />
              </div>
            ) : feed.error ? (
              <div className="row between g10" style={{ padding: 16 }}>
                <span className="small muted">{t.loadError}</span>
                <button className="btn btn-ghost btn-sm" onClick={feed.reload}>
                  {t.retry}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="small muted" style={{ padding: "18px 16px" }}>
                {t.emptyNotifTitle}
              </div>
            ) : (
              items.map((n) => {
                const Icon = NOTIF_ICONS[n.type];
                const unreadRow = !n.read_at;
                return (
                  <Link
                    key={n.id}
                    href={notificationHref(routes, n)}
                    onClick={() => openItem(n)}
                    className="row g12"
                    style={{
                      padding: "12px 16px",
                      alignItems: "flex-start",
                      borderTop: "1px solid var(--line-soft)",
                      /* Непрочитанное подсвечено тем же оттенком, что и на экране
                         `/notifications`: экран общий, и две подсветки одного
                         состояния читались бы как два разных состояния */
                      background: unreadRow ? "var(--surface-tint)" : undefined,
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        background: "var(--primary-bg)",
                        color: "var(--primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="grow stack g2">
                      <span
                        className="small pretty"
                        style={{ fontWeight: unreadRow ? 600 : 400, lineHeight: "20px" }}
                      >
                        {n.text}
                      </span>
                      <span className="caption muted">{dayTime(n.created_at, lang)}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
          <hr className="divider" />
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="row center small"
            style={{ padding: 14, color: "var(--primary)", fontWeight: 700 }}
          >
            {t.notifAll}
          </Link>
        </div>
      )}
    </div>
  );
}

/* ============ Меню разделов ============ */

/**
 * Единственное меню площадки: разделы, аккаунт и язык — всё за кнопкой
 * с тремя полосками справа в шапке, на любой ширине экрана.
 *
 * Шторка взята штатная (`Sheet` из дизайн-системы): она сама закрывается
 * по Escape, держит фон от прокрутки, на телефоне выезжает снизу, а на
 * широком экране открывается окном по центру.
 *
 * Порядок пунктов — от частого к редкому: сначала разделы, за ними аккаунт,
 * язык и выход. Выход стоит последним и отбит линией: промахнуться по нему,
 * целясь в «Профиль», человек не должен.
 */
function NavMenu({
  open,
  onClose,
  items,
  authed,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  authed: boolean;
}) {
  const { t } = useLang();
  const { me, logout } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  /* Пункты аккаунта — те же, что стояли в меню под аватаром, пока оно было */
  const account = me
    ? [
        { href: "/profile", label: t.navProfile, icon: IconUser },
        { href: "/notifications", label: t.navNotifications, icon: IconBell },
      ]
    : [];

  return (
    <Sheet open={open} onClose={onClose} title={<Logo />}>
      <div className="stack g4">
        {me && (
          <>
            <div className="row g12" style={{ padding: "2px 0 10px" }}>
              <Avatar initials={userInitials(me)} size={44} />
              <div className="stack grow g2" style={{ minWidth: 0 }}>
                <strong className="small clamp-2">{fullName(me) || t.navProfile}</strong>
                <span className="caption muted">{phoneFmt(me.phone)}</span>
              </div>
            </div>
            <hr className="divider" style={{ margin: "0 0 8px" }} />
          </>
        )}

        {items.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onClose}
              className="p2-menu-item"
              data-active={isActive(pathname, l)}
            >
              <Icon size={20} className="p2-menu-ico" />
              {l.label}
            </Link>
          );
        })}

        {account.length > 0 && (
          <>
            <hr className="divider" style={{ margin: "8px 0" }} />
            {account.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onClose}
                  className="p2-menu-item"
                  data-active={pathname === it.href}
                >
                  <Icon size={20} className="p2-menu-ico" />
                  {it.label}
                </Link>
              );
            })}
            {/* Отдельного входа в админку нет — пункт виден только админам */}
            {me?.is_admin && (
              <a href={admin()} className="p2-menu-item">
                <IconSettings size={20} className="p2-menu-ico" />
                {t.shAdmin}
              </a>
            )}
          </>
        )}

        {/* Вошедшему кнопки входа не нужны: его разделы уже в списке выше */}
        {!authed && (
          <>
            <hr className="divider" style={{ margin: "8px 0" }} />
            <Link href="/login" onClick={onClose} className="btn btn-primary btn-block btn-lg">
              {t.start}
            </Link>
            <Link href="/login" onClick={onClose} className="btn btn-secondary btn-block">
              {t.login}
            </Link>
          </>
        )}

        <hr className="divider" style={{ margin: "8px 0" }} />
        <div className="row between g10">
          <span className="caption muted">{t.language}</span>
          <LangSwitch />
        </div>

        {me && (
          <>
            <hr className="divider" style={{ margin: "8px 0" }} />
            <button
              className="p2-menu-item"
              style={{ color: "var(--danger)", width: "100%", border: "none", background: "none", cursor: "pointer" }}
              onClick={async () => {
                onClose();
                await logout();
                router.push("/");
              }}
            >
              <IconLogout size={20} />
              {t.logout}
            </button>
          </>
        )}
      </div>

      <style>{`
        /* Строка меню. Раскладки для неё в дизайн-системе нет: там пункт меню
           (.usermenu-item) рассчитан на выпадающую панель под аватаром,
           а здесь строки крупные — по ним попадают пальцем. */
        .p2-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 52px;
          padding: 0 12px;
          margin: 0 -12px;
          border-radius: var(--r-btn);
          font-size: 16px;
          font-weight: 600;
          text-align: left;
        }
        .p2-menu-item:hover { background: var(--surface-muted); }
        .p2-menu-ico { color: var(--text-3); }
        /* Текущий раздел залит цветом бренда бледно, а не плотно: меню читают
           списком, и одна плотная плашка в нём перетягивает взгляд на себя. */
        .p2-menu-item[data-active="true"] { background: var(--primary-bg); color: var(--primary); }
        .p2-menu-item[data-active="true"] .p2-menu-ico { color: var(--primary); }
      `}</style>
    </Sheet>
  );
}

/* ============ Шапка ============ */

/**
 * Одна шапка на витрину и кабинет, один ряд, разделы — за бургером.
 *
 * `title` заменяет логотип на телефоне: в кабинете это единственная строка,
 * где помещается название экрана.
 *
 * Справа стоит только то, что не является навигацией: язык (на широком
 * экране), кнопки входа для гостя, колокольчик для вошедшего — у него свой
 * счётчик, и прятать его в меню значит прятать и счётчик. Всё остальное —
 * под бургером.
 */
function Header({ title }: { title?: string }) {
  const { t } = useLang();
  const authed = Boolean(useMe().me);
  const items = useNavItems(authed);
  const [menu, setMenu] = useState(false);

  return (
    <>
      <header className="appbar">
        <div className="page appbar-inner">
          {title ? (
            <>
              <div className="desktop-only">
                <Logo />
              </div>
              <strong className="mobile-only clamp-2 grow" style={{ fontSize: 17 }}>
                {title}
              </strong>
            </>
          ) : (
            <Logo />
          )}

          <div className="row g8" style={{ marginLeft: "auto" }}>
            <div className="desktop-only">
              <LangSwitch />
            </div>
            {authed ? (
              <NotificationsBell />
            ) : (
              <div className="desktop-only g8">
                <Link href="/login" className="btn btn-secondary btn-sm" style={{ minHeight: 40 }}>
                  {t.login}
                </Link>
                <Link href="/login" className="btn btn-primary btn-sm" style={{ minHeight: 40 }}>
                  {t.start}
                </Link>
              </div>
            )}
            <button
              className="btn btn-icon"
              onClick={() => setMenu(true)}
              aria-expanded={menu}
              aria-haspopup="dialog"
              aria-label={t.shMenu}
            >
              <IconMenu />
            </button>
          </div>
        </div>

        <style>{`
          /* Липкая шапка накрывает то, куда ведут якоря лендинга («Вопросы»,
             «Как это работает»). Отступ равен её высоте; полок теперь одна,
             поэтому и правило одно на все ширины. */
          :target { scroll-margin-top: calc(var(--header-h) + 12px); }
        `}</style>
      </header>

      {/* Шторка стоит рядом с шапкой, а не внутри неё: `backdrop-filter`
          на `.appbar` делает её точкой отсчёта для `position: fixed`, и
          затемнение с окном остались бы внутри 60 px шапки */}
      <NavMenu open={menu} onClose={() => setMenu(false)} items={items} authed={authed} />
    </>
  );
}

/* ============ Нижняя таб-панель ============ */

export function TabBar() {
  const { t } = useLang();
  const pathname = usePathname();
  const tabs = [
    { href: "/my", label: t.navHome, icon: IconHome },
    { href: "/courses", label: t.navCatalog, icon: IconCatalog },
    { href: "/certificates", label: t.navCerts, icon: IconCertificate },
    { href: "/profile", label: t.navProfile, icon: IconUser },
  ];
  return (
    <nav className="tabbar" aria-label={t.shNavMain}>
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} data-active={active}>
            <span className="p2-tab-ico">
              <Icon size={21} strokeWidth={active ? 2.1 : 1.75} />
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}

      <style>{`
        /* Активная вкладка отмечена капсулой под значком, а не одним цветом:
           у темы крупные радиусы, и на подписи в 11 px цвета мало — на солнце
           телефон её и не покажет. Высоты держат строку в 64 px таб-панели:
           26 капсула + 3 зазор + 13 подпись. */
        .p2-tab-ico {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 26px;
          border-radius: 999px;
          transition: background 0.16s;
        }
        .tabbar a[data-active="true"] .p2-tab-ico { background: var(--primary-bg); }
      `}</style>
    </nav>
  );
}

/* ============ Каркас страницы кабинета ============ */

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
  /* Отступ снизу считается по тому, что там стоит: липкая кнопка, таб-панель,
     обе или ничего. Ошибка здесь съедает последнюю строку экрана. */
  const main = hasStickyCta
    ? hideTabBar
      ? "has-sticky-cta no-tabbar"
      : "has-sticky-cta"
    : hideTabBar
      ? undefined
      : "has-tabbar";

  return (
    <>
      <Header title={title} />
      <main className={main}>{children}</main>
      {!hideTabBar && <TabBar />}
    </>
  );
}

/* ============ Каркас публичной страницы ============ */

/**
 * Таб-панель — навигация кабинета, и в публичной части её нет никогда:
 * разделы витрины живут в шторке под бургером.
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
      <Header />
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

/**
 * Два блока вместо колонок со ссылками.
 *
 * Наверху — контакты администратора: доступ к курсу здесь открывают руками
 * после оплаты вне платформы, и разговор с админом — это и есть путь к курсу,
 * а не сноска. Приходят они с бэкенда (`GET /settings`) и уже отличаются
 * по площадке; телефон и WhatsApp хранятся номерами, ссылку `wa.me` собираем
 * сами. Внизу — строка ссылок и копирайт.
 *
 * Подписи взяты из общего словаря: своих строк площадка не заводит, а
 * непереведённый абзац на казахском экране выглядит хуже, чем его отсутствие.
 */
export function Footer() {
  const { t, lang } = useLang();
  const contacts = usePublicSettings().data?.contacts;
  const wa = contacts ? waHref(contacts.whatsapp) : null;
  const phone = contacts?.phone.trim() || null;

  const links = [
    { href: "/courses", label: t.navCatalog },
    { href: "/#how", label: t.secHowItWorks },
    { href: "/#faq", label: t.secFaq },
    { href: "/verify", label: t.navVerify },
  ];

  return (
    <footer className="p2-footer">
      <div className="page section stack g24">
        <div className="p2-foot-top">
          <div className="stack g16" style={{ alignItems: "flex-start" }}>
            <Logo />
            <LangSwitch />
          </div>

          <div className="card card-pad stack g12">
            <strong className="small">{t.contactAdmin}</strong>
            {wa && (
              <a href={wa} className="btn btn-secondary" target="_blank" rel="noreferrer">
                <IconWhatsapp size={18} />
                WhatsApp
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="row g8 small">
                <IconPhone size={16} className="muted" />
                <span className="mono">{phone}</span>
              </a>
            )}
            {contacts?.hours && <span className="caption muted">{contacts.hours}</span>}
          </div>
        </div>

        <hr className="divider" />

        <div className="p2-foot-bottom">
          <nav className="row wrap g20" aria-label={t.shFootNav}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="small muted">
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="small muted">© 2026 {BRAND[lang].name}</span>
        </div>
      </div>

      <style>{`
        /* Фон страницы у этой площадки белый, и подвал цветом карточки от неё
           не отделяется — отсюда своя подложка. */
        .p2-footer {
          background: var(--surface-muted);
          border-top: 1px solid var(--border);
          margin-top: 32px;
        }
        /* Контакты — блок рядом с брендом, а не четвёртая колонка ссылок.
           На телефоне блоки встают друг под друга. */
        .p2-foot-top { display: grid; gap: 24px; }
        @media (min-width: 760px) {
          .p2-foot-top {
            grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
            gap: 40px;
            align-items: start;
          }
        }
        .p2-foot-bottom {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }
        @media (min-width: 760px) {
          .p2-foot-bottom {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
          }
        }
      `}</style>
    </footer>
  );
}
