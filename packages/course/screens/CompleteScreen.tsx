"use client";

/**
 * Завершение курса «/courses/:id/complete» — раздел 5.10 брифа. Праздничный экран.
 *
 * С 04.09.2026 сертификат выписывает админ руками (`CERTIFICATES_BRIEF`), поэтому
 * при открытии экран только читает состояние — `GET /courses/{id}/completion`.
 * Заявку создаёт `POST /courses/{id}/certificate`, и он ушёл под кнопку: ручка
 * больше не выдаёт документ идемпотентно, а заводит заявку, и вызов на открытии
 * плодил бы заявки каждому, кто просто зашёл на этот адрес.
 *
 * Состояния три: можно просить — кнопка; заявка подана — ждём админа; документ
 * выдан — лист, «Скачать» и «Поделиться». У заявки листа нет: документа
 * ещё не существует, и печатать в ней нечего.
 *
 * Отказ — не «что-то пошло не так», а понятная причина: чего не хватает
 * в чек-листе (`conditions_not_met`), незавершённая попытка теста, пустые
 * фамилия и имя в профиле, незаполненный ИИН или закрытый доступ.
 *
 * Оценка и отзыв уходят одним `POST /courses/{id}/reviews`. Премодерации нет:
 * отзыв виден на странице курса сразу, админ отвечает или удаляет постфактум.
 */

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  api,
  isApiError,
  useLoad,
  useMe,
  type ApiError,
  type CatalogOut,
  type CertificateState,
  type Completion,
  type Condition,
  type MyCertificates,
  type Review,
} from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useOrigin } from "@lms/ui/useOrigin";
import { useChrome, useRoutes } from "../host";
import { CertificateSheet } from "../components/CertificateSheet";
import { CourseRow, pickVersion } from "../components/CourseCard";
import { ConditionRow } from "../components/CourseProgram";
import { useCertificatePdf } from "../lib/certificatePdf";
import { Button, Empty, LinkButton, Note, Skeleton } from "@lms/ui";
import { IconCheck, IconDownload, IconShare, IconStar } from "@lms/ui/icons";

/** Длиннее 2000 символов сервер отдаёт 422 — не даём набрать заведомо лишнее. */
const REVIEW_MAX = 2000;

