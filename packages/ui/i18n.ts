/**
 * Словарь интерфейса RU / KZ.
 *
 * Переводится «обвязка» продукта — навигация, таб-панель, кнопки, статусы,
 * заголовки секций. Содержание курсов остаётся на языке, на котором курс написан:
 * по брифу курс одноязычный, а русская и казахская версии — два отдельных курса.
 *
 * Казахские надписи на 10–30% длиннее — это и есть проверка вёрстки.
 */

export type UiLang = "ru" | "kz";

const ru = {
  /* Навигация */
  navHome: "Моё обучение",
  navCatalog: "Каталог",
  navCerts: "Сертификаты",
  navProfile: "Профиль",
  navVerify: "Проверить сертификат",
  navFaq: "Вопросы",
  navCourses: "Курсы",
  navNotifications: "Уведомления",

  /* Кнопки */
  login: "Войти",
  logout: "Выйти из аккаунта",
  start: "Начать обучение",
  enroll: "Записаться",
  enrollShort: "Записаться",
  requested: "Заявка отправлена",
  requestedHint: "Администратор свяжется с вами и откроет доступ",
  contactAdmin: "Связаться с администратором",
  continue: "Продолжить обучение",
  continueShort: "Продолжить",
  openCatalog: "Открыть каталог",
  viewAll: "Смотреть все",
  save: "Сохранить изменения",
  cancel: "Отмена",
  skip: "Пропустить",
  next: "Далее",
  back: "Назад",
  retry: "Повторить",
  refresh: "Обновить",
  reset: "Сбросить",
  resetFilters: "Сбросить фильтры",
  filters: "Фильтры",
  search: "Поиск",
  download: "Скачать",
  share: "Поделиться",
  send: "Отправить",
  reply: "Ответить",
  ready: "Готово",
  markDone: "Отметить как пройденный",
  lessonDone: "Урок пройден",
  showCourses: (n: number) => `Показать ${n} ${plural(n, "курс", "курса", "курсов")}`,

  /* Статусы */
  stNew: "Новый",
  stProgress: "В процессе",
  stDone: "Пройден",
  stReview: "На проверке",
  stAccepted: "Зачтено",
  stRework: "На доработку",
  stLocked: "Заблокирован",
  stEnrolled: "Доступ открыт",
  stWaiting: "Заявка отправлена",

  /* Набор на курс */
  setOpen: "Идёт набор",
  setClosed: "Набор закрыт",
  setPlanned: (date: string) => `Старт ${date}`,
  priceOnRequest: "Цена по запросу",
  onlyKz: "Курс на казахском языке",
  onlyRu: "Курс на русском языке",
  lockedLesson: "Откроется после подтверждения администратором",

  /* Секции */
  secProgram: "Программа курса",
  secReviews: "Отзывы",
  secMaterials: "Материалы урока",
  secQuestions: "Вопросы по уроку",
  secMyCourses: "Мои курсы",
  secAttention: "Требует внимания",
  secPending: "Ожидают подтверждения",
  secNewCourses: "Новые курсы",
  secCertRequirements: "Что нужно для сертификата",
  secPopular: "Популярные курсы",
  secHowItWorks: "Как это работает",
  secFaq: "Частые вопросы",
  secTestimonials: "Что говорят учителя",
  secDevices: "Устройства, где выполнен вход",

  /* Сортировка каталога */
  sortNew: "Новые",
  sortStart: "По дате старта",
  sortRating: "По рейтингу",

  /* Единицы */
  lessons: (n: number) => `${n} ${plural(n, "урок", "урока", "уроков")}`,
  hours: (n: number) => `${n} ${plural(n, "час", "часа", "часов")}`,
  modules: (n: number) => `${n} ${plural(n, "модуль", "модуля", "модулей")}`,
  questions: (n: number) => `${n} ${plural(n, "вопрос", "вопроса", "вопросов")}`,
  students: (n: number) => `${fmt(n)} ${plural(n, "ученик", "ученика", "учеников")}`,
  lessonOf: (a: number, b: number) => `Урок ${a} из ${b}`,
  ofLessons: (a: number, b: number) => `${a} из ${b} уроков`,
  found: (n: number) => `Найдено ${n} ${plural(n, "курс", "курса", "курсов")}`,
  sentAgo: (days: number) =>
    days === 0
      ? "Заявка отправлена сегодня"
      : `Заявка отправлена ${days} ${plural(days, "день", "дня", "дней")} назад`,

  /* Прочее */
  greeting: (name: string) => `Здравствуйте, ${name}!`,
  language: "Язык интерфейса",
  emptyCoursesTitle: "У вас пока нет курсов",
  emptyCoursesText:
    "Выберите курс в каталоге и нажмите «Записаться» — администратор свяжется и откроет доступ",
  emptyCertsTitle: "Пока нет сертификатов",
  emptyCertsText: "Пройдите курс, чтобы получить первый сертификат",
  emptyNotifTitle: "Уведомлений пока нет",
  emptyNotifText:
    "Здесь появятся ответы на вопросы, результаты проверки заданий и новости о курсах",
  nothingFound: "Ничего не найдено",
  loadError: "Не удалось загрузить",
  loadErrorText: "Проверьте интернет и попробуйте ещё раз",
};

type Dict = typeof ru;

