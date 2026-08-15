"use client";

/**
 * Проверка работ «/submissions» — раздел 5.21 брифа.
 *
 * Вход в проверку идёт от курса, а не от общего списка учителей: методист
 * выбирает курс, видит его состав и очередь, и уже внутри — кто на каком
 * этапе и чью работу открывать. Плоский список всех сдач подряд не давал
 * понять, к какому курсу относится работа и что у человека сдано до неё.
 */

import Link from "next/link";
import { adminSubmissions, reviewCourses } from "@lms/prototype/data";
import { plural } from "@lms/ui/i18n";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Cover, Empty, Progress } from "@lms/ui";
import { IconCheckCircle, IconChevronRight } from "@lms/ui/icons";

export default function SubmissionsPage() {
  const list = reviewCourses();
  const total = adminSubmissions.length;
  const longWait = adminSubmissions.filter((s) => s.waiting > 3).length;

  return (
    <AdminShell
      title="Проверка работ"
      subtitle={`${total} в очереди · ${longWait} ${plural(longWait, "ждёт", "ждут", "ждут")} дольше трёх дней · выберите курс`}
    >
      {list.length === 0 ? (
        <div className="card">
          <Empty
            icon={<IconCheckCircle size={38} />}
            title="Все работы проверены"
            text="Новые сдачи появятся здесь и в счётчике меню."
          />
        </div>
      ) : (
        <div className="stack g16">
          <p className="small muted pretty" style={{ maxWidth: 720 }}>
            Внутри курса видно, из чего он состоит, кто на каком уроке
            остановился, какие тесты сданы и какие задания ждут проверки.
          </p>

          <div className="review-courses">
            {list.map(({ course, summary }) => {
              const donePct = Math.round((summary.finished / summary.participants) * 100);
              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}?tab=participants`}
                  className="card card-link stack"
                  style={{ overflow: "hidden" }}
                >
                  <Cover tone={course.cover} glyph={false} style={{ height: 76 }} />

                  <div className="card-pad stack g12">
                    <div className="row between g10" style={{ alignItems: "flex-start" }}>
                      <strong className="pretty" style={{ fontSize: 16, lineHeight: 1.3 }}>
                        {course.title}
                      </strong>
                      {summary.waiting > 0 ? (
                        <Badge kind={summary.longWait > 0 ? "rework" : "review"}>
                          {summary.waiting} на проверке
                        </Badge>
                      ) : (
                        <Badge kind="accepted">Очередь пуста</Badge>
                      )}
                    </div>

                    <span className="caption muted-3">
                      {course.lessons} {plural(course.lessons, "урок", "урока", "уроков")} ·{" "}
                      {summary.quizzes} {plural(summary.quizzes, "тест", "теста", "тестов")} ·{" "}
                      {summary.tasks} {plural(summary.tasks, "задание", "задания", "заданий")}
                    </span>

                    <div className="stack g6">
                      <div className="row between caption muted">
                        <span>
                          {summary.participants}{" "}
                          {plural(summary.participants, "участник", "участника", "участников")} ·{" "}
                          {summary.finished} завершили
                        </span>
                        <strong style={{ color: "var(--primary)" }}>{donePct}%</strong>
                      </div>
                      <Progress value={donePct} />
                    </div>

                    <hr className="divider" />

                    <div className="row between g10">
                      <span className="row g10">
                        <Stat
                          value={summary.waiting}
                          label="ждут"
                          tone={summary.waiting > 0 ? "review" : undefined}
                        />
                        <Stat
                          value={summary.longWait}
                          label="дольше 3 дней"
                          tone={summary.longWait > 0 ? "danger" : undefined}
                        />
                        <Stat
                          value={summary.rework}
                          label="доработка"
                          tone={summary.rework > 0 ? "warn" : undefined}
                        />
                      </span>
                      <span
                        className="row g4 caption"
                        style={{ color: "var(--primary)", fontWeight: 700 }}
                      >
                        Открыть
                        <IconChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .review-courses {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 760px) { .review-courses { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 1280px) { .review-courses { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      `}</style>
    </AdminShell>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: "review" | "danger" | "warn";
}) {
  const color =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warn"
        ? "var(--warning)"
        : tone === "review"
          ? "var(--primary)"
          : "var(--text-3)";
  return (
    <span className="stack g2" style={{ lineHeight: 1.15 }}>
      <strong style={{ fontSize: 17, color }}>{value}</strong>
      <span className="caption muted-3">{label}</span>
    </span>
  );
}
