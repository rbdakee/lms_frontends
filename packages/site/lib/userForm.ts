/**
 * Форма профиля поверх `PATCH /me` — общая для онбординга и профиля.
 * Имена полей совпадают с контрактом (snake_case) — маппинга на границе нет.
 */

import type { User, UserPatch } from "@lms/api";

export const USER_FIELDS = [
  "last_name",
  "first_name",
  "middle_name",
  "email",
  "school",
  "position",
  "region",
  "city",
  "subject",
  "experience",
] as const;

export type UserForm = Record<(typeof USER_FIELDS)[number], string>;

export function formFromUser(u: User): UserForm {
  return {
    last_name: u.last_name,
    first_name: u.first_name,
    middle_name: u.middle_name,
    email: u.email,
    school: u.school,
    position: u.position,
    region: u.region,
    city: u.city,
    subject: u.subject,
    experience: u.experience === null ? "" : String(u.experience),
  };
}

/**
 * Изменённые поля формы против текущего пользователя: шлём только их,
 * пустая строка превращается в `null` — «стереть» по контракту.
 */
export function buildPatch(user: User, form: UserForm): UserPatch {
  const patch: UserPatch = {};
  for (const key of USER_FIELDS) {
    const raw = form[key].trim();
    if (key === "experience") {
      const parsed = raw === "" ? null : Number.parseInt(raw, 10);
      const next = parsed !== null && Number.isNaN(parsed) ? null : parsed;
      if (next !== user.experience) patch.experience = next;
      continue;
    }
    if (raw !== user[key]) patch[key] = raw === "" ? null : raw;
  }
  return patch;
}

/**
 * ИИН обязателен с 04.09.2026, а поле в базе непустое, поэтому «номера ещё
 * нет» у зарегистрированных раньше обозначено значением, которого не бывает.
 * В форме его показывать нельзя: двенадцать нулей читаются как настоящий ИИН.
 */
export const IIN_PLACEHOLDER = "000000000000";

export function iinFilled(iin: string): boolean {
  return iin !== "" && iin !== IIN_PLACEHOLDER;
}
