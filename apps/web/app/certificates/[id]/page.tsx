"use client";

/** Просмотр сертификата «/certificates/:id» — макет A4 на русском и казахском. */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { certificates, demoCertificate, getCourse, type Certificate } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { useOrigin } from "@lms/ui/useOrigin";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import { CertificateSheet } from "@/components/course/CertificateSheet";
import { Button, Empty, LinkButton, Note } from "@lms/ui";
import { IconBook, IconDownload, IconLink, IconQr } from "@lms/ui/icons";

export default function CertificateViewPage() {
  const { id } = useParams<{ id: string }>();
  const { certs, fullName, toast } = useStore();
  const { verifyUrl } = useOrigin();
  const [lang, setLang] = useState<"ru" | "kz">("ru");

  const known: Certificate[] = [...certificates, demoCertificate];
  const found = known.find((c) => c.id === id);
  const cert = found ? { ...found, holder: fullName || found.holder } : null;
  const owned = cert ? certs.includes(cert.courseId) : false;
  /** Курс, за который выдан сертификат — чтобы можно было вернуться к материалам */
  const course = cert ? getCourse(cert.courseId) : null;

  if (!cert || !owned) {
    return (
      <>
        <BackHeader href="/certificates" title="Сертификат" />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title="Сертификат не найден"
              text="Возможно, курс ещё не завершён или ссылка устарела."
              action={
                <LinkButton href="/certificates" variant="secondary">
                  Мои сертификаты
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
      <BackHeader href="/certificates" title={cert.courseTitle} subtitle={cert.number} />

      <main className="page section has-tabbar" style={{ paddingTop: 20 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }} className="stack g20">
          <div className="row between wrap g12">
            <div className="stack g4">
              <h1 className="h2 pretty">{cert.courseTitle}</h1>
              <span className="small muted">
                {cert.hours} академических часов · выдан {cert.date}
              </span>
            </div>
            <div className="segmented">
              <button data-active={lang === "ru"} onClick={() => setLang("ru")}>
                Русская версия
              </button>
              <button data-active={lang === "kz"} onClick={() => setLang("kz")}>
                Қазақша нұсқа
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 12, background: "#f8fafc" }}>
            <CertificateSheet cert={cert} lang={lang} />
          </div>

          <div className="row g10 wrap">
            <Button
              size="lg"
              icon={<IconDownload size={18} />}
              onClick={() => toast(`Скачивается PDF (${lang === "ru" ? "RU" : "KZ"})`, "success")}
              style={{ flex: 1, minWidth: 220 }}
            >
              Скачать PDF
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icon={<IconLink size={18} />}
              onClick={() => {
                navigator.clipboard?.writeText(verifyUrl(cert.number));
                toast("Ссылка для проверки скопирована", "success");
              }}
              style={{ flex: 1, minWidth: 220 }}
            >
              Скопировать ссылку для проверки
            </Button>
            {course && (
              <Link
                href={`/courses/${course.id}`}
                className="btn btn-secondary btn-lg"
                style={{ flex: 1, minWidth: 220 }}
              >
                <IconBook size={18} />
                Посмотреть курс
              </Link>
            )}
          </div>

          <Note kind="info" icon={<IconQr size={18} />}>
            На бумажной версии есть QR-код — камера телефона откроет страницу проверки
            с готовым результатом. Номер можно ввести и вручную на{" "}
            <LinkButton href="/verify" variant="ghost" size="sm">
              /verify
            </LinkButton>
          </Note>
        </div>
      </main>

      <TabBar />
    </>
  );
}
