"use client";

/**
 * Карточка учителя «/teachers/:id» — раздел 5.22 брифа.
 *
 * `GET /admin/teachers/{id}` отдаёт профиль и все четыре вкладки одним ответом:
 * у одного человека курсов, тестов, работ и сертификатов заведомо немного,
 * поэтому пагинации у вкладок нет.
 *
 * Строка любой вкладки — это **площадка**, а не курс, тест, работа или
 * сертификат: аккаунт один на обе (`PLATFORMS_BRIEF`, решение 11), а учёба
 * раздельная (решение 2). У человека с общим курсом на обеих площадках строк
 * две, и без метки они читаются как дубль и баг.
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
  useDictionaries,
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
import { IIN_PLACEHOLDER } from "@/components/admin/certificatesApi";
import { GrantAccessSheet } from "@/components/admin/GrantAccess";
import { PlatformChip, usePlatformName } from "@/components/admin/platforms";
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
  IconEdit,
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
  /* Код один, а случая два: сервер не различает в этом ответе выданный
     документ и заявку на него. Обещать «выдан» там, где заявка только подана,
     значит врать админу, поэтому текст говорит про оба */
  certificate_issued: "По курсу есть сертификат или заявка на него — пересдача закрыта",
};

/** Строковые поля профиля: правятся и сравниваются одинаково, потому и списком */
const PROFILE_TEXT_FIELDS = [
  "last_name",
  "first_name",
  "middle_name",
  "email",
  "school",
  "position",
  "region",
  "city",
  "subject",
] as const;

type ProfileForm = Record<(typeof PROFILE_TEXT_FIELDS)[number], string> & {
  /* ИИН и стаж в форме тоже строки: пустое поле — это не «нет номера»
     и не «ноль лет», и решается это при сборке тела запроса */
  iin: string;
  experience: string;
};

/** Форма из карточки — ею она пересобирается при каждом открытии шторки. */
const profileForm = (teacher: AdminTeacherCard): ProfileForm => ({
  last_name: teacher.last_name,
  first_name: teacher.first_name,
  middle_name: teacher.middle_name,
  email: teacher.email,
  school: teacher.school,
  position: teacher.position,
  region: teacher.region,
  city: teacher.city,
  subject: teacher.subject,
  /* Заглушку в поле показывать нельзя: двенадцать нулей читаются как
     настоящий ИИН, и админ сохранил бы их, ничего не заметив */
  iin: teacher.iin === IIN_PLACEHOLDER ? "" : teacher.iin,
  experience: teacher.experience === null ? "" : String(teacher.experience),
});

/**
 * Что именно поменялось. Неприсланное поле сервер понимает как «не трогать»,
 * поэтому шлём только отличия: так `PATCH` не переписывает соседние поля
 * значениями, которых админ не касался.
 */
function profileChanges(teacher: AdminTeacherCard, f: ProfileForm): AdminTeacherPatch {
  const patch: AdminTeacherPatch = {};

  for (const key of PROFILE_TEXT_FIELDS) {
    /* Пробелы по краям сервер срезает сам — сравниваем уже срезанное,
       иначе лишний пробел выглядел бы правкой, которой не было */
    const value = f[key].trim();
    if (value !== teacher[key]) patch[key] = value === "" ? null : value;
  }

  /* Пустой ИИН — не «стереть»: снять номер нельзя вовсе, а `null` сервер
     читает как «не трогать». Значит, слать тут нечего */
  const iin = f.iin.trim();
  if (iin !== "" && iin !== teacher.iin) patch.iin = iin;

  /* Стаж, в отличие от ИИН, стирается: пустое поле — «не указан» */
  const raw = f.experience.trim();
  const years = raw === "" ? null : Number.parseInt(raw, 10);
  const experience = years !== null && Number.isNaN(years) ? null : years;
  if (experience !== teacher.experience) patch.experience = experience;

  return patch;
}

