"use client";

/**
 * Заявки на курсы (5.26) для прототипа.
 *
 * Заявки приходят из двух мест и показываются одним списком:
 *  - моки `adminLeads` — чтобы экран сразу был живой и в нём были все статусы;
 *  - «живая» заявка из кабинета учителя — та, которую владелец создаёт руками,
 *    нажав «Записаться». Ради неё весь сквозной путь и прокликивается.
 *
 * Статус живёт в store (`leadStatus`), поэтому переживает переход между экранами.
 */

import {
  adminLeads,
  getCourse,
  type Lead,
  type LeadEvent,
  type LeadStatus,
} from "@lms/prototype/data";
import { useStore } from "@lms/prototype";

/** Кабинет в прототипе один — заявки этого учителя открывают доступ по-настоящему. */
export const DEMO_TEACHER_ID = "t2";

/** «Сегодня» прототипа — 14 августа 2026, как и даты в моках. */
const TODAY = 14;

export interface LeadRow extends Lead {
  /** Заявка, поданная из кабинета прямо сейчас, а не заведённая в моках */
  live?: boolean;
}

/** «2 дня назад» → «12 августа»: даты в списке казахстанские и одинаковые. */
function createdLabel(daysAgo: number): string {
  if (daysAgo <= 0) return "сегодня";
  const d = TODAY - daysAgo;
  return d > 0 ? `${d} августа` : `${daysAgo} дн. назад`;
}

const LIVE = "live-";

/** Заявки для списка: живая заявка учителя + моки, статусы из store. */
export function useLeads(): LeadRow[] {
  const { requests, leadStatus } = useStore();

  const liveCourseIds = Array.from(
    new Set([
      ...Object.keys(requests),
      ...Object.keys(leadStatus)
        .filter((k) => k.startsWith(LIVE))
        .map((k) => k.slice(LIVE.length)),
    ]),
  ).filter((id) => getCourse(id));

  const live: LeadRow[] = liveCourseIds.map((courseId) => {
    const id = LIVE + courseId;
    const days = requests[courseId] ?? 0;
    const status = (leadStatus[id] as LeadStatus) ?? "new";
    const history: LeadEvent[] = [{ status: "new", date: createdLabel(days) }];
    if (status !== "new") history.push({ status, date: "сегодня", by: "Аскарова Б." });
    return {
      id,
      teacherId: DEMO_TEACHER_ID,
      courseId,
      price: getCourse(courseId)?.price,
      status,
      created: createdLabel(days),
      waiting: status === "granted" || status === "declined" ? 0 : days,
      live: true,
      history,
    };
  });

  /* Живая заявка вытесняет мок по тому же курсу — иначе у учителя их две */
  const mocks: LeadRow[] = adminLeads
    .filter((l) => !(l.teacherId === DEMO_TEACHER_ID && liveCourseIds.includes(l.courseId)))
    .map((l) => ({ ...l, status: (leadStatus[l.id] as LeadStatus) ?? l.status }));

  return [...live, ...mocks];
}

export function useLead(id: string): LeadRow | undefined {
  return useLeads().find((l) => l.id === id);
}

/** Красный счётчик в меню и на плитке дашборда. */
export function useNewLeadsCount(): number {
  return useLeads().filter((l) => l.status === "new").length;
}

/** Заявки одного учителя — в его карточке видно, повторный это клиент или новый. */
export function useLeadsOfTeacher(teacherId: string): LeadRow[] {
  return useLeads().filter((l) => l.teacherId === teacherId);
}

/** Активные статусы ждут действия админа, финальные — уже нет. */
export const isOpenLead = (status: LeadStatus) =>
  status === "new" || status === "contacted" || status === "paid";
