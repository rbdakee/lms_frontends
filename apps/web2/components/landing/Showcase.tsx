"use client";

/**
 * Витрина первого экрана: окно браузера, в котором идёт урок.
 *
 * Иллюстрация на первом экране стоит в брифе (раздел 5.1), но до 04.09.2026
 * её здесь не было — прошлая сессия убрала нарисованную карточку курса,
 * потому что та показывала придуманный курс с придуманным прогрессом
 * и номером сертификата. Требование владельца от 04.09.2026 — «чтобы сайт
 * казался живым» — вернуло иллюстрацию, но другого рода: это показ
 * интерфейса, а не рассказ о несуществующем курсе. Отсюда правила, по которым
 * она собрана:
 *
 * - **Ни одного имени, номера и названия курса.** Строки, где в жизни стоят
 *   ФИО и название, нарисованы серыми плашками — ровно так, как рисуют макет.
 *   «Сертификат № 0001 на имя Айгуль Н.» был бы и неправдой на витрине,
 *   и персональными данными в разметке.
 * - **Три кадра — те же три шага, что перечислены ниже текстом**: урок,
 *   результат теста, сертификат. Картинка не обещает ничего сверх сказанного.
 * - **Окно браузера, а не абстрактная карточка.** Человек, ни разу
 *   не открывавший площадку, по такой картинке понимает главное: это сайт,
 *   он откроется в обычном браузере, ставить ничего не нужно.
 * - **Тёмная зона плеера взята из общей палитры** (`--player-*`), а не
 *   подобрана на глаз: на настоящем уроке плеер выглядит так же.
 * - **Адрес в строке браузера не выдуман.** Домена второй площадки ещё нет
 *   (`PLATFORMS_BRIEF`, «Ждём от владельца»), поэтому в строке стоит имя
 *   площадки из `@/lib/brand` — оно же поедет на сертификат.
 *
 * **Все три кадра лежат в разметке одновременно, друг под другом в одной
 * ячейке сетки, и переключаются прозрачностью.** Так окно держит высоту
 * самого высокого кадра и не дёргается каждые шесть секунд: на телефоне
 * оно стоит в потоке, и его скачок утащил бы за собой всю страницу.
 * Внутренние анимации привязаны не к появлению в дереве, а к признаку
 * `active`, поэтому полоса плеера и галочки проигрываются заново на каждом
 * круге.
 *
 * Кадры сменяются раз в шесть секунд и замирают под курсором. Точки внизу —
 * указатели, а не кнопки: витрина целиком спрятана от скринридеров
 * (`aria-hidden`), потому что вслух «07:12 / 11:40» и серые плашки — шум,
 * а всё, что здесь показано, страница ниже говорит словами. Интерактивный
 * элемент внутри `aria-hidden` был бы ловушкой для клавиатуры.
 *
 * Смена кадров не запускается вовсе, если человек попросил систему убрать
 * движение: он видит первый кадр неподвижным.
 */

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useLang } from "@lms/ui/lang";
import { BRAND } from "@/lib/brand";
import { EASE } from "./Motion";
import {
  IconCheck,
  IconLock,
  IconPlay,
  IconTask,
  IconText,
  IconVideo,
} from "@lms/ui/icons";

/** Шесть секунд — кадр успевает быть прочитанным и не успевает надоесть. */
const SCENE_MS = 6000;
const SCENES = 3;

/* Материалы урока — типы, а не названия: выдуманное название курса
   на витрине читается как обещание, которого никто не давал. */
const ROWS = [
  { icon: IconVideo, text: "Видеоурок", done: true },
  { icon: IconText, text: "Конспект", done: true },
  { icon: IconTask, text: "Практическая работа", done: false },
];

/** Длина видео в кадре — 11:40; отсчёт начинается с 7:12. */
const CLIP_FROM = 432;
const CLIP_TO = 700;

