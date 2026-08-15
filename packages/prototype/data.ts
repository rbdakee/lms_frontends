/**
 * Тестовые данные прототипа — реальные названия, ФИО и школы из DESIGN_PROMPTS.md.
 * Никакого lorem ipsum: длинные названия и длинные ФИО оставлены специально,
 * чтобы проверять вёрстку.
 *
 * Модель повторяет договорённости из BACKEND_NOTES.md:
 * курс одноязычный, русская и казахская версии — два курса с общим `groupId`.
 */

export type Lang = "ru" | "kz";
export type LessonKind = "video" | "text" | "quiz" | "task";

/** Статус набора курса — раздел 5.16 брифа. */
export type CourseStatus = "draft" | "planned" | "open" | "closed" | "hidden";

export interface Lesson {
  id: string;
  n: number;
  title: string;
  kind: LessonKind;
  duration: string;
  /** «Требует времени», минут — вводится админом вручную, суммируется в программе */
  timeMin: number;
  /** для тестов */
  questions?: number;
  minutes?: number;
  passScore?: number;
  final?: boolean;
  /** Пересдаваемый тест: попыток сколько угодно, засчитывается последний результат */
  retakable?: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

/** Ответ администратора на отзыв — тем же тредом, что и в вопросах. */
export interface ReviewReply {
  author: string;
  date: string;
  text: string;
}

export interface Review {
  id: string;
  author: string;
  school: string;
  rating: number;
  text: string;
  date: string;
  reply?: ReviewReply;
}

export interface Course {
  id: string;
  /** Общий идентификатор языковой группы: RU и KZ версии — два курса с одним groupId */
  groupId: string;
  lang: Lang;
  title: string;
  category: string;
  lessons: number;
  hours: number;
  modules: number;
  rating: number;
  reviewsCount: number;
  students: number;
  isNew?: boolean;
  short: string;
  full: string;
  cover: string;
  weeks: string;
  tasksCount: number;
  passScore: number;
  /** Цена в тенге. Пусто — «Цена по запросу», платформа деньги не принимает */
  price?: number;
  status: CourseStatus;
  /** Дата старта для запланированного курса, ISO */
  startsAt?: string;
  /** Дата публикации — по ней сортируются «новые» */
  publishedAt: string;
  modulesList?: Module[];
  reviews?: Review[];
}

const c1Modules: Module[] = [
  {
    id: "m1",
    title: "Модуль 1. Основы цифровой среды",
    lessons: [
      { id: "l1", n: 1, title: "Что такое цифровая грамотность", kind: "video", duration: "12 мин", timeMin: 12 },
      { id: "l2", n: 2, title: "Безопасность в интернете", kind: "text", duration: "15 мин", timeMin: 15 },
      { id: "l3", n: 3, title: "Аккаунты и пароли: как не потерять всё", kind: "video", duration: "18 мин", timeMin: 18 },
      {
        id: "l4",
        n: 4,
        title: "Тест модуля 1",
        kind: "quiz",
        duration: "8 вопросов",
        timeMin: 15,
        questions: 8,
        minutes: 15,
        passScore: 70,
        retakable: false,
      },
    ],
  },
  {
    id: "m2",
    title: "Модуль 2. Инструменты для урока",
    lessons: [
      { id: "l5", n: 5, title: "Google Класс: первый запуск", kind: "video", duration: "24 мин", timeMin: 24 },
      { id: "l6", n: 6, title: "Создание теста за 10 минут", kind: "video", duration: "15 мин", timeMin: 15 },
      { id: "l7", n: 7, title: "Практическое задание: свой тест", kind: "task", duration: "загрузка файла", timeMin: 40 },
      { id: "l8", n: 8, title: "Совместные документы в работе класса", kind: "video", duration: "16 мин", timeMin: 16 },
      {
        id: "l9",
        n: 9,
        title: "Тест модуля 2",
        kind: "quiz",
        duration: "10 вопросов",
        timeMin: 15,
        questions: 10,
        minutes: 15,
        passScore: 70,
        retakable: false,
      },
    ],
  },
  {
    id: "m3",
    title: "Модуль 3. Оценивание и обратная связь",
    lessons: [
      { id: "l10", n: 10, title: "Онлайн-опросы на уроке", kind: "video", duration: "14 мин", timeMin: 14 },
      { id: "l11", n: 11, title: "Электронный журнал без ошибок", kind: "text", duration: "12 мин", timeMin: 12 },
      { id: "l12", n: 12, title: "Практическое задание: план цифрового урока", kind: "task", duration: "загрузка файла", timeMin: 45 },
      { id: "l13", n: 13, title: "Обратная связь ученику в цифре", kind: "video", duration: "19 мин", timeMin: 19 },
      {
        id: "l14",
        n: 14,
        title: "Тест модуля 3",
        kind: "quiz",
        duration: "8 вопросов",
        timeMin: 15,
        questions: 8,
        minutes: 15,
        passScore: 70,
        /** Пересдаваемый — на нём проверяется спокойный сценарий без модалки */
        retakable: true,
      },
    ],
  },
  {
    id: "m4",
    title: "Модуль 4. Данные и искусственный интеллект",
    lessons: [
      { id: "l15", n: 15, title: "Персональные данные учеников: что можно и что нельзя", kind: "text", duration: "10 мин", timeMin: 10 },
      { id: "l16", n: 16, title: "ИИ-помощник для подготовки к уроку", kind: "video", duration: "21 мин", timeMin: 21 },
      { id: "l17", n: 17, title: "Практическое задание: свой набор промптов", kind: "task", duration: "загрузка файла", timeMin: 40 },
      {
        id: "l18",
        n: 18,
        title: "Итоговый тест",
        kind: "quiz",
        duration: "20 вопросов · 30 мин · порог 70%",
        timeMin: 30,
        questions: 20,
        minutes: 30,
        passScore: 70,
        final: true,
        retakable: false,
      },
    ],
  },
];

/** Казахская версия того же курса — отдельный курс со своей программой. */
const c1KzModules: Module[] = [
  {
    id: "km1",
    title: "1-модуль. Цифрлық ортаның негіздері",
    lessons: [
      { id: "k1", n: 1, title: "Цифрлық сауаттылық дегеніміз не", kind: "video", duration: "12 мин", timeMin: 12 },
      { id: "k2", n: 2, title: "Интернеттегі қауіпсіздік", kind: "text", duration: "15 мин", timeMin: 15 },
      { id: "k3", n: 3, title: "Аккаунттар мен құпиясөздер", kind: "video", duration: "18 мин", timeMin: 18 },
      {
        id: "k4",
        n: 4,
        title: "1-модуль тесті",
        kind: "quiz",
        duration: "8 сұрақ",
        timeMin: 15,
        questions: 8,
        minutes: 15,
        passScore: 70,
        retakable: false,
      },
    ],
  },
  {
    id: "km2",
    title: "2-модуль. Сабаққа арналған құралдар",
    lessons: [
      { id: "k5", n: 5, title: "Google Class: алғашқы қадамдар", kind: "video", duration: "24 мин", timeMin: 24 },
      { id: "k6", n: 6, title: "10 минутта тест құрастыру", kind: "video", duration: "15 мин", timeMin: 15 },
      { id: "k7", n: 7, title: "Практикалық тапсырма: өз тестің", kind: "task", duration: "файл жүктеу", timeMin: 40 },
      {
        id: "k8",
        n: 8,
        title: "Қорытынды тест",
        kind: "quiz",
        duration: "20 сұрақ · 30 мин · шек 70%",
        timeMin: 30,
        questions: 20,
        minutes: 30,
        passScore: 70,
        final: true,
        retakable: false,
      },
    ],
  },
];

export const courses: Course[] = [
  {
    id: "digital-literacy",
    groupId: "digital-literacy",
    lang: "ru",
    title: "Цифровая грамотность педагога",
    category: "Цифровые навыки",
    lessons: 18,
    hours: 36,
    modules: 4,
    rating: 4.8,
    reviewsCount: 126,
    students: 4316,
    price: 45000,
    status: "open",
    publishedAt: "2026-01-18",
    short:
      "Google Класс, онлайн-тесты, безопасность и цифровые инструменты — на примерах из школьной практики.",
    full:
      "Курс о том, как использовать цифровые инструменты в реальном классе: планирование урока, онлайн-оценивание, безопасность данных учеников и работа с ИИ-помощниками. Каждый модуль заканчивается тестом, финал — практическое задание с проверкой администратора.",
    cover: "cover-c1",
    weeks: "≈ 3 недели",
    tasksCount: 3,
    passScore: 70,
    modulesList: c1Modules,
    reviews: [
      {
        id: "cr1",
        author: "Нурланова Айгуль Сериковна",
        school: "КГУ «Средняя школа №27» · Алматы",
        rating: 5,
        text: "Проходила с телефона по дороге на работу. Всё открывается, ничего не тормозит, видео можно смотреть на скорости 1,5×.",
        date: "12 мая 2026",
      },
      {
        id: "cr2",
        author: "Нурланова Айгуль Сериковна",
        school: "КГУ «Средняя школа №27» · Алматы",
        rating: 4,
        text: "Дошла до четвёртого модуля и вернулась дописать: раздел про ИИ пришлось пересматривать дважды, примеров для начальной школы там мало.",
        date: "26 мая 2026",
        reply: {
          author: "Администратор",
          date: "27 мая 2026",
          text: "Спасибо, записали. К осеннему потоку добавим два примера по начальным классам в 16-й урок.",
        },
      },
      {
        id: "cr3",
        author: "Ким Елена Викторовна",
        school: "Школа-лицей №8 · Караганда",
        rating: 5,
        text: "Модуль про Google Класс пригодился сразу — на следующий день собрала тест для 7 класса за десять минут.",
        date: "4 мая 2026",
      },
      {
        id: "cr4",
        author: "Жумабаев Асхат Маратович",
        school: "КГУ «ОШ №12», с. Каскелен · Алматинская обл.",
        rating: 4,
        text: "Хотелось бы больше примеров для начальной школы, но в целом всё понятно и по делу. Задания проверяют быстро.",
        date: "28 апреля 2026",
        reply: {
          author: "Администратор",
          date: "29 апреля 2026",
          text: "Задания стараемся проверять за один-два дня. По начальной школе есть отдельный курс «Читательская грамотность» — там примеры как раз для 1–4 классов.",
        },
      },
    ],
  },
  {
    id: "digital-literacy-kz",
    groupId: "digital-literacy",
    lang: "kz",
    title: "Педагогтің цифрлық сауаттылығы",
    category: "Цифровые навыки",
    lessons: 8,
    hours: 24,
    modules: 2,
    rating: 4.7,
    reviewsCount: 34,
    students: 612,
    price: 40000,
    status: "open",
    publishedAt: "2026-03-02",
    short:
      "Google Class, онлайн-тесттер және оқушы деректерінің қауіпсіздігі — мектеп тәжірибесіндегі мысалдармен.",
    full:
      "Курс цифрлық құралдарды нақты сыныпта қалай қолдану керектігі туралы: сабақты жоспарлау, онлайн бағалау және оқушылардың деректерін қорғау. Әр модуль тестпен аяқталады.",
    cover: "cover-c1",
    weeks: "≈ 2 апта",
    tasksCount: 1,
    passScore: 70,
    modulesList: c1KzModules,
    reviews: [
      {
        id: "crk1",
        author: "Оспанова Динара Бахытжановна",
        school: "КГУ «М. Әуезов атындағы ОМ» · Түркістан обл.",
        rating: 5,
        text: "Барлығы қазақ тілінде, түсінікті. Тестті телефоннан тапсырдым, ешқандай қиындық болған жоқ.",
        date: "18 мамыр 2026",
      },
    ],
  },
  {
    id: "formative-assessment",
    groupId: "formative-assessment",
    lang: "ru",
    title: "Формативное оценивание в классе",
    category: "Оценивание",
    lessons: 12,
    hours: 24,
    modules: 3,
    rating: 4.9,
    reviewsCount: 98,
    students: 2441,
    price: 35000,
    status: "open",
    publishedAt: "2026-02-04",
    short:
      "Приёмы формативного оценивания, которые работают на обычном уроке без дополнительной техники.",
    full:
      "Как видеть прогресс каждого ученика прямо на уроке и вовремя корректировать объяснение. Разбираем приёмы, критерии, обратную связь и типичные ошибки.",
    cover: "cover-c2",
    weeks: "≈ 2 недели",
    tasksCount: 2,
    passScore: 70,
  },
  {
    id: "pisa-literacy",
    groupId: "pisa-literacy",
    lang: "ru",
    title: "Функциональная грамотность: задания PISA на уроке",
    category: "Методика преподавания",
    lessons: 15,
    hours: 30,
    modules: 4,
    rating: 4.8,
    reviewsCount: 74,
    students: 1932,
    price: 60000,
    status: "planned",
    startsAt: "2026-09-01",
    publishedAt: "2026-07-28",
    short:
      "Как составлять и разбирать задания в формате PISA по своему предмету — с готовыми примерами.",
    full:
      "Читательская, математическая и естественно-научная грамотность: структура заданий, критерии проверки и способы встроить их в обычный урок.",
    cover: "cover-c3",
    weeks: "≈ 3 недели",
    tasksCount: 3,
    passScore: 70,
  },
  {
    id: "inclusive-education",
    groupId: "inclusive-education",
    lang: "ru",
    title: "Работа с детьми с особыми образовательными потребностями",
    category: "Инклюзивное образование",
    lessons: 21,
    hours: 40,
    modules: 5,
    rating: 4.7,
    reviewsCount: 143,
    students: 644,
    price: 75000,
    status: "planned",
    startsAt: "2026-10-15",
    publishedAt: "2026-08-01",
    short:
      "Практика инклюзии: адаптация материала, работа с классом, взаимодействие с родителями и специалистами.",
    full:
      "Курс для учителя, у которого в классе есть ребёнок с особыми потребностями. Без теории ради теории — только то, что применимо завтра на уроке.",
    cover: "cover-c4",
    weeks: "≈ 4 недели",
    tasksCount: 4,
    passScore: 70,
  },
  {
    id: "ai-for-teacher",
    groupId: "ai-for-teacher",
    lang: "ru",
    title: "Искусственный интеллект в работе учителя",
    category: "Цифровые навыки",
    lessons: 16,
    hours: 32,
    modules: 4,
    rating: 4.9,
    reviewsCount: 51,
    students: 1163,
    isNew: true,
    /** Цена не задана — в каталоге «Цена по запросу», а не пустое место */
    status: "open",
    publishedAt: "2026-07-14",
    short:
      "ИИ-помощник для планов уроков, проверочных работ и обратной связи — с проверкой фактов и границами применения.",
    full:
      "Практический курс: какие задачи учителя ИИ решает хорошо, какие плохо, как формулировать запросы и как не нарушить правила работы с данными учеников.",
    cover: "cover-c5",
    weeks: "≈ 3 недели",
    tasksCount: 3,
    passScore: 70,
  },
  {
    id: "ai-for-teacher-kz",
    groupId: "ai-for-teacher",
    lang: "kz",
    title: "Мұғалім жұмысындағы жасанды интеллект",
    category: "Цифровые навыки",
    lessons: 14,
    hours: 28,
    modules: 4,
    rating: 4.8,
    reviewsCount: 12,
    students: 214,
    isNew: true,
    price: 55000,
    status: "planned",
    startsAt: "2026-10-01",
    publishedAt: "2026-08-05",
    short:
      "Сабаққа дайындалу, тапсырма құрастыру және кері байланыс үшін ЖИ көмекшісі — фактілерді тексерумен.",
    full:
      "Практикалық курс: мұғалімнің қандай міндеттерін жасанды интеллект жақсы шешеді, қайсысын нашар, сұранысты қалай құру керек.",
    cover: "cover-c5",
    weeks: "≈ 3 апта",
    tasksCount: 2,
    passScore: 70,
  },
  {
    id: "parents-conflicts",
    groupId: "classroom-management",
    lang: "ru",
    title: "Классное руководство: конфликты и работа с родителями",
    category: "Классное руководство",
    lessons: 10,
    hours: 20,
    modules: 3,
    rating: 4.6,
    reviewsCount: 45,
    students: 287,
    price: 40000,
    status: "closed",
    publishedAt: "2026-01-09",
    short: "Трудные разговоры с родителями, конфликты в классе и способы их разрешить без выгорания.",
    full: "Сценарии сложных разговоров, техники деэскалации и границы ответственности классного руководителя.",
    cover: "cover-c3",
    weeks: "≈ 2 недели",
    tasksCount: 2,
    passScore: 70,
  },
  {
    id: "classroom-management",
    groupId: "classroom-management",
    lang: "kz",
    title: "Сынып жетекшілігі: қақтығыстар және ата-аналармен жұмыс",
    category: "Классное руководство",
    lessons: 14,
    hours: 28,
    modules: 4,
    rating: 4.6,
    reviewsCount: 62,
    students: 887,
    price: 40000,
    status: "closed",
    publishedAt: "2026-01-21",
    short:
      "Сынып жетекшісіне арналған курс: қақтығыстарды шешу, ата-аналармен әңгіме және сынып ұжымымен жұмыс.",
    full:
      "Курс сынып жетекшісінің күнделікті жұмысы туралы: жанжалдарды шешу, ата-аналар жиналысы, қиын әңгімелер және сынып ұжымын қалыптастыру.",
    cover: "cover-c6",
    weeks: "≈ 3 апта",
    tasksCount: 2,
    passScore: 70,
  },
  {
    id: "digital-journal",
    groupId: "digital-journal",
    lang: "ru",
    title: "Электронный журнал и отчётность без ошибок",
    category: "Цифровые навыки",
    lessons: 11,
    hours: 22,
    modules: 3,
    rating: 4.5,
    reviewsCount: 39,
    students: 1521,
    price: 30000,
    status: "open",
    publishedAt: "2026-03-19",
    short: "Ведение электронного журнала, типовые ошибки и подготовка отчётов без переделок.",
    full: "Пошагово разбираем работу с электронным журналом: выставление оценок, пропуски, отчёты за четверть и год.",
    cover: "cover-c1",
    weeks: "≈ 2 недели",
    tasksCount: 1,
    passScore: 70,
  },
  {
    id: "criteria-assessment",
    groupId: "criteria-assessment",
    lang: "kz",
    title: "Жаңартылған бағдарламадағы критериалды бағалау",
    category: "Оценивание",
    lessons: 14,
    hours: 28,
    modules: 4,
    rating: 4.8,
    reviewsCount: 88,
    students: 521,
    price: 38000,
    status: "open",
    publishedAt: "2026-04-21",
    short: "Критериалды бағалаудың құрылымы, дескрипторлар және нақты сабақтағы мысалдар.",
    full: "Жаңартылған мазмұн бойынша критериалды бағалау: жиынтық және қалыптастырушы бағалау, дескрипторларды құрастыру.",
    cover: "cover-c2",
    weeks: "≈ 3 апта",
    tasksCount: 2,
    passScore: 70,
  },
  {
    id: "reading-literacy",
    groupId: "reading-literacy",
    lang: "ru",
    title: "Читательская грамотность на предметном уроке",
    category: "Предметные курсы",
    lessons: 13,
    hours: 26,
    modules: 3,
    rating: 4.7,
    reviewsCount: 33,
    students: 712,
    isNew: true,
    price: 32000,
    status: "open",
    publishedAt: "2026-06-30",
    short: "Работа с текстом на уроках любого предмета: вопросы, стратегии чтения, проверка понимания.",
    full: "Курс для учителей-предметников: как встроить работу с текстом в химию, географию и историю.",
    cover: "cover-c4",
    weeks: "≈ 2 недели",
    tasksCount: 2,
    passScore: 70,
  },
  {
    id: "stem-lab",
    groupId: "stem-lab",
    lang: "ru",
    title: "Практикум по STEM-проектам в школе",
    category: "Предметные курсы",
    lessons: 17,
    hours: 34,
    modules: 4,
    rating: 4.5,
    reviewsCount: 27,
    students: 398,
    price: 55000,
    status: "planned",
    startsAt: "2026-09-20",
    publishedAt: "2026-08-08",
    short: "Как запустить проектную работу в школе: от идеи до защиты проекта учениками.",
    full: "Организация проектной деятельности, распределение ролей в команде и критерии оценки проекта.",
    cover: "cover-c5",
    weeks: "≈ 4 недели",
    tasksCount: 3,
    passScore: 70,
  },
  {
    id: "burnout",
    groupId: "burnout",
    lang: "ru",
    title: "Профилактика выгорания учителя",
    category: "Методика преподавания",
    lessons: 8,
    hours: 16,
    modules: 2,
    rating: 4.9,
    reviewsCount: 116,
    students: 1834,
    price: 25000,
    status: "open",
    publishedAt: "2026-02-26",
    short: "Нагрузка, границы и восстановление: короткий курс с практическими упражнениями.",
    full: "Как распознать выгорание на ранней стадии, распределить нагрузку и восстановить ресурс.",
    cover: "cover-c6",
    weeks: "≈ 2 недели",
    tasksCount: 1,
    passScore: 70,
  },
];

export const DEMO_COURSE_ID = "digital-literacy";

/** Курсы, которые видны в каталоге: черновики и скрытые в выдачу не попадают. */
export const catalogCourses = courses.filter(
  (c) => c.status === "open" || c.status === "planned" || c.status === "closed",
);

export const categories = [
  "Цифровые навыки",
  "Методика преподавания",
  "Оценивание",
  "Инклюзивное образование",
  "Классное руководство",
  "Предметные курсы",
];

export const regions = [
  "Алматы",
  "Астана",
  "Шымкент",
  "Алматинская область",
  "Карагандинская область",
  "Туркестанская область",
  "Актюбинская область",
  "Восточно-Казахстанская область",
];

export const subjects = [
  "Математика",
  "Казахский язык и литература",
  "Русский язык и литература",
  "Начальные классы",
  "Информатика",
  "История",
  "Физика",
  "Биология",
];

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

/* ---------- Языковые версии ---------- */

/** Все версии курса — русская и казахская связаны общим groupId. */
export function groupVersions(course: Course): Course[] {
  return courses.filter((c) => c.groupId === course.groupId);
}

/** Языки, на которых существует курс — для бейджей на объединённой карточке. */
export function groupLangs(course: Course): Lang[] {
  const langs = groupVersions(course).map((c) => c.lang);
  return (["ru", "kz"] as Lang[]).filter((l) => langs.includes(l));
}

/** Версия курса на нужном языке; если её нет — единственная существующая. */
export function versionForLang(course: Course, lang: Lang): Course {
  return groupVersions(course).find((c) => c.lang === lang) ?? course;
}

/** Средняя оценка по всей языковой группе — так решено в BACKEND_NOTES. */
export function groupRating(course: Course): { rating: number; count: number } {
  const list = groupVersions(course);
  const count = list.reduce((s, c) => s + c.reviewsCount, 0);
  const rating = count
    ? list.reduce((s, c) => s + c.rating * c.reviewsCount, 0) / count
    : course.rating;
  return { rating, count };
}

export function allLessons(course: Course): Lesson[] {
  return (course.modulesList ?? []).flatMap((m) => m.lessons);
}

export function getLesson(course: Course, lessonId: string): Lesson | undefined {
  return allLessons(course).find((l) => l.id === lessonId);
}

export function moduleOfLesson(course: Course, lessonId: string): Module | undefined {
  return (course.modulesList ?? []).find((m) => m.lessons.some((l) => l.id === lessonId));
}

/** Сумма «требует времени» по всем элементам курса — подсказка в редакторе. */
export function programMinutes(course: Course): number {
  return allLessons(course).reduce((s, l) => s + (l.timeMin ?? 0), 0);
}

/* ---------- Вопросы теста ---------- */

export interface Question {
  id: string;
  type: "single" | "multi" | "bool";
  text: string;
  hint?: string;
  options: string[];
  correct: number[];
  points: number;
  explanation: string;
}

export const finalQuizQuestions: Question[] = [
  {
    id: "q1",
    type: "single",
    text: "Что нужно сделать в первую очередь, если вы получили письмо с просьбой срочно ввести пароль от школьной почты?",
    options: [
      "Ввести пароль, раз просят срочно",
      "Проверить адрес отправителя и не переходить по ссылке",
      "Переслать письмо коллегам",
      "Удалить письмо и никому не говорить",
    ],
    correct: [1],
    points: 1,
    explanation:
      "Это классический фишинг — злоумышленники давят на срочность. Сначала проверяем отправителя, по ссылкам из письма не переходим.",
  },
  {
    id: "q2",
    type: "bool",
    text: "Пароль «12345678» считается надёжным, если его никто не знает.",
    options: ["Верно", "Неверно"],
    correct: [1],
    points: 1,
    explanation:
      "Простые последовательности подбираются программой за секунды, даже если пароль «в секрете».",
  },
  {
    id: "q3",
    type: "multi",
    text: "Какие данные нельзя публиковать в открытом чате класса?",
    hint: "Выберите все подходящие варианты",
    options: [
      "Домашние адреса учеников",
      "Медицинские сведения",
      "Расписание уроков",
      "Телефоны родителей",
    ],
    correct: [0, 1, 3],
    points: 2,
    explanation:
      "Расписание — открытая информация. Адреса, медицинские данные и телефоны родителей относятся к персональным данным.",
  },
  {
    id: "q4",
    type: "single",
    text: "Вы хотите, чтобы ученики без Google-аккаунта прошли ваш тест в Google Формах. Что нужно сделать?",
    options: [
      "Ничего — аккаунт нужен всегда",
      "Отключить «Требовать вход в аккаунт» в настройках формы",
      "Отправить каждому ученику отдельную копию формы",
      "Перевести тест в документ Word",
    ],
    correct: [1],
    points: 1,
    explanation:
      "В настройках формы снимается требование входа — тогда ссылка открывается у любого ученика.",
  },
  {
    id: "q5",
    type: "multi",
    text: "Что относится к формативному оцениванию на цифровом уроке?",
    hint: "Выберите все подходящие варианты",
    options: [
      "Короткий опрос в начале урока",
      "Итоговая контрольная за четверть",
      "Взаимопроверка работ по критериям",
      "Быстрый онлайн-квиз на понимание темы",
    ],
    correct: [0, 2, 3],
    points: 2,
    explanation:
      "Формативное оценивание идёт по ходу обучения. Итоговая контрольная — суммативное оценивание.",
  },
  {
    id: "q6",
    type: "bool",
    text: "Скриншот электронного журнала с фамилиями и оценками можно выложить в общий родительский чат.",
    options: ["Верно", "Неверно"],
    correct: [1],
    points: 1,
    explanation:
      "Оценки конкретного ученика — персональные данные. Их сообщают только родителям этого ученика.",
  },
  {
    id: "q7",
    type: "single",
    text: "Вы попросили ИИ-помощника составить план урока. Что обязательно сделать перед использованием?",
    options: [
      "Ничего, ИИ проверяет факты сам",
      "Проверить факты и соответствие программе",
      "Отправить план на согласование в министерство",
      "Переписать план от руки",
    ],
    correct: [1],
    points: 1,
    explanation:
      "ИИ-помощник ошибается в фактах и датах. Учитель отвечает за содержание урока, поэтому проверка обязательна.",
  },
  {
    id: "q8",
    type: "single",
    text: "Ученик прислал работу с ошибками. Какая обратная связь полезнее?",
    options: [
      "«Плохо, переделай»",
      "Отметка без комментария",
      "Что получилось, что нужно исправить и как именно",
      "Исправить всё за ученика",
    ],
    correct: [2],
    points: 1,
    explanation:
      "Обратная связь работает, когда указывает на конкретный шаг для улучшения, а не оценивает ученика целиком.",
  },
];

/* ---------- Материалы урока ---------- */

export const lessonMaterials = [
  { name: "Чек-лист создания теста.pdf", size: "0,4 МБ", type: "PDF" },
  { name: "Шаблон вопросов.docx", size: "0,1 МБ", type: "DOC" },
];

/* ---------- Вопросы под уроком: тред без вложенности ---------- */

export interface ThreadReply {
  id: string;
  author: string;
  initials: string;
  /** Отвечать может админ и любой учитель с доступом к курсу */
  role: "admin" | "teacher";
  date: string;
  text: string;
}

export interface LessonThread {
  id: string;
  author: string;
  initials: string;
  date: string;
  text: string;
  replies: ThreadReply[];
}

export const lessonThreads: LessonThread[] = [
  {
    id: "th1",
    author: "Жумабаев Асхат Маратович",
    initials: "ЖА",
    date: "12 мая, 21:40",
    text: "Можно ли ограничить время прохождения теста в Google Формах?",
    replies: [],
  },
  {
    id: "th2",
    author: "Ким Елена Викторовна",
    initials: "КЕ",
    date: "9 мая, 14:05",
    text: "Ученики без Google-аккаунта смогут пройти тест?",
    replies: [
      {
        id: "th2r1",
        author: "Оспанова Динара Бахытжановна",
        initials: "ОД",
        role: "teacher",
        date: "9 мая, 16:22",
        text: "У меня работает: в настройках формы снимаю галочку про вход в аккаунт, и дети открывают по ссылке с телефона.",
      },
      {
        id: "th2r2",
        author: "Администратор",
        initials: "АД",
        role: "admin",
        date: "10 мая, 09:14",
        text: "Всё верно. Отключите «Требовать вход в аккаунт» — это показано на 8-й минуте видео. Тогда ссылка откроется у любого ученика.",
      },
    ],
  },
];

/* ---------- Уведомления ---------- */

export type NotifType = "access" | "task" | "answer" | "certificate" | "course" | "starting";

export const notifications: {
  id: string;
  type: NotifType;
  text: string;
  time: string;
  href: string;
}[] = [
  {
    id: "n0",
    type: "access",
    text: "Доступ к курсу «Цифровая грамотность педагога» открыт — можно начинать",
    time: "только что",
    href: "/courses/digital-literacy",
  },
  {
    id: "n1",
    type: "task",
    text: "Ваше задание «Практическое задание: свой тест» зачтено",
    time: "2 часа назад",
    href: "/learn/digital-literacy/task/l7",
  },
  {
    id: "n2",
    type: "answer",
    text: "Администратор ответил на ваш вопрос к уроку «Создание теста за 10 минут»",
    time: "вчера",
    href: "/learn/digital-literacy/l6",
  },
  {
    id: "n5",
    type: "starting",
    text: "Курс «Функциональная грамотность: задания PISA на уроке» стартует 1 сентября",
    time: "2 дня назад",
    href: "/courses/pisa-literacy",
  },
  {
    id: "n3",
    type: "certificate",
    text: "Сертификат по курсу «Формативное оценивание в классе» готов — можно скачать",
    time: "3 дня назад",
    href: "/certificates",
  },
  {
    id: "n4",
    type: "course",
    text: "В каталоге появился новый курс «Искусственный интеллект в работе учителя»",
    time: "5 дней назад",
    href: "/courses/ai-for-teacher",
  },
];

export const notificationIds = notifications.map((n) => n.id);

/* ---------- Сертификаты ---------- */

export interface Certificate {
  id: string;
  number: string;
  courseId: string;
  courseTitle: string;
  courseTitleKz?: string;
  hours: number;
  date: string;
  dateKz: string;
  holder: string;
  holderKz: string;
}

export const certificates: Certificate[] = [
  {
    id: "cert-formative",
    number: "KZ-2026-003107",
    courseId: "formative-assessment",
    courseTitle: "Формативное оценивание в классе",
    courseTitleKz: "Сыныптағы қалыптастырушы бағалау",
    hours: 24,
    date: "2 марта 2026 г.",
    dateKz: "2026 ж. 2 наурыз",
    holder: "Нурланова Айгуль Сериковна",
    holderKz: "Нұрланова Айгүл Серікқызы",
  },
];

/** Сертификат, который выдаётся при завершении демо-курса. */
export const demoCertificate: Certificate = {
  id: "cert-digital",
  number: "KZ-2026-004821",
  courseId: DEMO_COURSE_ID,
  courseTitle: "Цифровая грамотность педагога",
  courseTitleKz: "Педагогтің цифрлық сауаттылығы",
  hours: 36,
  date: "20 мая 2026 г.",
  dateKz: "2026 ж. 20 мамыр",
  holder: "Нурланова Айгуль Сериковна",
  holderKz: "Нұрланова Айгүл Серікқызы",
};

/** Реестр для страницы /verify. */
export const certRegistry: Record<
  string,
  { holder: string; course: string; hours: number; date: string }
> = {
  "KZ-2026-004821": {
    holder: "Смагулова Гульмира Токтарбековна",
    course: "Цифровая грамотность педагога",
    hours: 36,
    date: "14 мая 2026",
  },
  "KZ-2026-003107": {
    holder: "Нурланова Айгуль Сериковна",
    course: "Формативное оценивание в классе",
    hours: 24,
    date: "2 марта 2026",
  },
};

/* ---------- Профиль учителя ---------- */

export const teacherProfile = {
  lastName: "Нурланова",
  firstName: "Айгуль",
  middleName: "Сериковна",
  get fullName() {
    return `${this.lastName} ${this.firstName} ${this.middleName}`;
  },
  initials: "АН",
  phone: "+7 (707) 123-45-67",
  email: "",
  school: "КГУ «Средняя школа №27»",
  position: "Учитель",
  region: "Алматы",
  city: "Алматы",
  subject: "Математика",
  experience: "12",
};

/**
 * Устройства, где выполнен вход — раздел 5.13 брифа.
 * Ограничения на число входов нет: список нужен, чтобы человек сам
 * увидел лишнее и закрыл доступ.
 */
export const sessions = [
  { id: "s-cur", device: "iPhone 13", browser: "Safari", where: "Алматы", when: "сейчас", current: true },
  { id: "s-2", device: "Ноутбук Windows", browser: "Chrome", where: "Алматы", when: "вчера, 19:42", current: false },
  { id: "s-3", device: "Планшет школы", browser: "Chrome", where: "Алматы", when: "3 апреля, 11:05", current: false },
];

/* ---------- Контакты администратора (5.25) ---------- */

export const adminContacts = {
  name: "Аскарова Бота",
  phone: "+7 (701) 700-11-22",
  phoneRaw: "+77017001122",
  whatsapp: "https://wa.me/77017001122",
  telegram: "https://t.me/lms_kz_admin",
  telegramName: "@lms_kz_admin",
  hours: "Отвечаем с 9:00 до 18:00 по будням",
};

/* ---------- Данные админки ---------- */

export const adminTeachers = [
  {
    id: "t1",
    initials: "СГ",
    name: "Смагулова Гульмира Токтарбековна",
    phone: "+7 (701) 555-12-34",
    phoneRaw: "+77015551234",
    school: "Гимназия №5 им. Абая",
    region: "Шымкент",
    courses: 3,
    finished: 2,
    certs: 2,
    email: "g.smagulova@mail.kz",
    registered: "18 января 2026",
    subject: "Информатика",
  },
  {
    id: "t2",
    initials: "АН",
    name: "Нурланова Айгуль Сериковна",
    phone: "+7 (707) 123-45-67",
    phoneRaw: "+77071234567",
    school: "КГУ «Средняя школа №27»",
    region: "Алматы",
    courses: 2,
    finished: 1,
    certs: 1,
    email: "не указан",
    registered: "3 февраля 2026",
    subject: "Математика",
  },
  {
    id: "t3",
    initials: "ЖА",
    name: "Жумабаев Асхат Маратович",
    phone: "+7 (778) 900-44-21",
    phoneRaw: "+77789004421",
    school: "КГУ «ОШ №12», с. Каскелен",
    region: "Алматинская область",
    courses: 1,
    finished: 0,
    certs: 0,
    email: "не указан",
    registered: "2 апреля 2026",
    subject: "Физика",
  },
  {
    id: "t4",
    initials: "КЕ",
    name: "Ким Елена Викторовна",
    phone: "+7 (747) 210-88-05",
    phoneRaw: "+77472108805",
    school: "Школа-лицей №8",
    region: "Карагандинская область",
    courses: 2,
    finished: 2,
    certs: 2,
    email: "e.kim@lyceum8.kz",
    registered: "22 февраля 2026",
    subject: "Русский язык и литература",
  },
  {
    id: "t5",
    initials: "ОД",
    name: "Оспанова Динара Бахытжановна",
    phone: "+7 (705) 341-19-76",
    phoneRaw: "+77053411976",
    school: "КГУ «СШ им. М. Ауэзова»",
    region: "Туркестанская область",
    courses: 1,
    finished: 0,
    certs: 0,
    email: "не указан",
    registered: "5 мая 2026",
    subject: "Начальные классы",
  },
  {
    id: "t6",
    initials: "АД",
    name: "Абдрахманов Данияр Ержанович",
    phone: "+7 (702) 668-30-14",
    phoneRaw: "+77026683014",
    school: "НИШ ФМН г. Алматы",
    region: "Алматы",
    courses: 4,
    finished: 3,
    certs: 3,
    email: "d.abdrakhmanov@nis.edu.kz",
    registered: "9 января 2026",
    subject: "Математика",
  },
];

/* ---------- Заявки на курсы (5.26) ---------- */

export type LeadStatus = "new" | "contacted" | "paid" | "granted" | "declined";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Новая",
  contacted: "Связались",
  paid: "Оплачено",
  granted: "Доступ выдан",
  declined: "Отказ",
};

