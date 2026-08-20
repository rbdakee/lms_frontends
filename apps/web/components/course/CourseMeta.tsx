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

import { usePublicSettings, waHref } from "@lms/api";
import { day, price as fmtPrice } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { Badge } from "@lms/ui";
import { IconPhone, IconWhatsapp } from "@lms/ui/icons";

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
 *
 * Каналы — WhatsApp и звонок, из настроек площадки; оба хранятся номерами,
 * ссылку wa.me собираем здесь. Пока настройки не пришли или канал
 * не заполнен — не рисуем ничего: скелет на вторичной кнопке шумнее пользы.
 */
export function ContactAdmin({ variant = "button" }: { variant?: "button" | "link" }) {
  const { t } = useStore();
  const settings = usePublicSettings();
  const contacts = settings.data?.contacts;
  if (!contacts) return null;

  const wa = waHref(contacts.whatsapp);
  const phone = contacts.phone.trim();

  if (variant === "link") {
    const href = wa ?? (phone ? `tel:${phone}` : null);
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="row center g6 small"
        style={{ color: "var(--primary)", fontWeight: 700, minHeight: 44 }}
      >
        {wa ? <IconWhatsapp size={17} /> : <IconPhone size={17} />}
        {t.contactAdmin}
      </a>
    );
  }

  if (!wa && !phone) return null;
  return (
    <div className="stack g8">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="btn btn-secondary grow">
          <IconWhatsapp size={18} />
          WhatsApp
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="row center g6 small"
          style={{ color: "var(--text-2)", minHeight: 44 }}
        >
          <IconPhone size={16} />
          <span className="mono">{phone}</span>
        </a>
      )}
      {contacts.hours && (
        <span className="caption muted-3" style={{ textAlign: "center" }}>
          {contacts.hours}
        </span>
      )}
    </div>
  );
}
