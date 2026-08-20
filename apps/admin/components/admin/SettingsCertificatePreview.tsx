"use client";

/**
 * Превью сертификата на вкладке «Картинки сертификата»: те же три картинки
 * настроек в компоновке настоящего документа. ФИО, курс, дата и номер —
 * не настоящие данные, шаблон один на все сертификаты и в конструкторе
 * не нуждается — только показывает, куда лягут картинки.
 *
 * `.cert`/`.cert-inner` — общий каркас с макетом сертификата учителя
 * (`packages/ui/globals.css`), поэтому пропорции и вид совпадают с тем,
 * что учитель увидит на своей странице.
 */

import type { CertificateImages } from "@lms/api";

const DEMO = {
  name: "Иванова Мария Петровна",
  course: "Формирующее оценивание на уроке",
  hours: 72,
  date: "20.08.2026",
  number: "0001",
};

export function SettingsCertificatePreview({ images }: { images: CertificateImages }) {
  return (
    <div className="cert">
      <div className="cert-inner">
        {images.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images.logo.url}
            alt=""
            style={{
              width: "11cqw",
              height: "11cqw",
              objectFit: "contain",
              marginBottom: "1.4cqw",
            }}
          />
        )}
        <div
          style={{
            fontSize: "3.6cqw",
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: "#0f172a",
          }}
        >
          СЕРТИФИКАТ
        </div>
        <div style={{ fontSize: "1.3cqw", color: "#94a3b8", marginTop: "1cqw" }}>
          Настоящий сертификат подтверждает, что
        </div>
        <div
          style={{
            fontSize: "2.6cqw",
            fontWeight: 700,
            color: "#0f172a",
            marginTop: "1.4cqw",
          }}
        >
          {DEMO.name}
        </div>
        <div style={{ fontSize: "1.3cqw", color: "#94a3b8", marginTop: "1cqw" }}>
          прошёл(-ла) курс повышения квалификации
        </div>
        <div style={{ fontSize: "1.8cqw", fontWeight: 700, color: "#3a57d6", marginTop: "1cqw" }}>
          «{DEMO.course}»
        </div>
        <div style={{ fontSize: "1.3cqw", color: "#0f172a", marginTop: "0.8cqw" }}>
          объёмом {DEMO.hours} часов
        </div>

        {/* Подвал: дата и номер слева, подпись и печать — те же слоты,
            что и в настоящем документе */}
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "2cqw",
            paddingTop: "2cqw",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "1.3cqw", color: "#64748b" }}>Дата выдачи: {DEMO.date}</div>
            <div
              style={{
                fontSize: "1.3cqw",
                fontFamily: "ui-monospace, monospace",
                color: "#64748b",
                marginTop: "0.3cqw",
              }}
            >
              Номер: {DEMO.number}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                height: "6cqw",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              {images.sign && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images.sign.url}
                  alt=""
                  style={{ maxWidth: "14cqw", maxHeight: "6cqw", objectFit: "contain" }}
                />
              )}
            </div>
            <div
              style={{
                width: "12cqw",
                borderTop: "1px solid #cbd5e1",
                paddingTop: "0.5cqw",
                fontSize: "1.1cqw",
                color: "#64748b",
              }}
            >
              Подпись
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                height: "9cqw",
                width: "9cqw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {images.stamp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images.stamp.url}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              )}
            </div>
            <div style={{ fontSize: "1.1cqw", color: "#64748b" }}>М.П.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