export interface LeadEvent {
  status: LeadStatus;
  date: string;
  by?: string;
}

export interface Lead {
  id: string;
  teacherId: string;
  courseId: string;
  /** Цена на момент заявки — курс могут переоценить, заявка не меняется */
  price?: number;
  status: LeadStatus;
  created: string;
  /** Сколько дней ждёт — краснеет после двух */
  waiting: number;
  note?: string;
  /** Повторный клик «Записаться» новую заявку не создаёт, а помечает напоминанием */
  reminded?: boolean;
  declineReason?: string;
  history: LeadEvent[];
}

export const adminLeads: Lead[] = [
  {
    id: "ld1",
    teacherId: "t1",
    courseId: "pisa-literacy",
    price: 60000,
    status: "new",
    created: "13 августа, 21:12",
    waiting: 1,
    history: [{ status: "new", date: "13 августа, 21:12" }],
  },
  {
    id: "ld2",
    teacherId: "t3",
    courseId: "digital-literacy",
    price: 45000,
    status: "new",
    created: "11 августа, 08:40",
    waiting: 3,
    reminded: true,
    note: "Звонил дважды — не берёт трубку, написала в WhatsApp.",
    history: [
      { status: "new", date: "11 августа, 08:40" },
      { status: "new", date: "13 августа, 19:02", by: "напоминание от учителя" },
    ],
  },
  {
    id: "ld3",
    teacherId: "t5",
    courseId: "inclusive-education",
    price: 75000,
    status: "contacted",
    created: "10 августа, 12:05",
    waiting: 4,
    note: "Оплатит после 20 августа, ждёт отпускные. Просила напомнить.",
    history: [
      { status: "new", date: "10 августа, 12:05" },
      { status: "contacted", date: "10 августа, 17:30", by: "Аскарова Б." },
    ],
  },
  {
    id: "ld4",
    teacherId: "t4",
    courseId: "digital-literacy",
    price: 45000,
    status: "paid",
    created: "12 августа, 09:31",
    waiting: 2,
    note: "Перевод Kaspi 45 000 ₸, 13 августа.",
    history: [
      { status: "new", date: "12 августа, 09:31" },
      { status: "contacted", date: "12 августа, 10:15", by: "Аскарова Б." },
      { status: "paid", date: "13 августа, 14:48", by: "Аскарова Б." },
    ],
  },
  {
    id: "ld5",
    teacherId: "t6",
    courseId: "ai-for-teacher",
    status: "new",
    created: "14 августа, 07:55",
    waiting: 0,
    history: [{ status: "new", date: "14 августа, 07:55" }],
  },
  {
    id: "ld6",
    teacherId: "t2",
    courseId: "digital-journal",
    price: 30000,
    status: "granted",
    created: "6 августа, 15:20",
    waiting: 0,
    note: "Наличные, 30 000 ₸.",
    history: [
      { status: "new", date: "6 августа, 15:20" },
      { status: "contacted", date: "6 августа, 18:00", by: "Аскарова Б." },
      { status: "paid", date: "7 августа, 11:10", by: "Аскарова Б." },
      { status: "granted", date: "7 августа, 11:12", by: "Аскарова Б." },
    ],
  },
  {
    id: "ld7",
    teacherId: "t5",
    courseId: "parents-conflicts",
    price: 40000,
    status: "declined",
    created: "2 августа, 10:02",
    waiting: 0,
    declineReason: "Передумала — выбрала курс по инклюзии",
    history: [
      { status: "new", date: "2 августа, 10:02" },
      { status: "contacted", date: "2 августа, 13:41", by: "Аскарова Б." },
      { status: "declined", date: "4 августа, 09:20", by: "Аскарова Б." },
    ],
  },
];

