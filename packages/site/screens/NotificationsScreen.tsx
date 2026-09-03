"use client";

/**
 * Уведомления «/notifications» — раздел 5.14 брифа.
 *
 * `GET /notifications` отдаёт готовый текст на языке читателя — собирать его
 * здесь не надо. Адрес перехода фронт строит сам из `type` и `params`
 * (`lib/notifications.ts`): сервер отдаёт идентификаторы, а не пути.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, qs, useLoad, useMe, type Notification, type NotificationsPage } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { dayTime } from "@lms/ui/i18n";
import { useChrome, useRoutes } from "../host";
import {
  markRead,
  notificationHref,
  NOTIF_ICONS,
  NOTIF_TONES,
  onNotificationsChanged,
} from "../lib/notifications";
import { Button, Empty, RowSkeleton } from "@lms/ui";
import { IconBell, IconChevronRight } from "@lms/ui/icons";

const PER_PAGE = 20;

export function NotificationsScreen() {
  const { t, lang } = useLang();
  const { me, status } = useMe();
  const router = useRouter();
  const routes = useRoutes();
  const { TeacherShell } = useChrome();
  /* Догруженные страницы: «Показать ещё» не перечитывает первую */
  const [more, setMore] = useState<Notification[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (status === "guest") router.replace(routes.login(routes.notifications));
  }, [status, router]);

  const feed = useLoad<NotificationsPage | null>(
    () =>
      me
        ? api<NotificationsPage>(`/notifications${qs({ page: 1, per_page: PER_PAGE })}`)
        : Promise.resolve(null),
    [me?.id],
  );

  /* Прочитали из колокольчика — счётчик и точки на экране должны совпасть */
  useEffect(() => onNotificationsChanged(feed.reload), [feed.reload]);

  if (!me || feed.loading) {
    return (
      <TeacherShell>
        <div className="page section stack g20" style={{ paddingTop: 20 }}>
          <h1 className="h1">{t.navNotifications}</h1>
          <div className="stack g10">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        </div>
      </TeacherShell>
    );
  }

  if (feed.error) {
    return (
      <TeacherShell>
        <div className="page section stack g20" style={{ paddingTop: 20 }}>
          <h1 className="h1">{t.navNotifications}</h1>
          <div className="card">
            <Empty
              title={t.loadError}
              text={t.loadErrorText}
              action={
                <Button variant="secondary" onClick={feed.reload}>
                  {t.retry}
                </Button>
              }
            />
          </div>
        </div>
      </TeacherShell>
    );
  }

  const data = feed.data!;
  const items = [...data.items, ...more];
  const hasMore = items.length < data.total;

  /** Отметка одного: страница и колокольчик ведут себя одинаково. */
  const readOne = (id: number) => {
    feed.setData((d) =>
      d
        ? {
            ...d,
            unread_count: Math.max(0, d.unread_count - 1),
            items: markOne(d.items, id),
          }
        : d,
    );
    setMore((m) => markOne(m, id));
    void markRead({ ids: [id] });
  };

  const readAll = () => {
    feed.setData((d) => (d ? { ...d, unread_count: 0, items: markAll(d.items) } : d));
    setMore(markAll);
    void markRead({ all: true });
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await api<NotificationsPage>(
        `/notifications${qs({
          page: Math.floor(items.length / PER_PAGE) + 1,
          per_page: PER_PAGE,
        })}`,
      );
      setMore((m) => [...m, ...next.items]);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <TeacherShell>
      <div className="page section stack g20" style={{ paddingTop: 20 }}>
        <div className="row between wrap g12">
          <h1 className="h1">{t.navNotifications}</h1>
          {data.unread_count > 0 && (
            <Button variant="secondary" size="sm" onClick={readAll}>
              {t.notifMarkAll}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconBell size={36} />}
              title={t.emptyNotifTitle}
              text={t.emptyNotifText}
            />
          </div>
        ) : (
          <>
            <div className="card" style={{ overflow: "hidden" }}>
              {items.map((n, i) => {
                const Icon = NOTIF_ICONS[n.type];
                const tone = NOTIF_TONES[n.type];
                const isUnread = !n.read_at;
                return (
                  <Link
                    key={n.id}
                    href={notificationHref(routes, n)}
                    onClick={() => isUnread && readOne(n.id)}
                    className="row g12"
                    style={{
                      padding: "16px",
                      alignItems: "flex-start",
                      borderTop: i > 0 ? "1px solid var(--line-soft)" : undefined,
                      background: isUnread ? "var(--surface-tint)" : undefined,
                      minHeight: 72,
                    }}
                  >
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: tone.bg,
                        color: tone.fg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="grow stack g4" style={{ minWidth: 0 }}>
                      <span
                        className="small pretty"
                        style={{ fontWeight: isUnread ? 700 : 500, lineHeight: "21px" }}
                      >
                        {n.text}
                      </span>
                      <span className="caption muted-3">{dayTime(n.created_at, lang)}</span>
                    </span>
                    {isUnread ? (
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 999,
                          background: "var(--primary)",
                          flexShrink: 0,
                          marginTop: 8,
                        }}
                        aria-label={t.notifUnread}
                      />
                    ) : (
                      <IconChevronRight size={18} className="muted-3" style={{ marginTop: 4 }} />
                    )}
                  </Link>
                );
              })}
            </div>

            {hasMore && (
              <Button variant="secondary" block loading={loadingMore} onClick={loadMore}>
                {t.showMore}
              </Button>
            )}
          </>
        )}

        <p className="small muted-3 pretty">{t.notifAdminNote}</p>
      </div>
    </TeacherShell>
  );
}

/* Отметка «прочитано» рисуется сразу: ответ сервера — 204 без тела, и ждать
   его, чтобы погасить точку, незачем. */
function markOne(list: Notification[], id: number): Notification[] {
  return list.map((n) =>
    n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n,
  );
}

function markAll(list: Notification[]): Notification[] {
  return list.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }));
}