export default function TeacherCardPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, t } = useLang();
  const toast = useToast();
  const platformName = usePlatformName();
  const card = useLoad(() => api<AdminTeacherCard>(`/admin/teachers/${id}`), [id]);
  const dictionaries = useDictionaries();

  const [tab, setTab] = useState<Tab>("courses");
  const [retakeFor, setRetakeFor] = useState<AdminTeacherQuiz | null>(null);
  const [reason, setReason] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  /**
   * Профиль показываем целиком, вместе с пустыми строками: эти поля админ
   * теперь правит с карточки, и пустая строка — подсказка, что заполнить,
   * а не мусор на экране. ФИО в списке нет — оно стоит заголовком карточки.
   *
   * Третий элемент — что написать вместо пустого значения: у ИИН слово
   * мужского рода, и оно обязано совпадать с тем, что печатает `IinValue`
   * на странице сертификатов.
   */
  const profile: [string, string, string?][] = [
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
    /* Заглушка — метка «не заполнен», а не номер: двенадцать нулей на экране
       читались бы как настоящий ИИН */
    ["ИИН", teacher.iin === IIN_PLACEHOLDER ? "" : teacher.iin, "не заполнен"],
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
        /* Площадка берётся из той самой строки, у которой нажали кнопку:
           попытки на площадках разные, и снятый зачёт не с той — отнятая
           у человека попытка */
        json: {
          quiz_id: retakeFor.quiz_id,
          platform: retakeFor.platform,
          reason: reason.trim(),
        } satisfies TeacherRetakeIn,
      });
      card.setData(updated);
      toast(
        `Пересдача открыта на площадке «${platformName(retakeFor.platform)}» — учитель получит уведомление`,
        "success",
      );
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

  const f = form ?? profileForm(teacher);
  const profilePatch = profileChanges(teacher, f);
  const profileChanged = Object.keys(profilePatch).length > 0;
  const regions = dictionaries.data?.regions ?? [];

  /* Форма собирается заново на каждое открытие: прошлый черновик соврал бы
     о том, что сейчас на сервере */
  const openProfile = () => {
    setForm(profileForm(teacher));
    setErrors({});
    setProfileOpen(true);
  };

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...(prev ?? profileForm(teacher)), [key]: value }));
    /* Подпись из отказа относилась к прежнему значению — правка её снимает */
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /**
   * Правка профиля — свой обработчик рядом с `patch`: тот закрывает шторку
   * и чистит поле телефона в любом случае, а здесь отказ обязан остаться
   * под полем, в открытой форме, где его и исправляют.
   */
  const saveProfile = async () => {
    if (!profileChanged || busy) return;
    setBusy(true);
    try {
      const updated = await api<AdminTeacherCard>(`/admin/teachers/${teacher.id}`, {
        method: "PATCH",
        json: profilePatch,
      });
      card.setData(updated);
      toast("Данные сохранены", "success");
      setProfileOpen(false);
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length > 0) {
        setErrors(fields);
        return;
      }
      /* Занятый ИИН — подписью под тем же полем. Чей это аккаунт, сервер
         нарочно не называет, и искать владельца номера мы не идём */
      if (isApiError(e, "iin_taken")) {
        setErrors({ iin: e.message });
        return;
      }
      toast(isApiError(e) ? e.message : "Не удалось сохранить", "error");
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
              {profile.map(([k, v, empty]) => (
                <div key={k} className="row between g10" style={{ alignItems: "flex-start" }}>
                  <dt className="caption muted nowrap">{k}</dt>
                  {/* Приглушено само значение, а не подпись: подпись — это то,
                      что ищут глазами, и гасить её незачем */}
                  <dd
                    className={v ? "small" : "small muted-3"}
                    style={{ margin: 0, textAlign: "right", fontWeight: v ? 600 : 400 }}
                  >
                    {v || empty || "не заполнено"}
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
            {/* Опечатку в ФИО или в ИИН чинить больше некому: учитель свой
                номер только видит, а в реестр академии он уходит как есть */}
            <Button
              variant="secondary"
              block
              icon={<IconEdit size={17} />}
              onClick={openProfile}
            >
              Изменить данные
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
                      <span className="row g8 nowrap">
                        <PlatformChip platform={en.platform} />
                        <StatusBadge status={en.completed_at ? "Пройден" : "В процессе"} />
                      </span>
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
                /* Ключ — пара «тест и площадка»: один тест приходит двумя
                   строками, с разными попытками и разной судьбой пересдачи */
                teacher.quizzes.map((q) => (
                  <div key={`${q.quiz_id}-${q.platform}`} className="card card-pad stack g12">
                    <div className="row between wrap g10">
                      <div className="stack g2" style={{ minWidth: 0 }}>
                        <span className="row g8 wrap">
                          <strong className="small pretty">{q.title}</strong>
                          <PlatformChip platform={q.platform} />
                        </span>
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
                  Причина сохраняется в истории попытки. Один и тот же тест может стоять
                  двумя строками — по строке на площадку: попытки, зачёт и пересдача у них
                  раздельные.
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
                    <span className="row g8 nowrap">
                      <PlatformChip platform={s.platform} />
                      <SubmissionStatusBadge status={s.status} />
                    </span>
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
                    title="Сертификатов и заявок пока нет"
                    text="Появятся, когда учитель запросит документ: выдаёт его админ, руками."
                  />
                </div>
              ) : (
                /* Вкладка показывает и заявки, поэтому состояние берём
                   из `status`, а не из `revoked_at`: у заявки нет ни номера,
                   ни даты выдачи, и печатать их как у выданного — врать */
                teacher.certificates.map((c) => (
                  <Link
                    key={c.id}
                    href={`/certificates/${c.id}`}
                    className="card card-link card-pad row between wrap g10"
                  >
                    <div className="stack g2">
                      <strong className="small pretty">{c.course_title}</strong>
                      {c.number ? (
                        <span className="caption mono muted-3">{c.number}</span>
                      ) : (
                        <span className="caption muted-3">номер появится при выдаче</span>
                      )}
                      <span className="caption muted-3">
                        {c.hours} {plural(c.hours, "час", "часа", "часов")} ·{" "}
                        {c.status === "requested"
                          ? `запрошен ${dayYear(c.requested_at, lang)}`
                          : `выдан ${dayYear(c.issued_at, lang)}`}
                      </span>
                      {/* Документы до 04.09.2026: номер академии админ
                          проставит на странице «Сертификаты» */}
                      {c.status === "issued" && !c.registration_number && (
                        <span className="caption muted-3">рег. номер не проставлен</span>
                      )}
                    </div>
                    <span className="row g8 wrap">
                      <PlatformChip platform={c.platform} />
                      {c.status === "requested" ? (
                        <Badge kind="review">Ждёт выдачи</Badge>
                      ) : c.status === "issued" ? (
                        <Badge kind="accepted">Выдан</Badge>
                      ) : (
                        <Badge kind="locked">Отозван {dayYear(c.revoked_at, lang)}</Badge>
                      )}
                    </span>
                  </Link>
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
          {/* Тест с обеих площадок называется одинаково, а попытка снимается
              только на одной — площадку админ обязан прочесть до нажатия */}
          {retakeFor && (
            <Note kind="warning">
              <span className="small">
                <strong>{t.pfRetakeOn(platformName(retakeFor.platform))}</strong> — на второй
                площадке попытки этого теста останутся как есть.
              </span>
            </Note>
          )}
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

      {/* Правка данных. Телефона тут нет нарочно: он меняется своей кнопкой
          и отзывает сессии — мешать это с правкой опечатки нельзя */}
      <Sheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Изменить данные учителя"
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              loading={busy}
              disabled={!profileChanged}
              onClick={saveProfile}
            >
              Сохранить
            </Button>
            {!profileChanged && <span className="caption muted-3">Менять нечего</span>}
            <Button variant="secondary" block onClick={() => setProfileOpen(false)}>
              Отмена
            </Button>
          </div>
        }
      >
        <div className="stack g14">
          <Note kind="muted">
            <span className="small">
              ФИО в уже выданных сертификатах не изменится — там снимок на момент выдачи,
              и правят его на карточке сертификата. А ИИН на бумаге читается живым:
              исправленный номер попадёт в PDF, скачанный после правки.
            </span>
          </Note>

          <ProfileField
            id="tp-last"
            label="Фамилия"
            value={f.last_name}
            error={errors.last_name}
            onChange={(v) => setField("last_name", v)}
          />
          <ProfileField
            id="tp-first"
            label="Имя"
            value={f.first_name}
            error={errors.first_name}
            onChange={(v) => setField("first_name", v)}
          />
          <ProfileField
            id="tp-middle"
            label="Отчество"
            value={f.middle_name}
            error={errors.middle_name}
            onChange={(v) => setField("middle_name", v)}
          />

          <div className="field">
            <label className="label" htmlFor="tp-iin">
              ИИН
            </label>
            <input
              id="tp-iin"
              className={`input mono${errors.iin ? " input-error" : ""}`}
              inputMode="numeric"
              maxLength={12}
              value={f.iin}
              /* Пробелы и буквы сервер всё равно отобьёт — не даём их ввести */
              onChange={(e) => setField("iin", e.target.value.replace(/\D/g, ""))}
              placeholder="990000000042"
            />
            <span className="hint">
              12 цифр. Номер печатается в сертификате и уходит в реестр академии —
              сверьте с документом.
            </span>
            {errors.iin && <span className="error-text">{errors.iin}</span>}
          </div>

          <ProfileField
            id="tp-email"
            label="Email"
            value={f.email}
            error={errors.email}
            onChange={(v) => setField("email", v)}
          />
          <ProfileField
            id="tp-school"
            label="Школа"
            value={f.school}
            error={errors.school}
            onChange={(v) => setField("school", v)}
          />
          <ProfileField
            id="tp-position"
            label="Должность"
            value={f.position}
            error={errors.position}
            onChange={(v) => setField("position", v)}
          />

          <div className="field">
            <label className="label" htmlFor="tp-region">
              Регион
            </label>
            <select
              id="tp-region"
              className={`input${errors.region ? " input-error" : ""}`}
              value={f.region}
              onChange={(e) => setField("region", e.target.value)}
            >
              <option value="">Не указан</option>
              {/* Пока справочник грузится — и если регион в карточке с ним
                  разошёлся — своего варианта нет, и `select` молча показал бы
                  «Не указан», а сохранил бы совсем другое */}
              {f.region !== "" && !regions.includes(f.region) && (
                <option value={f.region}>{f.region}</option>
              )}
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.region && <span className="error-text">{errors.region}</span>}
          </div>

          <ProfileField
            id="tp-city"
            label="Город"
            value={f.city}
            error={errors.city}
            onChange={(v) => setField("city", v)}
          />
          <ProfileField
            id="tp-subject"
            label="Предмет"
            value={f.subject}
            error={errors.subject}
            onChange={(v) => setField("subject", v)}
          />

          <div className="field">
            <label className="label" htmlFor="tp-exp">
              Стаж
            </label>
            <input
              id="tp-exp"
              type="number"
              min={0}
              max={70}
              className={`input${errors.experience ? " input-error" : ""}`}
              value={f.experience}
              onChange={(e) => setField("experience", e.target.value)}
            />
            <span className="hint">Полных лет, от 0 до 70. Пустое поле — стаж не указан</span>
            {errors.experience && <span className="error-text">{errors.experience}</span>}
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

/**
 * Простое поле шторки «Изменить данные»: подпись, ввод и подпись отказа.
 * Своя разметка есть только у ИИН, региона и стажа — там своя клавиатура,
 * свой список и свой разбор пустого значения.
 */
function ProfileField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`input${error ? " input-error" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
