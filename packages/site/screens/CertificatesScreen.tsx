"use client";

/**
 * Мои сертификаты «/certificates» — раздел 5.11 брифа.
 *
 * Данные — `GET /me/certificates`. Пагинации нет: список заведомо короткий,
 * и он же кормит экран одного сертификата — отдельного эндпоинта за одним
 * документом контракт не даёт.
 */

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, useLoad, useMe, type MyCertificates } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { dayYear } from "@lms/ui/i18n";
import { useChrome, useRoutes } from "../host";
import { CertificateThumb } from "@lms/course";
import { Button, Empty, LinkButton, Skeleton } from "@lms/ui";
import { IconCertificate, IconChevronRight } from "@lms/ui/icons";

export function CertificatesScreen() {
  const { t, lang } = useLang();
  const { me, status } = useMe();
  const router = useRouter();
  const routes = useRoutes();
  const { TeacherShell } = useChrome();

  useEffect(() => {
    if (status === "guest") router.replace(routes.login(routes.certificates));
  }, [status, router]);

  const certs = useLoad<MyCertificates | null>(
    () => (me ? api<MyCertificates>("/me/certificates") : Promise.resolve(null)),
    [me?.id],
  );

  const list = certs.data?.items ?? [];

  return (
    <TeacherShell>
      <div className="page section stack g20" style={{ paddingTop: 20 }}>
        <div className="stack g8">
          <h1 className="h1">{t.navCerts}</h1>
          <p className="body muted">{t.certsSubtitle}</p>
        </div>

        {!me || certs.loading ? (
          <div className="grid-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card card-pad stack g10">
                <Skeleton h={0} style={{ aspectRatio: "297/210", height: "auto" }} />
                <Skeleton w="80%" h={16} />
                <Skeleton w="50%" h={12} />
              </div>
            ))}
          </div>
        ) : certs.error ? (
          <div className="card">
            <Empty
              title={t.loadError}
              text={t.loadErrorText}
              action={
                <Button variant="secondary" onClick={certs.reload}>
                  {t.retry}
                </Button>
              }
            />
          </div>
        ) : list.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconCertificate size={38} />}
              title={t.emptyCertsTitle}
              text={t.emptyCertsText}
              action={
                <LinkButton href={routes.catalog} size="lg">
                  {t.openCatalog}
                </LinkButton>
              }
            />
          </div>
        ) : (
          <div className="grid-3">
            {list.map((c) => (
              <Link
                key={c.id}
                href={routes.certificate(c.id)}
                className="card card-link"
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: 12, background: "var(--bg)" }}>
                  <CertificateThumb cert={c} />
                </div>
                <div className="card-pad row between g10" style={{ alignItems: "flex-start" }}>
                  <div className="stack g4 grow" style={{ minWidth: 0 }}>
                    <strong className="small pretty">{c.course_title}</strong>
                    <span className="caption muted-3">
                      {t.certIssuedOn(dayYear(c.issued_at, lang))} · {t.academicHours(c.hours)}
                    </span>
                    <span className="caption mono muted">{c.number}</span>
                  </div>
                  <IconChevronRight size={18} className="muted-3" style={{ marginTop: 2 }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
