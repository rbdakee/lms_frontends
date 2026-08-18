"use client";

/**
 * Программа курса из API: аккордеоны модулей, внутри — уроки, тесты и задания
 * вперемешку в порядке сервера. Один компонент на два ответа:
 *
 * - `program[]` страницы курса — без статусов. Гостю и заявителю ряды с замком
 *   и без переходов, как было; с выданным доступом уроки ведут в плеер.
 * - `GET /courses/{id}/program` — те же элементы плюс `status`. Это сайдбар
 *   экрана урока: галочка у пройденного, замок у закрытого, «вы здесь»
 *   у открытого сейчас и «N из M» у модуля.
 *
 * Строки вида «8 вопросов · 15 мин · порог 70%» собираются здесь из полей
 * (`questions_count`, `time_limit_min`, `pass_score`) — сервер готовых
 * подписей не шлёт.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramItem, ProgramModule, ProgramStatusItem } from "@lms/api";
import { useStore } from "@lms/prototype";
import { plural } from "@lms/ui/i18n";
import { Accordion, Badge } from "@lms/ui";
import {
  IconCheck,
  IconEdit,
  IconLock,
  IconPlay,
  IconQuiz,
  IconText,
  IconVideo,
} from "@lms/ui/icons";

/** Элемент программы — со статусом (экран урока) или без (страница курса). */
type AnyItem = ProgramItem | ProgramStatusItem;
type AnyModule = { id: number; title: string; items: AnyItem[] };

/**
 * Ссылка на экран элемента программы: у урока, теста и задания свои маршруты
 * и свои id — `kind` обязателен. Id серверные и живут в разных таблицах,
 * поэтому совпадение чисел у урока и теста ничего не значит.
 */
export function itemHref(
  courseId: number | string,
  item: { kind: ProgramItem["kind"]; id: number },
): string {
  if (item.kind === "quiz") return `/learn/${courseId}/quiz/${item.id}`;
  if (item.kind === "task") return `/learn/${courseId}/task/${item.id}`;
  return `/learn/${courseId}/${item.id}`;
}

/**
 * Куда ведёт «Продолжить» по `next_lesson`: сразу на экран элемента —
 * урок, тест или задание. Продолжать нечего (курс пройден) — к программе.
 */
export function continueHref(
  courseId: number | string,
  next: { kind: ProgramItem["kind"]; id: number } | null | undefined,
): string {
  if (!next) return `/courses/${courseId}`;
  return itemHref(courseId, next);
}

function ItemIcon({ kind }: { kind: ProgramItem["kind"] }) {
  const map = {
    video: <IconVideo size={18} />,
    text: <IconText size={18} />,
    quiz: <IconQuiz size={18} />,
    task: <IconEdit size={18} />,
  };
  return map[kind];
}

/** Статус есть только в ответе `GET /courses/{id}/program`. */
function statusOf(item: AnyItem): ProgramStatusItem["status"] | undefined {
  return "status" in item ? item.status : undefined;
}

/** «Вы здесь» бывает только у урока: `activeItemId` — id из плеера. */
function isLesson(item: AnyItem): boolean {
  return item.kind === "video" || item.kind === "text";
}