function mmss(total: number) {
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/* ============ Кадр 1: урок ============ */

function SceneLesson({ active, still }: { active: boolean; still: boolean }) {
  /* Время под полосой идёт вместе с ней: полоса ползёт, а число стоит —
     первое, что выдаёт нарисованный плеер. */
  const [sec, setSec] = useState(CLIP_FROM);
  useEffect(() => {
    if (!active || still) return;
    setSec(CLIP_FROM);
    const id = setInterval(
      () => setSec((s) => (s >= CLIP_TO - 1 ? CLIP_FROM : s + 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [active, still]);

  return (
    <>
      <div className="sc-player">
        <span className="sc-play">
          <IconPlay size={22} />
        </span>
        <div className="sc-hud">
          <div className="sc-track">
            <m.span
              className="sc-fill"
              initial={{ width: "8%" }}
              animate={{ width: active || still ? "62%" : "8%" }}
              transition={{ duration: active && !still ? 5.6 : 0, ease: "linear" }}
            />
          </div>
          <span className="sc-time">{mmss(sec)} / {mmss(CLIP_TO)}</span>
        </div>
      </div>

      <ul className="sc-rows">
        {ROWS.map((r, i) => {
          const Icon = r.icon;
          const shown = active || still;
          return (
            <li key={r.text} className="sc-row">
              <span className="sc-row-ico">
                <Icon size={15} />
              </span>
              <span className="sc-row-text">{r.text}</span>
              <m.span
                className="sc-mark"
                data-done={r.done}
                animate={{ scale: shown ? 1 : 0.3, opacity: shown ? 1 : 0 }}
                transition={
                  still
                    ? { duration: 0 }
                    : { delay: active ? 0.4 + i * 0.22 : 0, type: "spring", stiffness: 420, damping: 20 }
                }
              >
                {r.done ? <IconCheck size={13} /> : <span className="sc-mark-dot" />}
              </m.span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ============ Кадр 2: результат теста ============ */

function SceneQuiz({ active, still }: { active: boolean; still: boolean }) {
  const shown = active || still;
  return (
    <div className="sc-quiz">
      <div className="sc-ring-wrap">
        <svg viewBox="0 0 120 120" className="sc-ring">
          <circle cx="60" cy="60" r="52" className="sc-ring-bg" />
          <m.circle
            cx="60"
            cy="60"
            r="52"
            className="sc-ring-fg"
            animate={{ pathLength: shown ? 0.86 : 0 }}
            transition={{ duration: still ? 0 : 1.5, ease: EASE }}
          />
        </svg>
        <div className="sc-ring-mid">
          <strong>86%</strong>
          <span>из 100</span>
        </div>
      </div>
      <div className="sc-quiz-side">
        <span className="sc-pill sc-pill-ok">
          <IconCheck size={13} /> Тест сдан
        </span>
        <span className="sc-quiz-note">Проходной балл 70%</span>
        <div className="sc-lines">
          <span className="sc-line sc-w80" />
          <span className="sc-line sc-w60" />
        </div>
      </div>
    </div>
  );
}

/* ============ Кадр 3: сертификат ============ */

/* Узор кода нарисован формулой, а не картинкой: это изображение QR,
   а не рабочий код — сканировать здесь нечего, и притворяться, что есть,
   не нужно. Формула без случайных чисел: на сервере и в браузере узор
   обязан совпасть, иначе React ругается на расхождение разметки. */
const QR_N = 11;
const QR_CELLS = Array.from({ length: QR_N * QR_N }, (_, i) => {
  const x = i % QR_N;
  const y = Math.floor(i / QR_N);
  const finder =
    (x < 3 && y < 3) || (x >= QR_N - 3 && y < 3) || (x < 3 && y >= QR_N - 3);
  return finder || (x * 7 + y * 11 + ((x * y) % 5)) % 3 === 0;
});

function SceneCert({ active, still }: { active: boolean; still: boolean }) {
  const { lang, t } = useLang();
  const brand = BRAND[lang];
  const shown = active || still;

  return (
    <div className="sc-cert">
      <div className="sc-paper">
        <span className="sc-paper-brand">
          {brand.line1}
          <br />
          {brand.line2}
        </span>
        <span className="sc-paper-word">Сертификат</span>
        {/* Плашки вместо ФИО и названия курса — макет, а не выдуманный человек */}
        <span className="sc-line sc-w70" />
        <span className="sc-line sc-w45" />
        <div className="sc-qr">
          {QR_CELLS.map((on, i) => (
            <span key={i} data-on={on || undefined} />
          ))}
        </div>
      </div>
      <m.span
        className="sc-pill sc-pill-ok sc-valid"
        animate={{ scale: shown ? 1 : 0.6, opacity: shown ? 1 : 0, y: shown ? 0 : 6 }}
        transition={
          still
            ? { duration: 0 }
            : { delay: active ? 0.5 : 0, type: "spring", stiffness: 380, damping: 18 }
        }
      >
        <IconCheck size={13} /> {t.vfValid}
      </m.span>
    </div>
  );
}

/* ============ Витрина ============ */

export function Showcase() {
  const { lang } = useLang();
  const still = Boolean(useReducedMotion());
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (still || paused) return;
    const id = setInterval(() => setScene((s) => (s + 1) % SCENES), SCENE_MS);
    return () => clearInterval(id);
  }, [still, paused]);

  return (
    <div
      className="sc-stage"
      aria-hidden="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <m.div
        className="sc-tilt"
        initial={still ? false : { opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
      >
        <div className="sc-mac">
          <div className="sc-bar">
            <span className="sc-dot" data-c="1" />
            <span className="sc-dot" data-c="2" />
            <span className="sc-dot" data-c="3" />
            <span className="sc-url">
              <IconLock size={11} />
              {BRAND[lang].name}
            </span>
          </div>
          <div className="sc-body">
            <div className="sc-frame" data-on={scene === 0 || undefined}>
              <SceneLesson active={scene === 0} still={still} />
            </div>
            <div className="sc-frame" data-on={scene === 1 || undefined}>
              <SceneQuiz active={scene === 1} still={still} />
            </div>
            <div className="sc-frame" data-on={scene === 2 || undefined}>
              <SceneCert active={scene === 2} still={still} />
            </div>
          </div>
        </div>

        {/* Телефон рядом с окном — вторая половина обещания «весь путь
            с телефона». Стоит справа от окна и ничего не закрывает; там,
            где на него не хватает поля, он не показывается вовсе. */}
        <div className="sc-phone">
          <div className="sc-phone-screen">
            <span className="sc-phone-notch" />
            <div className="sc-phone-player">
              <span className="sc-phone-play">
                <IconPlay size={12} />
              </span>
            </div>
            <div className="sc-phone-rows">
              <span className="sc-line sc-w80" />
              <span className="sc-line sc-w55" />
              <span className="sc-line sc-w65" />
            </div>
          </div>
        </div>
      </m.div>

      <div className="sc-tabs">
        {Array.from({ length: SCENES }).map((_, i) => (
          <span key={i} className="sc-tab" data-on={i === scene || undefined} />
        ))}
      </div>

      <style>{`
        /* Перспектива стоит на том же слое, что и окно. Ниже её ставить
           нельзя: элемент со своим transform (а его двигает появление)
           схлопывает 3D для потомков, и разворот окна выродился бы
           в плоское сжатие. */
        .sc-stage { position: relative; }
        .sc-tilt { position: relative; perspective: 1600px; }

        .sc-mac {
          background: var(--card);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 34px 80px rgba(4, 10, 32, 0.42), 0 4px 12px rgba(4, 10, 32, 0.24);
          animation: sc-float 9s ease-in-out infinite;
        }
        @keyframes sc-float {
          0%, 100% { transform: translateY(0) rotateY(-5deg) rotateX(2deg); }
          50% { transform: translateY(-12px) rotateY(-2.5deg) rotateX(1deg); }
        }

        /* Полка окна: три кружка и адресная строка — узнаётся с одного
           взгляда и без подписи «это браузер». */
        .sc-bar {
          height: 38px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          background: var(--surface-muted);
          border-bottom: 1px solid var(--line-soft);
        }
        .sc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .sc-dot[data-c="1"] { background: #ff5f57; }
        .sc-dot[data-c="2"] { background: #febc2e; }
        .sc-dot[data-c="3"] { background: #28c840; }
        .sc-url {
          margin-left: 8px;
          flex: 1;
          min-width: 0;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          background: var(--card);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sc-url svg { flex-shrink: 0; }

        /* Кадры лежат в одной ячейке: высота окна равна самому высокому
           из них и не меняется при смене. */
        .sc-body { padding: 16px; display: grid; }
        .sc-frame {
          grid-area: 1 / 1;
          display: grid;
          /* Центрирование, а не прижим к верху: самый высокий кадр (урок)
             и так заполняет окно целиком, а короткие — тест и сертификат —
             иначе висели бы у потолка. */
          align-content: center;
          gap: 14px;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .sc-frame[data-on] { opacity: 1; transform: none; }

        /* ---- Кадр «урок» ---- */
        .sc-player {
          position: relative;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, var(--player-stage-1) 0%, var(--player-stage-2) 60%, var(--player-stage-3) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sc-play {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--player-fg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-play);
          position: relative;
        }
        /* Круг расходится волной — единственное место, где движение говорит
           «здесь нажимают», а не украшает. */
        .sc-play::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid var(--primary);
          opacity: 0;
          animation: sc-pulse 2.8s ease-out infinite;
        }
        @keyframes sc-pulse {
          0% { transform: scale(0.9); opacity: 0.55; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { opacity: 0; }
        }
        .sc-hud {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 10px;
          display: grid;
          gap: 6px;
        }
        .sc-track {
          height: 4px;
          border-radius: 999px;
          background: var(--player-track);
          overflow: hidden;
        }
        .sc-fill { display: block; width: 8%; height: 100%; background: var(--player-fg); border-radius: 999px; }
        .sc-time {
          font-size: 11px;
          color: var(--player-fg-dim);
          font-variant-numeric: tabular-nums;
        }

        .sc-rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
        .sc-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 8px 4px;
          border-top: 1px solid var(--line-soft);
        }
        .sc-row:first-child { border-top: 0; }
        .sc-row-ico { color: var(--text-3); display: flex; }
        .sc-row-text { font-size: 13px; color: var(--text-2); }
        .sc-mark {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-sunken);
          color: var(--text-3);
        }
        .sc-mark[data-done="true"] { background: var(--success-bg); color: var(--success-strong); }
        .sc-mark-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--warning); }

        /* ---- Кадр «тест» ---- */
        .sc-quiz {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 20px;
          align-items: center;
          padding: 10px 6px;
        }
        .sc-ring-wrap { position: relative; width: 128px; height: 128px; }
        .sc-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
        .sc-ring-bg, .sc-ring-fg { fill: none; stroke-width: 9; stroke-linecap: round; }
        .sc-ring-bg { stroke: var(--track); }
        .sc-ring-fg { stroke: var(--primary); }
        .sc-ring-mid {
          position: absolute;
          inset: 0;
          display: grid;
          align-content: center;
          justify-items: center;
        }
        .sc-ring-mid strong { font-size: 28px; line-height: 1; color: var(--text); }
        .sc-ring-mid span { font-size: 11px; color: var(--text-3); margin-top: 3px; }
        .sc-quiz-side { display: grid; gap: 10px; justify-items: start; }
        .sc-quiz-note { font-size: 12px; color: var(--text-3); }

        /* ---- Кадр «сертификат» ---- */
        .sc-cert { position: relative; display: grid; justify-items: center; align-content: center; }
        .sc-paper {
          width: 100%;
          max-width: 292px;
          background: linear-gradient(180deg, var(--card), var(--cert-paper-to));
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 18px 18px 16px;
          display: grid;
          justify-items: center;
          gap: 9px;
          box-shadow: var(--shadow);
        }
        .sc-paper-brand {
          font-size: 10px;
          line-height: 1.35;
          text-align: center;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .sc-paper-word {
          font-size: 17px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.02em;
        }
        .sc-qr {
          margin-top: 4px;
          width: 62px;
          height: 62px;
          padding: 4px;
          background: var(--qr-bg);
          border: 1px solid var(--line-soft);
          border-radius: 6px;
          display: grid;
          grid-template-columns: repeat(${QR_N}, 1fr);
          gap: 1px;
        }
        .sc-qr span { border-radius: 1px; }
        .sc-qr span[data-on] { background: var(--qr-fg); }
        .sc-valid { margin-top: 12px; }

        /* ---- Общее для кадров ---- */
        .sc-lines { display: grid; gap: 7px; width: 100%; }
        .sc-line { display: block; height: 8px; border-radius: 999px; background: var(--surface-sunken); }
        .sc-w45 { width: 45%; } .sc-w55 { width: 55%; } .sc-w60 { width: 60%; }
        .sc-w65 { width: 65%; } .sc-w70 { width: 70%; } .sc-w80 { width: 80%; }
        .sc-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .sc-pill-ok { background: var(--success-bg); color: var(--success-deep); }

        /* ---- Телефон ----
           Корпус нарисован рамкой и тенью: без них белый прямоугольник
           читался не как телефон, а как обрывок карточки.

           Место — справа от окна, и это правка 04.09.2026: слева он налезал
           на заголовок первого экрана, а текст на витрине важнее украшения.
           Показывается с 1280, где в поле страницы есть куда свеситься,
           а с 1440 отходит от окна совсем и не закрывает даже его угол. */
        .sc-phone {
          position: absolute;
          right: -46px;
          bottom: -30px;
          width: 108px;
          padding: 6px;
          border-radius: 20px;
          background: linear-gradient(155deg, #39415e 0%, #171d33 55%, #0d1222 100%);
          box-shadow: 0 26px 52px rgba(4, 10, 32, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.14);
          display: none;
          animation: sc-float-phone 9s ease-in-out infinite;
        }
        @keyframes sc-float-phone {
          0%, 100% { transform: translateY(0) rotateY(-7deg); }
          50% { transform: translateY(-7px) rotateY(-4deg); }
        }
        .sc-phone-screen {
          background: var(--card);
          border-radius: 15px;
          overflow: hidden;
          padding: 7px;
          display: grid;
          gap: 7px;
        }
        .sc-phone-notch {
          display: block;
          width: 30px;
          height: 4px;
          border-radius: 999px;
          background: #0d1222;
          margin: 0 auto;
        }
        .sc-phone-player {
          aspect-ratio: 3 / 4;
          border-radius: 10px;
          background: linear-gradient(140deg, var(--player-stage-1), var(--player-stage-3));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sc-phone-play {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--player-fg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sc-phone-rows { display: grid; gap: 6px; padding: 2px 2px 4px; }

        /* ---- Указатели кадров ---- */
        .sc-tabs { display: flex; gap: 6px; justify-content: center; margin-top: 22px; }
        .sc-tab {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.28);
          transition: width 0.35s ease, background 0.35s ease;
        }
        .sc-tab[data-on] { width: 22px; background: rgba(255, 255, 255, 0.85); }

        @media (min-width: 1280px) {
          .sc-phone { display: grid; }
        }
        @media (min-width: 1440px) {
          .sc-phone { right: -118px; bottom: -10px; }
        }
        /* На узком экране окно стоит прямо: разворот съедает ширину,
           которой на телефоне и так нет. */
        @media (max-width: 899px) {
          .sc-mac { animation: none; }
          .sc-quiz { grid-template-columns: minmax(0, 1fr); justify-items: center; text-align: center; }
          .sc-quiz-side { justify-items: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sc-mac, .sc-phone { animation: none; }
          .sc-play::after { animation: none; }
          .sc-frame { transition: none; }
        }
      `}</style>
    </div>
  );
}