export function CompleteScreen({ courseId: id }: { courseId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang } = useLang();
  const toast = useToast();
  const routes = useRoutes();
  const { Shell } = useChrome();
  const { me, status } = useMe();
  const { verifyUrl } = useOrigin(routes.verifyOrigin);
  const { downloading, download } = useCertificatePdf();

  /* «Что пройти дальше» — живой каталог */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);

  /* Чек-лист, право просить и строка сертификата — одним запросом. Гостю
     не читаем: он уедет на вход соседним эффектом */
  const completion = useLoad<Completion | null>(
    () =>
      me
        ? api<Completion>(`/courses/${encodeURIComponent(id)}/completion`)
        : Promise.resolve(null),
    [id, me?.id],
  );

  const [requesting, setRequesting] = useState(false);
  /* ФИО и ИИН сервер проверяет только в момент нажатия, поэтому этот отказ
     живёт рядом с кнопкой, а не подменяет собой весь экран */
  const [profileFail, setProfileFail] = useState<ApiError | null>(null);

  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (status === "guest") router.replace(routes.login(pathname));
  }, [status, router, pathname]);

  /* Сессия умерла между `/me` и чтением состояния — на вход, а не в отказ */
  useEffect(() => {
    if (isApiError(completion.error, "unauthorized")) router.replace(routes.login(pathname));
  }, [completion.error, router, pathname]);

  const certificate = completion.data?.certificate ?? null;
  const issuedId = certificate?.status === "issued" ? certificate.id : null;

  /* Лист печатается из `MyCertificate`: ни ФИО, ни курса, ни часов в состоянии
     строки нет. Заявке этот запрос не нужен — печатать ещё нечего */
  const issued = useLoad<MyCertificates | null>(
    () => (issuedId === null ? Promise.resolve(null) : api<MyCertificates>("/me/certificates")),
    [issuedId],
  );
  const cert = issued.data?.items.find((c) => c.id === issuedId) ?? null;

  /* Отзыв уходит один раз: повторно тот же экран его не шлёт, а вернуться
     и написать второй — право учителя, в среднюю оценку идёт последний */
  const sendReview = async () => {
    if (sending || !stars) return;
    setSending(true);
    try {
      await api<Review>(`/courses/${encodeURIComponent(id)}/reviews`, {
        method: "POST",
        json: { rating: stars, text: review.trim() },
      });
      setSent(true);
      toast(t.cmpReviewToast, "success");
    } catch (e) {
      toast(isApiError(e) ? e.message : t.loadErrorText, "error");
    } finally {
      setSending(false);
    }
  };

  const requestCertificate = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const state = await api<CertificateState>(
        `/courses/${encodeURIComponent(id)}/certificate`,
        { method: "POST" },
      );
      setProfileFail(null);
      /* Ответ — та же строка, что отдаёт `completion`: перечитывать нечего */
      completion.setData((d) => (d ? { ...d, certificate: state, can_request: false } : d));
    } catch (e) {
      if (isApiError(e, "iin_required") || isApiError(e, "profile_incomplete")) {
        setProfileFail(e);
      } else if (isApiError(e)) {
        /* Условия могли разъехаться, пока экран был открыт: читаем свежий чек-лист */
        toast(e.message, "error");
        completion.reload();
      } else {
        toast(t.cmpRequestError, "error");
      }
    } finally {
      setRequesting(false);
    }
  };

  if (!me || completion.loading) {
    return (
      <Shell>
        <div className="page section" style={{ paddingTop: 40 }}>
          <div
            className="card card-pad stack g12"
            style={{ alignItems: "center", padding: 40, maxWidth: 620, margin: "0 auto" }}
          >
            <span className="spinner" style={{ width: 30, height: 30, color: "var(--primary)" }} />
          </div>
        </div>
      </Shell>
    );
  }

  if (!completion.data) return <IssueFailed courseId={id} error={completion.error} />;

  const { can_request, blocker, conditions } = completion.data;

  /* Документа нет и просить нельзя: объясняет либо помеха от сервера,
     либо незакрытый чек-лист. Отзыв и «что дальше» здесь ни при чём —
     курс ещё не пройден */
  if (!certificate && !can_request) {
    return (
      <NotIssued
        title={t.cmpNotIssued}
        text={blocker?.message}
        conditions={blocker ? null : conditions}
        action={
          <LinkButton href={routes.course(id)} variant="secondary">
            {t.cmpToProgram}
          </LinkButton>
        }
      />
    );
  }

  const next = (catalog.data?.items ?? []).map((g) => pickVersion(g, lang)).slice(0, 3);

  const allCerts = routes.certificates && (
    <LinkButton href={routes.certificates} variant="ghost" block>
      {t.cmpAllCerts}
    </LinkButton>
  );

  return (
    <Shell>
      <div className="page section stack g32" style={{ paddingTop: 24 }}>
        {/* Поздравление */}
        <section className="stack g16" style={{ alignItems: "center", textAlign: "center" }}>
          <div className="confetti-wrap">
            <span
              style={{
                width: 76,
                height: 76,
                borderRadius: 999,
                background: "var(--success)",
                color: "var(--text-on-fill)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-success)",
              }}
            >
              <IconCheck size={38} />
            </span>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="confetti" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>

          <div className="stack g8">
            <h1 className="h1">{t.cmpTitle}</h1>
            {/* Название курса и часы живут только в выданном документе:
                в `completion` их нет, а отдельный запрос за курсом ради
                подзаголовка того не стоит */}
            {cert && (
              <p className="body muted pretty" style={{ maxWidth: 520 }}>
                {t.cmpSub(cert.course_title, cert.hours)}
              </p>
            )}
          </div>
        </section>

        {certificate?.status === "issued" ? (
          /* Сертификат — тот же документ, что на «/certificates/:id», не миниатюра:
             человек только что его получил и хочет видеть ФИО, часы, номер и QR.
             Ширина шире остальных секций: у макета A4 свои пропорции, и на 620px
             подписи в подвале мельчают до нечитаемых */
          <section style={{ maxWidth: 900, margin: "0 auto", width: "100%" }} className="stack g16">
            {issued.loading ? (
              <Skeleton h={0} style={{ aspectRatio: "297/210", height: "auto" }} />
            ) : (
              /* Документа в списке нет — его отозвали между двумя запросами или он
                 с другой площадки. Пустой лист рисовать нечем, поздравление остаётся */
              cert && (
                <>
                  <div className="card" style={{ padding: 12, background: "var(--surface-sunken)" }}>
                    <CertificateSheet cert={cert} />
                  </div>
                  <div className="row g10 wrap">
                    <Button
                      block
                      size="lg"
                      icon={<IconDownload size={18} />}
                      loading={downloading}
                      onClick={() => download(cert)}
                    >
                      {t.cmpDownload}
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      icon={<IconShare size={18} />}
                      onClick={() => {
                        navigator.clipboard?.writeText(verifyUrl(cert.number));
                        toast(t.certLinkCopied, "success");
                      }}
                    >
                      {t.share}
                    </Button>
                  </div>
                </>
              )
            )}
            {allCerts}
          </section>
        ) : (
          <section style={{ maxWidth: 620, margin: "0 auto", width: "100%" }} className="stack g16">
            {certificate ? (
              <>
                {/* Заявка подана: просить второй раз нечего, сроков не обещаем —
                    документ выдаёт живой человек */}
                <Note kind="info">
                  <strong style={{ display: "block", marginBottom: 4 }}>
                    {t.cmpRequestedTitle}
                  </strong>
                  {t.cmpRequestedText}
                </Note>
                {allCerts}
              </>
            ) : (
              <>
                <Button size="lg" block loading={requesting} onClick={requestCertificate}>
                  {t.certGet}
                </Button>
                {profileFail && (
                  <div className="stack g10">
                    <Note kind="warning">{profileFail.message}</Note>
                    {/* Два разных отказа — две разные дороги: ИИН правится
                        в онбординге, а не в профиле, и `pathname` возвращает
                        человека ровно сюда, к той же кнопке. В предпросмотре
                        админки онбординга нет — там остаётся профиль */}
                    {isApiError(profileFail, "iin_required") && routes.onboarding ? (
                      <LinkButton href={routes.onboarding(pathname)} variant="secondary" block>
                        {t.cmpFillIin}
                      </LinkButton>
                    ) : (
                      routes.profile && (
                        <LinkButton href={routes.profile} variant="secondary" block>
                          {t.cmpFillProfile}
                        </LinkButton>
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Оценка курса */}
        <section style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
          <div className="card card-pad stack g14">
            <h2 className="h3">{t.cmpRate}</h2>
            {sent ? (
              /* Премодерации нет — отзыв виден на странице курса сразу */
              <Note kind="success">{t.cmpReviewSent}</Note>
            ) : (
              <>
                <div className="row g6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setStars(s)}
                      aria-label={t.cmpRateStar(s)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: (hover || stars) >= s ? "var(--warning)" : "var(--border-strong)",
                      }}
                    >
                      <IconStar size={32} filled={(hover || stars) >= s} strokeWidth={1.4} />
                    </button>
                  ))}
                </div>
                <textarea
                  className="input"
                  placeholder={t.cmpReviewPlaceholder}
                  value={review}
                  maxLength={REVIEW_MAX}
                  onChange={(e) => setReview(e.target.value)}
                />
                <Button disabled={!stars} loading={sending} onClick={sendReview}>
                  {t.cmpSendReview}
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Что дальше */}
        {next.length > 0 && (
          <section className="stack g16">
            <h2 className="h2">{t.cmpNext}</h2>
            <div className="stack g10 next-list">
              {next.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </div>
            {routes.catalog && (
              <LinkButton href={routes.catalog} variant="secondary" block>
                {t.openCatalog}
              </LinkButton>
            )}
          </section>
        )}
      </div>

      <style>{`
        .confetti-wrap { position: relative; display: inline-flex; }
        .confetti {
          position: absolute; top: 50%; left: 50%;
          width: 7px; height: 12px; border-radius: 2px;
          background: hsl(calc(var(--i) * 47), 78%, 60%);
          animation: burst 1.1s cubic-bezier(.2,.7,.3,1) forwards;
          animation-delay: calc(var(--i) * 24ms);
          opacity: 0;
        }
        @keyframes burst {
          0% { transform: translate(-50%,-50%) rotate(0deg); opacity: 1; }
          100% {
            transform:
              translate(calc(-50% + cos(calc(var(--i) * 25.7deg)) * 130px),
                        calc(-50% + sin(calc(var(--i) * 25.7deg)) * 130px))
              rotate(320deg);
            opacity: 0;
          }
        }
        @media (min-width: 900px) {
          .next-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
      `}</style>
    </Shell>
  );
}

/* ============ Сертификата нет ============ */

/**
 * Одна раскладка на два случая: сервер отказал и «условия ещё не закрыты».
 * Заголовок, объяснение и дорога дальше приходят снаружи — причину в обоих
 * случаях формулирует сервер, а чего именно не хватает, показывает чек-лист
 * теми же строками, что на странице курса.
 */
function NotIssued({
  title,
  text,
  action,
  conditions,
}: {
  title: string;
  text?: string;
  action: ReactNode;
  conditions: Condition[] | null;
}) {
  const { t } = useLang();
  const { Shell } = useChrome();

  return (
    <Shell>
      <div className="page section" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }} className="stack g16">
          <div className="card">
            <Empty title={title} text={text} action={action} />
          </div>

          {conditions && conditions.length > 0 && (
            <div className="card card-pad stack g12">
              <h2 className="h3">{t.cmpConditionsLeft}</h2>
              <div className="stack g10">
                {conditions.map((c) => (
                  <ConditionRow key={c.code} condition={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

/**
 * Каждому отказу — своё объяснение и своя дорога дальше. Причину пишет сервер,
 * экран добавляет заголовок и кнопку: у `conditions_not_met` — чек-лист
 * из `details.conditions`, у `profile_incomplete` — путь в профиль.
 */
function IssueFailed({ courseId, error }: { courseId: string; error: ApiError | null }) {
  const { t } = useLang();
  const routes = useRoutes();
  const conditions =
    isApiError(error, "conditions_not_met") && Array.isArray(error.details.conditions)
      ? (error.details.conditions as Condition[])
      : null;

  /* Нет курса, черновик или скрытый — как на странице курса */
  const notFound = error?.status === 404 || error?.status === 422;
  /* Сеть не ответила (status 0) — это «не удалось загрузить», а не отказ */
  const refusal = error && error.status > 0 ? error : null;

  return (
    <NotIssued
      title={!refusal ? t.loadError : notFound ? t.courseNotFound : t.cmpNotIssued}
      text={refusal ? refusal.message : t.loadErrorText}
      conditions={conditions}
      action={
        notFound && routes.catalog ? (
          <LinkButton href={routes.catalog} variant="secondary">
            {t.openCatalog}
          </LinkButton>
        ) : isApiError(error, "profile_incomplete") && routes.profile ? (
          <LinkButton href={routes.profile} variant="secondary">
            {t.cmpFillProfile}
          </LinkButton>
        ) : (
          <LinkButton href={routes.course(courseId)} variant="secondary">
            {t.cmpToProgram}
          </LinkButton>
        )
      }
    />
  );
}
