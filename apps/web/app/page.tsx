"use client";

/** Лендинг «/» — раздел 5.1 брифа. Один экран — один вопрос. */

import Link from "next/link";
import { useState } from "react";
import { api, useLoad, useMe, type CatalogOut } from "@lms/api";
import { fmt, rating as fmtRating } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { Footer, PublicShell } from "@/components/layout/Shell";
import { CourseCard } from "@lms/course";
import { Badge, CourseCardSkeleton, Cover, Stars } from "@lms/ui";
import {
  IconArrowRight,
  IconCatalog,
  IconCertificate,
  IconChevronDown,
  IconCheckCircle,
  IconGraduation,
  IconPlay,
  IconQuiz,
  IconShield,
} from "@lms/ui/icons";

const steps = [
  {
    icon: IconCatalog,
    title: "Выбрали курс",
    text: "Каталог открыт без регистрации. Фильтры по предмету, языку и длительности.",
  },
  {
    icon: IconPlay,
    title: "Прошли уроки",
    text: "Видео, короткий конспект и файлы для скачивания. Урок — 10–15 минут.",
  },
  {
    icon: IconQuiz,
    title: "Сдали тест и задание",
    text: "Итоговый тест — одна попытка, с разбором ответов. Задание проверяет методист.",
  },
  {
    icon: IconCertificate,
    title: "Получили сертификат",
    text: "PDF с номером и QR-кодом. Проверяется на этом сайте за пару секунд.",
  },
];

const testimonials = [
  {
    text: "Проходила курс по формативному оцениванию вечерами, по одному уроку. Через три недели уже применяла приёмы на своих уроках математики.",
    name: "Смагулова Гульмира Токтарбековна",
    school: "Гимназия №5 им. Абая · Шымкент",
    initials: "СГ",
  },
  {
    text: "Барлық сабақ қазақ тілінде. Сертификатты аттестацияға тапсырдым — нөмірі бойынша бірден тексерілді.",
    name: "Әбдірахманов Қуаныш Ғанибекұлы",
    school: "Мектеп-лицей №12 · Астана",
    initials: "ӘҚ",
  },
  {
    text: "В селе интернет слабый, но уроки открывались с телефона нормально. Прогресс не терялся, даже когда связь пропадала.",
    name: "Нурланова Айгуль Сериковна",
    school: "СШ №3 · Карагандинская область",
    initials: "АН",
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
    a: "Проверьте, что WhatsApp установлен на этом номере — код приходит именно туда. Подождите минуту и нажмите «Отправить код повторно». Если код так и не пришёл — напишите на help@lms.kz, поможем войти вручную.",
  },
];