export const getLead = (id: string) => adminLeads.find((l) => l.id === id);
export const leadsForTeacher = (teacherId: string) =>
  adminLeads.filter((l) => l.teacherId === teacherId);

export const adminSubmissions = [
  {
    id: "s1",
    teacherId: "t2",
    initials: "АН",
    teacher: "Нурланова Айгуль Сериковна",
    task: "Практическое задание: свой тест",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    sent: "10 августа, 14:20",
    waiting: 4,
    status: "Новая" as const,
    answer:
      "Сделала тест по математике для 5 класса, ссылка: forms.gle/aB3xK9. Скриншот настроек приложила.",
    file: { name: "скриншот_моего_теста.jpg", size: "2,4 МБ", type: "JPG" },
  },
  {
    id: "s2",
    teacherId: "t4",
    initials: "КЕ",
    teacher: "Ким Елена Викторовна",
    task: "План формативного урока",
    courseId: "formative-assessment",
    course: "Формативное оценивание в классе",
    sent: "13 августа, 09:05",
    waiting: 1,
    status: "Новая" as const,
    answer:
      "План урока русского языка в 7 классе с тремя точками формативного оценивания. Файл во вложении.",
    file: { name: "План_урока_Ким.docx", size: "128 КБ", type: "DOC" },
  },
  {
    id: "s3",
    teacherId: "t3",
    initials: "ЖА",
    teacher: "Жумабаев Асхат Маратович",
    task: "Практическое задание: свой тест · повторная сдача",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    sent: "14 августа, 11:40",
    waiting: 0,
    status: "Доработка" as const,
    answer:
      "Добавил ещё два вопроса и проставил баллы, как просили. Ссылка та же: forms.gle/kL7pQ2.",
    file: { name: "тест_физика_7класс.pdf", size: "1,1 МБ", type: "PDF" },
  },
  {
    id: "s4",
    teacherId: "t5",
    initials: "ОД",
    teacher: "Оспанова Динара Бахытжановна",
    task: "Практическое задание: план цифрового урока",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    sent: "14 августа, 08:15",
    waiting: 0,
    status: "Новая" as const,
    answer: "План урока по познанию мира для 3 класса с использованием интерактивной доски.",
    file: { name: "план_3класс.docx", size: "96 КБ", type: "DOC" },
  },
  {
    id: "s5",
    teacherId: "t6",
    initials: "АД",
    teacher: "Абдрахманов Данияр Ержанович",
    task: "Практическое задание: свой набор промптов",
    courseId: "ai-for-teacher",
    course: "Искусственный интеллект в работе учителя",
    sent: "12 августа, 19:30",
    waiting: 2,
    status: "Новая" as const,
    answer: "Собрал 10 промптов для подготовки задач по алгебре, с примерами ответов и проверкой.",
    file: { name: "промпты_алгебра.pdf", size: "640 КБ", type: "PDF" },
  },
  {
    id: "s6",
    teacherId: "t1",
    initials: "СГ",
    teacher: "Смагулова Гульмира Токтарбековна",
    task: "Практическое задание: свой тест",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    sent: "11 августа, 16:02",
    waiting: 3,
    status: "Новая" as const,
    answer: "Тест по информатике для 6 класса, 8 вопросов, включён режим теста и баллы.",
    file: { name: "informatika_6.jpg", size: "1,8 МБ", type: "JPG" },
  },
  {
    id: "s7",
    teacherId: "t4",
    initials: "КЕ",
    teacher: "Ким Елена Викторовна",
    task: "Практическое задание: свой набор промптов",
    courseId: "ai-for-teacher",
    course: "Искусственный интеллект в работе учителя",
    sent: "14 августа, 10:55",
    waiting: 0,
    status: "Новая" as const,
    answer: "Промпты для проверки сочинений с критериями и примерами обратной связи.",
    file: { name: "promts_rus.docx", size: "72 КБ", type: "DOC" },
  },
];

