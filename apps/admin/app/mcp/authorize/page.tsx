"use client";

/**
 * Экран согласия OAuth — «/mcp/authorize» (`MCP_BRIEF`, решение 3).
 *
 * Сюда бэкенд присылает внешнего ИИ-клиента (claude.ai, ChatGPT) со всеми
 * параметрами OAuth в адресе. Свой вход у MCP отсутствует: админ входит тем же
 * кодом, что и в админку, поэтому без сессии мы уводим на `/login` и просим
 * вернуть сюда же — вместе с параметрами.
 *
 * Параметры экран не разбирает и не проверяет: целиком отдаёт их серверу
 * (`authorize_info`), а решение возвращает телом. Негодный запрос сервер
 * называет сам — тогда кнопок нет, переходить некуда.
 *
 * Оболочки админки здесь нет, как у экрана входа: человек пришёл не работать
 * в админке, а ответить на один вопрос.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  useLoad,
  useMe,
  type McpAuthorizeIn,
  type McpAuthorizeInfo,
  type McpAuthorizeOut,
} from "@lms/api";
import { Button, Empty, Note } from "@lms/ui";
import { IconAlert, IconCheck, IconLock } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import logo from "@lms/ui/logo.png";
import { web } from "@/lib/urls";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="row center" style={{ minHeight: "100dvh", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div className="row center g10" style={{ marginBottom: 20 }}>
          <img src={logo.src} alt="" className="logo-emblem" width={38} height={38} />
          <strong style={{ fontSize: 13.5, lineHeight: 1.2 }}>
            Академия педагогов
            <br />и психологов
          </strong>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="row center" style={{ minHeight: 200 }}>
      <span className="spinner" style={{ width: 28, height: 28, color: "var(--primary)" }} />
    </div>
  );
}

function Consent({ search }: { search: string }) {
  const { t } = useLang();
  const info = useLoad(
    () => api<McpAuthorizeInfo>(`/admin/mcp/authorize_info${search}`),
    [search],
  );
  const [pd, setPd] = useState(false);
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [failed, setFailed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const d = info.data;

  if (info.loading && !d) return <Spinner />;

  if (!d) {
    return (
      <div className="card">
        <Empty
          title={t.loadError}
          text={t.loadErrorText}
          action={
            <Button variant="secondary" onClick={info.reload}>
              {t.retry}
            </Button>
          }
        />
      </div>
    );
  }

  /* Негодный запрос — без кнопок: сервер сам не знает, куда вернуть человека */
  if (!d.valid || !d.client || !d.redirect_uri) {
    return (
      <div className="card">
        <Empty
          icon={<IconAlert size={36} />}
          title={t.mcpAuthInvalid}
          text={[d.error_message, t.mcpAuthInvalidText].filter(Boolean).join(" ")}
        />
      </div>
    );
  }

  const params = new URLSearchParams(search);
  const client = d.client;
  let host = d.redirect_uri;
  try {
    host = new URL(d.redirect_uri).host;
  } catch {
    /* Не разобрался как адрес — показываем строку как пришла */
  }

  const decide = async (decision: "allow" | "deny") => {
    if (busy) return;
    setBusy(decision);
    setFailed(false);
    /* Поля берём из адреса, а не из ответа `authorize_info`: сервер сверит их
       с тем, что сам выдал клиенту при регистрации */
    const body: McpAuthorizeIn = {
      client_id: client.client_id,
      redirect_uri: d.redirect_uri!,
      response_type: params.get("response_type") ?? "code",
      code_challenge: params.get("code_challenge") ?? "",
      code_challenge_method: params.get("code_challenge_method") ?? "",
      state: params.get("state"),
      scope: params.get("scope"),
      resource: params.get("resource"),
      decision,
      pd_allowed: decision === "allow" && pd,
    };
    try {
      const { redirect_to } = await api<McpAuthorizeOut>("/admin/mcp/authorize", {
        method: "POST",
        json: body,
      });
      setLeaving(true);
      window.location.href = redirect_to;
    } catch {
      setFailed(true);
      setBusy(null);
    }
  };

  return (
    <div className="card stack g20" style={{ padding: 28 }}>
      <div className="stack g8">
        <h1 className="h1">{t.mcpAuthTitle}</h1>
        <p className="body pretty">{t.mcpAuthAsk(client.name)}</p>
        <span className="caption muted-3">{t.mcpAuthReturn(host)}</span>
      </div>

      <div className="stack g6">
        <strong className="small">{t.mcpAuthCanTitle}</strong>
        <p className="small muted pretty">{t.mcpAuthCanText}</p>
      </div>

      <label className="check">
        <input type="checkbox" checked={pd} onChange={(e) => setPd(e.target.checked)} />
        <span className="check-box">
          <IconCheck size={14} />
        </span>
        <span className="check-label small stack g2">
          <span>{t.mcpAuthPd}</span>
          <span className="caption muted-3">{t.mcpAuthPdWhy}</span>
        </span>
      </label>

      {failed && <Note kind="danger">{t.mcpAuthFailed}</Note>}
      {leaving && <span className="caption muted-3">{t.mcpAuthRedirecting}</span>}

      <div className="row g10">
        <Button
          variant="secondary"
          className="grow"
          loading={busy === "deny"}
          disabled={!!busy}
          onClick={() => void decide("deny")}
        >
          {t.mcpAuthDeny}
        </Button>
        <Button
          className="grow"
          loading={busy === "allow"}
          disabled={!!busy}
          onClick={() => void decide("allow")}
        >
          {t.mcpAuthAllow}
        </Button>
      </div>

      <span className="caption muted-3">{t.mcpAuthRevokeHint}</span>
    </div>
  );
}

function Screen() {
  const router = useRouter();
  const { status, me } = useMe();
  const { t } = useLang();
  const [search, setSearch] = useState<string | null>(null);

  /* Адрес читаем в браузере: на сборке параметров нет */
  useEffect(() => {
    setSearch(window.location.search);
  }, []);

  const guest = status === "guest" || status === "error";

  /* Не вошёл — на вход, а после него обратно сюда с теми же параметрами */
  useEffect(() => {
    if (!guest || search === null) return;
    router.replace(
      `/login?next=${encodeURIComponent(`/mcp/authorize${search}`)}`,
    );
  }, [guest, search, router]);

  if (status === "loading" || guest || search === null) return <Spinner />;

  if (!me?.is_admin) {
    return (
      <div className="card">
        <Empty
          icon={<IconLock size={36} />}
          title="Нет прав администратора"
          text="Подключить ИИ может только администратор. Войдите другим номером."
          action={
            <div className="row center g10">
              <a
                href={`/login?next=${encodeURIComponent(`/mcp/authorize${search}`)}`}
                className="btn btn-primary"
              >
                {t.login}
              </a>
              <a href={web("/my")} className="btn btn-secondary">
                Кабинет учителя
              </a>
            </div>
          }
        />
      </div>
    );
  }

  return <Consent search={search} />;
}

export default function McpAuthorizePage() {
  return (
    <Frame>
      <Screen />
    </Frame>
  );
}
