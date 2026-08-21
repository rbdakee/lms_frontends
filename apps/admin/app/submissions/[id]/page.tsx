"use client";

/**
 * Карточка проверки работы «/submissions/:id» — раздел 5.21 брифа.
 * Условие слева, работа справа. Комментарий обязателен для «на доработку»:
 * без него учитель не поймёт, что исправлять, — поэтому кнопка заблокирована
 * ещё до отправки, а сервер проверяет это своей `422`.
 *
 * Данные — `GET /admin/submissions/{id}`, вердикт — `POST .../review`.
 * Ссылки на файлы сдачи постоянные и приходят готовыми: их не подписывают,
 * байты отдаются с проверкой сессии — автору и админам.
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminSubmissionCard,
  type SubmissionReviewIn,
  type SubmissionVerdict,
} from "@lms/api";
import { dayTime, fileSize } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import {
  nextPendingId,
  SubmissionStatusBadge,
  teacherName,
  TeacherAvatar,
} from "@/components/admin/submissionsApi";
import { Waiting } from "@/components/admin/Waiting";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  Accordion,
  Badge,
  Breadcrumbs,
  Button,
  Empty,
  FileRow,
  fileType,
  LinkButton,
  Note,
} from "@lms/ui";
import { IconArrowLeft, IconArrowRight, IconCheck, IconExternal } from "@lms/ui/icons";

/** Порог краснеющего ожидания у работ — три дня, как в очереди. */
const RED_AFTER_DAYS = 3;

type Files = AdminSubmissionCard["files"];

