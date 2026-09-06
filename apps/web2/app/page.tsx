"use client";

/**
 * Лендинг «/» второй площадки — раздел 5.1 брифа. Один экран — один вопрос.
 *
 * Раскладка своя, и от первой площадки отличается не оттенком, а составом
 * и порядком блоков. У каждого отличия причина:
 *
 * - **Ни одного выдуманного числа и ни одного выдуманного отзыва.** В день
 *   запуска у площадки ноль учителей и ноль сертификатов: «120 курсов»,
 *   «4300 учителей» и три отзыва с ФИО и школами были бы не унаследованным
 *   долгом, а неправдой, написанной нами. Считать счётчики по живому каталогу
 *   тоже нельзя — «1 курс в каталоге» на витрине хуже отсутствия блока.
 *   Вместо чисел — три свойства продукта, верных в первый же день; отзывы
 *   появятся, когда их напишут живые люди.
 * - **Витрина каталога стоит второй, а не четвёртой, и занимает отдельную
 *   комнату** — секцию во всю ширину окна, отбитую каймой. За курсами сюда
 *   и приходят, рассказ о платформе может подождать до следующего экрана.
 * - **Шаги — лестница с крупной нумерацией**, а не четыре одинаковые карточки:
 *   у первой площадки вся страница набрана однотипными `.card card-pad`,
 *   и повторить это значило бы сделать ту же страницу другим цветом.
 * - **«Как это работает» и «Частые вопросы» стоят в две колонки**: заголовок
 *   в левой полосе, содержание в правой. У первой площадки заголовок всегда
 *   над сеткой, и одна эта перестановка меняет ритм всей страницы.
 *
 * **Первый экран показывает продукт (04.09.2026).** До этого дня он был
 * набран одним текстом: прошлая сессия убрала макет карточки курса, потому
 * что тот показывал придуманный курс с придуманным прогрессом. Владелец
 * попросил, чтобы площадка «казалась живой», и иллюстрация вернулась
 * в виде, который ничего не выдумывает: окно браузера, а в нём сам
 * интерфейс — плеер, результат теста, бумага сертификата с серыми плашками
 * вместо ФИО. Правила, по которым она собрана, — в `components/landing/
 * Showcase.tsx`; иллюстрация на первом экране стоит и в брифе.
 *
 * **Движение — часть той же задачи.** Блоки появляются при прокрутке, ответы
 * в вопросах разворачиваются, полоса первого экрана медленно дышит светом.
 * Правило одно: движение либо показывает продукт, либо помогает понять,
 * что произошло, — и всё оно выключается по `prefers-reduced-motion`.
 * Обвязка и её цена в килобайтах — в `components/landing/Motion.tsx`.
 *
 * **Сроков получения сертификата на витрине нет (04.09.2026).** Заголовок обещал
 * сертификат «через три недели», а финальный призыв повторял то же число. Владелец
 * убрал обещание: сертификат выдаёт админ по подтверждению
 * (`CERTIFICATES_BRIEF.md`), и срок от нас не зависит. Сколько занимает сам курс,
 * страница по-прежнему отвечает — но в «Частых вопросах», где об этом спросили,
 * а не в заголовке, где это звучало бы обязательством.
 *
 * Тексты — те же, что были: русский текст лендинга написан прямо в разметке
 * и на казахский не переводится вовсе. Это долг первой площадки; углублять
 * его новым сочинённым текстом не стали, поэтому блоки собраны из уже
 * существующих строк, а подписи и заголовки взяты из общего словаря.
 *
 * Почта поддержки берётся из бренда площадки, а не написана строкой: чужой
 * адрес увёл бы людей второй площадки в чужую переписку.
 */

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, useReducedMotion, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { api, useLoad, useMe, type CatalogOut } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { Footer, PublicShell } from "@/components/layout/Shell";
import { EASE, MotionRoot, Reveal } from "@/components/landing/Motion";
import { Showcase } from "@/components/landing/Showcase";
import { ContactAdmin, CourseCard } from "@lms/course";
import { Button, CourseCardSkeleton, Empty } from "@lms/ui";
import {
  IconArrowRight,
  IconCertificate,
  IconChevronDown,
  IconDevice,
  IconGlobe,
} from "@lms/ui/icons";

