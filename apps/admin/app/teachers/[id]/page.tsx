"use client";

/**
 * Карточка учителя «/teachers/:id» — раздел 5.22 брифа.
 *
 * Два ключевых действия: «Открыть доступ к курсу» (главное — доступ выдаётся
 * руками после оплаты вне платформы) и «Разрешить пересдачу» с обязательной
 * причиной. Пересдачу разрешаем только у непересдаваемых тестов: у пересдаваемых
 * попыток и так сколько угодно, разрешать там нечего.
 *
 * «Последний вход» и «активность» не показываем — раздел 9а: чтобы они были
 * правдой, пришлось бы писать в базу на каждое движение учителя.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  adminSubmissions,
  adminTeachers,
  getCourse,
  teacherCourses,
  teacherQuizzes,
  type Course,
} from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { DEMO_TEACHER_ID, useLeadsOfTeacher } from "@/components/admin/leads";
import { GrantAccessSheet } from "@/components/admin/GrantAccess";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  LinkButton,
  Note,
  Progress,
  Sheet,
  StatusBadge,
} from "@lms/ui";
import {
  IconCertificate,
  IconCheck,
  IconLock,
  IconPhone,
  IconQuiz,
} from "@lms/ui/icons";

type Tab = "courses" | "tests" | "works" | "certs";

export default function TeacherCardPage() {
  const { id } = useParams<{ id: string }>();
  const { toast, enrolled, grantAccess, revokeAccess } = useStore();
  const teacher = adminTeachers.find((t) => t.id === id);
  const leads = useLeadsOfTeacher(id);

  const [tab, setTab] = useState<Tab>("courses");
  const [retakeFor, setRetakeFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [allowed, setAllowed] = useState<string[]>([]);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [closing, setClosing] = useState<Course | null>(null);
  const [closed, setClosed] = useState<string[]>([]);

  if (!teacher) {
    return (
      <AdminShell title="Учитель не найден">
        <div className="card">
          <Empty
            title="Учитель не найден"
            action={
              <LinkButton href="/teachers" variant="secondary">
                К списку учителей
              </LinkButton>
            }
          />
        </div>
      </AdminShell>
    );
  }

  const isDemo = teacher.id === DEMO_TEACHER_ID;

  /* Курсы с доступом: моки участия + то, что открыли прямо сейчас в прототипе */
  const fromMocks = teacherCourses(teacher.id);
  const extra = isDemo
    ? enrolled
        .filter((cid) => !fromMocks.some((x) => x.course.id === cid))
        .map((cid) => getCourse(cid))
        .filter((c): c is Course => Boolean(c))
    : [];
  const courseRows = [
    ...fromMocks.map(({ participant, course }) => ({
      course,
      done: participant.lessonsDone,
      finished: Boolean(participant.finished),
    })),
    ...extra.map((course) => ({ course, done: 0, finished: false })),
  ].filter((r) => !closed.includes(r.course.id));

  /* Тесты показываем только по курсам, к которым у учителя есть доступ */
  const courseTitles = courseRows.map((r) => r.course.title);
  const quizRows = teacherQuizzes.filter((q) => courseTitles.includes(q.course));

  const works = adminSubmissions.filter((s) => s.teacherId === teacher.id);
  const retake = quizRows.find((q) => q.id === retakeFor);

  const closeAccess = (course: Course) => {
    if (isDemo) revokeAccess(course.id);
    setClosed((c) => [...c, course.id]);
    setClosing(null);
    toast(`Доступ к «${course.title}» закрыт — прогресс и результаты сохранены`);
  };

  return (
    <AdminShell title={teacher.name} subtitle={`${teacher.school} · ${teacher.region}`}>
      <div className="teacher-two">
        {/* ===== Профиль ===== */}
        <aside className="stack g16">
          <div className="card card-pad stack g14">
            <div className="row g12">
              <Avatar initials={teacher.initials} size={56} tone="neutral" />
              <div className="grow stack g4" style={{ minWidth: 0 }}>
                <strong className="pretty">{teacher.name}</strong>
                <span className="caption muted-3">{teacher.subject}</span>
              </div>
            </div>

            <hr className="divider" />

            <dl className="stack g10" style={{ margin: 0 }}>
              {[
                ["Школа", teacher.school],
                ["Регион", teacher.region],
                ["Телефон", teacher.phone],
                ["Email", teacher.email],
                ["Регистрация", teacher.registered],
              ].map(([k, v]) => (
                <div key={k} className="row between g10" style={{ alignItems: "flex-start" }}>
                  <dt className="caption muted nowrap">{k}</dt>
                  <dd className="small" style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card card-pad stack g8">
            <h2 className="h3">Действия</h2>
            {/* Главное действие карточки */}
            <Button block size="lg" icon={<IconCheck size={18} />} onClick={() => setGrantOpen(true)}>
              Открыть доступ к курсу
            </Button>
            <Button
              variant="secondary"
              block
              icon={<IconPhone size={17} />}
              onClick={() => setPhoneOpen(true)}
            >
              Изменить номер телефона
            </Button>
            <Button
              variant="danger-soft"
              block
              icon={<IconLock size={17} />}
              onClick={() => setBlockOpen(true)}
            >
              Заблокировать
            </Button>
          </div>

          {leads.length > 0 && (
            <div className="card card-pad stack g10">
              <h2 className="h3">Заявки</h2>
              {leads.map((l) => (
                <Link key={l.id} href={`/leads/${l.id}`} className="row between g10">
                  <span className="small pretty grow" style={{ minWidth: 0 }}>
                    {getCourse(l.courseId)?.title}
                  </span>
                  <span className="caption muted-3 nowrap">{l.created}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>

        {/* ===== Вкладки ===== */}
        <section className="stack g16">
          <div className="tabs">
            {(
              [
                ["courses", `Курсы · ${courseRows.length}`],
                ["tests", `Тесты · ${quizRows.length}`],
                ["works", `Работы · ${works.length}`],
                ["certs", `Сертификаты · ${teacher.certs}`],
              ] as [Tab, string][]
            ).map(([v, label]) => (
              <button key={v} data-active={tab === v} onClick={() => setTab(v)}>
                {label}
              </button>
            ))}
          </div>

          {/* ---- Курсы: прогресс и «Закрыть доступ» ---- */}
          {tab === "courses" && (
            <div className="stack g12">
              {courseRows.length === 0 ? (
                <div className="card">
                  <Empty
                    title="Доступа к курсам нет"
                    text="Откройте доступ к курсу — он сразу появится у учителя в «Моих курсах»."
                    action={<Button onClick={() => setGrantOpen(true)}>Открыть доступ к курсу</Button>}
                  />
                </div>
              ) : (
                courseRows.map(({ course, done, finished }) => {
                  const pct = Math.round((done / course.lessons) * 100);
                  return (
                    <div key={course.id} className="card card-pad stack g10">
                      <div className="row between wrap g10">
                        <Link href={`/courses/${course.id}`} className="pretty grow">
                          <strong className="small">{course.title}</strong>
                        </Link>
                        <StatusBadge status={finished ? "Пройден" : "В процессе"} />
                      </div>
                      <div className="row g12">
                        <Progress value={pct} />
                        <strong className="small nowrap" style={{ color: "var(--primary)" }}>
                          {pct}%
                        </strong>
                      </div>
                      <div className="row between wrap g10">
                        <span className="caption muted-3">
                          {done} из {course.lessons} уроков
                        </span>
                        <Button
                          variant="danger-soft"
                          size="sm"
                          onClick={() => setClosing(course)}
                        >
                          Закрыть доступ
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ---- Тесты: история попыток и пересдача ---- */}
          {tab === "tests" && (
            <div className="stack g12">
              {quizRows.length === 0 ? (
                <div className="card">
                  <Empty icon={<IconQuiz size={34} />} title="Тестов пока нет" />
                </div>
              ) : (
                quizRows.map((q) => {
                  const last = q.attempts[q.attempts.length - 1];
                  const open = allowed.includes(q.id);
                  return (
                    <div key={q.id} className="card card-pad stack g12">
                      <div className="row between wrap g10">
                        <div className="stack g2" style={{ minWidth: 0 }}>
                          <strong className="small pretty">{q.name}</strong>
                          <span className="caption muted-3">{q.course}</span>
                        </div>
                        <div className="row g8">
                          {q.retakable && <Badge kind="new">Пересдаваемый</Badge>}
                          <StatusBadge status={last?.passed ? "Сдан" : "Не сдан"} />
                        </div>
                      </div>

                      {/* История попыток по каждому тесту */}
                      <div className="stack g8">
                        {q.attempts.map((a, i) => (
                          <div key={i} className="row between g10" style={{ minHeight: 32 }}>
                            <span className="small">
                              Попытка {i + 1}
                              <span className="caption muted-3"> · {a.date}</span>
                            </span>
                            <span className="row g8 nowrap">
                              <strong
                                className="small"
                                style={{ color: a.passed ? "var(--success)" : "var(--danger)" }}
                              >
                                {a.pct}%
                              </strong>
                              {a.counted && <Badge kind="new">зачётная</Badge>}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Пересдачу разрешаем только там, где попытка одна */}
                      {q.retakable ? (
                        <span className="caption muted-3 pretty">
                          Попыток не ограничено, засчитывается последний результат —
                          разрешать пересдачу не нужно.
                        </span>
                      ) : open ? (
                        <Badge kind="accepted">Пересдача открыта</Badge>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => setRetakeFor(q.id)}>
                          Разрешить пересдачу
                        </Button>
                      )}
                    </div>
                  );
                })
              )}

              <Note kind="muted">
                <span className="small">
                  У непересдаваемого теста попытка одна. Пересдача нужна, когда тест прервался
                  не по вине учителя: пропал интернет, разрядился телефон, закрылась вкладка.
                  Причина сохраняется в истории.
                </span>
              </Note>
            </div>
          )}

          {/* ---- Работы ---- */}
          {tab === "works" && (
            <div className="stack g12">
              {works.length === 0 ? (
                <div className="card">
                  <Empty title="Сданных работ нет" />
                </div>
              ) : (
                works.map((w) => (
                  <Link
                    key={w.id}
                    href={`/submissions/${w.id}`}
                    className="card card-link card-pad row between wrap g10"
                  >
                    <div className="stack g2">
                      <strong className="small pretty">{w.task}</strong>
                      <span className="caption muted-3">
                        {w.course} · {w.sent}
                      </span>
                    </div>
                    <StatusBadge status={w.status} />
                  </Link>
                ))
              )}
            </div>
          )}

          {/* ---- Сертификаты ---- */}
          {tab === "certs" && (
            <div className="stack g12">
              {teacher.certs === 0 ? (
                <div className="card">
                  <Empty
                    icon={<IconCertificate size={34} />}
                    title="Сертификатов пока нет"
                    text="Появятся, когда учитель выполнит условия хотя бы одного курса."
                  />
                </div>
              ) : (
                Array.from({ length: teacher.certs }).map((_, i) => (
                  <div key={i} className="card card-pad row between wrap g10">
                    <div className="stack g2">
                      <strong className="small">
                        {i === 0
                          ? "Формативное оценивание в классе"
                          : "Цифровая грамотность педагога"}
                      </strong>
                      <span className="caption mono muted-3">KZ-2026-00{3107 + i * 714}</span>
                    </div>
                    <Badge kind="accepted">Выдан</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      {/* Открыть доступ — та же модалка, что в заявках */}
      <GrantAccessSheet
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        teacherName={teacher.name}
        onGrant={(courseId) => {
          if (isDemo) grantAccess(courseId);
          setClosed((c) => c.filter((x) => x !== courseId));
          setTab("courses");
          toast(
            `Доступ к «${getCourse(courseId)?.title}» открыт — учителю ушло уведомление`,
            "success",
          );
        }}
      />

      {/* Закрыть доступ — с подтверждением */}
      <Sheet
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        title="Закрыть доступ к курсу?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              onClick={() => closing && closeAccess(closing)}
            >
              Закрыть доступ
            </Button>
            <Button variant="secondary" block onClick={() => setClosing(null)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          «{closing?.title}» пропадёт у {teacher.name} из «Моих курсов». Прогресс, результаты
          тестов и сданные работы не удаляются — если открыть доступ снова, всё вернётся.
        </p>
      </Sheet>

      {/* Модалка пересдачи — причина обязательна */}
      <Sheet
        open={!!retakeFor}
        onClose={() => {
          setRetakeFor(null);
          setReason("");
        }}
        title="Разрешить пересдачу?"
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              disabled={!reason.trim()}
              onClick={() => {
                setAllowed((a) => [...a, retakeFor!]);
                setRetakeFor(null);
                setReason("");
                toast("Пересдача открыта — учитель получит уведомление", "success");
              }}
            >
              Разрешить
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => {
                setRetakeFor(null);
                setReason("");
              }}
            >
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <p className="small muted pretty">
            <strong style={{ color: "var(--text)" }}>{retake?.name}</strong> · {teacher.name}.
            Тест снова станет доступен, прошлый результат (
            {retake?.attempts[retake.attempts.length - 1]?.pct}%) останется в истории.
          </p>
          <div className="field">
            <label className="label" htmlFor="reason">
              Причина <span style={{ color: "var(--danger)" }}>· обязательно</span>
            </label>
            <textarea
              id="reason"
              className="input"
              style={{ minHeight: 96 }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: позвонил учитель — во время теста отключили свет в селе, телефон разрядился"
            />
            <span className="hint">Сохранится в истории действий по этому учителю</span>
          </div>
        </div>
      </Sheet>

      {/* Смена номера */}
      <Sheet
        open={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        title="Изменить номер телефона"
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              onClick={() => {
                setPhoneOpen(false);
                toast("Номер изменён — вход теперь по новому номеру", "success");
              }}
            >
              Сохранить номер
            </Button>
            <Button variant="secondary" block onClick={() => setPhoneOpen(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <Note kind="warning">
            Вход только по SMS. Если учитель сменил симку, без этого действия он потеряет
            аккаунт и сертификаты.
          </Note>
          <div className="field">
            <label className="label">Текущий номер</label>
            <input className="input mono" defaultValue={teacher.phone} disabled />
          </div>
          <div className="field">
            <label className="label">Новый номер</label>
            <input className="input mono" placeholder="+7 (___) ___-__-__" />
          </div>
        </div>
      </Sheet>

      {/* Блокировка */}
      <Sheet
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Заблокировать учителя?"
        footer={
          <div className="stack g8">
            <Button
              variant="danger"
              block
              size="lg"
              onClick={() => {
                setBlockOpen(false);
                toast("Учитель заблокирован");
              }}
            >
              Заблокировать
            </Button>
            <Button variant="secondary" block onClick={() => setBlockOpen(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          {teacher.name} не сможет войти в систему. Прогресс и выданные сертификаты
          сохранятся — блокировку можно снять.
        </p>
      </Sheet>

      <style>{`
        .teacher-two { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        @media (min-width: 1024px) { .teacher-two { grid-template-columns: 320px 1fr; gap: 24px; } }
      `}</style>
    </AdminShell>
  );
}
