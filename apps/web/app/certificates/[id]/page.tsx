"use client";

/**
 * Просмотр сертификата «/certificates/:id» — макет A4.
 *
 * Экран живёт тем же `GET /me/certificates`: отдельного эндпоинта за одним
 * документом нет, а в элементе списка уже есть всё, что печатает макет,
 * включая `holder_name`. Переключателя языка нет — документ одноязычный,
 * по языку версии курса.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, useLoad, useMe, type MyCertificates } from "@lms/api";
import { useStore } from "@lms/prototype";
import { dayYear } from "@lms/ui/i18n";
import { useOrigin } from "@lms/ui/useOrigin";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import { CertificateSheet } from "@/components/course/CertificateSheet";
import { useCertificatePdf } from "@/lib/certificatePdf";
import { Button, Empty, LinkButton, Skeleton } from "@lms/ui";
import { IconBook, IconDownload, IconLink } from "@lms/ui/icons";

export default function CertificateViewPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, toast } = useStore();
  const { me, status } = useMe();
  const router = useRouter();
  const { verifyUrl } = useOrigin();
  const { downloading, download } = useCertificatePdf();

  useEffect(() => {
    if (status === "guest") router.replace(`/login?next=/certificates/${id}`);
  }, [status, router, id]);

  const certs = useLoad<MyCertificates | null>(
    () => (me ? api<MyCertificates>("/me/certificates") : Promise.resolve(null)),
    [me?.id],
  );

  if (!me || certs.loading) {
    return (
      <>
        <BackHeader href="/certificates" title={t.navCerts} />
        <main className="page section has-tabbar stack g20" style={{ paddingTop: 20 }}>
          <Skeleton w="60%" h={28} />
          <Skeleton h={0} style={{ aspectRatio: "297/210", height: "auto" }} />
          <Skeleton h={48} r={10} />
        </main>
        <TabBar />
      </>
    );
  }

  if (certs.error) {
    return (
      <>
        <BackHeader href="/certificates" title={t.navCerts} />
        <main className="page section has-tabbar">
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
        </main>
        <TabBar />
      </>
    );
  }

  const cert = (certs.data?.items ?? []).find((c) => String(c.id) === id);

  if (!cert) {
    return (
      <>
        <BackHeader href="/certificates" title={t.navCerts} />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title={t.certNotFound}
              text={t.certNotFoundText}
              action={
                <LinkButton href="/certificates" variant="secondary">
                  {t.certMine}
                </LinkButton>
              }
            />
          </div>
        </main>
        <TabBar />
      </>
    );
  }

  return (
    <>
      <BackHeader href="/certificates" title={cert.course_title} subtitle={cert.number} />

      <main className="page section has-tabbar" style={{ paddingTop: 20 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }} className="stack g20">
          <div className="stack g4">
            <h1 className="h2 pretty">{cert.course_title}</h1>
            <span className="small muted">
              {t.academicHours(cert.hours)} ·{" "}
              {t.certIssuedOn(dayYear(cert.issued_at, lang)).toLowerCase()} ·{" "}
              {cert.lang === "kz" ? t.certLangKz : t.certLangRu}
            </span>
          </div>

          <div className="card" style={{ padding: 12, background: "#f8fafc" }}>
            <CertificateSheet cert={cert} />
          </div>

          <div className="row g10 wrap">
            <Button
              size="lg"
              icon={<IconDownload size={18} />}
              loading={downloading}
              onClick={() => download(cert)}
              style={{ flex: 1, minWidth: 220 }}
            >
              {t.certDownloadPdf}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icon={<IconLink size={18} />}
              onClick={() => {
                navigator.clipboard?.writeText(verifyUrl(cert.number));
                toast(t.certLinkCopied, "success");
              }}
              style={{ flex: 1, minWidth: 220 }}
            >
              {t.certCopyLink}
            </Button>
            <Link
              href={`/courses/${cert.course_id}`}
              className="btn btn-secondary btn-lg"
              style={{ flex: 1, minWidth: 220 }}
            >
              <IconBook size={18} />
              {t.certViewCourse}
            </Link>
          </div>
        </div>
      </main>

      <TabBar />
    </>
  );
}