export function CourseProgram({
  program,
  locked,
  courseId,
  activeItemId,
  onNavigate,
}: {
  program: AnyModule[];
  /** До выдачи доступа элементы видны, но не кликабельны — с замком. */
  locked?: boolean;
  /** Живой режим: с id курса ряды уроков становятся переходами в плеер. */
  courseId?: number | string;
  /** Урок, открытый прямо сейчас, — «вы здесь». */
  activeItemId?: number;
  /** Закрыть шторку программы на мобильном перед переходом. */
  onNavigate?: () => void;
}) {
  const { t, toast } = useStore();
  const router = useRouter();
  /* Переходы возможны только там, где есть куда идти и доступ уже выдан */
  const live = courseId !== undefined && !locked;

  const activeModuleId =
    activeItemId === undefined
      ? undefined
      : program.find((m) => m.items.some((i) => i.id === activeItemId && isLesson(i)))?.id;

  const [open, setOpen] = useState<number[]>(() =>
    activeModuleId !== undefined
      ? [activeModuleId]
      : program.length
        ? [program[0].id]
        : [],
  );

  /* Перешли в урок соседнего модуля — раскрываем его сами: искать себя
     в свёрнутом списке человеку не должно приходиться */
  useEffect(() => {
    if (activeModuleId === undefined) return;
    setOpen((o) => (o.includes(activeModuleId) ? o : [...o, activeModuleId]));
  }, [activeModuleId]);

  const toggle = (id: number) =>
    setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  if (!program.length) {
    return <div className="card card-pad small muted">{t.programEmpty}</div>;
  }

  const itemMeta = (item: AnyItem, active: boolean): string => {
    let meta: string;
    if (item.kind === "quiz") {
      meta = [
        t.questions(item.questions_count),
        item.time_limit_min ? `${item.time_limit_min} мин` : "",
        t.passScore(item.pass_score),
      ]
        .filter(Boolean)
        .join(" · ");
    } else if (item.kind === "task") {
      meta = t.submitFormat(item.submit_format);
    } else {
      meta = item.duration_label ?? `${item.time_required_min} мин`;
    }
    if (locked) return `${meta} · ${t.lockedLesson.toLowerCase()}`;
    if (statusOf(item) === "locked") return t.lockedAfterCurrent;
    if (active) return `${meta} · ${t.youAreHere}`;
    return meta;
  };

  const openItem = (item: AnyItem) => {
    /* Замок — правило показа, а не защита: сервер урок отдаст. Но открывать
       его в обход порядка не даём, иначе строгий порядок ничего не значит */
    if (statusOf(item) === "locked") {
      toast(t.lockedNext);
      return;
    }
    onNavigate?.();
    router.push(itemHref(courseId!, item));
  };

  return (
    <div className="stack g10">
      {program.map((m) => {
        const isOpen = open.includes(m.id);
        const hasStatus = m.items.some((i) => "status" in i);
        const doneCount = m.items.filter((i) => statusOf(i) === "done").length;
        const allDone = hasStatus && m.items.length > 0 && doneCount === m.items.length;
        return (
          <Accordion
            key={m.id}
            open={isOpen}
            onToggle={() => toggle(m.id)}
            head={
              <div className="stack g6">
                <div className="h3" style={{ fontSize: 16, lineHeight: "20px" }}>
                  {m.title}
                </div>
                {hasStatus ? (
                  <span
                    className="caption"
                    style={{
                      color: allDone ? "var(--success)" : "var(--text-2)",
                      fontWeight: allDone ? 700 : undefined,
                    }}
                  >
                    {t.ofTotal(doneCount, m.items.length)} · {t.progressDone.toLowerCase()}
                  </span>
                ) : (
                  <span className="caption muted">{t.lessons(m.items.length)}</span>
                )}
              </div>
            }
          >
            <div>
              {m.items.map((item) => {
                const status = statusOf(item);
                const active = live && isLesson(item) && item.id === activeItemId;
                /* С доступом кликается всё: у теста и задания свои экраны */
                const clickable = live;
                const iconClass = locked
                  ? "locked"
                  : status === "done"
                    ? "done"
                    : status === "locked"
                      ? "locked"
                      : active
                        ? "current"
                        : "";
                const content = (
                  <>
                    <span className={`lesson-icon ${iconClass}`}>
                      {locked || status === "locked" ? (
                        <IconLock size={16} />
                      ) : status === "done" ? (
                        <IconCheck size={17} />
                      ) : active ? (
                        <IconPlay size={15} />
                      ) : (
                        <ItemIcon kind={item.kind} />
                      )}
                    </span>

                    <span className="grow stack g4" style={{ minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: active ? 700 : 600,
                          lineHeight: "20px",
                        }}
                        className="pretty"
                      >
                        {item.title}
                      </span>
                      <span className="caption muted-3">{itemMeta(item, active)}</span>
                    </span>

                    {item.kind === "quiz" && item.is_final && <Badge kind="new">Итоговый</Badge>}
                  </>
                );

                return clickable ? (
                  <button
                    key={`${item.kind}-${item.id}`}
                    className="lesson-row"
                    data-locked={status === "locked" || undefined}
                    data-current={active || undefined}
                    onClick={() => openItem(item)}
                  >
                    {content}
                  </button>
                ) : (
                  /* До выдачи доступа ряд виден, но никуда не ведёт */
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="lesson-row"
                    data-locked={locked || status === "locked" || undefined}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </Accordion>
        );
      })}

      {locked && (
        <div className="note note-muted" style={{ justifyContent: "center" }}>
          <IconLock size={18} />
          <div>{t.lockedLesson}</div>
        </div>
      )}
    </div>
  );
}

/* ============ Чек-лист «Что нужно для сертификата» ============ */

/**
 * Требования выводятся из программы: уроки — из `lessons_count`, задания
 * и итоговый тест — из состава `program[]`. Живых счётчиков здесь нет:
 * `access.done_count` считает все элементы вперемешку и на условия
 * не раскладывается — почленный чек-лист придёт из
 * `GET /courses/{id}/completion` в сессии 6.
 */
export function CourseCertChecklist({
  course,
}: {
  course: {
    hours: number;
    lang: string;
    lessons_count: number;
    program: ProgramModule[];
  };
}) {
  const { t } = useStore();
  const items = course.program.flatMap((m) => m.items);
  const tasksTotal = items.filter((i) => i.kind === "task").length;
  const finalQuiz = items.find((i) => i.kind === "quiz" && i.is_final);
  const lessonsTotal = course.lessons_count;

  const rows = [
    lessonsTotal > 0 && {
      label: `Пройти все ${lessonsTotal} ${plural(lessonsTotal, "урок", "урока", "уроков")}`,
      value: null,
      done: false,
      started: false,
    },
    tasksTotal > 0 && {
      label: `Сдать все ${tasksTotal} ${plural(tasksTotal, "задание", "задания", "заданий")}`,
      value: null,
      done: false,
      started: false,
    },
    finalQuiz &&
      finalQuiz.kind === "quiz" && {
        label: `Сдать итоговый тест — проходной балл ${finalQuiz.pass_score}%`,
        value: null,
        done: false,
        started: false,
      },
  ].filter(Boolean) as { label: string; value: string | null; done: boolean; started: boolean }[];

  if (!rows.length) return null;

  return (
    <div className="card card-pad stack g14" style={{ background: "#fbfcff" }}>
      <h3 className="h3">{t.secCertRequirements}</h3>
      <div className="stack g10">
        {rows.map((it, i) => (
          <div key={i} className="row g10" style={{ alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
                fontSize: 11,
                fontWeight: 800,
                background: it.done
                  ? "var(--success)"
                  : it.started
                    ? "var(--primary-bg)"
                    : "#f1f5f9",
                color: it.done ? "#fff" : it.started ? "var(--primary-pressed)" : "var(--text-3)",
                border: it.done ? "none" : "1px solid var(--border)",
              }}
            >
              {it.done ? <IconCheck size={14} /> : ""}
            </span>
            <span className="grow small" style={{ lineHeight: "22px" }}>
              {it.label}
            </span>
            {it.value && (
              <span
                className="caption nowrap"
                style={{
                  color: it.done ? "var(--success)" : "var(--text-2)",
                  fontWeight: 700,
                  marginTop: 3,
                }}
              >
                {it.value}
              </span>
            )}
          </div>
        ))}
      </div>
      <hr className="divider" />
      <span className="caption muted">
        Сертификат на {course.hours} часов ·{" "}
        {course.lang === "kz" ? "на казахском языке" : "на русском языке"}
      </span>
    </div>
  );
}
