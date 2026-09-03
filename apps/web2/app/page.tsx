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
 * - **Герой — типографическое заявление во всю колонку**, без нарисованного
 *   макета карточки справа. Макет показывал придуманный курс с придуманным
 *   прогрессом и номером сертификата, а тема площадки (белый фон, крупные
 *   радиусы, Rubik) держится на воздухе и шрифте, а не на иллюстрации.
 * - **Шаги — лестница с крупной нумерацией**, а не четыре одинаковые карточки:
 *   у первой площадки вся страница набрана однотипными `.card card-pad`,
 *   и повторить это значило бы сделать ту же страницу другим цветом.
 * - **«Как это работает» и «Частые вопросы» стоят в две колонки**: заголовок
 *   в левой полосе, содержание в правой. У первой площадки заголовок всегда
 *   над сеткой, и одна эта перестановка меняет ритм всей страницы.
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
import { api, useLoad, useMe, type CatalogOut } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { SUPPORT_MAIL } from "@/lib/brand";
import { Footer, PublicShell } from "@/components/layout/Shell";
import { CourseCard } from "@lms/course";
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
    title: "Курсы на русском и казахском",
    text: "Короткие видеоуроки, конспекты и практические задания.",
  },
];

/* Иконок у шагов нет: их роль здесь играет номер, и значок рядом с ним
   спорил бы за то же место в строке. */
const steps = [
  {
    title: "Выбрали курс",
    text: "Каталог открыт без регистрации. Фильтры по предмету, языку и длительности.",
  },
  {
    title: "Прошли уроки",
    text: "Видео, короткий конспект и файлы для скачивания. Урок — 10–15 минут.",
  },
  {
    title: "Сдали тест и задание",
    text: "Итоговый тест — одна попытка, с разбором ответов. Задание проверяет методист.",
  },
  {
    title: "Получили сертификат",
    text: "PDF с номером и QR-кодом. Проверяется на этом сайте за пару секунд.",
  },
];

const faq = [
  {
    q: "Кто проверяет задания?",
    a: "Практические задания смотрит методист платформы. Ответ приходит в рабочие дни — обычно в течение суток. Если задание вернули на доработку, в комментарии будет написано, что именно поправить.",
  },
  {
    q: "Сертификат подойдёт для аттестации?",
    a: "На сертификате указан объём в академических часах, уникальный номер и QR-код. Комиссия может проверить подлинность на странице «Проверить сертификат» — без регистрации, за пару секунд.",
  },
  {
    q: "Сколько времени занимает курс?",
    a: "Курс на 36 часов большинство проходит за 2–3 недели по 20–30 минут в день. Жёстких сроков нет: прогресс сохраняется, можно прерваться и вернуться через месяц.",
  },
  {
    q: "Можно учиться только с телефона?",
    a: "Да. Платформа сделана так, чтобы весь путь — от записи до сертификата — проходился с телефона. Ноутбук не нужен.",
  },
  {
    q: "Что делать, если не приходит код в WhatsApp?",
    a: `Проверьте, что WhatsApp установлен на этом номере — код приходит именно туда. Подождите минуту и нажмите «Отправить код повторно». Если код так и не пришёл — напишите на ${SUPPORT_MAIL}, поможем войти вручную.`,
  },
];

