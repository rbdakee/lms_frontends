"use client";

/**
 * Карточка сертификата «/certificates/:id» — раздел 4 `CERTIFICATES_BRIEF`.
 *
 * Показ и правка одного документа плюс три действия над ним: «Выдать»
 * (заявка превращается в сертификат), «Сохранить» (правка снимков на бумаге)
 * и «Отозвать». Заявка, документ и отозванная строка — это одна и та же
 * строка сертификата в трёх состояниях, поэтому экран один, а не три.
 *
 * Данные — `GET /admin/certificates/{id}`, действия — `POST .../issue`,
 * `PATCH .../{id}` и `POST .../revoke`. Все четыре отвечают **одной формой**
 * `AdminCertificateCard` = документ плюс предупреждение, и экран
 * перерисовывается ответом целиком (`card.setData`): второй запрос за
 * карточкой рассказал бы то же самое, но с задержкой и лишним мерцанием.
 *
 * Номер сертификата не правится: на нём держится публичная проверка и QR
 * на уже напечатанной бумаге. Учитель, курс и площадка — тоже: смена любого
 * означает другой документ, а не правку этого. Правится только то, что
 * печатается, и то, что админ вписал руками.
 *
 * Повтор регистрационного номера — **предупреждение, а не отказ**: правил
 * чужой нумерации мы не знаем, а запрет остановил бы админа посреди работы.
 * Документ в этот момент уже сохранён, откатывать нечего — поэтому форма
 * не сбрасывается, а предупреждение живёт до следующего действия.
 *
 * **ИИН — самые чувствительные персональные данные, что у нас есть.** Он
 * показывается только через `IinValue` и не уходит ни в адрес страницы,
 * ни в логи, ни в текст ошибки.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminCertificate,
  type AdminCertificateCard,
  type CertificateIssueIn,
  type CertificateLang,
  type CertificatePatchIn,
} from "@lms/api";
import { dayTime } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { fieldErrors } from "@/lib/fieldErrors";
import {
  CertificateStatusBadge,
  certTeacherName,
  IinValue,
} from "@/components/admin/certificatesApi";
import { PlatformChip } from "@/components/admin/platforms";
import { AdminShell } from "@/components/layout/AdminShell";
import { Breadcrumbs, Button, Empty, LinkButton, Note, Sheet } from "@lms/ui";
import { IconArrowLeft, IconCertificate } from "@lms/ui/icons";

/** Что видно в полях формы. Числа и даты живут строками — их печатают. */
interface Form {
  registration_number: string;
  holder_name: string;
  course_title: string;
  hours: string;
  lang: CertificateLang;
  /** Значение `<input type="datetime-local">`, а не ISO. */
  issued_at: string;
}

/** Язык документа — в схеме их ровно два, всё прочее читаем как русский. */
const certLang = (raw: string): CertificateLang => (raw === "kz" ? "kz" : "ru");

/**
 * Смещение Алматы в минутах для конкретного момента.
 *
 * Все даты в проекте показываются по казахстанскому времени, а не по поясу
 * браузера (`@lms/ui/i18n`), и поле правки обязано жить по тем же часам:
 * иначе админ из другого пояса, открыв карточку, увидел бы в поле одно время,
 * а в подписи рядом другое — и, сохранив, сдвинул бы дату **на бумаге**.
 * Считаем через `Intl`, а не константой `+05:00`: константа молча испортится,
 * если страна снова разъедется на два пояса.
 */
