"use client";

/** Уведомления «/notifications» — раздел 5.14 брифа. */

import Link from "next/link";
import { notifications } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { TeacherShell } from "@/components/layout/Shell";
import { Button, Empty } from "@lms/ui";
import type { NotifType } from "@lms/prototype/data";
import {
  IconBell,
  IconCalendar,
  IconCatalog,
  IconCheckCircle,
  IconChevronRight,
  IconKey,
  IconMail,
  IconSparkle,
} from "@lms/ui/icons";

const ICONS: Record<NotifType, (p: { size?: number }) => React.JSX.Element> = {
  access: IconKey,
  task: IconCheckCircle,
  answer: IconMail,
  certificate: IconSparkle,
  course: IconCatalog,
  starting: IconCalendar,
};

const TONES: Record<NotifType, { bg: string; fg: string }> = {
  access: { bg: "var(--success-bg)", fg: "var(--success)" },
  task: { bg: "var(--success-bg)", fg: "var(--success)" },
  answer: { bg: "var(--primary-bg)", fg: "var(--primary)" },
  certificate: { bg: "var(--warning-bg)", fg: "#b45309" },
  course: { bg: "#f1f5f9", fg: "var(--text-2)" },
  starting: { bg: "var(--primary-bg)", fg: "var(--primary)" },
};

export default function NotificationsPage() {
  const { t, readNotifications, markAllRead, markRead } = useStore();
  const unread = notifications.filter((n) => !readNotifications.includes(n.id));

  return (
    <TeacherShell>
      <div className="page section stack g20" style={{ paddingTop: 20 }}>
        <div className="row between wrap g12">
          <h1 className="h1">{t.navNotifications}</h1>
          {unread.length > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              Отметить все как прочитанные
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconBell size={36} />}
              title={t.emptyNotifTitle}
              text={t.emptyNotifText}
            />
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {notifications.map((n, i) => {
              const isUnread = !readNotifications.includes(n.id);
              const Icon = ICONS[n.type];
              const tone = TONES[n.type];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => markRead(n.id)}
                  className="row g12"
                  style={{
                    padding: "16px",
                    alignItems: "flex-start",
                    borderTop: i > 0 ? "1px solid #f1f5f9" : undefined,
                    background: isUnread ? "#fbfcff" : undefined,
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
                    <span className="caption muted-3">{n.time}</span>
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
                      aria-label="Не прочитано"
                    />
                  ) : (
                    <IconChevronRight size={18} className="muted-3" style={{ marginTop: 4 }} />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <p className="small muted-3 pretty">
          Колокольчик есть только у учителя. Администратор свои уведомления —
          новые заявки и работы на проверку — получает в Telegram-бот.
        </p>
      </div>
    </TeacherShell>
  );
}