const kz: Dict = {
  navHome: "Менің оқуым",
  navCatalog: "Каталог",
  navCerts: "Сертификаттар",
  navProfile: "Профиль",
  navVerify: "Сертификатты тексеру",
  navFaq: "Сұрақтар",
  navCourses: "Курстар",
  navNotifications: "Хабарламалар",

  login: "Кіру",
  logout: "Аккаунттан шығу",
  start: "Оқуды бастау",
  enroll: "Тіркелу",
  enrollShort: "Тіркелу",
  requested: "Өтінім жіберілді",
  requestedHint: "Әкімші сізбен хабарласып, курсқа кіруді ашады",
  contactAdmin: "Әкімшімен байланысу",
  continue: "Оқуды жалғастыру",
  continueShort: "Жалғастыру",
  openCatalog: "Каталогты ашу",
  viewAll: "Барлығын көру",
  save: "Өзгерістерді сақтау",
  cancel: "Бас тарту",
  skip: "Өткізіп жіберу",
  next: "Әрі қарай",
  back: "Артқа",
  retry: "Қайталау",
  refresh: "Жаңарту",
  reset: "Тазалау",
  resetFilters: "Сүзгілерді тазалау",
  filters: "Сүзгілер",
  search: "Іздеу",
  download: "Жүктеп алу",
  share: "Бөлісу",
  send: "Жіберу",
  reply: "Жауап беру",
  ready: "Дайын",
  markDone: "Өтті деп белгілеу",
  lessonDone: "Сабақ аяқталды",
  showCourses: (n: number) => `${n} курсты көрсету`,

  stNew: "Жаңа",
  stProgress: "Оқуда",
  stDone: "Аяқталды",
  stReview: "Тексерілуде",
  stAccepted: "Есептелді",
  stRework: "Пысықтауға",
  stLocked: "Бұғатталған",
  stEnrolled: "Қолжетімділік ашық",
  stWaiting: "Өтінім жіберілді",

  setOpen: "Қабылдау жүріп жатыр",
  setClosed: "Қабылдау жабық",
  setPlanned: (date: string) => `Басталуы ${date}`,
  priceOnRequest: "Бағасы сұраныс бойынша",
  onlyKz: "Курс қазақ тілінде",
  onlyRu: "Курс орыс тілінде",
  lockedLesson: "Әкімші растағаннан кейін ашылады",

  secProgram: "Курс бағдарламасы",
  secReviews: "Пікірлер",
  secMaterials: "Сабақ материалдары",
  secQuestions: "Сабақ бойынша сұрақтар",
  secMyCourses: "Менің курстарым",
  secAttention: "Назар аудару керек",
  secPending: "Растауды күтуде",
  secNewCourses: "Жаңа курстар",
  secCertRequirements: "Сертификат алу үшін не қажет",
  secPopular: "Танымал курстар",
  secHowItWorks: "Бұл қалай жұмыс істейді",
  secFaq: "Жиі қойылатын сұрақтар",
  secTestimonials: "Мұғалімдер не дейді",
  secDevices: "Кіру жасалған құрылғылар",

  sortNew: "Жаңалары",
  sortStart: "Басталу күні бойынша",
  sortRating: "Рейтинг бойынша",

  lessons: (n: number) => `${n} сабақ`,
  hours: (n: number) => `${n} сағат`,
  modules: (n: number) => `${n} модуль`,
  questions: (n: number) => `${n} сұрақ`,
  students: (n: number) => `${fmt(n)} оқушы`,
  lessonOf: (a: number, b: number) => `${b} сабақтың ${a}-сі`,
  ofLessons: (a: number, b: number) => `${b} сабақтың ${a}-сі`,
  found: (n: number) => `${n} курс табылды`,
  sentAgo: (days: number) =>
    days === 0 ? "Өтінім бүгін жіберілді" : `Өтінім ${days} күн бұрын жіберілді`,

  greeting: (name: string) => `Сәлеметсіз бе, ${name}!`,
  language: "Интерфейс тілі",
  emptyCoursesTitle: "Сізде әзірге курс жоқ",
  emptyCoursesText:
    "Каталогтан курс таңдап, «Тіркелу» түймесін басыңыз — әкімші хабарласып, курсты ашады",
  emptyCertsTitle: "Әзірге сертификат жоқ",
  emptyCertsText: "Алғашқы сертификатты алу үшін курстан өтіңіз",
  emptyNotifTitle: "Әзірге хабарлама жоқ",
  emptyNotifText:
    "Мұнда сұрақтарға жауаптар, тапсырмаларды тексеру нәтижелері және курстар туралы жаңалықтар пайда болады",
  nothingFound: "Ештеңе табылмады",
  loadError: "Жүктеу мүмкін болмады",
  loadErrorText: "Интернетті тексеріп, қайталап көріңіз",
};

export const dict: Record<UiLang, Dict> = { ru, kz };

/** Русское склонение по числу. */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** 4316 → «4 316» */
export function fmt(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

/** 4.8 → «4,8» */
export function rating(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

/**
 * Цена курса. Платформа деньги не принимает — это просто число рядом
 * с длительностью. Пусто — «Цена по запросу», а не пустое место.
 */
export function price(value: number | undefined, lang: UiLang = "ru"): string {
  if (!value) return dict[lang].priceOnRequest;
  return `${fmt(value)} ₸`;
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const MONTHS_KZ = [
  "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
  "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан",
];

/** «2026-09-01» → «1 сентября». Даты казахстанские, часовой пояс Asia/Almaty. */
export function day(iso: string | undefined, lang: UiLang = "ru"): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  const months = lang === "kz" ? MONTHS_KZ : MONTHS_RU;
  return `${d} ${months[(m ?? 1) - 1]}`;
}

/** 260 → «4 ч 20 мин» */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
