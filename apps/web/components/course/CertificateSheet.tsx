"use client";

/**
 * Макет сертификата A4 альбомный — раздел 5.11 брифа.
 * Размеры в cqw, поэтому макет одинаково читается и в миниатюре,
 * и на всю ширину.
 *
 * Документ одноязычный: язык берётся из самого сертификата (`lang` — язык
 * версии курса), переключателя на экране нет. Казахскому написанию ФИО
 * взяться неоткуда — у человека одно имя.
 */

import type { MyCertificate } from "@lms/api";
import { dayYear, dict } from "@lms/ui/i18n";
import { useOrigin } from "@lms/ui/useOrigin";
import logo from "@lms/ui/logo.png";
import { QrCode } from "@/components/course/QrCode";

export function CertificateSheet({ cert }: { cert: MyCertificate }) {
  const kz = cert.lang === "kz";
  const brand = dict[kz ? "kz" : "ru"];
  const { verifyHost, verifyUrl } = useOrigin();
  const issued = dayYear(cert.issued_at, kz ? "kz" : "ru");

  return (
    <div className="cert">
      <div className="cert-inner">
        {/* Шапка */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.2cqw",
            color: "#4c6fff",
            marginBottom: "2.4cqw",
          }}
        >
          {/* Эмблема круглая и со своим фоном — синей плашки под ней нет.
              Название разбито на две строки той же парой строк словаря, что
              и в шапке сайта: автоперенос ломает его на три. */}
          <img src={logo.src} alt="" style={{ width: "5.4cqw", height: "5.4cqw" }} />
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              textAlign: "left",
              fontWeight: 800,
              fontSize: "1.9cqw",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            <span>{brand.brandLine1}</span>
            <span>{brand.brandLine2}</span>
          </span>
        </div>

        <div
          style={{
            fontSize: "4.6cqw",
            fontWeight: 800,
            letterSpacing: "0.14em",
            color: "#0f172a",
            lineHeight: 1.1,
          }}
        >
          СЕРТИФИКАТ
        </div>
        <div style={{ fontSize: "1.7cqw", color: "#64748b", marginTop: "0.8cqw" }}>
          {kz
            ? "біліктілікті арттыру курсынан өткені туралы"
            : "о прохождении курса повышения квалификации"}
        </div>

        <div
          style={{
            width: "16cqw",
            height: "0.3cqw",
            background: "#4c6fff",
            borderRadius: "1cqw",
            margin: "2.4cqw 0",
          }}
        />

        {/* ФИО */}
        <div
          style={{
            fontSize: "3.4cqw",
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.25,
            maxWidth: "84%",
            textWrap: "balance",
          }}
        >
          {cert.holder_name}
        </div>

        <div style={{ fontSize: "1.7cqw", color: "#64748b", margin: "1.6cqw 0 0.8cqw" }}>
          {kz ? "курстан өтті" : "прошёл(-ла) курс"}
        </div>

        <div
          style={{
            fontSize: "2.3cqw",
            fontWeight: 700,
            color: "#3a57d6",
            lineHeight: 1.3,
            maxWidth: "88%",
            textWrap: "balance",
          }}
        >
          «{cert.course_title}»
        </div>

        <div style={{ fontSize: "1.7cqw", color: "#64748b", marginTop: "1.2cqw" }}>
          {kz
            ? `көлемі — ${cert.hours} академиялық сағат`
            : `объём — ${cert.hours} академических часов`}
        </div>

        {/* Подвал */}
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "2cqw",
            paddingTop: "2.4cqw",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "1.5cqw", color: "#64748b" }}>
              {kz ? `Берілген күні: ${issued}` : `Дата выдачи: ${issued}`}
            </div>
            <div
              style={{
                fontSize: "1.6cqw",
                fontFamily: "ui-monospace, monospace",
                fontWeight: 700,
                color: "#0f172a",
                marginTop: "0.5cqw",
                letterSpacing: "0.04em",
              }}
            >
              {cert.number}
            </div>
            <div style={{ fontSize: "1.3cqw", color: "#94a3b8", marginTop: "0.4cqw" }}>
              {kz ? `Тексеру: ${verifyHost}` : `Проверка: ${verifyHost}`}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "12cqw",
                borderTop: "1px solid #cbd5e1",
                paddingTop: "0.7cqw",
                fontSize: "1.3cqw",
                color: "#64748b",
              }}
            >
              {kz ? "Платформа директоры" : "Директор платформы"}
            </div>
          </div>

          {/* Скан ведёт на страницу проверки именно этого номера */}
          <div
            style={{
              width: "9cqw",
              height: "9cqw",
              borderRadius: "1cqw",
              border: "1px solid #e2e8f0",
              flexShrink: 0,
              background: "#fff",
              overflow: "hidden",
            }}
          >
            <QrCode
              value={verifyUrl(cert.number)}
              title={
                kz
                  ? `${cert.number} сертификатын тексеру`
                  : `Проверка сертификата ${cert.number}`
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Миниатюра для списка сертификатов. */
export function CertificateThumb({ cert }: { cert: MyCertificate }) {
  return (
    <div
      className="cert"
      style={{ background: "linear-gradient(150deg,#ffffff,#f8faff)" }}
      aria-hidden="true"
    >
      <div className="cert-inner" style={{ justifyContent: "center", gap: "1.4cqw" }}>
        <div
          style={{
            fontSize: "4cqw",
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: "#0f172a",
          }}
        >
          СЕРТИФИКАТ
        </div>
        <div
          style={{
            width: "14cqw",
            height: "0.3cqw",
            background: "#4c6fff",
            borderRadius: "1cqw",
          }}
        />
        <div
          style={{
            fontSize: "2.4cqw",
            fontWeight: 700,
            color: "#3a57d6",
            maxWidth: "84%",
            lineHeight: 1.3,
            textWrap: "balance",
          }}
        >
          {cert.course_title}
        </div>
        <div
          style={{
            fontSize: "1.6cqw",
            fontFamily: "ui-monospace, monospace",
            color: "#64748b",
            letterSpacing: "0.04em",
          }}
        >
          {cert.number}
        </div>
      </div>
    </div>
  );
}