export default function SubmissionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useLang();
  const toast = useToast();

  const card = useLoad(() => api<AdminSubmissionCard>(`/admin/submissions/${id}`), [id]);

  const [verdict, setVerdict] = useState<SubmissionVerdict | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<null | "save" | "next">(null);

  if (card.loading) {
    return (
      <AdminShell title={t.subCardTitle}>
        <div className="card card-pad row center" style={{ minHeight: 200 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      </AdminShell>
    );
  }

  const s = card.data;
  if (card.error || !s) {
    const missing = card.error?.status === 404;
    return (
      <AdminShell title={t.subCardTitle}>
        <div className="card">
          <Empty
            title={missing ? t.subNotFound : t.loadError}
            text={missing ? t.subNotFoundText : t.loadErrorText}
            action={
              missing ? (
                <LinkButton href="/submissions" variant="secondary">
                  {t.subToQueue}
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

  const teacher = teacherName(s.teacher);
  const reviewed = s.status !== "pending";
  const reworkBlocked = verdict === "rework" && !comment.trim();
  const statementHtml =
    typeof s.task.statement?.html === "string" ? s.task.statement.html : null;

  /**
   * Вердикт ставится один раз: `409` означает, что кто-то из админов успел
   * раньше — показываем его сообщение и перечитываем карточку, чтобы на экране
   * оказался уже стоящий вердикт, а не форма.
   */
  const save = async (goNext: boolean) => {
    if (!verdict || reworkBlocked || busy) return;
    setBusy(goNext ? "next" : "save");
    try {
      const updated = await api<AdminSubmissionCard>(`/admin/submissions/${s.id}/review`, {
        method: "POST",
        json: { verdict, comment: comment.trim() || null } satisfies SubmissionReviewIn,
      });
      card.setData(updated);
      toast(
        verdict === "accepted" ? t.subAcceptedToast : t.subReworkToast,
        verdict === "accepted" ? "success" : "info",
      );
      if (!goNext) {
        router.push("/submissions");
        return;
      }
      const next = await nextPendingId(updated.id);
      if (next) {
        router.push(`/submissions/${next}`);
      } else {
        toast(t.subQueueEmptyToast, "info");
        router.push("/submissions");
      }
    } catch (e) {
      if (isApiError(e, "already_reviewed")) {
        toast(e.message, "info");
        card.reload();
      } else {
        toast(isApiError(e) ? e.message : t.subSaveError, "error");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell
      title={teacher}
      subtitle={`${s.task.title} · ${s.course.title}`}
      actions={
        <LinkButton href="/submissions" variant="secondary" size="sm">
          <IconArrowLeft size={16} />
          <span className="hide-sm">{t.subToQueue}</span>
        </LinkButton>
      }
    >
      <div className="stack g16">
        <Breadcrumbs
          items={[{ label: t.subTitle, href: "/submissions" }, { label: s.task.title }]}
        />

        {/* ===== Шапка работы ===== */}
        <div className="card card-pad row g14 wrap">
          <TeacherAvatar teacher={s.teacher} size={48} />
          <div className="grow stack g4" style={{ minWidth: 200 }}>
            <strong className="pretty">{teacher}</strong>
            <span className="caption muted">
              {s.course.title} · {t.subSent.toLowerCase()} {dayTime(s.created_at, lang)}
            </span>
          </div>
          <div className="row wrap g8">
            {s.attempt_number > 1 && (
              <Badge kind="rework">{t.subAttempt(s.attempt_number)}</Badge>
            )}
            {!reviewed && <Waiting days={s.waiting_days} redAfter={RED_AFTER_DAYS} />}
            <SubmissionStatusBadge status={s.status} />
          </div>
        </div>

        <div className="review-two">
          {/* ===== Условие ===== */}
          <section className="card card-pad stack g14">
            <h2 className="h3">{t.subStatement}</h2>
            {statementHtml ? (
              <article
                className="task-statement stack g12"
                dangerouslySetInnerHTML={{ __html: statementHtml }}
              />
            ) : (
              <p className="small muted">{s.task.title}</p>
            )}

            {s.task.template_file && (
              <div className="stack g8">
                <hr className="divider" />
                <strong className="small">{t.subTemplate}</strong>
                <FileRow
                  type={fileType(s.task.template_file.mime)}
                  name={s.task.template_file.name}
                  size={fileSize(s.task.template_file.size_bytes)}
                />
                <span className="caption muted-3">{t.subTemplateHint}</span>
              </div>
            )}
          </section>

          {/* ===== Работа ===== */}
          <section className="stack g16">
            <div className="card card-pad stack g14">
              <h2 className="h3">{t.subWork}</h2>
              {s.text ? (
                <p className="body pretty" style={{ whiteSpace: "pre-wrap" }}>
                  {s.text}
                </p>
              ) : (
                <p className="small muted">{t.subNoText}</p>
              )}
              <SubmissionFiles files={s.files} />
            </div>

            {/* ===== Решение ===== */}
            {reviewed ? (
              <div className="card card-pad stack g12">
                <div className="row between wrap g10">
                  <h2 className="h3">{t.subReviewed}</h2>
                  <SubmissionStatusBadge status={s.status} />
                </div>
                {s.comment && (
                  <p className="body pretty" style={{ whiteSpace: "pre-wrap" }}>
                    {s.comment}
                  </p>
                )}
                {s.reviewed_at && (
                  <span className="caption muted-3">
                    {t.subReviewedAt(dayTime(s.reviewed_at, lang))}
                  </span>
                )}
                <LinkButton href="/submissions" variant="secondary">
                  {t.subToQueue}
                </LinkButton>
              </div>
            ) : (
              <div className="card card-pad stack g14">
                <h2 className="h3">{t.subVerdict}</h2>

                <div className="row g10">
                  <Button
                    variant={verdict === "accepted" ? "success" : "secondary"}
                    block
                    icon={<IconCheck size={17} />}
                    onClick={() => setVerdict("accepted")}
                  >
                    {t.subAccept}
                  </Button>
                  <Button
                    variant={verdict === "rework" ? "danger" : "secondary"}
                    block
                    onClick={() => setVerdict("rework")}
                  >
                    {t.stRework}
                  </Button>
                </div>

                <div className="field">
                  <label className="label" htmlFor="cm">
                    {t.subComment}{" "}
                    {verdict === "rework" ? (
                      <span style={{ color: "var(--danger)" }}>{t.subCommentRequired}</span>
                    ) : (
                      <span className="label-optional">{t.subCommentOptional}</span>
                    )}
                  </label>
                  <textarea
                    id="cm"
                    className={`input ${reworkBlocked && comment !== "" ? "input-error" : ""}`}
                    style={{ minHeight: 110 }}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      verdict === "rework" ? t.subCommentRework : t.subCommentAccept
                    }
                  />
                  {reworkBlocked && <span className="error-text">{t.subCommentError}</span>}
                </div>

                <hr className="divider" />

                <div className="stack g8">
                  <Button
                    block
                    size="lg"
                    disabled={!verdict || reworkBlocked || busy !== null}
                    loading={busy === "next"}
                    onClick={() => save(true)}
                    iconRight={<IconArrowRight size={17} />}
                  >
                    {t.subSaveNext}
                  </Button>
                  <Button
                    variant="secondary"
                    block
                    disabled={!verdict || reworkBlocked || busy !== null}
                    loading={busy === "save"}
                    onClick={() => save(false)}
                  >
                    {t.subSaveBack}
                  </Button>
                </div>

                {verdict === "accepted" && <Note kind="success">{t.subAcceptNote}</Note>}
              </div>
            )}

            {/* ===== Прошлые сдачи ===== */}
            {s.history.length > 0 && (
              <div className="card card-pad">
                <Accordion
                  head={
                    <span className="row g8">
                      <strong className="small">{t.subHistory}</strong>
                      <span className="caption muted-3">{s.history.length}</span>
                    </span>
                  }
                >
                  <div className="stack g14">
                    {s.history.map((h, i) => (
                      <div key={h.id} className="stack g8">
                        <div className="row between wrap g8">
                          <span className="caption muted-3">{dayTime(h.created_at, lang)}</span>
                          <SubmissionStatusBadge status={h.status} />
                        </div>
                        {h.text && (
                          <p className="small pretty" style={{ whiteSpace: "pre-wrap" }}>
                            {h.text}
                          </p>
                        )}
                        <SubmissionFiles files={h.files} compact />
                        {h.comment && (
                          <Note kind="muted">
                            <span className="small pretty" style={{ whiteSpace: "pre-wrap" }}>
                              {h.comment}
                            </span>
                            {h.reviewed_at && (
                              <span className="caption muted-3">
                                {" · "}
                                {t.subReviewedAt(dayTime(h.reviewed_at, lang))}
                              </span>
                            )}
                          </Note>
                        )}
                        {i < s.history.length - 1 && <hr className="divider" />}
                      </div>
                    ))}
                  </div>
                </Accordion>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        .review-two { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
        @media (min-width: 1100px) { .review-two { grid-template-columns: 1fr 1fr; gap: 24px; } }
        @media (max-width: 700px) { .hide-sm { display: none; } }
        .task-statement { font-size: 16px; line-height: 26px; }
        .task-statement ul, .task-statement ol { padding-left: 20px; }
      `}</style>
    </AdminShell>
  );
}

/**
 * Файлы работы. Ссылка постоянная и приходит от сервера — открываем её
 * в новой вкладке, чтобы не терять начатую проверку.
 */
function SubmissionFiles({ files, compact }: { files: Files; compact?: boolean }) {
  const { t } = useLang();

  if (files.length === 0) {
    return compact ? null : <span className="caption muted-3">{t.subNoFiles}</span>;
  }

  return (
    <div className="stack g8">
      {!compact && <strong className="small">{t.subFiles}</strong>}
      {files.map((f) => (
        <FileRow
          key={f.url}
          type={fileType(f.mime)}
          name={f.name}
          size={fileSize(f.size_bytes)}
          action={
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <IconExternal size={15} />
              <span className="hide-sm">{t.subOpenFile}</span>
            </a>
          }
        />
      ))}
    </div>
  );
}
