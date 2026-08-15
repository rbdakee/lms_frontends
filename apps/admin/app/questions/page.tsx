"use client";

/**
 * Вопросы от учителей «/questions» — раздел 5.24 брифа.
 * Сводный список по всей платформе; те же карточки стоят внутри курса,
 * и ответ, данный там, виден здесь — состояние общее.
 */

import { useState } from "react";
import { adminQuestions } from "@lms/prototype/data";
import { useModeration } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { QuestionCard } from "@/components/admin/Moderation";
import { Button, Empty } from "@lms/ui";
import { IconCheckCircle } from "@lms/ui/icons";

export default function AdminQuestionsPage() {
  const { replyCount } = useModeration();
  const [onlyOpen, setOnlyOpen] = useState(true);

  const list = adminQuestions.filter((q) => (onlyOpen ? replyCount(q.id) === 0 : true));
  const openCount = adminQuestions.filter((q) => replyCount(q.id) === 0).length;

  return (
    <AdminShell
      title="Вопросы от учителей"
      subtitle={`${openCount} без ответа`}
      actions={
        <Button
          variant={onlyOpen ? "primary" : "secondary"}
          size="sm"
          onClick={() => setOnlyOpen((v) => !v)}
        >
          Только без ответа
        </Button>
      }
    >
      <div className="stack g14" style={{ maxWidth: 860 }}>
        {list.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconCheckCircle size={38} />}
              title="Все вопросы отвечены"
              text="Вопрос — это тред: отвечать может админ и любой учитель с доступом к курсу."
              action={
                <Button variant="secondary" onClick={() => setOnlyOpen(false)}>
                  Показать все вопросы
                </Button>
              }
            />
          </div>
        ) : (
          list.map((q) => <QuestionCard key={q.id} question={q} showCourse />)
        )}
      </div>
    </AdminShell>
  );
}