export const adminQuestions = [
  {
    id: "q1",
    teacher: "Жумабаев Асхат Маратович",
    initials: "ЖА",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    lesson: "Урок 6 · Создание теста за 10 минут",
    time: "12 мая, 21:40",
    text: "Можно ли ограничить время прохождения теста в Google Формах?",
    replies: [] as ThreadReply[],
  },
  {
    id: "q2",
    teacher: "Оспанова Динара Бахытжановна",
    initials: "ОД",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    lesson: "Урок 12 · Практическое задание: план цифрового урока",
    time: "13 августа, 09:12",
    text: "Не открывается файл шаблона в задании — пишет, что формат не поддерживается.",
    replies: [] as ThreadReply[],
  },
  {
    id: "q3",
    teacher: "Ким Елена Викторовна",
    initials: "КЕ",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    lesson: "Урок 6 · Создание теста за 10 минут",
    time: "9 мая, 14:05",
    text: "Ученики без Google-аккаунта смогут пройти тест?",
    replies: [
      {
        id: "q3r1",
        author: "Оспанова Динара Бахытжановна",
        initials: "ОД",
        role: "teacher" as const,
        date: "9 мая, 16:22",
        text: "У меня работает: снимаю галочку про вход в аккаунт, и дети открывают по ссылке с телефона.",
      },
      {
        id: "q3r2",
        author: "Администратор",
        initials: "АД",
        role: "admin" as const,
        date: "10 мая, 09:14",
        text: "Всё верно. Отключите «Требовать вход в аккаунт» — это показано на 8-й минуте видео.",
      },
    ] as ThreadReply[],
  },
];