/**
 * Свойства продукта на месте прежних счётчиков. Каждое верно в первый день,
 * когда учеников и сертификатов ещё ноль, и каждое собрано из текста, который
 * уже есть ниже на этой же странице — в шагах и в вопросах.
 */
const features = [
  {
    icon: IconCertificate,
    title: "Сертификат с номером и QR-кодом",
    text: "Проверяется на этом сайте за пару секунд.",
  },
  {
    icon: IconDevice,
    title: "Весь путь — с телефона",
    text: "От записи до сертификата. Ноутбук не нужен.",
  },
  {
    icon: IconGlobe,
    title: "Русский и казахский",
    text: "Курс идёт на одном языке; языковая версия — отдельный курс в каталоге.",
  },
];

/* Иконок у шагов нет: их роль здесь играет номер, и значок рядом с ним
   спорил бы за то же место в строке. */
const steps = [
  {
    title: "Открыть каталог",
    text: "Регистрация не нужна: фильтры по предмету, языку и объёму часов работают сразу.",
  },
  {
    title: "Пройти уроки",
    text: "Видео на 10–15 минут, конспект под ним и файлы, которые можно скачать себе.",
  },
  {
    title: "Сдать тест и работу",
    text: "Тест — одна попытка, с разбором ответов. Практическую работу читает методист.",
  },
  {
    title: "Забрать сертификат",
    text: "PDF с номером и QR-кодом. Комиссия проверяет его здесь же, без регистрации.",
  },
];

const faq = [
  {
    q: "Кто проверяет практические работы?",
    a: "Методист площадки, не автомат. Ответ обычно приходит в течение рабочего дня. Если работу вернули, в комментарии сказано, что именно переделать.",
  },
  {
    q: "Примут ли сертификат на аттестации?",
    a: "На нём стоят объём в академических часах, номер и QR-код. Комиссия открывает страницу проверки и видит имя, курс и дату — регистрироваться ей не нужно.",
  },
  {
    q: "Сколько это займёт времени?",
    a: "Курс на 36 часов обычно укладывается в 2–3 недели по 20–30 минут в день. Жёстких сроков нет: прогресс сохраняется, можно вернуться и через месяц.",
  },
  {
    q: "Хватит ли одного телефона?",
    a: "Хватит. Уроки, тест, сдача работы и сам сертификат открываются с телефона — ноутбук не нужен ни на одном шаге.",
  },
  {
    q: "Не приходит код в WhatsApp",
    a: "Проверьте, что WhatsApp стоит именно на этом номере — код уходит туда. Подождите минуту и нажмите «Отправить код повторно». Если не помогло, напишите администратору — откроем вход вручную.",
  },
];

/* Первый экран — единственное место, где блоки появляются по загрузке,
   а не по прокрутке: он и так перед глазами. Очередь на 90 мс задаёт
   порядок чтения — надзаголовок, заявление, кнопки. */
