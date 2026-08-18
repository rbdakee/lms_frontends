"use client";

/**
 * Заявки из API — общее для списка «/leads» и карточки «/leads/:id».
 * Прототипный `leads.ts` остаётся для непереведённых экранов (дашборд,
 * карточка учителя) и уйдёт вместе с их сессиями.
 */

import { api, qs, type AdminLead, type AdminLeadsPage, type LeadStatus } from "@lms/api";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Новая",
  contacted: "Связались",
  paid: "Оплачена",
  granted: "Доступ выдан",
  declined: "Отказ",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "paid",
  "granted",
  "declined",
];

/** Активные статусы ждут действия админа, финальные — уже нет. */
export const isOpenLead = (status: string) =>
  status === "new" || status === "contacted" || status === "paid";

/**
 * Отдельного `GET /admin/leads/{id}` в контракте пока нет — карточка ищет
 * заявку перебором страниц списка. Заявок немного, а бэкенду записано
 * пожелание завести точечный эндпоинт.
 */
export async function findLead(id: number): Promise<AdminLead | null> {
  let page = 1;
  for (;;) {
    const res = await api<AdminLeadsPage>(`/admin/leads${qs({ page, per_page: 100 })}`);
    const hit = res.items.find((l) => l.id === id);
    if (hit) return hit;
    if (page * res.per_page >= res.total) return null;
    page += 1;
  }
}