export const adminReviews = [
  {
    id: "r1",
    teacher: "Нурланова Айгуль Сериковна",
    initials: "АН",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    rating: 5,
    time: "12 мая 2026",
    text: "Проходила с телефона по дороге на работу. Всё открывается, ничего не тормозит, видео можно смотреть на скорости 1,5×.",
    reply: null as ReviewReply | null,
  },
  {
    id: "r2",
    teacher: "Нурланова Айгуль Сериковна",
    initials: "АН",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    rating: 4,
    time: "26 мая 2026",
    text: "Дошла до четвёртого модуля и вернулась дописать: раздел про ИИ пришлось пересматривать дважды, примеров для начальной школы там мало.",
    reply: {
      author: "Администратор",
      date: "27 мая 2026",
      text: "Спасибо, записали. К осеннему потоку добавим два примера по начальным классам в 16-й урок.",
    } as ReviewReply | null,
  },
  {
    id: "r3",
    teacher: "Жумабаев Асхат Маратович",
    initials: "ЖА",
    courseId: "digital-literacy",
    course: "Цифровая грамотность педагога",
    rating: 4,
    time: "28 апреля 2026",
    text: "Хотелось бы больше примеров для начальной школы, но в целом всё понятно и по делу.",
    reply: null as ReviewReply | null,
  },
  {
    id: "r4",
    teacher: "Ким Елена Викторовна",
    initials: "КЕ",
    courseId: "formative-assessment",
    course: "Формативное оценивание в классе",
    rating: 5,
    time: "11 августа 2026",
    text: "Модуль про критерии — лучшее, что я видела по этой теме. Применила на следующей неделе.",
    reply: null as ReviewReply | null,
  },
];

