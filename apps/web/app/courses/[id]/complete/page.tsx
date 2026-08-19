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
 */

import { useParams, useRouter, usePathname } from "next/navigation";
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
} from "@lms/api";
import { useStore } from "@lms/prototype";
import { useOrigin } from "@lms/ui/useOrigin";
import { TeacherShell } from "@/components/layout/Shell";
import { CertificateThumb } from "@/components/course/CertificateSheet";
import { CourseRow, pickVersion } from "@/components/course/CourseCard";
import { ConditionRow } from "@/components/course/CourseProgram";
import { Button, Empty, LinkButton, Note } from "@lms/ui";
import { IconCheck, IconDownload, IconShare, IconStar } from "@lms/ui/icons";

export default function CompletePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang, rateCourse, ratings, toast } = useStore();
  const { me, status } = useMe();
  const { verifyUrl } = useOrigin();

  /* «Что пройти дальше» — живой каталог */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);

  const [cert, setCert] = useState<Certificate | null>(null);
  const [fail, setFail] = useState<ApiError | null>(null);
  const [issuing, setIssuing] = useState(true);

  const [stars, setStars] = useState(ratings[id] ?? 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (status === "guest") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

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
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
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
      <TeacherShell>
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
      </TeacherShell>
    );
  }

  if (!cert) return <IssueFailed courseId={id} error={fail} />;

  const next = (catalog.data?.items ?? []).map((g) => pickVersion(g, lang)).slice(0, 3);

  return (
    <TeacherShell>
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
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 32px rgba(22,163,74,.34)",
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

        {/* Сертификат */}
        <section style={{ maxWidth: 620, margin: "0 auto", width: "100%" }} className="stack g16">
          <CertificateThumb cert={cert} />
          <div className="row g10 wrap">
            <Button
              block
              size="lg"
              icon={<IconDownload size={18} />}
              onClick={() => toast(t.certPdfToast, "success")}
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
          <LinkButton href="/certificates" variant="ghost" block>
            {t.cmpAllCerts}
          </LinkButton>
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
                      onClick={() => {
                        setStars(s);
                        rateCourse(id, s);
                      }}
                      aria-label={`Оценка ${s}`}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: (hover || stars) >= s ? "#f59e0b" : "var(--border-strong)",
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
                  onChange={(e) => setReview(e.target.value)}
                />
                <Button
                  disabled={!stars}
                  onClick={() => {
                    setSent(true);
                    toast(t.cmpReviewToast, "success");
                  }}
                >
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
            <LinkButton href="/courses" variant="secondary" block>
              {t.openCatalog}
            </LinkButton>
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
    </TeacherShell>
  );
}

/* ============ Сертификат не выдан ============ */

/**
 * Каждому отказу — своё объяснение и своя дорога дальше. Причину пишет сервер,
 * экран добавляет заголовок и кнопку: у `conditions_not_met` — чек-лист
 * из `details.conditions`, у `profile_incomplete` — путь в профиль.
 */
function IssueFailed({ courseId, error }: { courseId: string; error: ApiError | null }) {
  const { t } = useStore();
  const conditions =
    isApiError(error, "conditions_not_met") && Array.isArray(error.details.conditions)
      ? (error.details.conditions as Condition[])
      : null;

  /* Нет курса, черновик или скрытый — как на странице курса */
  const notFound = error?.status === 404 || error?.status === 422;
  /* Сеть не ответила (status 0) — это «не удалось загрузить», а не отказ */
  const refusal = error && error.status > 0 ? error : null;

  return (
    <TeacherShell>
      <div className="page section" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }} className="stack g16">
          <div className="card">
            <Empty
              title={!refusal ? t.loadError : notFound ? t.courseNotFound : t.cmpNotIssued}
              text={refusal ? refusal.message : t.loadErrorText}
              action={
                notFound ? (
                  <LinkButton href="/courses" variant="secondary">
                    {t.openCatalog}
                  </LinkButton>
                ) : isApiError(error, "profile_incomplete") ? (
                  <LinkButton href="/profile" variant="secondary">
                    {t.cmpFillProfile}
                  </LinkButton>
                ) : (
                  <LinkButton href={`/courses/${courseId}`} variant="secondary">
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
    </TeacherShell>
  );
}