function almatyOffsetMin(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** ISO (UTC) → значение `datetime-local` по алматинским часам. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const shifted = new Date(at.getTime() + almatyOffsetMin(at) * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** Значение `datetime-local` → ISO (UTC), считая введённое алматинским. */
function fromLocalInput(value: string): string | null {
  /* `…Z` читает введённое как UTC — это ещё не ответ, а точка отсчёта,
     от которой берём смещение и сдвигаем назад */
  const asIfUtc = Date.parse(`${value}:00Z`);
  if (Number.isNaN(asIfUtc)) return null;
  const offset = almatyOffsetMin(new Date(asIfUtc));
  return new Date(asIfUtc - offset * 60000).toISOString();
}

/** Форма из документа — им же она пересобирается после каждого действия. */
const snapshot = (c: AdminCertificate): Form => ({
  registration_number: c.registration_number,
  holder_name: c.holder_name,
  course_title: c.course_title,
  hours: String(c.hours),
  lang: certLang(c.lang),
  issued_at: toLocalInput(c.issued_at),
});

/**
 * Что именно поменялось. Неприсланное поле сервер понимает как «не трогать»,
 * поэтому шлём только отличия: так `PATCH` не переписывает соседние поля
 * значениями, которых админ не касался.
 */
function changes(c: AdminCertificate, f: Form): CertificatePatchIn {
  const patch: CertificatePatchIn = {};

  /* Пробелы по краям сервер срезает сам — сравниваем уже срезанное,
     иначе лишний пробел выглядел бы правкой, которой не было */
  const reg = f.registration_number.trim();
  if (reg !== c.registration_number) patch.registration_number = reg;

  const holder = f.holder_name.trim();
  if (holder !== c.holder_name) patch.holder_name = holder;

  const title = f.course_title.trim();
  if (title !== c.course_title) patch.course_title = title;

  /* Пустые часы — это не «ноль часов»: в базе поле обязательное, и сервер
     трактует присланный null как «не трогать». Показывать сохранение там,
     где ничего не сохранится, — врать, поэтому пустое просто не уходит
     и вернётся из ответа прежним */
  const hours = Number(f.hours);
  if (f.hours.trim() !== "" && Number.isFinite(hours) && hours !== c.hours) {
    patch.hours = hours;
  }

  if (f.lang !== certLang(c.lang)) patch.lang = f.lang;

  /* Стёртая дата выдачи отменила бы выдачу в обход отзыва — сервер отбивает
     её по полю, и слать null нам незачем */
  if (f.issued_at !== "" && f.issued_at !== toLocalInput(c.issued_at)) {
    const at = fromLocalInput(f.issued_at);
    if (at !== null) patch.issued_at = at;
  }

  return patch;
}

export default function CertificateCardPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const toast = useToast();

  const card = useLoad(() => api<AdminCertificateCard>(`/admin/certificates/${id}`), [id]);

  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "issue" | "save" | "revoke">(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  /* Ответ любого действия — та же карточка: форма пересобирается из неё,
     и «Менять нечего» снова становится правдой без второго запроса */
  useEffect(() => {
    setForm(card.data ? snapshot(card.data.certificate) : null);
    setErrors({});
  }, [card.data]);

  if (card.loading) {
    return (
      <AdminShell title={t.crtCardTitle}>
        <div className="card card-pad row center" style={{ minHeight: 200 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  const data = card.data;
  if (card.error || !data) {
    const missing = card.error?.status === 404;
    return (
      <AdminShell title={t.crtCardTitle}>
        <div className="card">
          <Empty
            title={missing ? t.crtNotFound : t.loadError}
            text={missing ? t.crtNotFoundText : t.loadErrorText}
            action={
              missing ? (
                <LinkButton href="/certificates" variant="secondary">
                  {t.crtToList}
                </LinkButton>
              ) : (
                <Button variant="secondary" onClick={card.reload}>
                  {t.retry}
                </Button>
              )
            }
          />
        </div>
      </AdminShell>
    );
  }

  const c = data.certificate;
  /* Предупреждение приходит только в ответ на запись и живёт ровно столько,
     сколько живёт этот ответ: у карточки, полученной заново, оно уже null */
  const warning = data.warning;
  const f = form ?? snapshot(c);
  const request = c.status === "requested";
  const regFilled = f.registration_number.trim() !== "";
  const patch = changes(c, f);
  const changed = Object.keys(patch).length > 0;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...(prev ?? snapshot(c)), [key]: value }));
    /* Подпись из 422 относилась к прежнему значению — правка её снимает */
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /**
   * Отказ на экран. Текст пишет сервер: свой мы сочинить не можем, не зная,
   * что именно он проверил. `422` ложится подписями под поля, остальное —
   * тостом; после `409` карточка перечитывается, потому что на экране
   * осталась форма, которая уже неверна.
   */
  const fail = (e: unknown, fallback: string) => {
    const fields = fieldErrors(e);
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      return;
    }
    toast(isApiError(e) ? e.message : fallback, "error");
    if (isApiError(e) && e.status === 409) card.reload();
  };

  /**
   * Выдача. Подтверждения нет намеренно: кнопка названа своими словами,
   * а рядом сказано, что произойдёт, — модалка здесь только добавила бы
   * щелчок к действию, ради которого экран и открывали.
   */
  const issue = async () => {
    if (!regFilled || busy) return;
    setBusy("issue");
    try {
      const updated = await api<AdminCertificateCard>(`/admin/certificates/${c.id}/issue`, {
        method: "POST",
        json: {
          registration_number: f.registration_number.trim(),
        } satisfies CertificateIssueIn,
      });
      card.setData(updated);
      toast(t.crtIssuedToast, "success");
    } catch (e) {
      fail(e, t.crtIssueError);
    } finally {
      setBusy(null);
    }
  };

  /** Правка доступна во всех трёх состояниях: опечатку чинят и в отозванном */
  const save = async () => {
    if (!changed || busy) return;
    setBusy("save");
    try {
      const updated = await api<AdminCertificateCard>(`/admin/certificates/${c.id}`, {
        method: "PATCH",
        json: patch,
      });
      card.setData(updated);
      toast(t.crtSavedToast);
    } catch (e) {
      fail(e, t.crtSaveError);
    } finally {
      setBusy(null);
    }
  };

  /** Отзыв — тому, кто уже скачал документ, его не отменить: спрашиваем */
  const revoke = async () => {
    if (busy) return;
    setBusy("revoke");
    try {
      const updated = await api<AdminCertificateCard>(`/admin/certificates/${c.id}/revoke`, {
        method: "POST",
      });
      card.setData(updated);
      setConfirmRevoke(false);
      toast(request ? t.crtRequestRevokedToast : t.crtRevokedToast);
    } catch (e) {
      setConfirmRevoke(false);
      fail(e, t.crtRevokeError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell
      title={certTeacherName(c.teacher)}
      subtitle={c.course_title}
      actions={
        <LinkButton href="/certificates" variant="secondary" size="sm">
          <IconArrowLeft size={16} />
          <span className="hide-sm">{t.crtToList}</span>
        </LinkButton>
      }
    >
      <div className="stack g16" style={{ maxWidth: 760 }}>
        <Breadcrumbs
          items={[
            { label: t.crtTitle, href: "/certificates" },
            /* У заявки номера ещё нет — крошка называет её тем, что она есть */
            { label: c.number ?? t.crtCardRequestTitle },
          ]}
        />

        {/* ===== Учитель: только показ. Сменить его — это другой документ ===== */}
        <section className="card card-pad stack g14">
          <div className="row between wrap g10">
            <h2 className="h3">{t.crtTeacherSection}</h2>
            <CertificateStatusBadge status={c.status} />
          </div>

          {/* ФИО живое — по ссылке уходят в профиль сверить его со снимком */}
          <Link href={`/teachers/${c.teacher.id}`} className="pretty" style={{ fontWeight: 700 }}>
            {certTeacherName(c.teacher)}
          </Link>

          <dl className="stack g10" style={{ margin: 0 }}>
            <FactRow label={t.crtIin}>
              <IinValue iin={c.teacher.iin} />
            </FactRow>
            <FactRow label={t.crtCourse}>
              <span className="small pretty">{c.course_title}</span>
            </FactRow>
            <FactRow label={t.crtPlatform}>
              <PlatformChip platform={c.platform} />
            </FactRow>
          </dl>
        </section>

        {request && <Note kind="info">{t.crtRequestNote}</Note>}

        {/* Правка отозванного разрешена: опечатку чинят и в нём */}
        {c.status === "revoked" && (
          <Note kind="warning">{t.crtRevokedNote(dayTime(c.revoked_at, lang))}</Note>
        )}

        {warning && (
          <Note kind="warning">
            <div className="stack g6">
              <strong className="small">{t.crtWarnTitle}</strong>
              {/* Сообщение сервера как есть: чужой номер называет он */}
              <span className="small pretty">{warning.message}</span>
              <Link href={`/certificates/${warning.certificate_id}`} className="small">
                {t.crtOpen}
              </Link>
              <span className="caption muted-3 pretty">{t.crtWarnHint}</span>
            </div>
          </Note>
        )}

        {/* ===== Документ: снимки на бумаге и то, что вписано руками ===== */}
        <section className="card card-pad stack g14">
          <h2 className="h3">{t.crtDocSection}</h2>

          {/* Поля ввода у номера нет и не будет: на нём держится проверка
              по QR на уже напечатанной бумаге */}
          <div className="field">
            <span className="label">{t.crtNumber}</span>
            {c.number ? (
              <span className="mono">{c.number}</span>
            ) : (
              <span className="caption muted-3">{t.crtNumberNone}</span>
            )}
          </div>

          {/* Правится всегда: у заявки его вводят при выдаче, у выданных
              до 04.09.2026 проставляют задним числом, пустым — стирают
              ошибочный */}
          <div className="field">
            <label className="label" htmlFor="crt-reg">
              {t.crtRegNumber}
            </label>
            <input
              id="crt-reg"
              className={`input${errors.registration_number ? " input-error" : ""}`}
              value={f.registration_number}
              onChange={(e) => set("registration_number", e.target.value)}
              placeholder={t.crtRegNumberPlaceholder}
            />
            <span className="hint">{t.crtRegNumberHint}</span>
            {errors.registration_number && (
              <span className="error-text">{errors.registration_number}</span>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="crt-holder">
              {t.crtHolder}
            </label>
            <input
              id="crt-holder"
              className={`input${errors.holder_name ? " input-error" : ""}`}
              value={f.holder_name}
              onChange={(e) => set("holder_name", e.target.value)}
            />
            <span className="hint">{t.crtHolderHint}</span>
            {errors.holder_name && <span className="error-text">{errors.holder_name}</span>}
          </div>

          <div className="field">
            <label className="label" htmlFor="crt-course">
              {t.crtCourseTitleField}
            </label>
            <input
              id="crt-course"
              className={`input${errors.course_title ? " input-error" : ""}`}
              value={f.course_title}
              onChange={(e) => set("course_title", e.target.value)}
            />
            {errors.course_title && <span className="error-text">{errors.course_title}</span>}
          </div>

          <div className="field">
            <label className="label" htmlFor="crt-hours">
              {t.crtHoursField}
            </label>
            <input
              id="crt-hours"
              type="number"
              min={0}
              className={`input${errors.hours ? " input-error" : ""}`}
              value={f.hours}
              onChange={(e) => set("hours", e.target.value)}
            />
            {errors.hours && <span className="error-text">{errors.hours}</span>}
          </div>

          <div className="field">
            <label className="label" htmlFor="crt-lang">
              {t.crtLangField}
            </label>
            <select
              id="crt-lang"
              className={`input${errors.lang ? " input-error" : ""}`}
              value={f.lang}
              onChange={(e) => set("lang", certLang(e.target.value))}
            >
              <option value="ru">{t.crtLangRuOpt}</option>
              <option value="kz">{t.crtLangKzOpt}</option>
            </select>
            {errors.lang && <span className="error-text">{errors.lang}</span>}
          </div>

          {/* У заявки даты выдачи нет вовсе, и ставит её выдача, а не форма:
              на такую правку сервер отвечает `certificate_not_issued` */}
          {!request && (
            <div className="field">
              <label className="label" htmlFor="crt-issued">
                {t.crtIssuedAtField}
              </label>
              <input
                id="crt-issued"
                type="datetime-local"
                className={`input${errors.issued_at ? " input-error" : ""}`}
                value={f.issued_at}
                onChange={(e) => set("issued_at", e.target.value)}
              />
              {errors.issued_at && <span className="error-text">{errors.issued_at}</span>}
            </div>
          )}

          <Note kind="muted">{t.crtFixedNote}</Note>
        </section>

        {/* ===== Действия ===== */}
        <section className="card card-pad stack g10">
          {request && (
            <>
              <Note kind="info">{t.crtIssueText}</Note>
              <Button
                block
                size="lg"
                icon={<IconCertificate size={18} />}
                disabled={!regFilled || busy !== null}
                loading={busy === "issue"}
                onClick={issue}
              >
                {t.crtIssueBtn}
              </Button>
              {!regFilled && <span className="caption muted-3 pretty">{t.crtRegRequired}</span>}
            </>
          )}

          <Button
            variant="secondary"
            block
            disabled={!changed || busy !== null}
            loading={busy === "save"}
            onClick={save}
          >
            {t.crtSaveBtn}
          </Button>
          {!changed && <span className="caption muted-3">{t.crtNothingChanged}</span>}

          {/* У отозванной строки кнопки нет: повторный отзыв ничего не меняет,
              время остаётся временем первого */}
          {c.status !== "revoked" && (
            <Button
              variant="danger"
              block
              disabled={busy !== null}
              onClick={() => setConfirmRevoke(true)}
            >
              {request ? t.crtRevokeRequestBtn : t.crtRevokeBtn}
            </Button>
          )}
        </section>
      </div>

      <Sheet
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title={request ? t.crtRevokeRequestTitle : t.crtRevokeTitle}
        footer={
          <div className="stack g8">
            <Button variant="danger" block size="lg" loading={busy === "revoke"} onClick={revoke}>
              {t.crtRevokeConfirm}
            </Button>
            <Button variant="secondary" block onClick={() => setConfirmRevoke(false)}>
              {t.cancel}
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">{request ? t.crtRevokeRequestText : t.crtRevokeText}</p>
      </Sheet>

      <style>{`
        @media (max-width: 700px) { .hide-sm { display: none; } }
      `}</style>
    </AdminShell>
  );
}

/** Строка «подпись — значение» в блоке про учителя: показ, а не поле ввода. */
function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="row between g10" style={{ alignItems: "flex-start" }}>
      <dt className="caption muted nowrap">{label}</dt>
      <dd className="small" style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>
        {children}
      </dd>
    </div>
  );
}