export default function LandingPage() {
  const { t } = useLang();
  const authed = Boolean(useMe().me);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  /* Витрина каталога — те же живые данные, что и на «/courses». Сервер отдаёт
     свежие группы сверху, поэтому первые шесть — это буквально новые курсы,
     а не «популярные»: популярность на пустой площадке не из чего посчитать. */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);
  const fresh = (catalog.data?.items ?? []).slice(0, 6);
  const startHref = authed ? "/my" : "/login";
  const startLabel = authed ? t.navHome : t.start;

  return (
    <PublicShell hasStickyCta>
      {/* ===== Первый экран ===== */}
      <section className="page" style={{ paddingTop: 36, paddingBottom: 32 }}>
        <div className="stack g24 p2-hero">
          <div className="stack g14">
            <span className="caption p2-eyebrow">Онлайн-курсы с сертификатом</span>
            <h1
              className="h1"
              style={{ fontSize: "clamp(32px, 6vw, 54px)", lineHeight: 1.07, letterSpacing: "-0.03em" }}
            >
              Повышение квалификации онлайн — в своём темпе, с сертификатом
            </h1>
            <p className="body muted pretty" style={{ maxWidth: 560 }}>
              Учитесь с телефона между уроками, а в конце получаете сертификат
              с номером — его может проверить любая комиссия.
            </p>
          </div>

          <div className="stack g10">
            <div className="row wrap g10">
              <Link href={startHref} className="btn btn-primary btn-lg p2-hero-btn">
                {startLabel}
              </Link>
              <Link href="/courses" className="btn btn-secondary btn-lg p2-hero-btn">
                {t.openCatalog}
              </Link>
            </div>
            <p className="small muted-3">Регистрация по номеру телефона — около минуты.</p>
          </div>
        </div>

        <ul className="p2-props">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="p2-prop">
                <span className="p2-prop-ico">
                  <Icon size={22} />
                </span>
                <div className="stack g4">
                  <strong className="h3">{f.title}</strong>
                  <span className="small muted pretty">{f.text}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ===== Витрина каталога — главный блок страницы ===== */}
      <section className="p2-room">
        <div className="page section">
          <div className="row between wrap g12" style={{ marginBottom: 24 }}>
            <h2 className="h2">{t.secNewCourses}</h2>
            <Link href="/courses" className="btn btn-secondary">
              {t.viewAll}
              <IconArrowRight size={17} />
            </Link>
          </div>

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
              {fresh.map((g) => (
                <CourseCard key={g.group_id} group={g} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Как это работает ===== */}
      <section id="how" className="page section p2-split">
        <div className="stack g10">
          <h2 className="h2">{t.secHowItWorks}</h2>
          <p className="body muted pretty">
            Четыре шага от каталога до сертификата. Прогресс сохраняется — можно прерваться
            и вернуться.
          </p>
        </div>
        <ol className="p2-steps">
          {steps.map((s, i) => (
            <li key={s.title} className="p2-step">
              <span className="p2-step-num">{i + 1}</span>
              <div className="stack g6">
                <h3 className="h3">{s.title}</h3>
                <p className="small muted pretty">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== Частые вопросы ===== */}
      <section id="faq" className="page section p2-split" style={{ paddingTop: 0 }}>
        <div className="stack g12">
          <h2 className="h2">{t.secFaq}</h2>
          <p className="body muted pretty">
            Не нашли ответ — напишите нам, отвечаем в рабочие дни.
          </p>
          <a
            href={`mailto:${SUPPORT_MAIL}`}
            className="btn btn-secondary"
            style={{ alignSelf: "flex-start" }}
          >
            Задать вопрос
          </a>
        </div>
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
              {openFaq === i && (
                <div className="acc-body">
                  <p className="body muted pretty" style={{ padding: "14px 16px" }}>
                    {f.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Финальный призыв ===== */}
      <section className="p2-close">
        <div className="page section p2-close-inner">
          <div className="stack g8">
            <h2 className="h2">Начните с одного урока — сегодня вечером</h2>
            <p className="body muted pretty">
              Регистрация по номеру телефона — без документов и анкет.
            </p>
          </div>
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

      <style>{`
        /* Герой занимает одну колонку и ограничен по ширине строки, а не сеткой
           50/50: длинную строку в 54 px читать невозможно, и рамку заявлению
           задаёт мера набора. */
        .p2-hero { max-width: 720px; }
        .p2-eyebrow {
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
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
        .p2-prop-ico { color: var(--primary); display: flex; padding-top: 2px; }
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
          .p2-prop-ico { padding-top: 0; }
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
      `}</style>
    </PublicShell>
  );
}
