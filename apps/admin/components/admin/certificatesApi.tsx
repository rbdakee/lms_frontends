"use client";

/**
 * Общее для списка «/certificates» и карточки «/certificates/:id»: одинаково
 * подписанный статус, ФИО учителя и ИИН.
 *
 * Документ выписывает админ руками (`CERTIFICATES_BRIEF`, решение владельца
 * 04.09.2026), поэтому строка сертификата бывает в трёх состояниях — они же
 * три вкладки экрана.
 *
 * **ИИН — персональные данные, и более чувствительные, чем всё остальное,
 * что мы храним.** Он виден только админу, не уходит ни в адрес страницы,
 * ни в логи, ни в текст ошибки.
 */

import type { AdminCertificateTeacher, CertificateStatus } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { Badge, type BadgeKind } from "@lms/ui";

/** Заглушка «ИИН не заполнен»: настоящего номера из одних нулей не бывает. */
export const IIN_PLACEHOLDER = "000000000000";

/* Заявка — не документ, поэтому и не «выдан»: у неё свой нейтральный тон.
   `Record<CertificateStatus, …>` нарочно: новое состояние в схеме сломает
   typecheck, а не пропадёт с экрана молча. */
const STATUS_KIND: Record<CertificateStatus, BadgeKind> = {
  requested: "review",
  issued: "accepted",
  revoked: "locked",
};

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  const { t } = useLang();
  const label =
    status === "issued" ? t.crtStIssued : status === "revoked" ? t.crtStRevoked : t.crtStRequested;
  return <Badge kind={STATUS_KIND[status]}>{label}</Badge>;
}

/** ФИО целиком — это админка, учителя здесь видно по имени. */
export const certTeacherName = (teacher: AdminCertificateTeacher) =>
  [teacher.last_name, teacher.first_name, teacher.middle_name].filter(Boolean).join(" ");

/**
 * ИИН для показа. Заглушку не печатаем цифрами: двенадцать нулей читаются
 * как настоящий номер, а это метка «не заполнен» у всех, кто зарегистрировался
 * до 04.09.2026.
 */
export function IinValue({ iin }: { iin: string }) {
  const { t } = useLang();
  if (!iin || iin === IIN_PLACEHOLDER) {
    return <span className="caption muted-3">{t.crtIinEmpty}</span>;
  }
  return <span className="mono">{iin}</span>;
}
