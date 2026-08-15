"use client";

/**
 * Отзывы «/reviews» — раздел 5.24 брифа.
 *
 * Премодерации нет: отзыв виден на странице курса сразу, админ отвечает или
 * удаляет постфактум. Так исчезает очередь неопубликованных отзывов, которую
 * надо было разгребать. От одного человека отзывов может быть несколько —
 * в среднюю оценку курса идёт последний отзыв каждого автора.
 */

import { useState } from "react";
import { adminReviews, courses } from "@lms/prototype/data";
import { useModeration } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { ReviewCard } from "@/components/admin/Moderation";
import { Button, Empty } from "@lms/ui";
import { IconStar } from "@lms/ui/icons";

export default function AdminReviewsPage() {
  const { isHidden } = useModeration();
  const [course, setCourse] = useState("all");
  const [rating, setRating] = useState("all");

  const visible = adminReviews.filter((r) => !isHidden(r.id));
  const list = visible.filter((r) => {
    if (course !== "all" && r.courseId !== course) return false;
    if (rating !== "all" && r.rating !== Number(rating)) return false;
    return true;
  });

  const reviewCourseIds = Array.from(new Set(adminReviews.map((r) => r.courseId)));

  return (
    <AdminShell
      title="Отзывы"
      subtitle={`${visible.length} отзывов · публикуются сразу, без модерации`}
    >
      <div className="stack g16" style={{ maxWidth: 860 }}>
        <div className="row wrap g10">
          <select
            className="input"
            style={{ width: "auto", minWidth: 220 }}
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="all">Все курсы</option>
            {reviewCourseIds.map((id) => (
              <option key={id} value={id}>
                {courses.find((c) => c.id === id)?.title ?? id}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: "auto", minWidth: 150 }}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            <option value="all">Любая оценка</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
        </div>

        {list.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconStar size={38} />}
              title="Отзывов нет"
              text="По выбранным фильтрам отзывов не нашлось."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCourse("all");
                    setRating("all");
                  }}
                >
                  Сбросить фильтры
                </Button>
              }
            />
          </div>
        ) : (
          list.map((r) => <ReviewCard key={r.id} review={r} showCourse />)
        )}
      </div>
    </AdminShell>
  );
}
