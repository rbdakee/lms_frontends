"use client";

/**
 * Карточка отзыва для методиста — раздел 5.24 брифа.
 *
 * Премодерации у отзывов нет — отзыв виден сразу, админ отвечает или удаляет
 * постфактум. От одного человека отзывов может быть несколько, все с датами.
 *
 * Вопросы уехали в API и живут в `QuestionsQueue`: очередь и карточка курса
 * показывают один и тот же `GET /admin/questions`.
 *
 * Лента отзывов уехала в API (`ReviewsFeed`) — эта прототипная карточка
 * остаётся карточке курса до её сессии.
 */

import { useState } from "react";
import type { adminReviews } from "@lms/prototype/data";
import { useToast } from "@lms/ui/toast";
import { useModeration, useStore } from "@lms/prototype";
import { Avatar, Button, Sheet, Stars } from "@lms/ui";
import { IconMessage, IconTrash } from "@lms/ui/icons";

type Review = (typeof adminReviews)[number];

/* ============ Отзыв — без премодерации ============ */

export function ReviewCard({
  review,
  showCourse,
}: {
  review: Review;
  showCourse?: boolean;
}) {
  const toast = useToast();
  const { replyToReview, hideReview } = useStore();
  const { reviewReply, isHidden } = useModeration();
  const [draft, setDraft] = useState("");
  const [answering, setAnswering] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (isHidden(review.id)) return null;

  const answer = reviewReply(review.id);

  return (
    <div className="card card-pad stack g12">
      <div className="row g10">
        <Avatar initials={review.initials} size={38} tone="neutral" />
        <div className="grow stack g2" style={{ minWidth: 0 }}>
          <strong className="small">{review.teacher}</strong>
          <span className="caption muted-3 pretty">
            {showCourse ? `${review.course} · ${review.time}` : review.time}
          </span>
        </div>
        <Stars value={review.rating} />
      </div>

      <p className="body pretty">{review.text}</p>

      {answer && (
        <div
          className="stack g4"
          style={{ borderLeft: "3px solid var(--primary)", paddingLeft: 12 }}
        >
          <strong className="caption" style={{ color: "var(--primary)" }}>
            Ответ администратора
          </strong>
          <p className="small pretty">{answer}</p>
        </div>
      )}

      {answering ? (
        <div className="stack g10">
          <textarea
            className="input"
            style={{ minHeight: 80 }}
            placeholder="Ответ появится под отзывом на странице курса"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row g8">
            <Button
              size="sm"
              disabled={!draft.trim()}
              onClick={() => {
                replyToReview(review.id, draft.trim());
                setDraft("");
                setAnswering(false);
                toast("Ответ опубликован под отзывом", "success");
              }}
            >
              Опубликовать ответ
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAnswering(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="row g8 wrap">
          <Button
            variant="secondary"
            size="sm"
            icon={<IconMessage size={15} />}
            onClick={() => {
              setDraft(answer ?? "");
              setAnswering(true);
            }}
          >
            {answer ? "Изменить ответ" : "Ответить"}
          </Button>
          <Button
            variant="danger-soft"
            size="sm"
            icon={<IconTrash size={15} />}
            onClick={() => setConfirm(true)}
          >
            Удалить
          </Button>
        </div>
      )}

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Удалить отзыв?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              onClick={() => {
                hideReview(review.id);
                setConfirm(false);
                toast("Отзыв удалён со страницы курса");
              }}
            >
              Удалить
            </Button>
            <Button variant="secondary" block onClick={() => setConfirm(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          Отзыв пропадёт со страницы курса и перестанет влиять на оценку. Премодерации
          нет — отзывы публикуются сразу, поэтому удаление и есть модерация.
        </p>
      </Sheet>
    </div>
  );
}
