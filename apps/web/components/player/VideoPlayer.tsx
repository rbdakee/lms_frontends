"use client";

/**
 * Собственный плеер поверх любого источника (YouTube / Vimeo / MP4).
 * В прототипе воспроизведение имитируется таймером — все состояния
 * из раздела 6 брифа кликабельны и проверяются вживую.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconAlert,
  IconExternal,
  IconForward,
  IconFullscreen,
  IconMinimize,
  IconPause,
  IconPlay,
  IconRefresh,
  IconRewind,
  IconSubtitles,
  IconVolume,
} from "@lms/ui/icons";
import { Button } from "@lms/ui";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function time(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  title,
  durationLabel,
  lessonLabel,
  resumeAt = 0,
  onProgress,
  onEnded,
  error,
  stalled,
  onRetry,
}: {
  title: string;
  durationLabel: string;
  lessonLabel?: string;
  resumeAt?: number;
  /** доля просмотра 0..1 — только для подписи, урок отмечает сам учитель */
  onProgress?: (ratio: number) => void;
  onEnded?: () => void;
  error?: boolean;
  /**
   * Ссылка на видео живёт 15 минут и обычно продлевается незаметно.
   * Это состояние нужно на случай, когда продлить не вышло:
   * пропала сеть или админ закрыл доступ. Бесконечной крутилки быть не должно.
   */
  stalled?: boolean;
  onRetry?: () => void;
}) {
  /** «12 мин» → 720 секунд */
  const total = (() => {
    const m = durationLabel.match(/(\d+)/);
    return m ? parseInt(m[1], 10) * 60 : 740;
  })();

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(resumeAt);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const [fs, setFs] = useState(false);
  const [subs, setSubs] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  /* Ход «воспроизведения» */
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((prev) => {
        const next = prev + 0.25 * speed;
        if (next >= total) {
          setPlaying(false);
          onProgress?.(1);
          onEnded?.();
          return total;
        }
        onProgress?.(next / total);
        return next;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing, speed, total, onProgress, onEnded]);

  /* Панель скрывается через 3 секунды бездействия */
  const wake = useCallback(() => {
    setBarHidden(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBarHidden(true), 3000);
  }, []);

  useEffect(() => {
    if (playing) wake();
    else {
      setBarHidden(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [playing, wake]);

  /* Буферизация при старте */
  const play = () => {
    setStarted(true);
    setBuffering(true);
    setTimeout(() => {
      setBuffering(false);
      setPlaying(true);
    }, 700);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setT(ratio * total);
    onProgress?.(ratio);
    wake();
  };

  const jump = (d: number) => {
    setT((p) => Math.min(total, Math.max(0, p + d)));
    wake();
  };

  const pct = (t / total) * 100;

  /* ---- Не удалось продлить ссылку на видео ---- */
  if (stalled) {
    return (
      <div className="player">
        <div className="player-stage" />
        <div className="player-center" style={{ padding: 20, textAlign: "center" }}>
          <span style={{ color: "var(--warning)" }}>
            <IconAlert size={40} />
          </span>
          <div className="stack g4" style={{ alignItems: "center" }}>
            <strong style={{ color: "#fff", fontSize: 17 }}>
              Не удалось продолжить воспроизведение
            </strong>
            <span className="small" style={{ color: "rgba(255,255,255,.7)", maxWidth: 340 }}>
              Проверьте интернет и нажмите «Обновить». Просмотр продолжится с той же
              секунды — {time(t)}.
            </span>
          </div>
          <Button size="sm" icon={<IconRefresh size={16} />} onClick={onRetry}>
            Обновить
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Состояние ошибки ---- */
  if (error) {
    return (
      <div className="player">
        <div className="player-stage" />
        <div className="player-center" style={{ padding: 20, textAlign: "center" }}>
          <span style={{ color: "var(--warning)" }}>
            <IconAlert size={40} />
          </span>
          <div className="stack g4" style={{ alignItems: "center" }}>
            <strong style={{ color: "#fff", fontSize: 17 }}>Видео недоступно</strong>
            <span className="small" style={{ color: "rgba(255,255,255,.7)", maxWidth: 320 }}>
              Проверьте интернет или откройте видео на сайте источника
            </span>
          </div>
          <div className="row g8 wrap center">
            <Button variant="secondary" size="sm" icon={<IconExternal size={16} />}>
              Открыть в источнике
            </Button>
            <Button variant="ghost" size="sm" style={{ color: "#fff" }}>
              Сообщить о проблеме
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={box}
      className="player"
      style={
        fs
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 200,
              aspectRatio: "auto",
              width: "100vw",
              height: "100dvh",
              borderRadius: 0,
            }
          : undefined
      }
      onMouseMove={wake}
      onTouchStart={wake}
    >
      <div
        className="player-stage"
        onClick={() => {
          if (!started) return;
          setPlaying((p) => !p);
          wake();
        }}
        style={{ cursor: started ? "pointer" : "default" }}
      >
        {!started && (
          <span style={{ opacity: 0.5 }}>
            <IconPlay size={72} filled={false} strokeWidth={1} />
          </span>
        )}
      </div>

      {/* Заголовок — виден в полном экране */}
      {(fs || (started && !barHidden)) && (
        <div className="player-title" data-hidden={barHidden && !fs ? true : undefined}>
          <div className="row between g12">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="clamp-2">
                {title}
              </div>
              {lessonLabel && (
                <div className="caption" style={{ color: "rgba(255,255,255,.6)" }}>
                  {lessonLabel}
                </div>
              )}
            </div>
            {fs && (
              <button className="pbtn" onClick={() => setFs(false)} aria-label="Свернуть">
                <IconMinimize size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* До старта */}
      {!started && !buffering && (
        <div className="player-center">
          <button className="player-play" onClick={play} aria-label="Воспроизвести">
            <IconPlay size={28} />
          </button>
          {resumeAt > 0 ? (
            <div className="row g8 wrap center">
              <button
                className="btn btn-primary btn-sm"
                onClick={play}
                style={{ minHeight: 40 }}
              >
                Продолжить с {time(resumeAt)}
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  setT(0);
                  play();
                }}
                style={{
                  minHeight: 40,
                  background: "rgba(255,255,255,.16)",
                  color: "#fff",
                }}
              >
                Начать сначала
              </button>
            </div>
          ) : (
            <span className="small" style={{ color: "rgba(255,255,255,.65)" }}>
              {durationLabel}
            </span>
          )}
        </div>
      )}

      {/* Буферизация */}
      {buffering && (
        <div className="player-center">
          <span className="spinner" style={{ width: 34, height: 34, color: "#fff" }} />
          <span className="small" style={{ color: "rgba(255,255,255,.7)" }}>
            Загружается…
          </span>
        </div>
      )}

      {/* Пауза — крупная кнопка по центру */}
      {started && !playing && !buffering && (
        <div className="player-center" style={{ pointerEvents: "none" }}>
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "rgba(15,23,42,.6)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
            }}
          >
            <IconPlay size={26} />
          </span>
        </div>
      )}

      {/* Панель управления */}
      {started && (
        <div className="player-bar" data-hidden={barHidden || undefined}>
          <div className="player-track" onClick={seek}>
            <div className="player-buffer" style={{ width: `${Math.min(100, pct + 12)}%` }} />
            <div className="player-played" style={{ width: `${pct}%` }} />
            <div className="player-knob" style={{ left: `${pct}%` }} />
          </div>

          <div className="row g4">
            <button
              className="pbtn"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Пауза" : "Воспроизвести"}
            >
              {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
            </button>
            <button className="pbtn" onClick={() => jump(-10)} aria-label="Назад 10 секунд">
              <IconRewind size={20} />
            </button>
            <button className="pbtn" onClick={() => jump(10)} aria-label="Вперёд 10 секунд">
              <IconForward size={20} />
            </button>
            <span className="player-time" style={{ marginLeft: 6 }}>
              {time(t)} <span>/ {time(total)}</span>
            </span>

            <div className="grow" />

            <button
              className="pbtn pbtn-wide"
              onClick={() => setSpeedOpen((v) => !v)}
              aria-label="Скорость воспроизведения"
            >
              {String(speed).replace(".", ",")}×
            </button>
            <button
              className="pbtn"
              aria-label="Громкость"
              style={{ display: "none" }}
              data-desktop
            >
              <IconVolume size={20} />
            </button>
            <button
              className="pbtn"
              onClick={() => setSubs((v) => !v)}
              aria-label="Субтитры"
              style={{ opacity: subs ? 1 : 0.65 }}
            >
              <IconSubtitles size={20} />
            </button>
            <button
              className="pbtn"
              onClick={() => setFs((v) => !v)}
              aria-label={fs ? "Свернуть" : "Во весь экран"}
            >
              {fs ? <IconMinimize size={20} /> : <IconFullscreen size={20} />}
            </button>
          </div>

          {speedOpen && (
            <div className="speed-menu">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  data-active={s === speed || undefined}
                  onClick={() => {
                    setSpeed(s);
                    setSpeedOpen(false);
                    wake();
                  }}
                >
                  {String(s).replace(".", ",")}×
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Субтитры */}
      {subs && playing && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: barHidden ? 24 : 76,
            zIndex: 5,
            textAlign: "center",
            padding: "0 16px",
            transition: "bottom .25s",
          }}
        >
          <span
            style={{
              background: "rgba(2,6,23,.82)",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 14,
              lineHeight: "20px",
            }}
          >
            Откройте настройки формы и включите режим теста
          </span>
        </div>
      )}
    </div>
  );
}
