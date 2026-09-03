"use client";

/**
 * Превью сертификата на вкладке «Картинки сертификата»: три картинки бренда
 * в компоновке настоящего документа. ФИО, курс, дата и номер — не настоящие
 * данные, шаблон один на все сертификаты и в конструкторе не нуждается —
 * только показывает, куда лягут картинки.
 *
 * Картинки больше не настройка, а файлы в коде бэкенда, свои у каждой площадки
 * (PLATFORMS_BRIEF, решение 4). Отсюда они только показываются — загрузки нет,
 * и площадка приходит снаружи: у документа второй площадки логотип свой.
 *
 * `.cert`/`.cert-inner` — общий каркас с макетом сертификата учителя
 * (`packages/ui/globals.css`), поэтому пропорции и вид совпадают с тем,
 * что учитель увидит на своей странице.
 */

import { useState } from "react";
import { API_URL } from "@lms/api";

const DEMO = {
  name: "Иванова Мария Петровна",
  course: "Формирующее оценивание на уроке",
  hours: 72,
  date: "20.08.2026",
  number: "0001",
};

/** Слоты бумаги. Четвёртый, `logo`, — логотип в шапке сайта, здесь его нет. */
type CertSlot = "cert_logo" | "cert_sign" | "cert_stamp";

/**
 * Код площадки в адресе стоит нарочно: картинку тянет `<img>`, а он
 * не присылает `Origin` вовсе — без параметра сервер отдал бы набор первой
 * площадки на обе.
 */
function brandingSrc(slot: CertSlot, platform: string) {
  return `${API_URL}/branding/${slot}?platform=${encodeURIComponent(platform)}`;
}

/**
 * Картинка одного слота.
 *
 * Не положенный файл — обычный `404`, а не поломка: место на бумаге просто
 * останется пустым, и предпросмотр показывает ровно это. Отказ помнится
 * по адресу, потому что при смене площадки набор картинок другой.
 */
function SlotImage({
  slot,
  platform,
  style,
}: {
  slot: CertSlot;
  platform: string;
  style: React.CSSProperties;
}) {
  const src = brandingSrc(slot, platform);
  const [missing, setMissing] = useState("");
  if (missing === src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={style} onError={() => setMissing(src)} />
  );
}

export function SettingsCertificatePreview({ platform }: { platform: string }) {
  return (
    <div className="cert">
      <div className="cert-inner">
        <SlotImage
          slot="cert_logo"
          platform={platform}
          style={{
            width: "11cqw",
            height: "11cqw",
            objectFit: "contain",
            marginBottom: "1.4cqw",
          }}
        />
        <div
          style={{
            fontSize: "3.6cqw",
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: "var(--text)",
          }}
        >
          СЕРТИФИКАТ
        </div>
        <div style={{ fontSize: "1.3cqw", color: "var(--text-3)", marginTop: "1cqw" }}>
          Настоящий сертификат подтверждает, что
        </div>
        <div
          style={{
            fontSize: "2.6cqw",
            fontWeight: 700,
            color: "var(--text)",
            marginTop: "1.4cqw",
          }}
        >
          {DEMO.name}
        </div>
        <div style={{ fontSize: "1.3cqw", color: "var(--text-3)", marginTop: "1cqw" }}>
          прошёл(-ла) курс повышения квалификации
        </div>
        <div style={{ fontSize: "1.8cqw", fontWeight: 700, color: "var(--primary-pressed)", marginTop: "1cqw" }}>
          «{DEMO.course}»
        </div>
        <div style={{ fontSize: "1.3cqw", color: "var(--text)", marginTop: "0.8cqw" }}>
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
            <div style={{ fontSize: "1.3cqw", color: "var(--text-2)" }}>Дата выдачи: {DEMO.date}</div>
            <div
              style={{
                fontSize: "1.3cqw",
                fontFamily: "ui-monospace, monospace",
                color: "var(--text-2)",
                marginTop: "0.3cqw",
              }}
            >
              Номер: {DEMO.number}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            {/* Высота держится, даже когда картинки нет: подпись под чертой
                на месте, а бумага в этом месте просто пустая */}
            <div
              style={{
                height: "6cqw",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <SlotImage
                slot="cert_sign"
                platform={platform}
                style={{ maxWidth: "14cqw", maxHeight: "6cqw", objectFit: "contain" }}
              />
            </div>
            <div
              style={{
                width: "12cqw",
                borderTop: "1px solid var(--border-strong)",
                paddingTop: "0.5cqw",
                fontSize: "1.1cqw",
                color: "var(--text-2)",
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
              <SlotImage
                slot="cert_stamp"
                platform={platform}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ fontSize: "1.1cqw", color: "var(--text-2)" }}>М.П.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
