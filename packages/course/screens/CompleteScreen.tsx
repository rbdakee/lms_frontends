"use client";

/**
 * Завершение курса «/courses/:id/complete» — раздел 5.10 брифа. Праздничный экран.
 *
 * Сертификат выдаёт `POST /courses/{id}/certificate` при открытии экрана.
 * Выдача идемпотентна: повторный вызов отдаёт тот же документ и `200`,
 * поэтому F5 экран не ломает и «выдастся второй» здесь невозможно.
 *
 * Отказ — не «что-то пошло не так», а понятная причина: чего не хватает
 * в чек-листе (`conditions_not_met`), незавершённая попытка теста, пустые
 * фамилия и имя в профиле или закрытый доступ.
 *
 * Оценка и отзыв уходят одним `POST /courses/{id}/reviews`. Премодерации нет:
 * отзыв виден на странице курса сразу, админ отвечает или удаляет постфактум.
 */

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  ApiError,
  isApiError,
  useLoad,
  useMe,
  type CatalogOut,
  type Certificate,
  type Condition,
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
import { Button, Empty, LinkButton, Note } from "@lms/ui";
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

  const [cert, setCert] = useState<Certificate | null>(null);
  const [fail, setFail] = useState<ApiError | null>(null);
  const [issuing, setIssuing] = useState(true);

  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (status === "guest") router.replace(routes.login(pathname));
  }, [status, router, pathname]);

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

  useEffect(() => {
    if (!me) return;
    let alive = true;
    setIssuing(true);
    api<Certificate>(`/courses/${encodeURIComponent(id)}/certificate`, { method: "POST" })
      .then(
        (c) => {
          if (!alive) return;
          setCert(c);
          setFail(null);
        },
        (e) => {
          if (!alive) return;
          /* Сессия умерла между /me и выдачей — на вход, а не в отказ */
          if (isApiError(e, "unauthorized")) {
            router.replace(routes.login(pathname));
            return;
          }
          setCert(null);
          setFail(e instanceof ApiError ? e : null);
        },
      )
      .then(() => alive && setIssuing(false));
    return () => {
      alive = false;
    };
  }, [id, me, router, pathname]);

  if (!me || issuing) {
    return (
      <Shell>
        <div className="page section" style={{ paddingTop: 40 }}>
          <div
            className="card card-pad stack g12"
            style={{ alignItems: "center", padding: 40, maxWidth: 620, margin: "0 auto" }}
          >
            <span className="spinner" style={{ width: 30, height: 30, color: "var(--primary)" }} />
            <strong>{t.cmpIssuing}</strong>
            <span className="small muted-3">{t.cmpIssuingHint}</span>
          </div>
        </div>
      </Shell>
    );
  }

  if (!cert) return <IssueFailed courseId={id} error={fail} />;

  const next = (catalog.data?.items ?? []).map((g) => pickVersion(g, lang)).slice(0, 3);

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
            <p className="body muted pretty" style={{ maxWidth: 520 }}>
              {t.cmpSub(cert.course_title, cert.hours)}
            </p>
          </div>
        </section>

        {/* Сертификат — тот же документ, что на «/certificates/:id», не миниатюра:
            человек только что его получил и хочет видеть ФИО, часы, номер и QR.
            Ширина шире остальных секций: у макета A4 свои пропорции, и на 620px
            подписи в подвале мельчают до нечитаемых */}
        <section style={{ maxWidth: 900, margin: "0 auto", width: "100%" }} className="stack g16">
          <div className="card" style={{ padding: 12, background: "var(--bg)" }}>
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
          {routes.certificates && (
            <LinkButton href={routes.certificates} variant="ghost" block>
              {t.cmpAllCerts}
            </LinkButton>
          )}
        </section>

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
                      aria-label={`Оценка ${s}`}
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

/* ============ Сертификат не выдан ============ */

/**
 * Каждому отказу — своё объяснение и своя дорога дальше. Причину пишет сервер,
 * экран добавляет заголовок и кнопку: у `conditions_not_met` — чек-лист
 * из `details.conditions`, у `profile_incomplete` — путь в профиль.
 */
function IssueFailed({ courseId, error }: { courseId: string; error: ApiError | null }) {
  const { t } = useLang();
  const routes = useRoutes();
  const { Shell } = useChrome();
  const conditions =
    isApiError(error, "conditions_not_met") && Array.isArray(error.details.conditions)
      ? (error.details.conditions as Condition[])
      : null;

  /* Нет курса, черновик или скрытый — как на странице курса */
  const notFound = error?.status === 404 || error?.status === 422;
  /* Сеть не ответила (status 0) — это «не удалось загрузить», а не отказ */
  const refusal = error && error.status > 0 ? error : null;

  return (
    <Shell>
      <div className="page section" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }} className="stack g16">
          <div className="card">
            <Empty
              title={!refusal ? t.loadError : notFound ? t.courseNotFound : t.cmpNotIssued}
              text={refusal ? refusal.message : t.loadErrorText}
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
          </div>

          {/* Чего именно не хватает — теми же строками, что на странице курса */}
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
