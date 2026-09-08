"use client";

import { PublicShell } from "@/components/layout/Shell";
import { useLang } from "@lms/ui/lang";
import { Empty, LinkButton } from "@lms/ui";
import { IconSearch } from "@lms/ui/icons";

export default function NotFound() {
  const { t } = useLang();
  return (
    <PublicShell>
      <div className="page section" style={{ paddingTop: 40 }}>
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <Empty
            icon={<IconSearch size={36} />}
            title={t.nfTitle}
            text={t.nfText}
            action={
              <div className="row g8 wrap center">
                <LinkButton href="/courses">{t.openCatalog}</LinkButton>
                {/* Страница видна и гостю, поэтому вторая ссылка — на лендинг,
                    а не в кабинет: он потребовал бы входа */}
                <LinkButton href="/" variant="secondary">
                  {t.nfHome}
                </LinkButton>
              </div>
            }
          />
        </div>
      </div>
    </PublicShell>
  );
}
