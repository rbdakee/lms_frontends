"use client";

import { AdminShell } from "@/components/layout/AdminShell";
import { Empty, LinkButton } from "@lms/ui";
import { IconSearch } from "@lms/ui/icons";

export default function NotFound() {
  return (
    <AdminShell title="Страница не найдена">
      <div className="card" style={{ maxWidth: 520 }}>
        <Empty
          icon={<IconSearch size={36} />}
          title="Страница не найдена"
          text="Возможно, ссылка устарела. Откройте рабочий стол или очередь заявок."
          action={
            <div className="row g8 wrap center">
              <LinkButton href="/">Рабочий стол</LinkButton>
              <LinkButton href="/leads" variant="secondary">
                Заявки
              </LinkButton>
            </div>
          }
        />
      </div>
    </AdminShell>
  );
}
