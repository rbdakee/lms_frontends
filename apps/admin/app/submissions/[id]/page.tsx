"use client";

/**
 * Проверка одной работы «/submissions/:id» — раздел 5.21 брифа.
 * Условие слева, ответ справа. Комментарий обязателен для «на доработку».
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { adminSubmissions } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  FileRow,
  LinkButton,
  Note,
} from "@lms/ui";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconEye,
} from "@lms/ui/icons";

export default function SubmissionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useStore();

  const idx = adminSubmissions.findIndex((s) => s.id === id);
  const s = adminSubmissions[idx];
  const next = adminSubmissions[idx + 1];

  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<null | "accept" | "rework">(null);

  if (!s) {
    return (
      <AdminShell title="Работа не найдена">
        <div className="card">
          <Empty
            title="Работа не найдена"
            action={
              <LinkButton href="/submissions" variant="secondary">
                К очереди
              </LinkButton>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const reworkBlocked = decision === "rework" && !comment.trim();

  const finish = (goNext: boolean) => {
    toast(
      decision === "accept" ? "Работа зачтена" : "Работа отправлена на доработку",
      decision === "accept" ? "success" : "info",
    );
    router.push(goNext && next ? `/submissions/${next.id}` : "/submissions");
  };

  return (
    <AdminShell
      title={s.teacher}
      subtitle={`${s.task} · ${s.course}`}
      actions={
        <div className="row g8">
          <span className="caption muted-3 nowrap hide-sm">
            Работа {idx + 1} из {adminSubmissions.length}
          </span>
          <LinkButton href="/submissions" variant="secondary" size="sm">
            <IconArrowLeft size={16} />
            <span className="hide-sm">К очереди</span>
          </LinkButton>
        </div>
      }
    >
      <div className="stack g16">
        {/* Шапка работы */}
        <div className="card card-pad row g14 wrap">
          <Avatar initials={s.initials} size={48} tone="neutral" />
          <div className="grow stack g4" style={{ minWidth: 200 }}>
            <strong className="pretty">{s.teacher}</strong>
            <span className="caption muted">
              {s.course} · отправлено {s.sent}
            </span>
          </div>
          <Badge kind={s.waiting > 3 ? "rework" : "review"}>
            {s.waiting === 0 ? "сегодня" : `ждёт ${s.waiting} дн.`}
          </Badge>
        </div>

        <div className="review-two">
          {/* ===== Условие ===== */}
          <section className="card card-pad stack g14">
            <h2 className="h3">Условие задания</h2>
            <p className="body pretty">
              Создайте тест из 5 вопросов в Google Формах по своему предмету. Включите
              режим теста, назначьте баллы и приложите скриншот или ссылку на форму.
            </p>
            <hr className="divider" />
            <div className="stack g8">
              <strong className="small">Критерии оценки</strong>
              {[
                "5 вопросов",
                "включён режим теста",
                "назначены баллы",
                "хотя бы один вопрос с несколькими правильными ответами",
              ].map((c) => (
                <div key={c} className="row g8">
                  <span style={{ color: "var(--success)", flexShrink: 0 }}>
                    <IconCheck size={16} />
                  </span>
                  <span className="small">{c}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ===== Ответ учителя ===== */}
          <section className="stack g16">
            <div className="card card-pad stack g14">
              <h2 className="h3">Ответ учителя</h2>
              <p className="body pretty">{s.answer}</p>
              <FileRow
                type={s.file.type}
                name={s.file.name}
                size={s.file.size}
                action={
                  <div className="row g6">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconEye size={15} />}
                      onClick={() => toast("Открылся бы просмотр файла")}
                    >
                      <span className="hide-sm">Открыть</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconDownload size={15} />}
                      onClick={() => toast("Файл скачивается")}
                    />
                  </div>
                }
              />
            </div>

            {/* ===== Решение ===== */}
            <div className="card card-pad stack g14">
              <h2 className="h3">Решение</h2>

              <div className="row g10">
                <Button
                  variant={decision === "accept" ? "success" : "secondary"}
                  block
                  icon={<IconCheck size={17} />}
                  onClick={() => setDecision("accept")}
                >
                  Зачесть
                </Button>
                <Button
                  variant={decision === "rework" ? "danger" : "secondary"}
                  block
                  onClick={() => setDecision("rework")}
                >
                  На доработку
                </Button>
              </div>

              <div className="field">
                <label className="label" htmlFor="cm">
                  Комментарий{" "}
                  {decision === "rework" ? (
                    <span style={{ color: "var(--danger)" }}>· обязателен</span>
                  ) : (
                    <span className="label-optional">· необязательно</span>
                  )}
                </label>
                <textarea
                  id="cm"
                  className={`input ${reworkBlocked && comment !== "" ? "input-error" : ""}`}
                  style={{ minHeight: 110 }}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    decision === "rework"
                      ? "Объясните, что именно нужно исправить — учитель увидит этот текст"
                      : "Например: отличные дистракторы во 2-м и 4-м вопросах"
                  }
                />
                {reworkBlocked && (
                  <span className="error-text">
                    Для «на доработку» комментарий обязателен — иначе учитель не поймёт,
                    что исправлять
                  </span>
                )}
              </div>

              <hr className="divider" />

              <div className="stack g8">
                <Button
                  block
                  size="lg"
                  disabled={!decision || reworkBlocked}
                  onClick={() => finish(true)}
                  iconRight={<IconArrowRight size={17} />}
                >
                  {next ? "Сохранить и перейти к следующей" : "Сохранить"}
                </Button>
                <Button
                  variant="secondary"
                  block
                  disabled={!decision || reworkBlocked}
                  onClick={() => finish(false)}
                >
                  Сохранить и вернуться в очередь
                </Button>
              </div>
            </div>

            {decision === "accept" && (
              <Note kind="success">
                Учитель получит уведомление в колокольчик. Если это было последнее условие —
                сертификат выдастся автоматически.
              </Note>
            )}
          </section>
        </div>
      </div>

      <style>{`
        .review-two { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
        @media (min-width: 1100px) { .review-two { grid-template-columns: 1fr 1fr; gap: 24px; } }
        @media (max-width: 700px) { .hide-sm { display: none; } }
      `}</style>
    </AdminShell>
  );
}
