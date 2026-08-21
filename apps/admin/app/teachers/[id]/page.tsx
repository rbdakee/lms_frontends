"use client";

/**
 * Карточка учителя «/teachers/:id» — раздел 5.22 брифа.
 *
 * `GET /admin/teachers/{id}` отдаёт профиль и все четыре вкладки одним ответом:
 * у одного человека курсов, тестов, работ и сертификатов заведомо немного,
 * поэтому пагинации у вкладок нет.
 *
 * Два ключевых действия: «Открыть доступ к курсу» (главное — доступ выдаётся
 * руками после оплаты вне платформы) и «Разрешить пересдачу» с обязательной
 * причиной. Разрешать пересдачу можно не всегда — сервер говорит об этом
 * заранее (`can_allow_retake` и `retake_blocker`), чтобы экран не показывал
 * живую кнопку, которая ответит `409`.
 *
 * «Последний вход» и «активность» не показываем — раздел 9а: чтобы они были
 * правдой, пришлось бы писать в базу на каждое движение учителя.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminTeacherCard,
  type AdminTeacherEnrollment,
  type AdminTeacherQuiz,
  type AdminTeacherPatch,
  type RetakeBlocker,
  type TeacherRetakeIn,
} from "@lms/api";
import { dayTime, dayYear, phoneFmt, plural } from "@lms/ui/i18n";
import { PhoneInput } from "@lms/ui/PhoneInput";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { fieldErrors } from "@/lib/fieldErrors";
import { GrantAccessSheet } from "@/components/admin/GrantAccess";
import { SubmissionStatusBadge } from "@/components/admin/submissionsApi";
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

/**
 * Почему пересдачу разрешить нельзя. Тип `Record<RetakeBlocker, …>` нарочно:
 * новый код в схеме сломает typecheck, а не пропадёт с экрана молча.
 */
const RETAKE_BLOCKER: Record<RetakeBlocker, string> = {
  quiz_retakable: "Тест и так пересдаваемый — попыток не ограничено",
  no_attempt: "Человек ещё не проходил этот тест",
  attempt_in_progress: "Попытка ещё не завершена — дождитесь её конца",
  certificate_issued: "Сертификат по курсу уже выдан — пересдача закрыта",
};

