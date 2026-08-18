"use client";

/**
 * Мелкие элементы курса, которые встречаются на нескольких экранах:
 * бейдж статуса набора, цена и запасной путь «Связаться с администратором».
 *
 * Оплата на платформе не принимается — цена это просто число рядом
 * с длительностью, никаких корзин и кнопок «Оплатить».
 *
 * Типы структурные — подходит и карточка каталога, и курс из «Моих курсов».
 * `draft` и `hidden` в выдаче API не бывают, веток под них нет.
 */

import { adminContacts } from "@lms/prototype/data";
import { day, price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { Badge } from "@lms/ui";
import { IconPhone, IconTelegram, IconWhatsapp } from "@lms/ui/icons";

/** Три вида бейджа: идёт набор · старт такого-то числа · набор закрыт. */
export function EnrollBadge({
  course,
}: {
  course: { status: string; starts_at?: string | null };
}) {
  const { t, lang } = useStore();
  if (course.status === "planned")
    return <Badge kind="new">{t.setPlanned(day(course.starts_at, lang))}</Badge>;
  if (course.status === "closed") return <Badge kind="locked">{t.setClosed}</Badge>;
  return <Badge kind="done">{t.setOpen}</Badge>;
}

/** Цена строкой. `null` — «Цена по запросу», а не пустое место. */
export function Price({
  course,
  size = "md",
}: {
  course: { price: number | null };
  size?: "sm" | "md" | "lg";
}) {
  const { lang } = useStore();
  const fontSize = size === "lg" ? 24 : size === "sm" ? 14 : 17;
  return (
    <strong
      className="nowrap"
      style={{
        fontSize,
        letterSpacing: "-0.01em",
        color: course.price ? "var(--text)" : "var(--text-2)",
        fontWeight: course.price ? 800 : 600,
      }}
    >
      {fmtPrice(course.price ?? undefined, lang)}
    </strong>
  );
}

/**
 * Запасной путь связи. Главный сценарий — нажать «Записаться» и ждать,
 * поэтому кнопка вторичная и стоит под главной.
 */
export function ContactAdmin({ variant = "button" }: { variant?: "button" | "link" }) {
  const { t } = useStore();

  if (variant === "link") {
    return (
      <a
        href={adminContacts.whatsapp}
        target="_blank"
        rel="noreferrer"
        className="row center g6 small"
        style={{ color: "var(--primary)", fontWeight: 700, minHeight: 44 }}
      >
        <IconWhatsapp size={17} />
        {t.contactAdmin}
      </a>
    );
  }

  return (
    <div className="stack g8">
      <div className="row g8">
        <a
          href={adminContacts.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary grow"
        >
          <IconWhatsapp size={18} />
          WhatsApp
        </a>
        <a
          href={adminContacts.telegram}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary grow"
        >
          <IconTelegram size={18} />
          Telegram
        </a>
      </div>
      <a
        href={`tel:${adminContacts.phoneRaw}`}
        className="row center g6 small"
        style={{ color: "var(--text-2)", minHeight: 44 }}
      >
        <IconPhone size={16} />
        <span className="mono">{adminContacts.phone}</span>
      </a>
      <span className="caption muted-3" style={{ textAlign: "center" }}>
        {adminContacts.hours}
      </span>
    </div>
  );
}
