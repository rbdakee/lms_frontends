"use client";

/**
 * Карта экранов — служебная страница для приёмки прототипа.
 * Не часть продукта: в интерфейсе её нет, ссылка только в подвале.
 */

import Link from "next/link";
import { useStore } from "@lms/prototype";
import { Footer, PublicShell } from "@/components/layout/Shell";
import { admin } from "@/lib/urls";
import { Button, Note } from "@lms/ui";
import { IconChevronRight } from "@lms/ui/icons";

/** Путь учителя до заявки — то, что проверяется в этом приложении. */
const FLOW: [string, string][] = [
  ["/courses", "1. Каталог: цена и бейджи набора у каждой карточки"],
  ["/courses/pisa-literacy", "2. Страница курса: цена, старт и кнопка «Записаться»"],
  ["/my", "3. Кабинет: блок «Ожидают подтверждения»"],
];

interface Group {
  title: string;
  note: string;
  /** Экраны другого приложения — ссылка строится через admin() */
  external?: boolean;
  items: [string, string, string][];
}

const GROUPS: Group[] = [
  {
    title: "Публичная часть",
    note: "Работает без входа",
    items: [
      ["/", "Лендинг", "5.1"],
      ["/courses", "Каталог курсов · цена, статусы набора, фильтры", "5.2"],
      ["/courses/digital-literacy", "Страница курса · двуязычный, идёт набор", "5.3"],
      ["/courses/pisa-literacy", "Курс запланирован · «Старт 1 сентября»", "5.16"],
      ["/courses/parents-conflicts", "Набор закрыт · кнопка неактивна", "5.16"],
      ["/verify", "Проверка сертификата — форма", "5.12"],
      ["/verify/KZ-2026-004821", "Проверка по ссылке или QR — подлинный", "5.12"],
      ["/verify/KZ-2026-000000", "Проверка по ссылке или QR — не найден", "5.12"],
      ["/login", "Вход по телефону (код 4812)", "5.4"],
      ["/onboarding", "Онбординг после первого входа · фото необязательно", "5.5"],
    ],
  },
  {
    title: "Кабинет учителя",
    note: "Демо-состояние: 12 из 18 уроков, одна заявка ждёт подтверждения",
    items: [
      ["/my", "Главная · мои курсы и «Ожидают подтверждения»", "5.6"],
      ["/learn/digital-literacy/l6", "Плеер урока · состояния переключаются вручную", "5.7"],
      ["/learn/digital-literacy/l2", "Урок-конспект (текст) · вопросы тредом", "5.7"],
      ["/learn/digital-literacy/quiz/l18", "Непересдаваемый тест · «У вас одна попытка»", "5.8"],
      ["/learn/digital-literacy/quiz/l14", "Пересдаваемый тест · попыток не ограничено", "5.8"],
      ["/learn/digital-literacy/quiz/l4/result", "Результат, разбор и история попыток", "5.8"],
      ["/learn/digital-literacy/task/l17", "Задание — форма сдачи", "5.9"],
      ["/learn/digital-literacy/task/l7", "Задание — зачтено", "5.9"],
      ["/learn/digital-literacy/task/l12", "Задание — на доработку", "5.9"],
      ["/courses/digital-literacy/complete", "Завершение курса", "5.10"],
      ["/certificates", "Мои сертификаты", "5.11"],
      ["/certificates/cert-formative", "Сертификат A4 · RU и KZ", "5.11"],
      ["/notifications", "Уведомления · доступ открыт, скоро старт", "5.14"],
      ["/profile", "Профиль · устройства, где выполнен вход", "5.13"],
    ],
  },
  {
    title: "Админка",
    note: "Отдельное приложение на своём домене — открывается в нём же. Колокольчика нет: уведомления админа в Telegram-боте",
    /* Ссылки уходят на другой домен, поэтому строятся через admin() */
    external: true,
    items: [
      ["/", "Рабочий стол · три плитки того, что требует действия", "5.15"],
      ["/leads", "Заявки на курсы · «Позвонить», «WhatsApp», «Открыть доступ»", "5.26"],
      ["/leads/ld3", "Карточка заявки · история статусов и заметка", "5.26"],
      ["/courses", "Список курсов · цена, статус, старт, заявки в работе", "5.16"],
      ["/courses/digital-literacy", "Карточка курса · обзор", "5.17"],
      ["/courses/digital-literacy?tab=participants", "Участники курса · этапы и работы", "5.21"],
      [
        "/courses/digital-literacy/edit",
        "Редактор курса · есть казахская версия, «РУС | ҚАЗ» открывает её",
        "5.17",
      ],
      [
        "/courses/formative-assessment/edit",
        "Редактор курса · версии нет, «Создать казахскую версию»",
        "5.17",
      ],
      ["/lessons/l6", "Редактор урока · «Предпросмотр как учитель»", "5.18"],
      ["/quizzes/l18", "Редактор теста · «Пересдаваемый» выключен", "5.19"],
      ["/quizzes/l14", "Редактор теста · «Пересдаваемый» включён", "5.19"],
      ["/tasks/l7", "Редактор задания · зачёт/доработка, без баллов", "5.20"],
      ["/submissions", "Проверка работ · выбор курса", "5.21"],
      ["/submissions/s1", "Проверка одной работы", "5.21"],
      ["/teachers", "Список учителей · «Скачать CSV»", "5.22"],
      ["/teachers/t2", "Карточка учителя · доступ, пересдача, попытки", "5.22"],
      ["/reports/digital-literacy", "Отчёт по курсу · воронка", "5.23"],
      ["/questions", "Вопросы от учителей · треды", "5.24"],
      ["/reviews", "Отзывы · без премодерации, ответ и удаление", "5.24"],
      ["/settings", "Настройки · контакты, Telegram-бот, картинки", "5.25"],
    ],
  },
];

