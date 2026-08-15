"use client";

/** Завершение курса «/courses/:id/complete» — раздел 5.10 брифа. Праздничный экран. */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { courses, demoCertificate, getCourse } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { useOrigin } from "@lms/ui/useOrigin";
import { TeacherShell } from "@/components/layout/Shell";
import { CertificateThumb } from "@/components/course/CertificateSheet";
import { CourseRow } from "@/components/course/CourseCard";
import { Button, Empty, LinkButton, Note } from "@lms/ui";
import {
  IconCheck,
  IconDownload,
  IconShare,
  IconStar,
} from "@lms/ui/icons";

export default function CompletePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { issueCert, certs, rateCourse, ratings, toast } = useStore();
  const { verifyUrl } = useOrigin();

  const course = getCourse(id);
  const [stars, setStars] = useState(ratings[id] ?? 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [sent, setSent] = useState(false);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setGenerating(false);
      issueCert(id);
    }, 1400);
    return () => clearTimeout(t);
  }, [id, issueCert]);

  if (!course) {
    return (
      <TeacherShell>
        <div className="page section">
          <div className="card">
            <Empty
              title="Курс не найден"
              action={
                <LinkButton href="/courses" variant="secondary">
                  В каталог
                </LinkButton>
              }
            />
          </div>
        </div>
      </TeacherShell>
    );
  }

  const cert = { ...demoCertificate, courseId: course.id, courseTitle: course.title, hours: course.hours };
  const next = courses.filter((c) => c.id !== course.id).slice(0, 3);

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
            <h1 className="h1">Поздравляем! Курс пройден</h1>
            <p className="body muted pretty" style={{ maxWidth: 520 }}>
              «{course.title}» · {course.hours} академических часов. Сертификат уже
              в вашем профиле.
            </p>
          </div>
        </section>

        {/* Сертификат */}
        <section style={{ maxWidth: 620, margin: "0 auto", width: "100%" }} className="stack g16">
          {generating ? (
            <div className="card card-pad stack g12" style={{ alignItems: "center", padding: 40 }}>
              <span className="spinner" style={{ width: 30, height: 30, color: "var(--primary)" }} />
              <strong>Готовим сертификат…</strong>
              <span className="small muted-3">Обычно занимает несколько секунд</span>
            </div>
          ) : (
            <>
              <CertificateThumb cert={cert} />
              <div className="row g10 wrap">
                <Button
                  block
                  size="lg"
                  icon={<IconDownload size={18} />}
                  onClick={() => toast("Сертификат скачивается в PDF", "success")}
                >
                  Скачать сертификат
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<IconShare size={18} />}
                  onClick={() => {
                    navigator.clipboard?.writeText(verifyUrl(cert.number));
                    toast("Ссылка для проверки скопирована", "success");
                  }}
                >
                  Поделиться
                </Button>
              </div>
              <LinkButton href="/certificates" variant="ghost" block>
                Все мои сертификаты
              </LinkButton>
            </>
          )}
        </section>

        {/* Оценка курса */}
        <section style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
          <div className="card card-pad stack g14">
            <h2 className="h3">Оцените курс</h2>
            {sent ? (
              <Note kind="success">
                Спасибо! Отзыв отправлен на модерацию — появится на странице курса
                после проверки.
              </Note>
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
                        rateCourse(course.id, s);
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
                  placeholder="Что было полезно, чего не хватило? Ваш отзыв увидят другие учителя"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                />
                <Button
                  disabled={!stars}
                  onClick={() => {
                    setSent(true);
                    toast("Отзыв отправлен", "success");
                  }}
                >
                  Отправить отзыв
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Что дальше */}
        <section className="stack g16">
          <h2 className="h2">Что пройти дальше</h2>
          <div className="stack g10 next-list">
            {next.map((c) => (
              <CourseRow key={c.id} course={c} />
            ))}
          </div>
          <LinkButton href="/courses" variant="secondary" block>
            Открыть каталог
          </LinkButton>
        </section>
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
