"use client";

/**
 * Задание «/learn/:courseId/task/:id» — раздел 5.9 брифа.
 *
 * `GET /tasks/{id}` отдаёт условие, правила сдачи и всю историю работ
 * текущего учителя. Статус экрана — статус последней сдачи: `pending` —
 * работа у админа и форма скрыта, `rework` — комментарий проверяющего
 * и кнопка «Отправить заново», `accepted` — задание закрыто.
 *
 * Файлы уходят двумя шагами, как решено в контракте: сначала каждый файл
 * отдельным `POST /files`, потом сдача с их `key`. Расширение и размер
 * проверяются и здесь, и на сервере — клиентская проверка только для того,
 * чтобы не гнать заведомо лишние мегабайты.
 *
 * Имени проверяющего в ответе нет и не будет: комментарий подписан
 * «Администратор».
 */

import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type FileLink,
  type Submission,
  type SubmissionIn,
  type Task,
  type UploadedFile,
} from "@lms/api";
import { useStore } from "@lms/prototype";
import { BackHeader, TabBar } from "@/components/layout/Shell";
import {
  Badge,
  Button,
  Empty,
  FileRow,
  fileType,
  LinkButton,
  Skeleton,
} from "@lms/ui";
import { dayTime, fileSize } from "@lms/ui/i18n";
import {
  IconAlert,
  IconCheckCircle,
  IconClock,
  IconClose,
  IconDownload,
  IconUpload,
} from "@lms/ui/icons";

