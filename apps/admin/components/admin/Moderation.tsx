"use client";

/**
 * Карточки вопроса и отзыва для методиста — раздел 5.24 брифа.
 *
 * Вопрос — это тред: под ним сколько угодно ответов, у каждого автор и дата.
 * Отвечает и админ, и коллеги-учителя — часто коллега быстрее. Вложенности
 * второго уровня, лайков и редактирования чужих сообщений нет: именно они
 * превращают вопросы под уроком в форум с модерацией.
 *
 * У отзывов премодерации нет — отзыв виден сразу, админ отвечает или удаляет
 * постфактум. От одного человека отзывов может быть несколько, все с датами.
 *
 * Один и тот же компонент работает и в карточке курса, и в общих разделах:
 * состояние лежит в общем сторе, поэтому ответ из карточки курса виден в списке.
 */

import { useState } from "react";
import type { adminQuestions, adminReviews, ThreadReply } from "@lms/prototype/data";
import { useModeration, useStore } from "@lms/prototype";
import { Avatar, Badge, Button, Sheet, Stars } from "@lms/ui";
import { IconMessage, IconTrash } from "@lms/ui/icons";

type Question = (typeof adminQuestions)[number];
type Review = (typeof adminReviews)[number];

/* ============ Вопрос — тред ============ */

export function QuestionCard({
  question,
  showCourse,
}: {
  question: Question;
  /** В карточке курса название курса не нужно — оно уже в шапке экрана */
  showCourse?: boolean;
}) {
  const { toast, addReply, repliesFor } = useStore();
  const [draft, setDraft] = useState("");

  const replies = repliesFor(question.id, question.replies);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    addReply(question.id, {
      id: `${question.id}-r${replies.length + 1}`,
      author: "Администратор",
      initials: "АД",
      role: "admin",
      date: "сегодня",
      text,
    });
    setDraft("");
    toast("Ответ отправлен — учитель получит уведомление", "success");
  };

  return (
    <div className="card card-pad stack g12">
      <div className="row g10">
        <Avatar initials={question.initials} size={38} tone="neutral" />
        <div className="grow stack g2" style={{ minWidth: 0 }}>
          <strong className="small">{question.teacher}</strong>
          <span className="caption muted-3 pretty">
            {question.lesson} · {question.time}
          </span>
        </div>
        <Badge kind={replies.length ? "accepted" : "review"}>
          {replies.length ? `${replies.length} в треде` : "Без ответа"}
        </Badge>
      </div>

      <p className="body pretty">{question.text}</p>
      {showCourse && <span className="caption muted-3">{question.course}</span>}

      {replies.length > 0 && (
        <div className="stack g12" style={{ borderLeft: "3px solid var(--border)", paddingLeft: 12 }}>
          {replies.map((r) => (
            <ReplyRow key={r.id} reply={r} />
          ))}
        </div>
      )}

      <div className="stack g10">
        <textarea
          className="input"
          style={{ minHeight: 80 }}
          placeholder="Ответ увидит автор вопроса и все, кто откроет этот урок"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="row between wrap g10">
          <span className="caption muted-3">
            Отвечать может админ и любой учитель с доступом к курсу
          </span>
          <Button size="sm" disabled={!draft.trim()} onClick={send}>
            Ответить
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReplyRow({ reply }: { reply: ThreadReply }) {
  const admin = reply.role === "admin";
  return (
    <div className="stack g4">
      <div className="row g8 wrap">
        <strong className="caption" style={{ color: admin ? "var(--primary)" : "var(--text)" }}>
          {reply.author}
        </strong>
        {admin && <Badge kind="new">администратор</Badge>}
        <span className="caption muted-3">{reply.date}</span>
      </div>
      <p className="small pretty">{reply.text}</p>
    </div>
  );
}

/* ============ Отзыв — без премодерации ============ */

export function ReviewCard({
  review,
  showCourse,
}: {
  review: Review;
  showCourse?: boolean;
}) {
  const { toast, replyToReview, hideReview } = useStore();
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