export default function LandingPage() {
  const { t } = useLang();
  const authed = Boolean(useMe().me);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  /* Витрина каталога — те же живые данные, что и на «/courses» */
  const catalog = useLoad(() => api<CatalogOut>("/courses"), []);
  const popular = (catalog.data?.items ?? []).slice(0, 6);

  return (
    <PublicShell hasStickyCta>
      {/* ===== Первый экран ===== */}
      <section className="page" style={{ paddingTop: 32, paddingBottom: 8 }}>
        <div className="hero-grid">
          <div className="stack g20">
            <Badge kind="accepted" icon={<IconShield size={14} />}>
              Онлайн-курсы с сертификатом
            </Badge>
            <h1
              className="h1"
              style={{ fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.14, letterSpacing: "-0.03em" }}
            >
              Повышение квалификации онлайн — в своём темпе, с сертификатом
            </h1>
            <p className="body muted pretty" style={{ maxWidth: 560 }}>
              Курсы на русском и казахском: короткие видеоуроки, конспекты и практические
              задания. Учитесь с телефона между уроками, а в конце получаете сертификат
              с номером — его может проверить любая комиссия.
            </p>
            <div className="row wrap g10">
              <Link
                href={authed ? "/my" : "/login"}
                className="btn btn-primary btn-lg hero-cta"
              >
                {authed ? t.navHome : t.start}
              </Link>
              <Link href="/courses" className="btn btn-secondary btn-lg hero-cta">
                Смотреть каталог
              </Link>
            </div>
            <p className="small muted-3">
              Регистрация по номеру телефона — около минуты. Доступ к курсам сразу
              после входа.
            </p>
          </div>

          <div className="hero-art">
            <div
              className="card"
              style={{
                overflow: "hidden",
                boxShadow: "var(--shadow-hover)",
                background: "linear-gradient(150deg,var(--hero-from) 0%,var(--hero-mid) 55%,var(--hero-to) 100%)",
                border: "1px solid var(--hero-line)",
              }}
            >
              <div className="stack g16" style={{ padding: 24 }}>
                <div className="row g10">
                  <span className="logo-mark" style={{ width: 40, height: 40 }}>
                    <IconGraduation size={22} />
                  </span>
                  <div className="stack">
                    <strong style={{ fontSize: 15 }}>Цифровая грамотность педагога</strong>
                    <span className="caption muted">18 уроков · 36 часов · RU · KZ</span>
                  </div>
                </div>
                <div
                  className="card"
                  style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {[
                    { label: "Google Класс: первый запуск", done: true },
                    { label: "Создание теста за 10 минут", done: true },
                    { label: "Практическое задание: свой тест", done: false },
                  ].map((r) => (
                    <div key={r.label} className="row g10">
                      <span
                        className={`lesson-icon ${r.done ? "done" : "current"}`}
                        style={{ width: 28, height: 28, borderRadius: 8 }}
                      >
                        {r.done ? <IconCheckCircle size={16} /> : <IconPlay size={13} />}
                      </span>
                      <span className="small grow">{r.label}</span>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div className="row between small" style={{ marginBottom: 8 }}>
                    <span className="muted">Прогресс курса</span>
                    <strong style={{ color: "var(--primary)" }}>67%</strong>
                  </div>
                  <div className="progress progress-thick">
                    <div className="progress-bar" style={{ width: "67%" }} />
                  </div>
                </div>
                <div className="note note-success" style={{ padding: "10px 12px" }}>
                  <IconCertificate size={18} />
                  <span className="small">Сертификат KZ-2026-004821 · 36 часов</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Цифры ===== */}
      <section className="page" style={{ paddingTop: 32, paddingBottom: 8 }}>
        <div className="card card-pad stats-grid">
          {[
            { v: "120", l: "курсов в каталоге" },
            { v: fmt(4300), l: "учителей уже учатся" },
            { v: fmt(2800), l: "сертификатов выдано" },
          ].map((s) => (
            <div key={s.l} className="stack g4" style={{ alignItems: "center", textAlign: "center" }}>
              <div
                style={{
                  fontSize: "clamp(26px, 5vw, 36px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "var(--primary)",
                }}
              >
                {s.v}
              </div>
              <div className="small muted">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Как это работает ===== */}
      <section id="how" className="page section">
        <div className="stack g8" style={{ marginBottom: 24 }}>
          <h2 className="h2">{t.secHowItWorks}</h2>
          <p className="body muted pretty" style={{ maxWidth: 620 }}>
            Четыре шага от каталога до сертификата. Прогресс сохраняется — можно прерваться
            и вернуться.
          </p>
        </div>
        <div className="grid-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="card card-pad stack g10">
                <div className="row between">
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "var(--primary-bg)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={22} />
                  </span>
                  <span
                    className="caption"
                    style={{ color: "var(--text-3)", fontSize: 22, fontWeight: 800 }}
                  >
                    {i + 1}
                  </span>
                </div>
                <h3 className="h3">{s.title}</h3>
                <p className="small muted pretty">{s.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Популярные курсы ===== */}
      {(catalog.loading || popular.length > 0) && (
        <section className="page section" style={{ paddingTop: 8 }}>
          <div className="row between wrap g12" style={{ marginBottom: 20 }}>
            <div className="stack g4">
              <h2 className="h2">{t.secPopular}</h2>
              <p className="small muted">Чаще всего выбирают учителя в этом месяце</p>
            </div>
            <Link href="/courses" className="btn btn-secondary">
              {t.viewAll}
              <IconArrowRight size={17} />
            </Link>
          </div>
          <div className="grid-courses">
            {catalog.loading
              ? Array.from({ length: 3 }).map((_, i) => <CourseCardSkeleton key={i} />)
              : popular.map((g) => <CourseCard key={g.group_id} group={g} />)}
          </div>
        </section>
      )}

      {/* ===== Отзывы ===== */}
      <section className="page section" style={{ paddingTop: 8 }}>
        <h2 className="h2" style={{ marginBottom: 20 }}>
          {t.secTestimonials}
        </h2>
        <div className="grid-3">
          {testimonials.map((r, i) => (
            <figure key={i} className="card card-pad stack g14">
              <Stars value={5} size={15} />
              <blockquote className="body pretty" style={{ fontSize: 15, lineHeight: "24px" }}>
                «{r.text}»
              </blockquote>
              <figcaption className="row g10" style={{ marginTop: "auto" }}>
                <span
                  className="avatar"
                  style={{ width: 40, height: 40, fontSize: 14 }}
                  aria-hidden="true"
                >
                  {r.initials}
                </span>
                <span className="stack" style={{ minWidth: 0 }}>
                  <strong className="small">{r.name}</strong>
                  <span className="caption muted-3">{r.school}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ===== Частые вопросы ===== */}
      <section id="faq" className="page section" style={{ paddingTop: 8 }}>
        <div className="row between wrap g12" style={{ marginBottom: 20 }}>
          <div className="stack g4">
            <h2 className="h2">{t.secFaq}</h2>
            <p className="small muted">Не нашли ответ — напишите нам, отвечаем в рабочие дни.</p>
          </div>
          <a href="mailto:help@lms.kz" className="btn btn-secondary">
            Задать вопрос
          </a>
        </div>
        <div className="stack g10" style={{ maxWidth: 820 }}>
          {faq.map((f, i) => (
            <div key={i} className="accordion">
              <button
                className="acc-head"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                <span className="grow h3" style={{ fontSize: 16 }}>
                  {f.q}
                </span>
                <IconChevronDown className="acc-chevron" data-open={openFaq === i} />
              </button>
              {openFaq === i && (
                <div className="acc-body">
                  <p className="body muted pretty" style={{ padding: "14px 16px", fontSize: 15 }}>
                    {f.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Финальный призыв ===== */}
      <section className="page" style={{ paddingBottom: 48 }}>
        <div
          className="card card-pad stack g16"
          style={{
            background: "linear-gradient(135deg,var(--primary) 0%,var(--primary-pressed) 100%)",
            border: "none",
            padding: "32px 24px",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <h2 className="h2" style={{ color: "var(--text-on-fill)", maxWidth: 520 }}>
            Начните с одного урока — сегодня вечером
          </h2>
          <p style={{ color: "var(--text-on-fill-soft)", maxWidth: 480 }} className="body pretty">
            Регистрация по номеру телефона — без документов и анкет.
          </p>
          <Link
            href={authed ? "/my" : "/login"}
            className="btn btn-lg"
            style={{ background: "var(--card)", color: "var(--primary-pressed)", minWidth: 220 }}
          >
            {authed ? t.navHome : t.start}
          </Link>
        </div>
      </section>

      <Footer />

      {/* Липкая кнопка на мобильном — страница длинная, решение принимают в любой момент */}
      <div className="sticky-cta mobile-only no-tabbar">
        <div className="sticky-cta-inner row g8">
          <Link href={authed ? "/my" : "/login"} className="btn btn-primary btn-lg grow">
            {authed ? t.navHome : t.start}
          </Link>
          <Link href="/courses" className="btn btn-secondary btn-lg">
            Каталог
          </Link>
        </div>
      </div>

      <style>{`
        .hero-grid { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: center; }
        .hero-art { display: none; }
        .hero-cta { flex: 1; min-width: 160px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (min-width: 940px) {
          .hero-grid { grid-template-columns: 1.05fr 0.95fr; gap: 48px; padding: 24px 0 16px; }
          .hero-art { display: block; }
          .hero-cta { flex: initial; }
        }
      `}</style>
    </PublicShell>
  );
}
