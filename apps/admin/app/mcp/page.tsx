"use client";

/**
 * «Подключения ИИ» — «/mcp» (`MCP_BRIEF`).
 *
 * Админ видит свои подключения внешнего ИИ — через вход (OAuth, claude.ai
 * и ChatGPT) и по личному токену (Claude Code, Codex) — и отключает их:
 * отзыв действует сразу. Допуск к персональным данным включается и снимается
 * здесь же переключателем.
 *
 * «Последнего использования» и активности нет намеренно (правило продукта).
 * Токен показывается один раз, в ответе на создание; в базе лежит его хеш.
 */

import { useState } from "react";
import {
  API_URL,
  api,
  isApiError,
  useLoad,
  type McpConnection,
  type McpConnections,
  type McpTokenCreated,
  type McpTokenIn,
} from "@lms/api";
import { dayYear } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Empty, Note, Sheet } from "@lms/ui";
import { IconCopy, IconPlus, IconTrash } from "@lms/ui/icons";

const NAME_MAX = 100;

/** Строка для вставки в терминал или файл: моноширинная, с кнопкой копирования */
function Snippet({ text }: { text: string }) {
  const { t } = useLang();
  const toast = useToast();
  const copy = () => {
    void navigator.clipboard.writeText(text).then(
      () => toast(t.mcpCopied, "success"),
      () => toast(t.mcpSaveError, "error"),
    );
  };
  return (
    <div className="row g8" style={{ alignItems: "flex-start" }}>
      <pre
        className="mono small grow"
        style={{
          margin: 0,
          padding: "8px 10px",
          background: "var(--surface-muted)",
          borderRadius: 8,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          minWidth: 0,
        }}
      >
        {text}
      </pre>
      <button className="btn btn-icon" onClick={copy} aria-label={t.mcpCopy}>
        <IconCopy size={16} />
      </button>
    </div>
  );
}