/** Строки списка курсов в админке — со своим статусом, ценой и заявками. */
export const adminCourses: {
  id: string;
  title: string;
  langs: string;
  status: CourseStatus;
  price?: number;
  startsAt?: string;
  modules: number;
  lessons: number;
  leads: number;
  enrolled: number;
  finished: number;
  changed: string;
}[] = [
  {
    id: "digital-literacy",
    title: "Цифровая грамотность педагога",
    langs: "RU · ҚАЗ",
    status: "open",
    price: 45000,
    modules: 4,
    lessons: 18,
    leads: 6,
    enrolled: 812,
    finished: 356,
    changed: "12 августа",
  },
  {
    id: "inclusive-education",
    title: "Работа с детьми с особыми образовательными потребностями",
    langs: "RU",
    status: "planned",
    price: 75000,
    startsAt: "2026-10-15",
    modules: 5,
    lessons: 21,
    leads: 4,
    enrolled: 644,
    finished: 287,
    changed: "3 августа",
  },
  {
    id: "pisa-literacy",
    title: "Функциональная грамотность: задания PISA на уроке",
    langs: "RU",
    status: "planned",
    price: 60000,
    startsAt: "2026-09-01",
    modules: 4,
    lessons: 15,
    leads: 9,
    enrolled: 0,
    finished: 0,
    changed: "вчера",
  },
  {
    id: "formative-assessment",
    title: "Формативное оценивание в классе",
    langs: "RU",
    status: "open",
    price: 35000,
    modules: 3,
    lessons: 12,
    leads: 2,
    enrolled: 441,
    finished: 168,
    changed: "28 июля",
  },
  {
    id: "criteria-assessment",
    title: "Жаңартылған бағдарламадағы критериалды бағалау",
    langs: "ҚАЗ",
    status: "open",
    price: 38000,
    modules: 4,
    lessons: 14,
    leads: 1,
    enrolled: 352,
    finished: 74,
    changed: "21 июля",
  },
  {
    id: "ai-for-teacher",
    title: "Искусственный интеллект в работе учителя",
    langs: "RU · ҚАЗ",
    status: "open",
    modules: 4,
    lessons: 16,
    leads: 3,
    enrolled: 96,
    finished: 0,
    changed: "вчера",
  },
  {
    id: "parents-conflicts",
    title: "Классное руководство: конфликты и работа с родителями",
    langs: "RU · ҚАЗ",
    status: "closed",
    price: 40000,
    modules: 3,
    lessons: 10,
    leads: 0,
    enrolled: 287,
    finished: 214,
    changed: "9 июля",
  },
  {
    id: "stem-lab",
    title: "Практикум по STEM-проектам в школе",
    langs: "RU",
    status: "hidden",
    price: 55000,
    startsAt: "2026-09-20",
    modules: 4,
    lessons: 17,
    leads: 0,
    enrolled: 128,
    finished: 41,
    changed: "9 июля",
  },
  {
    id: "school-media",
    title: "Школьная медиастудия: видео и подкасты силами учеников",
    langs: "RU",
    status: "draft",
    modules: 3,
    lessons: 9,
    leads: 0,
    enrolled: 0,
    finished: 0,
    changed: "сегодня",
  },
];

