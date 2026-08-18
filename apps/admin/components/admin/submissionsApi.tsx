"use client";

/**
 * Общее для очереди «/submissions» и карточки «/submissions/:id»: одинаково
 * подписанный статус, учитель с фото и переход к следующей работе.
 */

import { api, qs, type AdminSubmission, type AdminSubmissionsPage } from "@lms/api";
import { useStore } from "@lms/prototype";
import { Avatar, Badge, type BadgeKind } from "@lms/ui";

export type SubmissionStatus = AdminSubmission["status"];
type Teacher = AdminSubmission["teacher"];

const STATUS_KIND: Record<SubmissionStatus, BadgeKind> = {
  pending: "review",
  accepted: "accepted",
  rework: "rework",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useStore();
  const label =
    status === "accepted" ? t.stAccepted : status === "rework" ? t.stRework : t.stReview;
  return <Badge kind={STATUS_KIND[status]}>{label}</Badge>;
}

/** ФИО целиком — это админка, учителя здесь видно по имени. */
export const teacherName = (teacher: Teacher) =>
  [teacher.last_name, teacher.first_name, teacher.middle_name].filter(Boolean).join(" ");

/** Фото у учителя необязательно — без него рисуем инициалы, как в заявках. */
export function TeacherAvatar({ teacher, size = 34 }: { teacher: Teacher; size?: number }) {
  if (teacher.photo_url) {
    return (
      <img
        src={teacher.photo_url}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const initials =
    ((teacher.first_name[0] ?? "") + (teacher.last_name[0] ?? "")).toUpperCase() || "??";
  return <Avatar initials={initials} size={size} tone="neutral" />;
}

/**
 * «Сохранить и перейти к следующей»: отдельного эндпоинта нет — так решено
 * в контракте. Очередь перечитывается уже после вердикта, поэтому берём
 * первую работу, кроме текущей: она из `pending` только что вышла, но ответ
 * мог прийти из кэша соседнего запроса.
 */
export async function nextPendingId(currentId: number): Promise<number | null> {
  const page = await api<AdminSubmissionsPage>(
    `/admin/submissions${qs({ status: "pending", per_page: 100 })}`,
  );
  return page.items.find((s) => s.id !== currentId)?.id ?? null;
}
