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
import { useLang } from "@lms/ui/lang";
import { PlatformFilterBoundary } from "@/components/admin/platforms";
import { AdminShell } from "@/components/layout/AdminShell";
import { QuestionsQueue } from "@/components/admin/QuestionsQueue";

export default function AdminQuestionsPage() {
  /* Очередь читает фильтр площадки из адреса, а useSearchParams требует
     границы Suspense: без неё статический маршрут не собирается */
  return (
    <PlatformFilterBoundary>
      <Questions />
    </PlatformFilterBoundary>
  );
}

function Questions() {
  const { t } = useLang();
  /* Счётчик «без ответа» не зависит от фильтров списка — отдельный запрос,
     сам список для него не нужен. Площадку он тоже не слушает: в подзаголовке
     стоит число по обеим площадкам, и от чипа фильтра оно не меняется */
  const open = useLoad(
    () => api<AdminQuestionsPage>(`/admin/questions${qs({ answered: false, per_page: 1 })}`),
    [],
  );

  return (
    <AdminShell title={t.qaTitle} subtitle={t.qaUnanswered(open.data?.total ?? 0)}>
      <QuestionsQueue standalone onAnswered={open.reload} />
    </AdminShell>
  );
}