export const funnelData = [
  { label: "1. Что такое цифровая грамотность", value: 704 },
  { label: "3. Аккаунты и пароли", value: 620 },
  { label: "5. Google Класс: первый запуск", value: 556 },
  { label: "7. Практическое задание: свой тест", value: 401 },
  { label: "12. План цифрового урока", value: 366 },
  { label: "18. Итоговый тест", value: 358 },
];

/** Справочные числа внизу дашборда — считаются в момент открытия экрана. */
export const platformTotals = {
  teachers: 4316,
  publishedCourses: 9,
  certificates: 2847,
};

/* ---------- Участники курса: как идут по программе и что сдали ---------- */

export type TaskState = "Принято" | "Доработка" | "На проверке" | "Не сдано";

export interface ParticipantTask {
  /** Урок-задание, к которому относится работа */
  lesson: string;
  state: TaskState;
  /** Если работа ждёт админа — по этому id открывается карточка проверки */
  submissionId?: string;
}

export interface ParticipantQuiz {
  lesson: string;
  /** Балл в процентах; null — тест ещё не сдавали */
  score: number | null;
}

export interface Participant {
  teacherId: string;
  courseId: string;
  /** Сколько уроков курса пройдено */
  lessonsDone: number;
  /** Где учитель остановился — показываем в колонке «Этап» */
  currentLesson: string;
  quizzes: ParticipantQuiz[];
  tasks: ParticipantTask[];
  /** Курс завершён и сертификат выдан */
  finished?: boolean;
}

/**
 * Проверка работ идёт от курса: админ открывает курс и видит,
 * кто на каком этапе и что уже сдал. Поэтому участники хранятся
 * связкой «учитель + курс», а не плоским списком сдач.
 */
