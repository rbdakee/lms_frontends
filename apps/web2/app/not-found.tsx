"use client";

import { PublicShell } from "@/components/layout/Shell";
import { Empty, LinkButton } from "@lms/ui";
import { IconSearch } from "@lms/ui/icons";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="page section" style={{ paddingTop: 40 }}>
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <Empty
            icon={<IconSearch size={36} />}
            title="Страница не найдена"
            text="Возможно, ссылка устарела. Откройте каталог курсов или вернитесь на главную."
            action={
              <div className="row g8 wrap center">
                <LinkButton href="/courses">Открыть каталог</LinkButton>
                {/* Страница видна и гостю, поэтому вторая ссылка — на лендинг,
                    а не в кабинет: он потребовал бы входа */}
                <LinkButton href="/" variant="secondary">
                  На главную
                </LinkButton>
              </div>
            }
          />
        </div>
      </div>
    </PublicShell>
  );
}