export default function TeacherCardPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const toast = useToast();
  const card = useLoad(() => api<AdminTeacherCard>(`/admin/teachers/${id}`), [id]);

  const [tab, setTab] = useState<Tab>("courses");
  const [retakeFor, setRetakeFor] = useState<AdminTeacherQuiz | null>(null);
  const [reason, setReason] = useState("");
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [closing, setClosing] = useState<AdminTeacherEnrollment | null>(null);
  const [busy, setBusy] = useState(false);

  if (card.loading && !card.data) {
    return (
      <AdminShell title="Учитель">
        <div className="card card-pad row center" style={{ minHeight: 200 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  const teacher = card.data;
  if (card.error || !teacher) {
    /* 404 — человека нет; 422 — в адресе не число (так ведут прототипные
       ссылки вида `/teachers/t2`). Для читателя это одно и то же */
    const missing = card.error?.status === 404 || card.error?.status === 422;
    return (
      <AdminShell title={missing ? "Учитель не найден" : "Учитель"}>
        <div className="card">
          <Empty
            title={missing ? "Учитель не найден" : "Не удалось загрузить"}
            text={
              missing
                ? "Возможно, ссылка устарела или человек удалён."
                : "Проверьте интернет и попробуйте ещё раз."
            }
            action={
              missing ? (
                <LinkButton href="/teachers" variant="secondary">
                  К списку учителей
                </LinkButton>
              ) : (
                <Button variant="secondary" onClick={card.reload}>
                  Повторить
                </Button>
              )
            }
          />
        </div>
      </AdminShell>
    );
  }

  /* Только что зарегистрировавшийся ещё без ФИО — зовём его по номеру */
  const name =
    [teacher.last_name, teacher.first_name, teacher.middle_name].filter(Boolean).join(" ") ||
    phoneFmt(teacher.phone);
  const initials =
    ((teacher.first_name[0] ?? "") + (teacher.last_name[0] ?? "")).toUpperCase() || "??";

  /** Профиль у нового учителя почти пустой — пустые строки просто не рисуем */
  const profile: [string, string][] = [
    ["Школа", teacher.school],
    ["Должность", teacher.position],
    ["Регион", teacher.region],
    ["Город", teacher.city],
    ["Предмет", teacher.subject],
    [
      "Стаж",
      teacher.experience === null
        ? ""
        : `${teacher.experience} ${plural(teacher.experience, "год", "года", "лет")}`,
    ],
    ["Телефон", phoneFmt(teacher.phone)],
    ["Email", teacher.email],
    ["Регистрация", dayYear(teacher.created_at, lang)],
  ];

  /** «Закрыть доступ»: прогресс и результаты остаются, строка — тоже */
  const revoke = async (enrollment: AdminTeacherEnrollment) => {
    if (busy) return;
    setBusy(true);
    try {
      await api<void>(`/admin/enrollments/${enrollment.enrollment_id}`, { method: "DELETE" });
      toast(`Доступ к «${enrollment.course.title}» закрыт — прогресс сохранён`);
      setClosing(null);
      card.reload();
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось закрыть доступ", "error");
    } finally {
      setBusy(false);
    }
  };

  /** Ответ на пересдачу — карточка целиком: ею и перерисовываем вкладку */
  const allowRetake = async () => {
    if (!retakeFor || !reason.trim() || busy) return;
    setBusy(true);
    try {
      const updated = await api<AdminTeacherCard>(`/admin/teachers/${teacher.id}/retakes`, {
        method: "POST",
        json: { quiz_id: retakeFor.quiz_id, reason: reason.trim() } satisfies TeacherRetakeIn,
      });
      card.setData(updated);
      toast("Пересдача открыта — учитель получит уведомление", "success");
      setRetakeFor(null);
      setReason("");
    } catch (e) {
      if (isApiError(e) && e.status === 409) {
        /* Блокер на экране устарел — перечитываем карточку целиком */
        toast(e.message, "error");
        setRetakeFor(null);
        setReason("");
        card.reload();
      } else {
        toast(isApiError(e) ? e.message : "Не удалось разрешить пересдачу", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  /** Смена номера и блокировка — один и тот же `PATCH`, разные поля */
  const patch = async (body: AdminTeacherPatch, done: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api<AdminTeacherCard>(`/admin/teachers/${teacher.id}`, {
        method: "PATCH",
        json: body,
      });
      card.setData(updated);
      toast(done, "success");
      setPhoneOpen(false);
      setNewPhone("");
      setBlockOpen(false);
    } catch (e) {
      /* У 422 полезный текст лежит в `details.fields`, а `message` —
         общее «Проверьте заполнение полей»: без разбора неверный номер
         не объяснить */
      const fields = Object.values(fieldErrors(e));
      toast(
        fields[0] ?? (isApiError(e) ? e.message : "Не удалось сохранить"),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      title={name}
      subtitle={[teacher.school, teacher.region].filter(Boolean).join(" · ") || undefined}
    >
      <div className="teacher-two">
        {/* ===== Профиль ===== */}
        <aside className="stack g16">
          <div className="card card-pad stack g14">
            <div className="row g12">
              <Avatar initials={initials} size={56} tone="neutral" />
              <div className="grow stack g4" style={{ minWidth: 0 }}>
                <strong className="pretty">{name}</strong>
                {teacher.subject && <span className="caption muted-3">{teacher.subject}</span>}
                {teacher.is_blocked && <StatusBadge status="Заблокирован" />}
              </div>
            </div>

            <hr className="divider" />

            <dl className="stack g10" style={{ margin: 0 }}>
              {profile
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="row between g10" style={{ alignItems: "flex-start" }}>
                    <dt className="caption muted nowrap">{k}</dt>
                    <dd
                      className="small"
                      style={{ margin: 0, textAlign: "right", fontWeight: 600 }}
                    >
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
              variant={teacher.is_blocked ? "secondary" : "danger-soft"}
              block
              icon={<IconLock size={17} />}
              onClick={() => setBlockOpen(true)}
            >
              {teacher.is_blocked ? "Разблокировать" : "Заблокировать"}
            </Button>
          </div>
        </aside>

        {/* ===== Вкладки ===== */}
        <section className="stack g16">
          <div className="tabs">
            {(
              [
                ["courses", `Курсы · ${teacher.courses.length}`],
                ["tests", `Тесты · ${teacher.quizzes.length}`],
                ["works", `Работы · ${teacher.submissions.length}`],
                ["certs", `Сертификаты · ${teacher.certificates.length}`],
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
              {teacher.courses.length === 0 ? (
                <div className="card">
                  <Empty
                    title="Доступа к курсам нет"
                    text="Откройте доступ к курсу — он сразу появится у учителя в «Моих курсах»."
                    action={<Button onClick={() => setGrantOpen(true)}>Открыть доступ к курсу</Button>}
                  />
                </div>
              ) : (
                teacher.courses.map((en) => (
                  <div key={en.enrollment_id} className="card card-pad stack g10">
                    <div className="row between wrap g10">
                      {/* Карточка `/courses/{id}` ещё на прототипных данных
                          и числовой id не понимает — ведём в редактор, как
                          это делает список курсов */}
                      <Link href={`/courses/${en.course.id}/edit`} className="pretty grow">
                        <strong className="small">{en.course.title}</strong>
                      </Link>
                      <StatusBadge status={en.completed_at ? "Пройден" : "В процессе"} />
                    </div>
                    {/* Процент считает сервер по всей программе — тестам и заданиям
                        тоже. Пересчитывать его из уроков нельзя: разошедшееся число
                        на двух экранах читается как ошибка */}
                    <div className="row g12">
                      <Progress value={en.progress_percent} />
                      <strong className="small nowrap" style={{ color: "var(--primary)" }}>
                        {en.progress_percent}%
                      </strong>
                    </div>
                    <div className="row between wrap g10">
                      <span className="caption muted-3">
                        {en.lessons_done} из {en.lessons_total} уроков
                      </span>
                      {en.revoked_at ? (
                        <Badge kind="locked">Доступ закрыт {dayYear(en.revoked_at, lang)}</Badge>
                      ) : (
                        <Button variant="danger-soft" size="sm" onClick={() => setClosing(en)}>
                          Закрыть доступ
                        </Button>
                      )}
                    </div>
                    {/* История выдачи: когда открыли и что записал админ про оплату */}
                    <span className="caption muted-3 pretty">
                      Доступ открыт {dayYear(en.granted_at, lang)}
                      {en.paid_note ? ` · ${en.paid_note}` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ---- Тесты: история попыток и пересдача ---- */}
          {tab === "tests" && (
            <div className="stack g12">
              {teacher.quizzes.length === 0 ? (
                <div className="card">
                  <Empty icon={<IconQuiz size={34} />} title="Тестов пока нет" />
                </div>
              ) : (
                teacher.quizzes.map((q) => (
                  <div key={q.quiz_id} className="card card-pad stack g12">
                    <div className="row between wrap g10">
                      <div className="stack g2" style={{ minWidth: 0 }}>
                        <strong className="small pretty">{q.title}</strong>
                        <span className="caption muted-3">{q.course_title}</span>
                      </div>
                      <div className="row g8">
                        {q.retakable && <Badge kind="new">Пересдаваемый</Badge>}
                        <span className="caption muted-3 nowrap">порог {q.pass_score}%</span>
                      </div>
                    </div>

                    {/* История попыток по каждому тесту */}
                    <div className="stack g8">
                      {q.attempts.map((a, i) => (
                        <div key={a.id} className="stack g2">
                          <div className="row between g10" style={{ minHeight: 32 }}>
                            <span className="small">
                              Попытка {i + 1}
                              <span className="caption muted-3">
                                {" "}
                                · {dayTime(a.started_at, lang)}
                              </span>
                            </span>
                            <span className="row g8 nowrap">
                              {/* Незавершённая попытка приходит без баллов — «0%» соврал бы */}
                              {a.finished_at === null ? (
                                <span className="caption muted-3">не завершена</span>
                              ) : (
                                <strong
                                  className="small"
                                  style={{ color: a.passed ? "var(--success)" : "var(--danger)" }}
                                >
                                  {a.score}%
                                </strong>
                              )}
                              {a.is_counted && <Badge kind="new">зачётная</Badge>}
                            </span>
                          </div>
                          {a.uncounted_at && (
                            <span className="caption muted-3 pretty">
                              Зачёт снят {dayTime(a.uncounted_at, lang)}
                              {a.uncounted_reason ? ` · ${a.uncounted_reason}` : ""}
                            </span>
                          )}
                        </div>
                      ))}
                      {q.attempts.length === 0 && (
                        <span className="caption muted-3">Попыток пока не было</span>
                      )}
                    </div>

                    {q.can_allow_retake ? (
                      <Button variant="secondary" size="sm" onClick={() => setRetakeFor(q)}>
                        Разрешить пересдачу
                      </Button>
                    ) : (
                      <span className="caption muted-3 pretty">
                        {q.retake_blocker
                          ? RETAKE_BLOCKER[q.retake_blocker]
                          : "Пересдачу сейчас разрешить нельзя"}
                      </span>
                    )}
                  </div>
                ))
              )}

              <Note kind="muted">
                <span className="small">
                  У непересдаваемого теста попытка одна. Пересдача нужна, когда тест прервался
                  не по вине учителя: пропал интернет, разрядился телефон, закрылась вкладка.
                  Причина сохраняется в истории попытки.
                </span>
              </Note>
            </div>
          )}

          {/* ---- Работы ---- */}
          {tab === "works" && (
            <div className="stack g12">
              {teacher.submissions.length === 0 ? (
                <div className="card">
                  <Empty title="Сданных работ нет" />
                </div>
              ) : (
                teacher.submissions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/submissions/${s.id}`}
                    className="card card-link card-pad row between wrap g10"
                  >
                    <div className="stack g2">
                      <strong className="small pretty">{s.task_title}</strong>
                      <span className="caption muted-3">
                        Сдана {dayTime(s.created_at, lang)}
                        {s.reviewed_at ? ` · проверена ${dayTime(s.reviewed_at, lang)}` : ""}
                      </span>
                    </div>
                    <SubmissionStatusBadge status={s.status} />
                  </Link>
                ))
              )}
            </div>
          )}

          {/* ---- Сертификаты ---- */}
          {tab === "certs" && (
            <div className="stack g12">
              {teacher.certificates.length === 0 ? (
                <div className="card">
                  <Empty
                    icon={<IconCertificate size={34} />}
                    title="Сертификатов пока нет"
                    text="Появятся, когда учитель выполнит условия хотя бы одного курса."
                  />
                </div>
              ) : (
                teacher.certificates.map((c) => (
                  <div key={c.id} className="card card-pad row between wrap g10">
                    <div className="stack g2">
                      <strong className="small pretty">{c.course_title}</strong>
                      <span className="caption mono muted-3">{c.number}</span>
                      <span className="caption muted-3">
                        {c.hours} {plural(c.hours, "час", "часа", "часов")} ·{" "}
                        {dayYear(c.issued_at, lang)}
                      </span>
                    </div>
                    {c.revoked_at ? (
                      <Badge kind="locked">Отозван {dayYear(c.revoked_at, lang)}</Badge>
                    ) : (
                      <Badge kind="accepted">Выдан</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      {/* Открыть доступ — курсы грузятся при открытии модалки, а не с экраном */}
      {grantOpen && (
        <GrantAccessSheet
          open
          onClose={() => setGrantOpen(false)}
          userId={teacher.id}
          teacherName={name}
          onGranted={() => {
            setTab("courses");
            card.reload();
          }}
        />
      )}

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
              loading={busy}
              onClick={() => closing && revoke(closing)}
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
          «{closing?.course.title}» пропадёт у {name} из «Моих курсов». Прогресс, результаты
          тестов и сданные работы не удаляются — если открыть доступ снова, всё вернётся.
        </p>
      </Sheet>

      {/* Модалка пересдачи — причина обязательна, сервер отвечает 422 на пустую */}
      <Sheet
        open={Boolean(retakeFor)}
        onClose={() => {
          setRetakeFor(null);
          setReason("");
        }}
        title="Разрешить пересдачу?"
        footer={
          <div className="stack g8">
            <Button block size="lg" loading={busy} disabled={!reason.trim()} onClick={allowRetake}>
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
            <strong style={{ color: "var(--text)" }}>{retakeFor?.title}</strong> · {name}. Тест
            снова станет доступен, прошлые попытки останутся в истории.
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
            <span className="hint">Останется в истории снятой попытки</span>
          </div>
        </div>
      </Sheet>

      {/* Смена номера */}
      <Sheet
        open={phoneOpen}
        onClose={() => {
          setPhoneOpen(false);
          setNewPhone("");
        }}
        title="Изменить номер телефона"
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              loading={busy}
              disabled={!newPhone.trim()}
              onClick={() =>
                patch({ phone: newPhone.trim() }, "Номер изменён — вход теперь по новому номеру")
              }
            >
              Сохранить номер
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => {
                setPhoneOpen(false);
                setNewPhone("");
              }}
            >
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <Note kind="warning">
            Вход только по номеру телефона, код приходит в WhatsApp. Если учитель сменил
            номер, без этого действия он потеряет аккаунт и сертификаты. Все его сессии
            на старом номере будут отозваны.
          </Note>
          <div className="field">
            <label className="label">Текущий номер</label>
            <input className="input mono" value={phoneFmt(teacher.phone)} disabled />
          </div>
          <div className="field">
            <label className="label">Новый номер</label>
            <PhoneInput className="input mono" value={newPhone} onChange={setNewPhone} />
          </div>
        </div>
      </Sheet>

      {/* Блокировка */}
      <Sheet
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={teacher.is_blocked ? "Разблокировать учителя?" : "Заблокировать учителя?"}
        footer={
          <div className="stack g8">
            <Button
              variant={teacher.is_blocked ? "primary" : "danger"}
              block
              size="lg"
              loading={busy}
              onClick={() =>
                patch(
                  { is_blocked: !teacher.is_blocked },
                  teacher.is_blocked ? "Учитель разблокирован" : "Учитель заблокирован",
                )
              }
            >
              {teacher.is_blocked ? "Разблокировать" : "Заблокировать"}
            </Button>
            <Button variant="secondary" block onClick={() => setBlockOpen(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          {teacher.is_blocked
            ? `${name} снова сможет войти в систему.`
            : `${name} не сможет войти в систему — запрет действует сразу, не дожидаясь конца сессии. Прогресс и выданные сертификаты сохранятся, блокировку можно снять.`}
        </p>
      </Sheet>

      <style>{`
        .teacher-two { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        @media (min-width: 1024px) { .teacher-two { grid-template-columns: 320px 1fr; gap: 24px; } }
      `}</style>
    </AdminShell>
  );
}
