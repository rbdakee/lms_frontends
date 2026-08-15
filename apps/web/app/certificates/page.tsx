"use client";

/** Мои сертификаты «/certificates» — раздел 5.11 брифа. */

import Link from "next/link";
import {
  certificates,
  demoCertificate,
  getCourse,
  versionForLang,
  type Certificate,
} from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { TeacherShell } from "@/components/layout/Shell";
import { CertificateThumb } from "@/components/course/CertificateSheet";
import { Empty, LinkButton, Skeleton } from "@lms/ui";
import { IconCertificate, IconChevronRight } from "@lms/ui/icons";

export default function CertificatesPage() {
  const { t, certs, ready, fullName } = useStore();

  const list: Certificate[] = certs
    .map((courseId) => {
      const base =
        certificates.find((c) => c.courseId === courseId) ??
        (courseId === demoCertificate.courseId ? demoCertificate : null);
      if (base) return { ...base, holder: fullName || base.holder };
      const course = getCourse(courseId);
      if (!course) return null;
      /* Название на казахском берём из казахской версии группы, а не из пары
         полей внутри курса: версии — два самостоятельных курса с общим groupId */
      const kzVersion = versionForLang(course, "kz");
      return {
        id: `cert-${course.id}`,
        number: `KZ-2026-00${4900 + course.title.length}`,
        courseId: course.id,
        courseTitle: course.title,
        courseTitleKz: kzVersion.lang === "kz" ? kzVersion.title : undefined,
        hours: course.hours,
        date: "сегодня",
        dateKz: "бүгін",
        holder: fullName || demoCertificate.holder,
        holderKz: demoCertificate.holderKz,
      } as Certificate;
    })
    .filter(Boolean) as Certificate[];

  return (
    <TeacherShell>
      <div className="page section stack g20" style={{ paddingTop: 20 }}>
        <div className="stack g8">
          <h1 className="h1">{t.navCerts}</h1>
          <p className="body muted">
            Скачивайте PDF или отправляйте ссылку для проверки — комиссия увидит запись
            в реестре без регистрации.
          </p>
        </div>

        {!ready ? (
          <div className="grid-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card card-pad stack g10">
                <Skeleton h={0} style={{ aspectRatio: "297/210", height: "auto" }} />
                <Skeleton w="80%" h={16} />
                <Skeleton w="50%" h={12} />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconCertificate size={38} />}
              title={t.emptyCertsTitle}
              text={t.emptyCertsText}
              action={
                <LinkButton href="/courses" size="lg">
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
                href={`/certificates/${c.id}`}
                className="card card-link"
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: 12, background: "#f8fafc" }}>
                  <CertificateThumb cert={c} />
                </div>
                <div className="card-pad row between g10" style={{ alignItems: "flex-start" }}>
                  <div className="stack g4 grow" style={{ minWidth: 0 }}>
                    <strong className="small pretty">{c.courseTitle}</strong>
                    <span className="caption muted-3">
                      Выдан {c.date} · {c.hours} часов
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