export const participants: Participant[] = [
  /* --- Цифровая грамотность педагога: 18 уроков, 4 теста, 3 задания --- */
  {
    teacherId: "t2",
    courseId: "digital-literacy",
    lessonsDone: 12,
    currentLesson: "Урок 13 · Обратная связь ученику в цифре",
    quizzes: [
      { lesson: "Тест модуля 1", score: 88 },
      { lesson: "Тест модуля 2", score: 75 },
      { lesson: "Тест модуля 3", score: null },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Практическое задание: свой тест", state: "На проверке", submissionId: "s1" },
      { lesson: "Практическое задание: план цифрового урока", state: "Принято" },
      { lesson: "Практическое задание: свой набор промптов", state: "Не сдано" },
    ],
  },
  {
    teacherId: "t1",
    courseId: "digital-literacy",
    lessonsDone: 16,
    currentLesson: "Урок 17 · Практическое задание: свой набор промптов",
    quizzes: [
      { lesson: "Тест модуля 1", score: 100 },
      { lesson: "Тест модуля 2", score: 90 },
      { lesson: "Тест модуля 3", score: 88 },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Практическое задание: свой тест", state: "На проверке", submissionId: "s6" },
      { lesson: "Практическое задание: план цифрового урока", state: "Принято" },
      { lesson: "Практическое задание: свой набор промптов", state: "Не сдано" },
    ],
  },
  {
    teacherId: "t3",
    courseId: "digital-literacy",
    lessonsDone: 7,
    currentLesson: "Урок 8 · Совместные документы в работе класса",
    quizzes: [
      { lesson: "Тест модуля 1", score: 63 },
      { lesson: "Тест модуля 2", score: null },
      { lesson: "Тест модуля 3", score: null },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Практическое задание: свой тест", state: "Доработка", submissionId: "s3" },
      { lesson: "Практическое задание: план цифрового урока", state: "Не сдано" },
      { lesson: "Практическое задание: свой набор промптов", state: "Не сдано" },
    ],
  },
  {
    teacherId: "t5",
    courseId: "digital-literacy",
    lessonsDone: 12,
    currentLesson: "Урок 12 · Практическое задание: план цифрового урока",
    quizzes: [
      { lesson: "Тест модуля 1", score: 75 },
      { lesson: "Тест модуля 2", score: 80 },
      { lesson: "Тест модуля 3", score: null },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Практическое задание: свой тест", state: "Принято" },
      {
        lesson: "Практическое задание: план цифрового урока",
        state: "На проверке",
        submissionId: "s4",
      },
      { lesson: "Практическое задание: свой набор промптов", state: "Не сдано" },
    ],
  },
  {
    teacherId: "t6",
    courseId: "digital-literacy",
    lessonsDone: 18,
    currentLesson: "Курс пройден",
    quizzes: [
      { lesson: "Тест модуля 1", score: 100 },
      { lesson: "Тест модуля 2", score: 95 },
      { lesson: "Тест модуля 3", score: 100 },
      { lesson: "Итоговый тест", score: 92 },
    ],
    tasks: [
      { lesson: "Практическое задание: свой тест", state: "Принято" },
      { lesson: "Практическое задание: план цифрового урока", state: "Принято" },
      { lesson: "Практическое задание: свой набор промптов", state: "Принято" },
    ],
    finished: true,
  },

  /* --- Формативное оценивание в классе: 12 уроков, 3 теста, 2 задания --- */
  {
    teacherId: "t4",
    courseId: "formative-assessment",
    lessonsDone: 9,
    currentLesson: "Урок 10 · План формативного урока",
    quizzes: [
      { lesson: "Тест модуля 1", score: 92 },
      { lesson: "Тест модуля 2", score: 84 },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Критерии к своему уроку", state: "Принято" },
      { lesson: "План формативного урока", state: "На проверке", submissionId: "s2" },
    ],
  },
  {
    teacherId: "t2",
    courseId: "formative-assessment",
    lessonsDone: 12,
    currentLesson: "Курс пройден",
    quizzes: [
      { lesson: "Тест модуля 1", score: 88 },
      { lesson: "Тест модуля 2", score: 90 },
      { lesson: "Итоговый тест", score: 86 },
    ],
    tasks: [
      { lesson: "Критерии к своему уроку", state: "Принято" },
      { lesson: "План формативного урока", state: "Принято" },
    ],
    finished: true,
  },
  {
    teacherId: "t1",
    courseId: "formative-assessment",
    lessonsDone: 4,
    currentLesson: "Урок 5 · Обратная связь без оценки",
    quizzes: [
      { lesson: "Тест модуля 1", score: 71 },
      { lesson: "Тест модуля 2", score: null },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Критерии к своему уроку", state: "Не сдано" },
      { lesson: "План формативного урока", state: "Не сдано" },
    ],
  },

  /* --- Искусственный интеллект в работе учителя: 16 уроков, 3 теста, 2 задания --- */
  {
    teacherId: "t6",
    courseId: "ai-for-teacher",
    lessonsDone: 11,
    currentLesson: "Урок 12 · Практическое задание: свой набор промптов",
    quizzes: [
      { lesson: "Тест модуля 1", score: 95 },
      { lesson: "Тест модуля 2", score: 90 },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Разбор готового промпта", state: "Принято" },
      {
        lesson: "Практическое задание: свой набор промптов",
        state: "На проверке",
        submissionId: "s5",
      },
    ],
  },
  {
    teacherId: "t4",
    courseId: "ai-for-teacher",
    lessonsDone: 12,
    currentLesson: "Урок 12 · Практическое задание: свой набор промптов",
    quizzes: [
      { lesson: "Тест модуля 1", score: 89 },
      { lesson: "Тест модуля 2", score: 78 },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Разбор готового промпта", state: "Принято" },
      {
        lesson: "Практическое задание: свой набор промптов",
        state: "На проверке",
        submissionId: "s7",
      },
    ],
  },
  {
    teacherId: "t5",
    courseId: "ai-for-teacher",
    lessonsDone: 3,
    currentLesson: "Урок 4 · Что ИИ делать не должен",
    quizzes: [
      { lesson: "Тест модуля 1", score: null },
      { lesson: "Тест модуля 2", score: null },
      { lesson: "Итоговый тест", score: null },
    ],
    tasks: [
      { lesson: "Разбор готового промпта", state: "Не сдано" },
      { lesson: "Практическое задание: свой набор промптов", state: "Не сдано" },
    ],
  },
];

/** Участники одного курса */
export const courseParticipants = (courseId: string) =>
  participants.filter((p) => p.courseId === courseId);

/** Учитель по id — для колонки с ФИО и школой */
export const getTeacher = (id: string) => adminTeachers.find((t) => t.id === id);

/** Курсы, к которым у учителя открыт доступ — для карточки учителя и заявки. */
export const teacherCourses = (teacherId: string) =>
  participants
    .filter((p) => p.teacherId === teacherId)
    .map((p) => ({ participant: p, course: getCourse(p.courseId) }))
    .filter((x): x is { participant: Participant; course: Course } => Boolean(x.course));

/**
 * Сводка курса для админа: сколько в нём тестов и заданий,
 * сколько участников и сколько работ ждёт проверки.
 */
export function courseReviewSummary(courseId: string) {
  const list = courseParticipants(courseId);
  const queue = adminSubmissions.filter((s) => s.courseId === courseId);
  return {
    participants: list.length,
    finished: list.filter((p) => p.finished).length,
    quizzes: list[0]?.quizzes.length ?? 0,
    tasks: list[0]?.tasks.length ?? 0,
    waiting: queue.length,
    /** Ждут дольше трёх дней — просто счётчик из даты, никакого SLA */
    longWait: queue.filter((s) => s.waiting > 3).length,
    rework: list.filter((p) => p.tasks.some((t) => t.state === "Доработка")).length,
  };
}

/** Курсы, по которым есть что проверять — точка входа в раздел проверки */
export const reviewCourses = () =>
  Array.from(new Set(participants.map((p) => p.courseId)))
    .map((id) => ({ course: getCourse(id), summary: courseReviewSummary(id) }))
    .filter((c): c is { course: Course; summary: ReturnType<typeof courseReviewSummary> } =>
      Boolean(c.course),
    )
    .sort((a, b) => b.summary.waiting - a.summary.waiting);

/* ---------- Попытки теста в админке (история по каждому тесту) ---------- */

export interface TeacherQuizAttempt {
  date: string;
  pct: number;
  passed: boolean;
  counted: boolean;
}

export interface TeacherQuizRow {
  id: string;
  name: string;
  course: string;
  /** Пересдаваемому тесту разрешать нечего — кнопки пересдачи у него нет */
  retakable: boolean;
  attempts: TeacherQuizAttempt[];
}

export const teacherQuizzes: TeacherQuizRow[] = [
  {
    id: "tq-final",
    name: "Итоговый тест",
    course: "Цифровая грамотность педагога",
    retakable: false,
    attempts: [{ date: "12 августа 2026", pct: 35, passed: false, counted: true }],
  },
  {
    id: "tq-m1",
    name: "Тест модуля 1",
    course: "Цифровая грамотность педагога",
    retakable: false,
    attempts: [{ date: "6 августа 2026", pct: 88, passed: true, counted: true }],
  },
  {
    id: "tq-m3",
    name: "Тест модуля 3",
    course: "Цифровая грамотность педагога",
    retakable: true,
    attempts: [
      { date: "9 августа 2026", pct: 63, passed: false, counted: false },
      { date: "10 августа 2026", pct: 75, passed: true, counted: false },
      { date: "11 августа 2026", pct: 88, passed: true, counted: true },
    ],
  },
];

/* ---------- Сообщения Telegram-бота (5.15) ---------- */

export const telegramSamples = [
  {
    id: "tg-lead",
    icon: "🔔",
    title: "Новая заявка на курс",
    lines: [
      "Смагулова Гульмира Токтарбековна · +7 701 555-12-34",
      "Курс: Функциональная грамотность: задания PISA на уроке · 60 000 ₸",
    ],
    action: "Открыть заявку",
  },
  {
    id: "tg-work",
    icon: "📝",
    title: "Работа на проверку",
    lines: [
      "Ахметов Данияр · Задание 2 «Разбор урока»",
      "Курс: Цифровая грамотность педагога",
    ],
    action: "Проверить",
  },
];