export default function McpConnectionsPage() {
  const { t, lang } = useLang();
  const toast = useToast();
  const list = useLoad(() => api<McpConnections>("/admin/mcp/connections"), []);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [pd, setPd] = useState(false);
  const [creating, setCreating] = useState(false);
  /* Токен живёт только в этом состоянии: закрыли окно — больше не достать */
  const [created, setCreated] = useState<McpTokenCreated | null>(null);

  const [target, setTarget] = useState<McpConnection | null>(null);
  const [removing, setRemoving] = useState(false);

  const server = `${API_URL}/mcp`;

  const create = async () => {
    const clean = name.trim();
    if (!clean || clean.length > NAME_MAX) {
      setNameError(true);
      return;
    }
    if (creating) return;
    setCreating(true);
    try {
      const body: McpTokenIn = { name: clean, pd_allowed: pd };
      setCreated(await api<McpTokenCreated>("/admin/mcp/tokens", { method: "POST", json: body }));
      setName("");
      setPd(false);
      list.reload();
    } catch (e) {
      if (isApiError(e, "validation_error")) setNameError(true);
      else toast(isApiError(e) && e.status > 0 ? e.message : t.mcpSaveError, "error");
    } finally {
      setCreating(false);
    }
  };

  const togglePd = async (c: McpConnection) => {
    const next = !c.pd_allowed;
    /* Сразу показываем новое положение, при отказе сервера возвращаем */
    const put = (v: boolean) =>
      list.setData((d) =>
        d && { items: d.items.map((x) => (x.id === c.id ? { ...x, pd_allowed: v } : x)) },
      );
    put(next);
    try {
      await api<McpConnection>(`/admin/mcp/connections/${c.id}`, {
        method: "PATCH",
        json: { pd_allowed: next },
      });
    } catch (e) {
      put(c.pd_allowed);
      toast(isApiError(e) && e.status > 0 ? e.message : t.mcpSaveError, "error");
    }
  };

  const remove = async () => {
    if (!target || removing) return;
    setRemoving(true);
    try {
      await api<void>(`/admin/mcp/connections/${target.id}`, { method: "DELETE" });
      setTarget(null);
      list.reload();
      toast(t.mcpDisconnected, "success");
    } catch (e) {
      toast(isApiError(e) && e.status > 0 ? e.message : t.mcpSaveError, "error");
    } finally {
      setRemoving(false);
    }
  };

  const body = () => {
    if (list.loading && !list.data) {
      return (
        <div className="card card-pad row center" style={{ minHeight: 160 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      );
    }
    if (!list.data) {
      return (
        <div className="card">
          <Empty
            title={t.loadError}
            text={t.loadErrorText}
            action={
              <Button variant="secondary" onClick={list.reload}>
                {t.retry}
              </Button>
            }
          />
        </div>
      );
    }
    if (list.data.items.length === 0) {
      return (
        <div className="card">
          <Empty title={t.mcpEmptyTitle} text={t.mcpEmptyText} />
        </div>
      );
    }
    return (
      <div className="card card-pad stack g14">
        {list.data.items.map((c) => (
          <div key={c.id} className="mcp-row">
            <div className="grow stack g2" style={{ minWidth: 0 }}>
              <span className="row g8 small" style={{ fontWeight: 600 }}>
                <span className="clamp-2">{c.name}</span>
                <Badge kind={c.kind === "oauth" ? "progress" : "neutral"}>{t.mcpKind[c.kind]}</Badge>
              </span>
              <span className="caption muted-3">{t.mcpAddedAt(dayYear(c.created_at, lang))}</span>
            </div>
            <div className="row g10">
              <div className="stack g2" style={{ textAlign: "right" }}>
                <span className="caption">{t.mcpPd}</span>
                <span className="caption muted-3">{t.mcpPdHint}</span>
              </div>
              <button
                className="switch"
                data-on={c.pd_allowed}
                onClick={() => void togglePd(c)}
                aria-pressed={c.pd_allowed}
                aria-label={t.mcpPd}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<IconTrash size={15} />}
              onClick={() => setTarget(c)}
            >
              {t.mcpDisconnect}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminShell title={t.mcpTitle} subtitle={t.mcpSubtitle}>
      <div className="stack g20" style={{ maxWidth: 720 }}>
        {body()}

        <div className="card card-pad stack g14">
          <div className="stack g4">
            <h2 className="h3">{t.mcpNewTitle}</h2>
            <span className="small muted">{t.mcpNewHint}</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="mcp-name">
              {t.mcpNameLabel}
            </label>
            <input
              id="mcp-name"
              className={`input${nameError ? " input-error" : ""}`}
              value={name}
              maxLength={NAME_MAX}
              placeholder={t.mcpNamePlaceholder}
              onChange={(e) => {
                setNameError(false);
                setName(e.target.value);
              }}
            />
            {nameError && <span className="error-text">{t.mcpNameError}</span>}
          </div>
          <label className="check">
            <input type="checkbox" checked={pd} onChange={(e) => setPd(e.target.checked)} />
            <span className="check-box" />
            <span className="check-label small stack g2">
              <span>{t.mcpAuthPd}</span>
              <span className="caption muted-3">{t.mcpAuthPdWhy}</span>
            </span>
          </label>
          <div>
            <Button icon={<IconPlus size={16} />} loading={creating} onClick={() => void create()}>
              {t.mcpCreate}
            </Button>
          </div>
        </div>

        <div className="card card-pad stack g14">
          <h2 className="h3">{t.mcpHowTitle}</h2>
          <div className="stack g6">
            <strong className="small">{t.mcpHowServer}</strong>
            <Snippet text={server} />
          </div>
          <div className="stack g6">
            <strong className="small">{t.mcpHowClaudeCode}</strong>
            <Snippet
              text={`claude mcp add --transport http lms ${server} --header "Authorization: Bearer ${t.mcpTokenPlaceholder}"`}
            />
          </div>
          <div className="stack g6">
            <strong className="small">{t.mcpHowCodex}</strong>
            <Snippet
              text={`[mcp_servers.lms]\nurl = "${server}"\nbearer_token_env_var = "LMS_MCP_TOKEN"`}
            />
            <span className="caption muted-3">{t.mcpHowCodexEnv}</span>
            <Snippet text={`export LMS_MCP_TOKEN=${t.mcpTokenPlaceholder}`} />
          </div>
          <div className="stack g6">
            <strong className="small">{t.mcpHowWeb}</strong>
            <span className="small muted pretty">{t.mcpHowWebText}</span>
          </div>
        </div>
      </div>

      <Sheet
        open={created !== null}
        onClose={() => setCreated(null)}
        title={t.mcpTokenTitle}
        footer={
          <Button block onClick={() => setCreated(null)}>
            {t.mcpTokenDone}
          </Button>
        }
      >
        <div className="stack g14">
          <Note kind="warning">{t.mcpTokenWarn}</Note>
          {created && <Snippet text={created.token} />}
        </div>
      </Sheet>

      <Sheet
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target ? t.mcpDisconnectTitle(target.name) : undefined}
        footer={
          <div className="row g8">
            <Button variant="secondary" className="grow" onClick={() => setTarget(null)}>
              {t.cancel}
            </Button>
            <Button variant="danger" className="grow" loading={removing} onClick={() => void remove()}>
              {t.mcpDisconnect}
            </Button>
          </div>
        }
      >
        <p className="small pretty">{t.mcpDisconnectText}</p>
      </Sheet>

      <style>{`
        .mcp-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
      `}</style>
    </AdminShell>
  );
}
