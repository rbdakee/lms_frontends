"use client";

/**
 * Вопросы от учителей «/questions» — раздел 5.24 брифа.
 *
 * Сводная очередь по всей платформе: собрать её из вопросов по урокам нельзя,
 * админ не знает заранее, у каких уроков есть вопросы, — для этого и есть
 * `GET /admin/questions`. Тот же блок стоит вкладкой в карточке курса,
 * там он привязан к `course_id`.
 */

import { api, qs, useLoad, type AdminQuestionsPage } from "@lms/api";
import { useStore } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { QuestionsQueue } from "@/components/admin/QuestionsQueue";

export default function AdminQuestionsPage() {
  const { t } = useStore();
  /* Счётчик «без ответа» не зависит от фильтров списка — отдельный запрос,
     сам список для него не нужен */
  const open = useLoad(
    () => api<AdminQuestionsPage>(`/admin/questions${qs({ answered: false, per_page: 1 })}`),
    [],
  );

  return (
    <AdminShell title={t.qaTitle} subtitle={t.qaUnanswered(open.data?.total ?? 0)}>
      <QuestionsQueue onAnswered={open.reload} />
    </AdminShell>
  );
}
