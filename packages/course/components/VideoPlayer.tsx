"use client";

/**
 * Плеер видеоурока. Ссылку даёт `GET /lessons/{id}/playback`: публичного
 * адреса видео фронт не знает и за `video_url` не ходит вовсе — так плеер
 * не придётся переделывать, когда появится свой хостинг (контракт, сессия 4).
 *
 * Сегодня провайдер один — YouTube, и это настоящий `iframe` с родными
 * контролами: своего проигрывателя поверх чужого хостинга не строим, скорость,
 * субтитры и полный экран у YouTube уже есть. Со своим хостингом в `url`
 * придёт подписанная ссылка на раздатчик — её играет нативный `<video>`,
 * а сорвавшаяся подпись превращается в «не удалось продолжить» с «Обновить»,
 * который просто просит `playback` заново.
 */

import { useState } from "react";
import { api, useLoad, type Playback } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { Button } from "@lms/ui";
import { IconAlert, IconExternal, IconRefresh } from "@lms/ui/icons";

/**
 * id ролика из ссылки, какую положил админ: `watch?v=…`, `youtu.be/…`,
 * `/shorts/…` и уже готовый `/embed/…`. Не разобрали — показываем ошибку
 * со ссылкой на источник, а не чёрный прямоугольник.
 */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Сообщение вместо видео: отказ playback или сорвавшийся источник. */
function PlayerNotice({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="player">
      <div className="player-stage" />
      <div className="player-center" style={{ padding: 20, textAlign: "center" }}>
        <span style={{ color: "var(--warning)" }}>
          <IconAlert size={40} />
        </span>
        <div className="stack g4" style={{ alignItems: "center" }}>
          <strong style={{ color: "#fff", fontSize: 17 }}>{title}</strong>
          <span className="small" style={{ color: "rgba(255,255,255,.7)", maxWidth: 340 }}>
            {text}
          </span>
        </div>
        {action}
      </div>
    </div>
  );
}

export function VideoPlayer({ lessonId, title }: { lessonId: number; title: string }) {
  const { t } = useLang();
  const playback = useLoad(
    () => api<Playback>(`/lessons/${lessonId}/playback`),
    [lessonId],
  );
  /** Ссылку получили, а видео не пошло — обычно протухшая подпись раздатчика */
  const [sourceFailed, setSourceFailed] = useState(false);

  const refresh = () => {
    setSourceFailed(false);
    playback.reload();
  };

  if (playback.loading) {
    return (
      <div className="player">
        <div className="player-stage" />
        <div className="player-center">
          <span className="spinner" style={{ width: 34, height: 34, color: "#fff" }} />
        </div>
      </div>
    );
  }

  const err = playback.error;
  if (err) {
    /* Повторять есть смысл только когда виновата сеть или сервер. 403 — доступ
       к курсу закрыли посреди просмотра, 404 — видео у урока нет, 429 — ссылку
       просили слишком часто: во всех трёх случаях кнопки «Повторить» нет,
       а объясняет отказ текст сервера. */
    const retryable = err.status === 0 || err.status >= 500;
    return (
      <PlayerNotice
        title={retryable || err.code === "not_found" ? t.videoUnavailable : t.playbackStopped}
        text={retryable ? t.loadErrorText : err.message}
        action={
          retryable ? (
            <Button size="sm" icon={<IconRefresh size={16} />} onClick={refresh}>
              {t.retry}
            </Button>
          ) : null
        }
      />
    );
  }

  if (sourceFailed) {
    return (
      <PlayerNotice
        title={t.playbackStopped}
        text={t.playbackStoppedText}
        action={
          <Button size="sm" icon={<IconRefresh size={16} />} onClick={refresh}>
            {t.refresh}
          </Button>
        }
      />
    );
  }

  const url = playback.data?.url ?? "";
  const youtube = playback.data?.provider === "youtube";
  const videoId = youtube ? youtubeId(url) : null;

  if (youtube && !videoId) {
    return (
      <PlayerNotice
        title={t.videoUnavailable}
        text={t.videoUnavailableText}
        action={
          <a
            className="btn btn-secondary btn-sm"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconExternal size={16} />
            {t.openSource}
          </a>
        }
      />
    );
  }

  return (
    <div className="player">
      {videoId ? (
        /* nocookie-домен: пока учитель не нажал «плей», YouTube не пишет куки */
        <iframe
          className="player-frame"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video
          className="player-frame"
          src={url}
          controls
          playsInline
          onError={() => setSourceFailed(true)}
        />
      )}
    </div>
  );
}