/** Условие задания — JSON как лежит в базе, как и `body` урока. */
function Statement({ statement }: { statement: Task["statement"] }) {
  const html = typeof statement?.html === "string" ? statement.html : null;
  if (!html) return null;
  return <div className="lesson-text stack g12" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function TaskPage() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang, toast } = useStore();

  const task = useLoad(() => api<Task>(`/tasks/${encodeURIComponent(id)}`), [id]);

  const [text, setText] = useState("");
  /** Уже загруженные файлы: `key` уходит в сдачу, остальное — для строки */
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  /** «Отправить заново» после доработки — форма открывается по кнопке */
  const [reopened, setReopened] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const toLogin = useCallback(
    () => router.replace(`/login?next=${encodeURIComponent(pathname)}`),
    [pathname, router],
  );

  useEffect(() => {
    if (task.error?.code === "unauthorized") toLogin();
  }, [task.error, toLogin]);

  if (task.error?.code === "unauthorized" || (!task.data && !task.error)) {
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title={t.task} />
        <main className="page section has-tabbar stack g20" style={{ paddingTop: 16 }}>
          <Skeleton w="70%" h={28} />
          <Skeleton h={160} r={14} />
          <Skeleton h={200} r={14} />
        </main>
        <TabBar />
      </>
    );
  }

  if (!task.data) {
    const err = task.error!;
    const notFound = err.status === 404 || err.status === 422;
    const forbidden = err.code === "forbidden";
    return (
      <>
        <BackHeader href={`/courses/${courseId}`} title={t.task} />
        <main className="page section has-tabbar">
          <div className="card">
            <Empty
              title={forbidden ? t.accessClosedTitle : notFound ? t.taskNotFound : t.loadError}
              text={
                forbidden
                  ? t.accessClosedText
                  : notFound
                    ? t.taskNotFoundText
                    : t.loadErrorText
              }
              action={
                forbidden || notFound ? (
                  <LinkButton href={`/courses/${courseId}`} variant="secondary">
                    {t.toCourse}
                  </LinkButton>
                ) : (
                  <Button variant="secondary" onClick={task.reload}>
                    {t.retry}
                  </Button>
                )
              }
            />
          </div>
        </main>
        <TabBar />
      </>
    );
  }

  const d = task.data;
  const last = d.submissions[0];
  const exts = d.allowed_ext.map((e) => e.toLowerCase());
  const maxBytes = d.max_size_mb * 1024 * 1024;
  /* Форма показана сразу, если сдач ещё не было; после доработки — по кнопке */
  const formOpen = d.can_submit && (d.status === "none" || reopened);
  const withText = d.submit_format !== "file";
  const withFiles = d.submit_format !== "text";
  const canSend =
    (withText && text.trim().length > 0) || (withFiles && files.length > 0);

  /* Ссылка на шаблон подписана и живёт недолго — просим по клику */
  const downloadTemplate = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const link = await api<FileLink>(`/tasks/${encodeURIComponent(id)}/template_file`);
      const opened = window.open(link.url, "_blank", "noopener");
      if (!opened) window.location.href = link.url;
    } catch (e) {
      toast(isApiError(e) && e.status > 0 ? e.message : t.fileLinkError, "error");
    } finally {
      setDownloading(false);
    }
  };

  const addFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const list = Array.from(picked);
    if (files.length + list.length > 10) {
      toast(t.tooManyFiles, "error");
      return;
    }
    setUploading(true);
    try {
      for (const file of list) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (exts.length > 0 && !exts.includes(ext)) {
          toast(t.extNotAllowed(ext, exts.join(", ")), "error");
          continue;
        }
        if (file.size > maxBytes) {
          toast(t.fileTooBig(d.max_size_mb), "error");
          continue;
        }
        try {
          const form = new FormData();
          form.append("file", file);
          /* Content-Type ставит браузер сам — вместе с boundary,
             без него сервер тело не разберёт */
          const up = await api<UploadedFile>("/files", { method: "POST", body: form });
          setFiles((f) => [...f, up]);
        } catch (e) {
          if (isApiError(e, "unauthorized")) toLogin();
          else toast(isApiError(e) && e.status > 0 ? e.message : t.uploadError, "error");
        }
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = async () => {
    if (sending || !canSend) return;
    setSending(true);
    try {
      const body: SubmissionIn = {
        text: withText && text.trim() ? text.trim() : null,
        files: withFiles ? files.map((f) => ({ key: f.key, name: f.name })) : [],
      };
      await api<Submission>(`/tasks/${encodeURIComponent(id)}/submissions`, {
        method: "POST",
        json: body,
      });
      setText("");
      setFiles([]);
      setReopened(false);
      toast(t.taskSent, "success");
      /* Статус, история и `can_submit` считает сервер — перечитываем задание */
      task.reload();
    } catch (e) {
      if (isApiError(e, "unauthorized")) toLogin();
      /* submission_pending, task_accepted, validation_error — объясняет сервер */
      else if (isApiError(e) && e.status > 0) toast(e.message, "error");
      else toast(t.submitTaskError, "error");
    } finally {
      setSending(false);
    }
  };

  const statusCard = () => {
    if (d.status === "pending")
      return (
        <div className="card card-pad stack g14" style={{ borderColor: "#fde68a" }}>
          <div className="row between wrap g10">
            <div className="row g10">
              <span style={{ color: "var(--warning)" }}>
                <IconClock size={22} />
              </span>
              <strong>{t.stReview}</strong>
            </div>
            <Badge kind="review">{t.stReview}</Badge>
          </div>
          <p className="small muted">{t.pendingText}</p>
          {last && last.files.length > 0 && (
            <div className="stack g8">
              {last.files.map((f) => (
                <SubmissionFileRow key={f.url} file={f} />
              ))}
            </div>
          )}
        </div>
      );

    if (d.status === "accepted")
      return (
        <div className="card card-pad stack g14" style={{ borderColor: "#bbf7d0" }}>
          <div className="row between wrap g10">
            <div className="row g10">
              <span style={{ color: "var(--success)" }}>
                <IconCheckCircle size={22} />
              </span>
              <strong>{t.stAccepted}</strong>
            </div>
            <Badge kind="accepted">{t.stAccepted}</Badge>
          </div>
          {last?.comment && (
            <div className="stack g6">
              <span className="caption muted-3">
                {last.reviewed_at
                  ? t.adminCommentAt(dayTime(last.reviewed_at, lang))
                  : t.adminComment}
              </span>
              <p className="small pretty">{last.comment}</p>
            </div>
          )}
        </div>
      );

    if (d.status === "rework")
      return (
        <div className="card card-pad stack g14" style={{ borderColor: "#fecaca" }}>
          <div className="row between wrap g10">
            <div className="row g10">
              <span style={{ color: "var(--danger)" }}>
                <IconAlert size={22} />
              </span>
              <strong>{t.stRework}</strong>
            </div>
            <Badge kind="rework">{t.stRework}</Badge>
          </div>
          {last?.comment && (
            <div className="stack g6">
              <span className="caption muted-3">
                {last.reviewed_at
                  ? t.adminCommentAt(dayTime(last.reviewed_at, lang))
                  : t.adminComment}
              </span>
              <p className="small pretty">{last.comment}</p>
            </div>
          )}
          {d.can_submit && !reopened && (
            <Button block onClick={() => setReopened(true)}>
              {t.submitAgain}
            </Button>
          )}
        </div>
      );

    return null;
  };

  return (
    <>
      <BackHeader href={`/courses/${courseId}`} title={d.title} subtitle={t.task} />

      <main className={formOpen ? "has-sticky-cta" : "has-tabbar"}>
        <div className="page section stack g24" style={{ paddingTop: 16 }}>
          <div className="task-layout">
            {/* ===== Условие ===== */}
            <section className="stack g16" style={{ minWidth: 0 }}>
              <h1 className="h1 pretty">{d.title}</h1>

              <div className="card card-pad stack g14">
                <h2 className="h3">{t.secStatement}</h2>
                <Statement statement={d.statement} />

                {d.template_file && (
                  <div className="stack g6">
                    <span className="caption muted-3">{t.templateFile}</span>
                    <FileRow
                      type={fileType(d.template_file.mime)}
                      name={d.template_file.name}
                      size={fileSize(d.template_file.size_bytes)}
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={downloading}
                          icon={<IconDownload size={16} />}
                          onClick={downloadTemplate}
                        >
                          <span className="dl-label">{t.download}</span>
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>

              {/* История сдач — номер идёт снизу вверх: свежие сверху */}
              {d.submissions.length > 0 && (
                <div className="card card-pad stack g12">
                  <h3 className="h3">{t.secSubmissions}</h3>
                  <div className="stack g14">
                    {d.submissions.map((s, i) => (
                      <div key={s.id} className="stack g8">
                        <div className="row between wrap g8">
                          <strong className="small">
                            {t.submissionN(d.submissions.length - i)}
                          </strong>
                          <span className="row g8 nowrap">
                            <Badge
                              kind={
                                s.status === "accepted"
                                  ? "accepted"
                                  : s.status === "rework"
                                    ? "rework"
                                    : "review"
                              }
                            >
                              {s.status === "accepted"
                                ? t.stAccepted
                                : s.status === "rework"
                                  ? t.stRework
                                  : t.stReview}
                            </Badge>
                            <span className="caption muted-3">
                              {dayTime(s.created_at, lang)}
                            </span>
                          </span>
                        </div>
                        {s.text && <p className="small pretty muted">{s.text}</p>}
                        {s.files.length > 0 && (
                          <div className="stack g8">
                            {s.files.map((f) => (
                              <SubmissionFileRow key={f.url} file={f} />
                            ))}
                          </div>
                        )}
                        {s.comment && (
                          <div className="note note-muted">
                            <IconAlert size={17} />
                            <div className="small stack g4">
                              <span className="caption muted-3">
                                {s.reviewed_at
                                  ? t.adminCommentAt(dayTime(s.reviewed_at, lang))
                                  : t.adminComment}
                              </span>
                              <span className="pretty">{s.comment}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ===== Сдача ===== */}
            <section className="stack g16" style={{ minWidth: 0 }}>
              {statusCard()}

              {formOpen && (
                <div className="card card-pad stack g16">
                  <h2 className="h3">{t.secYourAnswer}</h2>

                  {withText && (
                    <div className="field">
                      <label className="label" htmlFor="answer">
                        {t.fieldComment}
                        {withFiles && (
                          <span className="label-optional"> · {t.optional}</span>
                        )}
                      </label>
                      <textarea
                        id="answer"
                        className="input"
                        placeholder={t.commentPlaceholder}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                    </div>
                  )}

                  {withFiles && (
                    <>
                      <input
                        ref={fileInput}
                        type="file"
                        multiple
                        accept={exts.length ? exts.map((e) => `.${e}`).join(",") : undefined}
                        style={{ display: "none" }}
                        onChange={(e) => void addFiles(e.target.files)}
                      />

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          void addFiles(e.dataTransfer.files);
                        }}
                        style={{
                          border: `1.5px dashed ${dragOver ? "var(--primary)" : "var(--border-strong)"}`,
                          borderRadius: 14,
                          padding: 24,
                          textAlign: "center",
                          background: dragOver ? "var(--primary-bg)" : "#fbfcfe",
                          transition: "all .14s",
                        }}
                      >
                        <div className="stack g10" style={{ alignItems: "center" }}>
                          <span style={{ color: "var(--primary)" }}>
                            <IconUpload size={28} />
                          </span>
                          <span className="small muted drag-hint">{t.dropHint}</span>
                          <Button
                            variant="secondary"
                            loading={uploading}
                            onClick={() => fileInput.current?.click()}
                          >
                            {t.chooseFile}
                          </Button>
                          <span className="caption muted-3">
                            {exts.length
                              ? t.fileLimits(exts.join(", ").toUpperCase(), d.max_size_mb)
                              : t.anyFileLimits(d.max_size_mb)}
                          </span>
                        </div>
                      </div>

                      {files.length > 0 && (
                        <div className="stack g8">
                          {files.map((f) => (
                            <FileRow
                              key={f.key}
                              type={fileType(f.mime)}
                              name={f.name}
                              size={fileSize(f.size_bytes)}
                              action={
                                <button
                                  className="btn btn-icon"
                                  style={{ minHeight: 36, width: 36 }}
                                  onClick={() =>
                                    setFiles((prev) => prev.filter((x) => x.key !== f.key))
                                  }
                                  aria-label={t.removeFile}
                                >
                                  <IconClose size={17} />
                                </button>
                              }
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="desktop-only">
                    <Button
                      block
                      size="lg"
                      loading={sending}
                      disabled={!canSend}
                      onClick={submit}
                    >
                      {t.submitTask}
                    </Button>
                  </div>
                </div>
              )}

              {!formOpen && (
                <LinkButton href={`/courses/${courseId}`} block variant="secondary">
                  {t.toCourse}
                </LinkButton>
              )}
            </section>
          </div>
        </div>
      </main>

      {formOpen && (
        <div className="sticky-cta mobile-only">
          <div className="sticky-cta-inner">
            <Button block size="lg" loading={sending} disabled={!canSend} onClick={submit}>
              {t.submitTask}
            </Button>
          </div>
        </div>
      )}

      <TabBar />

      <style>{`
        .task-layout { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
        @media (min-width: 1024px) {
          .task-layout { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 560px) {
          .drag-hint { display: none; }
        }
        @media (max-width: 420px) { .dl-label { display: none; } }
      `}</style>
    </>
  );
}

/**
 * Файл сдачи. Ссылка постоянная и проверяется сессией — открываем как есть,
 * подписывать её отдельным запросом, как материалы урока, не нужно.
 */
function SubmissionFileRow({
  file,
}: {
  file: { name: string; size_bytes: number; mime: string; url: string };
}) {
  const { t } = useStore();
  return (
    <FileRow
      type={fileType(file.mime)}
      name={file.name}
      size={fileSize(file.size_bytes)}
      action={
        <a
          className="btn btn-secondary btn-sm"
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconDownload size={16} />
          <span className="dl-label">{t.download}</span>
        </a>
      }
    />
  );
}