const heroBox: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const heroItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export default function LandingPage() {
  const { t } = useLang();
  const authed = Boolean(useMe().me);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const still = Boolean(useReducedMotion());
  /* Витрина каталога — те же живые данные, что и на «/courses». Сервер отдаёт
     свежие группы сверху, поэтому первые шесть — это буквально новые курсы,
     а не «популярные»: популярность на пустой площадке не из чего посчитать. */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);
  const fresh = (catalog.data?.items ?? []).slice(0, 6);
  const startHref = authed ? "/my" : "/login";
  const startLabel = authed ? t.navHome : t.start;

  return (
    <PublicShell hasStickyCta>
      <MotionRoot>
        {/* ===== Первый экран — плотная полоса цветом знака ===== */}
        <section className="p2-top">
          <div className="page p2-top-inner p2-hero-grid">
            <m.div
              className="stack g24 p2-hero"
              variants={heroBox}
              initial={still ? false : "hidden"}
              animate="show"
            >
              <m.div className="stack g14" variants={heroItem}>
                <span className="caption p2-eyebrow">Учёба между уроками</span>
                <h1
                  className="h1"
                  style={{ fontSize: "clamp(32px, 6vw, 54px)", lineHeight: 1.07, letterSpacing: "-0.03em" }}
                >
                  Повышение квалификации по двадцать минут в день
                </h1>
                <p className="body pretty p2-lede" style={{ maxWidth: 560 }}>
                  Видеоурок на 10–15 минут, конспект под ним и практическая работа,
                  которую читает методист. Всё открывается с телефона — в дороге,
                  на перемене, вечером.
                </p>
              </m.div>

              <m.div className="stack g10" variants={heroItem}>
                <div className="row wrap g10">
                  <Link href={startHref} className="btn btn-lg p2-hero-btn p2-cta">
                    {startLabel}
                  </Link>
                  <Link href="/courses" className="btn btn-lg p2-hero-btn p2-cta-ghost">
                    {t.openCatalog}
                  </Link>
                </div>
                <p className="small p2-note">Вход по номеру телефона, пароль не нужен.</p>
              </m.div>
            </m.div>

            <Showcase />
          </div>
        </section>

        {/* ===== Три свойства — уже на светлом, встык под полосой ===== */}
        <section className="page" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <ul className="p2-props">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal as="li" key={f.title} className="p2-prop" delay={i * 0.08}>
                  <span className="p2-prop-ico">
                    <Icon size={22} />
                  </span>
                  <div className="stack g4">
                    <strong className="h3">{f.title}</strong>
                    <span className="small muted pretty">{f.text}</span>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </section>

        {/* ===== Витрина каталога — главный блок страницы ===== */}
        <section className="p2-room">
          <div className="page section">
            <Reveal>
              <div className="row between wrap g12" style={{ marginBottom: 24 }}>
                <h2 className="h2">{t.secNewCourses}</h2>
                <Link href="/courses" className="btn btn-secondary">
                  {t.viewAll}
                  <IconArrowRight size={17} />
                </Link>
              </div>
            </Reveal>

            {catalog.loading ? (
              <div className="grid-courses">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CourseCardSkeleton key={i} />
                ))}
              </div>
            ) : catalog.error ? (
              <div className="card">
                <Empty
                  title={t.loadError}
                  text={t.loadErrorText}
                  action={
                    <Button variant="secondary" onClick={catalog.reload}>
                      {t.retry}
                    </Button>
                  }
                />
              </div>
            ) : fresh.length === 0 ? (
              <div className="card">
                <Empty title={t.emptyCatalogTitle} text={t.emptyCatalogText} />
              </div>
            ) : (
              <div className="grid-courses">
                {fresh.map((g, i) => (
                  /* Карточки появляются очередью по строке сетки, а не разом:
                     задержка привязана к позиции, поэтому на телефоне
                     (одна колонка) очередь читается так же, как на десктопе. */
                  <Reveal key={g.group_id} className="p2-cell" delay={(i % 3) * 0.07}>
                    <CourseCard group={g} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== Как это работает ===== */}
        <section id="how" className="page section p2-split">
          <Reveal>
            <div className="stack g10">
              <h2 className="h2">{t.secHowItWorks}</h2>
              <p className="body muted pretty">
                Четыре шага. Прогресс сохраняется на каждом, поэтому прерваться можно
                где угодно.
              </p>
            </div>
          </Reveal>
          <ol className="p2-steps">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} className="p2-step" delay={i * 0.07}>
                <span className="p2-step-num">{i + 1}</span>
                <div className="stack g6">
                  <h3 className="h3">{s.title}</h3>
                  <p className="small muted pretty">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ===== Частые вопросы ===== */}
        <section id="faq" className="page section p2-split" style={{ paddingTop: 0 }}>
          <Reveal>
            <div className="stack g12">
              <h2 className="h2">{t.secFaq}</h2>
              <p className="body muted pretty">
                Не нашли своего вопроса — напишите администратору, ответим
                в рабочие дни.
              </p>
              <div style={{ alignSelf: "flex-start" }}>
                <ContactAdmin variant="link" label="Задать вопрос" />
              </div>
            </div>
          </Reveal>
          <div className="stack g10">
            {faq.map((f, i) => (
              <div key={f.q} className="accordion">
                <button
                  className="acc-head"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="grow h3">{f.q}</span>
                  <IconChevronDown className="acc-chevron" data-open={openFaq === i} />
                </button>
                {/* Ответ разворачивается, а не возникает: рывок в середине
                    списка сбивает с той строки, которую человек читал.
                    Кайма живёт на внутреннем блоке — иначе при высоте 0
                    от закрытого ответа оставалась бы висеть линия. */}
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <m.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: still ? 0 : 0.3, ease: EASE }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="acc-body">
                        <p className="body muted pretty" style={{ padding: "14px 16px" }}>
                          {f.a}
                        </p>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Финальный призыв ===== */}
        <section className="p2-close">
          <div className="page section p2-close-inner">
            <Reveal className="stack g8">
              <h2 className="h2">Начните с одного урока</h2>
              <p className="body muted pretty">
                Вход по коду из WhatsApp. Прогресс сохраняется — прерваться можно
                на любом уроке.
              </p>
            </Reveal>
            <Link href={startHref} className="btn btn-primary btn-lg" style={{ minWidth: 220 }}>
              {startLabel}
            </Link>
          </div>
        </section>

        <Footer />

        {/* Липкая кнопка на мобильном — страница длинная, решение принимают в любой момент */}
        <div className="sticky-cta mobile-only no-tabbar">
          <div className="sticky-cta-inner row g8">
            <Link href={startHref} className="btn btn-primary btn-lg grow">
              {startLabel}
            </Link>
            <Link href="/courses" className="btn btn-secondary btn-lg">
              {t.navCatalog}
            </Link>
          </div>
        </div>
      </MotionRoot>

      <style>{`
        /* Герой занимает одну колонку и ограничен по ширине строки, а не сеткой
           50/50: длинную строку в 54 px читать невозможно, и рамку заявлению
           задаёт мера набора. */
        .p2-hero { max-width: 720px; }
        /* Первый экран залит цветом знака. У первой площадки на этом месте
           бледный градиент на белом — одна и та же раскладка на разном фоне
           расходится в глазах быстрее, чем перестановка блоков. Заодно это
           единственное место, где цвет бренда виден плотным, а не намёком. */
        .p2-top {
          position: relative;
          overflow: hidden;
          background: linear-gradient(158deg, var(--primary) 0%, var(--primary-pressed) 100%);
          color: var(--text-on-fill);
        }
        /* Два пятна света под содержимым. Плотная заливка на пол-экрана
           выглядит печатной плашкой; медленное движение возвращает ей глубину.
           Мягкость даёт сам градиент, а не filter: blur() — размытие такого
           размера стоит кадров на телефонах, ради которых площадка и делалась. */
        .p2-top::before,
        .p2-top::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .p2-top::before {
          width: 620px;
          height: 620px;
          top: -260px;
          right: -160px;
          background: radial-gradient(circle, rgba(140, 175, 255, 0.32), rgba(140, 175, 255, 0) 68%);
          animation: p2-drift 24s ease-in-out infinite;
        }
        .p2-top::after {
          width: 520px;
          height: 520px;
          bottom: -280px;
          left: -160px;
          background: radial-gradient(circle, rgba(96, 132, 246, 0.28), rgba(96, 132, 246, 0) 70%);
          animation: p2-drift 30s ease-in-out infinite reverse;
        }
        @keyframes p2-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-46px, 34px) scale(1.14); }
        }
        .p2-top-inner {
          position: relative;
          z-index: 1;
          padding-top: 48px;
          padding-bottom: 52px;
        }
        .p2-top .h1 { color: var(--text-on-fill); }
        .p2-lede { color: var(--text-on-fill-soft); }
        .p2-note { color: rgba(255, 255, 255, 0.62); }
        .p2-eyebrow {
          color: var(--text-on-fill-soft);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        /* Заявление и окно стоят рядом только там, где обоим хватает ширины:
           ниже 980 окно уезжает под кнопки, и первый экран читается сверху
           вниз — заголовок, кнопки, продукт. */
        .p2-hero-grid { display: grid; gap: 40px; align-items: center; }
        @media (min-width: 980px) {
          .p2-hero-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 470px); gap: 56px; }
          .p2-top-inner { padding-top: 64px; padding-bottom: 72px; }
        }
        /* Кнопки на заливке: обе из дизайн-системы здесь неразличимы —
           основная залита тем же цветом, что и фон. Белая и обведённая
           берут ту же геометрию (.btn-lg), меняется только окраска. */
        .p2-cta {
          background: var(--card);
          color: var(--primary-pressed);
        }
        .p2-cta:hover { background: var(--primary-bg); }
        .p2-cta-ghost {
          background: transparent;
          color: var(--text-on-fill);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
        }
        .p2-cta-ghost:hover { background: rgba(255, 255, 255, 0.12); }
        /* Подъём под курсором — то же, что делает карточка курса в каталоге:
           у площадки одна манера отвечать на наведение. */
        .p2-cta, .p2-cta-ghost { transition: background 0.16s, transform 0.16s; }
        .p2-cta:hover, .p2-cta-ghost:hover { transform: translateY(-2px); }
        /* На телефоне обе кнопки тянутся на всю ширину и делят строку пополам
           только когда помещаются: «Начать обучение» в две строки — это не кнопка. */
        .p2-hero-btn { flex: 1 1 200px; }
        @media (min-width: 620px) { .p2-hero-btn { flex: 0 0 auto; } }

        /* Свойства продукта разделены каймой, а не разложены по карточкам:
           фон площадки белый, и лишний слой заливки здесь нечем оправдать. */
        .p2-props {
          list-style: none;
          margin: 36px 0 0;
          padding: 0;
          display: grid;
        }
        .p2-prop {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: start;
          padding: 18px 0;
          border-top: 1px solid var(--line-soft);
        }
        /* Значок в оправе. У первой площадки значки стоят голыми в строке;
           оправа повторяет заливку первого экрана и связывает светлую часть
           страницы с тёмной. */
        .p2-prop-ico {
          color: var(--text-on-fill);
          background: var(--primary);
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        @media (min-width: 860px) {
          .p2-props {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            border-top: 1px solid var(--border);
          }
          .p2-prop {
            grid-template-columns: minmax(0, 1fr);
            gap: 10px;
            padding: 26px 28px 0;
            border-top: 0;
            border-left: 1px solid var(--line-soft);
          }
          .p2-prop:first-child { border-left: 0; padding-left: 0; }

        }

        /* Каталогу отдана отдельная комната во всю ширину окна. Это главное,
           за чем сюда приходят, а на белом листе блок иначе ничем не выделить,
           кроме каймы и полутона: заливать его цветом бренда — значит спорить
           с обложками курсов, которые в нём и стоят. */
        .p2-room {
          background: var(--surface-subtle);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        /* Обёртка появления — не лишний слой в сетке: карточка должна тянуться
           на высоту строки так же, как тянулась без неё. */
        .p2-cell { display: grid; }

        /* Заголовок секции — левая полоса, содержание — правая. */
        .p2-split { display: grid; gap: 24px; align-items: start; }
        @media (min-width: 940px) {
          .p2-split { grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 64px; }
        }

        /* Лестница: шаги отбиты волосяной линией и на широком экране смещаются
           вправо — движение от каталога к сертификату видно раньше, чем прочитан
           текст. Номер крупный и бледный: он размечает блок, а не спорит
           с заголовком шага. */
        .p2-steps { list-style: none; margin: 0; padding: 0; }
        .p2-step {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
          padding: 18px 0;
          border-top: 1px solid var(--line-soft);
        }
        .p2-step:first-child { border-top: 0; padding-top: 0; }
        .p2-step-num {
          font-size: clamp(30px, 5vw, 40px);
          line-height: 1;
          font-weight: 700;
          color: var(--primary-muted);
          font-variant-numeric: tabular-nums;
        }
        @media (min-width: 940px) {
          .p2-step { grid-template-columns: 64px minmax(0, 1fr); gap: 20px; padding: 22px 0; }
          .p2-step:nth-child(2) { margin-left: 26px; }
          .p2-step:nth-child(3) { margin-left: 52px; }
          .p2-step:nth-child(4) { margin-left: 78px; }
        }

        /* Финальный призыв — строка через всю ширину с каймой сверху, а не
           залитая карточка: страница заканчивается тем же приёмом, которым
           набрана, и последний экран не выглядит наклейкой поверх неё. */
        .p2-close { border-top: 1px solid var(--border); }
        .p2-close-inner { display: grid; gap: 20px; }
        @media (min-width: 860px) {
          .p2-close-inner {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 48px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .p2-top::before, .p2-top::after { animation: none; }
          .p2-cta:hover, .p2-cta-ghost:hover { transform: none; }
        }
      `}</style>
    </PublicShell>
  );
}