export default function MapPage() {
  const { resetDemo, toast } = useStore();

  return (
    <PublicShell>
      <div className="page section stack g24" style={{ paddingTop: 24 }}>
        <div className="stack g8">
          <h1 className="h1">Карта экранов прототипа</h1>
          <p className="body muted pretty" style={{ maxWidth: 680 }}>
            Служебная страница для приёмки — в самом продукте её нет. Номера справа
            ссылаются на разделы <span className="mono">DESIGN_BRIEF.md</span>.
          </p>
        </div>

        <Note kind="info">
          Прототип помнит состояние между экранами этого приложения: отправили
          заявку — она видна в кабинете, прошли урок — засчитан прогресс. Админка
          с недавних пор — отдельное приложение на своём домене, и состояние
          у неё своё: «Открыть доступ» там не отразится здесь, пока курсы, заявки
          и доступы не поедут через настоящий API. Сбросить можно кнопкой ниже
          или в профиле.
        </Note>

        {/* Путь учителя до заявки — дальше решение принимает администратор */}
        <section className="card card-pad stack g12">
          <div className="stack g4">
            <h2 className="h2">Путь учителя: каталог → заявка</h2>
            <span className="caption muted pretty">
              Доступ к курсу выдаёт администратор вручную, оплата идёт вне платформы.
              Пройдите три шага подряд — состояние сохраняется между экранами.
            </span>
          </div>
          <div className="stack g8">
            {FLOW.map(([href, label]) => (
              <Link key={label} href={href} className="row g10" style={{ minHeight: 44 }}>
                <span className="grow small pretty" style={{ fontWeight: 600 }}>
                  {label}
                </span>
                <span className="caption mono muted-3 nowrap">{href}</span>
                <IconChevronRight size={16} className="muted-3" />
              </Link>
            ))}
            <Link href={admin("/leads")} className="row g10" style={{ minHeight: 44 }}>
              <span className="grow small pretty" style={{ fontWeight: 600 }}>
                4. Дальше — в админке: очередь заявок и «Открыть доступ»
              </span>
              <span className="caption mono muted-3 nowrap">/leads</span>
              <IconChevronRight size={16} className="muted-3" />
            </Link>
          </div>
        </section>

        <div className="row wrap g10">
          <Button
            variant="secondary"
            onClick={() => {
              resetDemo("default");
              toast("Демо-состояние восстановлено", "success");
            }}
          >
            Сбросить в демо-состояние
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetDemo("empty");
              toast("Состояние нового пользователя");
            }}
          >
            Состояние нового пользователя
          </Button>
        </div>

        {GROUPS.map((g) => (
          <section key={g.title} className="stack g12">
            <div className="stack g4">
              <h2 className="h2">{g.title}</h2>
              <span className="caption muted">{g.note}</span>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {g.items.map(([path, label, ref], i) => (
                <Link
                  key={path}
                  href={g.external ? admin(path) : path}
                  className="row g12"
                  style={{
                    padding: "14px 16px",
                    borderTop: i > 0 ? "1px solid #f1f5f9" : undefined,
                    minHeight: 56,
                  }}
                >
                  <span className="grow stack g2" style={{ minWidth: 0 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {label}
                    </span>
                    <span className="caption mono muted-3">{path}</span>
                  </span>
                  <span className="caption muted-3 nowrap">{ref}</span>
                  <IconChevronRight size={17} className="muted-3" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Footer />
    </PublicShell>
  );
}
