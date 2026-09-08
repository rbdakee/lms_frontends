"use client";

/**
 * 403 `blocked` на `GET /me`: учитель заблокирован админом. Блокировка
 * действует сразу, поэтому закрывается всё приложение одним экраном,
 * а не отдельные запросы по одному.
 */

import { useMe } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { Empty } from "@lms/ui";
import { IconLock } from "@lms/ui/icons";
import { ContactAdmin } from "@lms/course";

export function BlockedGate({ children }: { children: React.ReactNode }) {
  const { status, blocked_message } = useMe();
  const { t } = useLang();

  if (status !== "blocked") return <>{children}</>;

  return (
    <main className="page section" style={{ paddingTop: 48 }}>
      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <Empty
          icon={<IconLock size={38} />}
          title={t.blockedTitle}
          text={blocked_message ?? t.blockedText}
        />
        <div style={{ padding: "0 24px 24px", maxWidth: 380, margin: "0 auto" }}>
          <ContactAdmin />
        </div>
      </div>
    </main>
  );
}
