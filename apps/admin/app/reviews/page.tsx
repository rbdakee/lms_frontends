"use client";

/**
 * Отзывы «/reviews» — раздел 5.24 брифа.
 *
 * Премодерации нет: отзыв виден на странице курса сразу, админ отвечает или
 * удаляет постфактум. Так исчезает очередь неопубликованных отзывов, которую
 * надо было разгребать. От одного человека отзывов может быть несколько —
 * в среднюю оценку курса идёт последний отзыв каждого автора.
 *
 * Сама лента — `ReviewsFeed` на `GET /admin/reviews`.
 */

import { useCallback, useState } from "react";
import { plural } from "@lms/ui/i18n";
import { AdminShell } from "@/components/layout/AdminShell";
import { ReviewsFeed } from "@/components/admin/ReviewsFeed";

export default function AdminReviewsPage() {
  /* Число в шапке — `total` ленты, а не длина страницы: оно меняется вместе
     с фильтрами и приходит уже посчитанным с сервера. Под фильтром это
     число отфильтрованных, и подпись обязана это говорить */
  const [count, setCount] = useState<{ total: number; filtered: boolean } | null>(null);
  const onTotal = useCallback(
    (total: number, filtered: boolean) => setCount({ total, filtered }),
    [],
  );

  return (
    <AdminShell
      title="Отзывы"
      subtitle={
        count === null
          ? "Публикуются сразу, без модерации"
          : `${count.total} ${plural(count.total, "отзыв", "отзыва", "отзывов")}${
              count.filtered ? " по фильтру" : ""
            } · публикуются сразу, без модерации`
      }
    >
      <ReviewsFeed onTotal={onTotal} />
    </AdminShell>
  );
}
