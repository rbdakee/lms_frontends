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
  toCourse: "К странице курса",
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
  /* Счёт по всем элементам программы — уроки, тесты и задания вместе */
  ofTotal: (a: number, b: number) => `${a} из ${b}`,
  found: (n: number) => `Найдено ${n} ${plural(n, "курс", "курса", "курсов")}`,
  sentAgo: (days: number) =>
    days === 0
      ? "Заявка отправлена сегодня"
      : `Заявка отправлена ${days} ${plural(days, "день", "дня", "дней")} назад`,
  passScore: (n: number) => `порог ${n}%`,
  submitFormat: (f: string): string =>
    f === "text" ? "текстовый ответ" : f === "both" ? "файл или текст" : "загрузка файла",

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

  /* Экран урока */
  lesson: "Урок",
  progressDone: "Пройдено",
  lessonNotFound: "Урок не найден",
  lessonNotFoundText: "Возможно, урок удалён или ссылка устарела",
  accessClosedTitle: "Доступ к курсу закрыт",
  accessClosedText:
    "Администратор ещё не открыл доступ или закрыл его. Состояние заявки видно на странице курса",
  lessonMarkedDone: "Урок отмечен как пройденный",
  markDoneError: "Не удалось отметить урок — попробуйте ещё раз",
  fileLinkError: "Не удалось получить ссылку на файл — попробуйте ещё раз",
  materialsEmptyTitle: "Материалов к уроку нет",
  materialsEmptyText: "К этому уроку файлы не прикреплены",
  lockedNext: "Завершите текущий урок, чтобы открыть следующий",
  lockedAfterCurrent: "откроется после текущего урока",
  youAreHere: "вы здесь",
  prevLesson: "Предыдущий урок",
  nextLesson: "Следующий урок",
  toProgram: "К программе курса",

  /* Плеер */
  playbackStopped: "Не удалось продолжить",
  playbackStoppedText: "Проверьте интернет и нажмите «Обновить»",
  videoUnavailable: "Видео недоступно",
  videoUnavailableText: "Проверьте интернет или откройте видео на сайте источника",
  openSource: "Открыть в источнике",
  showMore: "Показать ещё",
  emptyCatalogTitle: "Курсов пока нет",
  emptyCatalogText: "Каталог наполняется — загляните позже",
  programEmpty: "Программа заполняется",
  reviewsEmpty: "Отзывов пока нет",
  noReviews: "Нет отзывов",
  blockedTitle: "Доступ заблокирован",

  /* Админка · очередь проверки работ (5.21) */
  subTitle: "Проверка работ",
  subInQueue: (n: number) => `${n} ${plural(n, "работа", "работы", "работ")} в очереди`,
  subByFilter: (n: number) => `${n} по фильтру`,
  subFilterPending: "Ждут проверки",
  subFilterRework: "На доработке",
  subFilterAccepted: "Зачтённые",
  subFilterAll: "Все работы",
  subAllCourses: "Все курсы",
  subTeacher: "Учитель",
  subTask: "Задание",
  subCourse: "Курс",
  subSent: "Отправлена",
  subStatus: "Статус",
  subReworkTag: "Доработка",
  subAttempt: (n: number) => `Доработка №${n}`,
  subQueueEmptyTitle: "Все работы проверены",
  subQueueEmptyText: "Новые сдачи появятся здесь и в счётчике меню",
  subNoMatchTitle: "Работ не нашли",
  subNoMatchText: "Попробуйте снять фильтры",
  subCheck: "Проверить",
  pageOf: (a: number, b: number) => `Страница ${a} из ${b}`,
  forward: "Вперёд",

  /* Админка · карточка проверки работы */
  subCardTitle: "Проверка работы",
  subNotFound: "Работа не найдена",
  subNotFoundText: "Возможно, ссылка устарела или работа удалена",
  subToQueue: "К очереди",
  subStatement: "Условие задания",
  subTemplate: "Шаблон задания",
  subTemplateHint: "Файл-шаблон, который скачивает учитель",
  subWork: "Работа учителя",
  subFiles: "Файлы работы",
  subNoText: "Текста в работе нет",
  subNoFiles: "Файлов в работе нет",
  subHistory: "Прошлые сдачи",
  subOpenFile: "Открыть",
  subWaiting: "Ожидание",
  subVerdict: "Решение",
  subAccept: "Зачесть",
  subComment: "Комментарий",
  subCommentRequired: "· обязателен",
  subCommentOptional: "· необязательно",
  subCommentRework: "Объясните, что именно нужно исправить — учитель увидит этот текст",
  subCommentAccept: "Например: дескрипторы закрывают каждый критерий",
  subCommentError:
    "Для «на доработку» комментарий обязателен — иначе учитель не поймёт, что исправлять",
  subSaveNext: "Сохранить и перейти к следующей",
  subSaveBack: "Сохранить и вернуться в очередь",
  subAcceptedToast: "Работа зачтена",
  subReworkToast: "Работа отправлена на доработку",
  subSaveError: "Не удалось сохранить решение — попробуйте ещё раз",
  subQueueEmptyToast: "Очередь пуста — все работы проверены",
  subReviewed: "Работа проверена",
  subReviewedAt: (date: string) => `Проверена ${date}`,
  subAcceptNote:
    "Учитель получит уведомление в колокольчик. Если это было последнее условие — сертификат выдастся автоматически.",

  /* Экран теста (5.8) */
  quiz: "Тест",
  quizNotFound: "Тест не найден",
  quizNotFoundText: "Возможно, тест удалён или ссылка устарела",
  startQuiz: "Начать тест",
  retakeQuiz: "Пройти ещё раз",
  oneAttempt: "Одна попытка",
  retakableQuiz: "Пересдаваемый тест",
  statQuestions: "вопросов",
  statTimeLimit: "лимит времени",
  statPassScore: "проходной балл",
  noTimeLimit: "без ограничения",
  maxScoreNote: (n: number) => `Максимум ${n} ${plural(n, "балл", "балла", "баллов")}`,
  oneAttemptTitle: "У вас одна попытка",
  oneAttemptText:
    "Начав тест, вы не сможете пройти его заново. Убедитесь, что вас не отвлекут.",
  retakableText: "Попыток не ограничено, засчитывается последний результат",
  timerNote: "Таймер запустится сразу · ответы сохраняются автоматически",
  noTimerNote: "Время не ограничено · ответы сохраняются автоматически",
  confirmStartTitle: "Начать тест? Попытка одна",
  confirmStartText:
    "Попытка одна. Таймер запустится сразу и не остановится, даже если закрыть вкладку.",
  startNow: "Начать",
  notNow: "Не сейчас",
  quizClosedByCert: "Сертификат выдан — новые попытки закрыты",
  attemptUsed: "Попытка использована",
  questionN: (n: number) => `Вопрос ${n}`,
  questionOf: (a: number, b: number) => `Вопрос ${a} из ${b}`,
  lowTimeNote:
    "Осталось меньше двух минут. Ответы сохраняются автоматически — по истечении времени тест отправится сам.",
  multiHint: "Зачёт только за полностью верный набор — частичных баллов нет",
  autosaveHint: "Ответы сохраняются автоматически",
  finishQuiz: "Завершить тест",
  finishQuizTitle: "Завершить тест?",
  answered: "Отвечено",
  unansweredNote: (n: number) => `Вопрос ${n} остался без ответа.`,
  backToQuestion: (n: number) => `Вернуться к вопросу ${n}`,
  finishWarn: "После завершения изменить ответы будет нельзя.",
  startQuizError: "Не удалось начать тест — попробуйте ещё раз",
  answerSaveError: "Ответ не сохранён — проверьте связь и выберите ещё раз",
  finishQuizError: "Не удалось завершить тест — попробуйте ещё раз",
  quizResult: "Результат теста",
  quizReview: "Разбор ответов",
  quizPassed: "Тест сдан",
  quizFailed: "Тест не сдан",
  scoreOf: (a: number, b: number) => `${a} из ${b} баллов`,
  statPoints: "баллов",
  statPassShort: "проходной",
  statSpent: "затрачено",
  minShort: (n: number) => `${n} мин`,
  timedOutNote:
    "Время истекло — ответы отправлены автоматически. Засчитаны все вопросы, на которые вы успели ответить.",
  correct: "Верно",
  incorrect: "Неверно",
  points: (n: number) => `${n} ${plural(n, "балл", "балла", "баллов")}`,
  yourAnswer: "ваш ответ",
  correctAnswer: "правильный ответ",
  explanation: "Пояснение: ",
  toResult: "К результату",
  secAttempts: "История попыток",
  attemptN: (n: number) => `Попытка ${n}`,
  countedLast: "засчитывается последний результат",
  oneAttemptShort: "попытка одна",
  timedOutShort: "время истекло",
  countedBadge: "зачётная",

  /* Экран задания (5.9) */
  task: "Задание",
  taskNotFound: "Задание не найдено",
  taskNotFoundText: "Возможно, задание удалено или ссылка устарела",
  secStatement: "Условие",
  secYourAnswer: "Ваш ответ",
  templateFile: "Файл-шаблон",
  fieldComment: "Комментарий",
  optional: "необязательно",
  commentPlaceholder: "Например: ссылка на форму и что именно вы сделали",
  dropHint: "Перетащите файлы сюда или",
  chooseFile: "Выбрать файл",
  fileLimits: (exts: string, mb: number) => `${exts} · до ${mb} МБ`,
  anyFileLimits: (mb: number) => `Любые файлы · до ${mb} МБ`,
  extNotAllowed: (ext: string, list: string) =>
    `Формат .${ext} не принимается — можно: ${list}`,
  fileTooBig: (mb: number) => `Файл больше ${mb} МБ — уменьшите размер`,
  tooManyFiles: "Больше 10 файлов приложить нельзя",
  uploadError: "Не удалось загрузить файл — попробуйте ещё раз",
  removeFile: "Удалить файл",
  submitTask: "Отправить на проверку",
  submitAgain: "Отправить заново",
  taskSent: "Работа отправлена на проверку",
  submitTaskError: "Не удалось отправить работу — попробуйте ещё раз",
  pendingText: "Обычно проверяем за 1–2 рабочих дня — придёт уведомление в колокольчик",
  adminComment: "Комментарий администратора",
  adminCommentAt: (date: string) => `Комментарий администратора · ${date}`,
  secSubmissions: "История сдач",
  submissionN: (n: number) => `Работа №${n}`,
  nextQuiz: "К тесту",
  nextTask: "К заданию",
  finalQuiz: "Итоговый",
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
  toCourse: "Курс бетіне",
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
  ofTotal: (a: number, b: number) => `${b} ішінен ${a}`,
  found: (n: number) => `${n} курс табылды`,
  sentAgo: (days: number) =>
    days === 0 ? "Өтінім бүгін жіберілді" : `Өтінім ${days} күн бұрын жіберілді`,
  passScore: (n: number) => `өту шегі ${n}%`,
  submitFormat: (f: string) =>
    f === "text" ? "мәтіндік жауап" : f === "both" ? "файл немесе мәтін" : "файл жүктеу",

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

  lesson: "Сабақ",
  progressDone: "Өтілді",
  lessonNotFound: "Сабақ табылмады",
  lessonNotFoundText: "Сабақ жойылған немесе сілтеме ескірген болуы мүмкін",
  accessClosedTitle: "Курсқа қолжетімділік жабық",
  accessClosedText:
    "Әкімші қолжетімділікті әлі ашпаған немесе жапқан. Өтінім күйі курс бетінде көрінеді",
  lessonMarkedDone: "Сабақ өтті деп белгіленді",
  markDoneError: "Сабақты белгілеу мүмкін болмады — қайталап көріңіз",
  fileLinkError: "Файл сілтемесін алу мүмкін болмады — қайталап көріңіз",
  materialsEmptyTitle: "Сабақ материалдары жоқ",
  materialsEmptyText: "Бұл сабаққа файл тіркелмеген",
  lockedNext: "Келесі сабақ ашылуы үшін ағымдағы сабақты аяқтаңыз",
  lockedAfterCurrent: "ағымдағы сабақтан кейін ашылады",
  youAreHere: "сіз осындасыз",
  prevLesson: "Алдыңғы сабақ",
  nextLesson: "Келесі сабақ",
  toProgram: "Курс бағдарламасына",

  playbackStopped: "Жалғастыру мүмкін болмады",
  playbackStoppedText: "Интернетті тексеріп, «Жаңарту» түймесін басыңыз",
  videoUnavailable: "Бейне қолжетімсіз",
  videoUnavailableText: "Интернетті тексеріңіз немесе бейнені дереккөз сайтында ашыңыз",
  openSource: "Дереккөзде ашу",
  showMore: "Тағы көрсету",
  emptyCatalogTitle: "Әзірге курс жоқ",
  emptyCatalogText: "Каталог толықтырылып жатыр — кейінірек қайта келіңіз",
  programEmpty: "Бағдарлама толтырылуда",
  reviewsEmpty: "Әзірге пікір жоқ",
  noReviews: "Пікір жоқ",
  blockedTitle: "Кіру бұғатталған",

  subTitle: "Жұмыстарды тексеру",
  subInQueue: (n: number) => `Кезекте ${n} жұмыс`,
  subByFilter: (n: number) => `Сүзгі бойынша ${n}`,
  subFilterPending: "Тексеруді күтуде",
  subFilterRework: "Пысықтауда",
  subFilterAccepted: "Есептелгендер",
  subFilterAll: "Барлық жұмыстар",
  subAllCourses: "Барлық курстар",
  subTeacher: "Мұғалім",
  subTask: "Тапсырма",
  subCourse: "Курс",
  subSent: "Жіберілген",
  subStatus: "Күйі",
  subReworkTag: "Пысықтау",
  subAttempt: (n: number) => `Пысықтау №${n}`,
  subQueueEmptyTitle: "Барлық жұмыс тексерілді",
  subQueueEmptyText: "Жаңа жұмыстар осында және мәзір санағышында пайда болады",
  subNoMatchTitle: "Жұмыс табылмады",
  subNoMatchText: "Сүзгілерді алып тастап көріңіз",
  subCheck: "Тексеру",
  pageOf: (a: number, b: number) => `${b} беттің ${a}-сі`,
  forward: "Алға",

  subCardTitle: "Жұмысты тексеру",
  subNotFound: "Жұмыс табылмады",
  subNotFoundText: "Сілтеме ескірген немесе жұмыс жойылған болуы мүмкін",
  subToQueue: "Кезекке",
  subStatement: "Тапсырма шарты",
  subTemplate: "Тапсырма үлгісі",
  subTemplateHint: "Мұғалім жүктеп алатын үлгі файлы",
  subWork: "Мұғалімнің жұмысы",
  subFiles: "Жұмыс файлдары",
  subNoText: "Жұмыста мәтін жоқ",
  subNoFiles: "Жұмыста файл жоқ",
  subHistory: "Бұрынғы жұмыстар",
  subOpenFile: "Ашу",
  subWaiting: "Күту",
  subVerdict: "Шешім",
  subAccept: "Есептеу",
  subComment: "Пікір",
  subCommentRequired: "· міндетті",
  subCommentOptional: "· міндетті емес",
  subCommentRework: "Нақты нені түзету керегін жазыңыз — мұғалім осы мәтінді көреді",
  subCommentAccept: "Мысалы: дескрипторлар әр критерийді қамтиды",
  subCommentError:
    "«Пысықтауға» жіберу үшін пікір міндетті — әйтпесе мұғалім нені түзетуді түсінбейді",
  subSaveNext: "Сақтап, келесіге өту",
  subSaveBack: "Сақтап, кезекке оралу",
  subAcceptedToast: "Жұмыс есептелді",
  subReworkToast: "Жұмыс пысықтауға жіберілді",
  subSaveError: "Шешімді сақтау мүмкін болмады — қайталап көріңіз",
  subQueueEmptyToast: "Кезек бос — барлық жұмыс тексерілді",
  subReviewed: "Жұмыс тексерілді",
  subReviewedAt: (date: string) => `Тексерілген күні: ${date}`,
  subAcceptNote:
    "Мұғалімге қоңырауша арқылы хабарлама барады. Бұл соңғы шарт болса — сертификат автоматты түрде беріледі.",

  quiz: "Тест",
  quizNotFound: "Тест табылмады",
  quizNotFoundText: "Тест жойылған немесе сілтеме ескірген болуы мүмкін",
  startQuiz: "Тестті бастау",
  retakeQuiz: "Қайта өту",
  oneAttempt: "Бір әрекет",
  retakableQuiz: "Қайта тапсыруға болады",
  statQuestions: "сұрақ",
  statTimeLimit: "уақыт шегі",
  statPassScore: "өту балы",
  noTimeLimit: "шектеусіз",
  maxScoreNote: (n: number) => `Ең жоғары ${n} балл`,
  oneAttemptTitle: "Сізде бір ғана әрекет",
  oneAttemptText:
    "Тестті бастасаңыз, оны қайта өте алмайсыз. Сізді ешкім алаңдатпайтынына көз жеткізіңіз.",
  retakableText: "Әрекет саны шектелмеген, соңғы нәтиже есептеледі",
  timerNote: "Таймер бірден іске қосылады · жауаптар автоматты сақталады",
  noTimerNote: "Уақыт шектелмеген · жауаптар автоматты сақталады",
  confirmStartTitle: "Тестті бастайсыз ба? Әрекет біреу",
  confirmStartText:
    "Әрекет біреу. Таймер бірден іске қосылады және қойындыны жапсаңыз да тоқтамайды.",
  startNow: "Бастау",
  notNow: "Қазір емес",
  quizClosedByCert: "Сертификат берілді — жаңа әрекеттер жабық",
  attemptUsed: "Әрекет пайдаланылды",
  questionN: (n: number) => `${n}-сұрақ`,
  questionOf: (a: number, b: number) => `${b} сұрақтың ${a}-сі`,
  lowTimeNote:
    "Екі минуттан аз уақыт қалды. Жауаптар автоматты сақталады — уақыт біткенде тест өзі жіберіледі.",
  multiHint: "Балл тек толық дұрыс жиын үшін беріледі — ішінара балл жоқ",
  autosaveHint: "Жауаптар автоматты сақталады",
  finishQuiz: "Тестті аяқтау",
  finishQuizTitle: "Тестті аяқтайсыз ба?",
  answered: "Жауап берілді",
  unansweredNote: (n: number) => `${n}-сұрақ жауапсыз қалды.`,
  backToQuestion: (n: number) => `${n}-сұраққа оралу`,
  finishWarn: "Аяқтағаннан кейін жауаптарды өзгерту мүмкін болмайды.",
  startQuizError: "Тестті бастау мүмкін болмады — қайталап көріңіз",
  answerSaveError: "Жауап сақталмады — байланысты тексеріп, қайта таңдаңыз",
  finishQuizError: "Тестті аяқтау мүмкін болмады — қайталап көріңіз",
  quizResult: "Тест нәтижесі",
  quizReview: "Жауаптарды талдау",
  quizPassed: "Тест тапсырылды",
  quizFailed: "Тест тапсырылмады",
  scoreOf: (a: number, b: number) => `${b} балдан ${a}`,
  statPoints: "балл",
  statPassShort: "өту шегі",
  statSpent: "жұмсалды",
  minShort: (n: number) => `${n} мин`,
  timedOutNote:
    "Уақыт бітті — жауаптар автоматты жіберілді. Үлгерген сұрақтардың бәрі есептелді.",
  correct: "Дұрыс",
  incorrect: "Қате",
  points: (n: number) => `${n} балл`,
  yourAnswer: "сіздің жауабыңыз",
  correctAnswer: "дұрыс жауап",
  explanation: "Түсіндірме: ",
  toResult: "Нәтижеге",
  secAttempts: "Әрекеттер тарихы",
  attemptN: (n: number) => `${n}-әрекет`,
  countedLast: "соңғы нәтиже есептеледі",
  oneAttemptShort: "әрекет біреу",
  timedOutShort: "уақыт бітті",
  countedBadge: "есептік",

  task: "Тапсырма",
  taskNotFound: "Тапсырма табылмады",
  taskNotFoundText: "Тапсырма жойылған немесе сілтеме ескірген болуы мүмкін",
  secStatement: "Шарты",
  secYourAnswer: "Сіздің жауабыңыз",
  templateFile: "Үлгі-файл",
  fieldComment: "Пікір",
  optional: "міндетті емес",
  commentPlaceholder: "Мысалы: формаға сілтеме және не істегеніңіз",
  dropHint: "Файлдарды осында сүйреңіз немесе",
  chooseFile: "Файл таңдау",
  fileLimits: (exts: string, mb: number) => `${exts} · ${mb} МБ дейін`,
  anyFileLimits: (mb: number) => `Кез келген файл · ${mb} МБ дейін`,
  extNotAllowed: (ext: string, list: string) =>
    `.${ext} форматы қабылданбайды — рұқсат: ${list}`,
  fileTooBig: (mb: number) => `Файл ${mb} МБ-тан үлкен — көлемін азайтыңыз`,
  tooManyFiles: "10 файлдан артық тіркеуге болмайды",
  uploadError: "Файлды жүктеу мүмкін болмады — қайталап көріңіз",
  removeFile: "Файлды жою",
  submitTask: "Тексеруге жіберу",
  submitAgain: "Қайта жіберу",
  taskSent: "Жұмыс тексеруге жіберілді",
  submitTaskError: "Жұмысты жіберу мүмкін болмады — қайталап көріңіз",
  pendingText: "Әдетте 1–2 жұмыс күнінде тексереміз — қоңыраушаға хабарлама келеді",
  adminComment: "Әкімшінің пікірі",
  adminCommentAt: (date: string) => `Әкімшінің пікірі · ${date}`,
  secSubmissions: "Жұмыстар тарихы",
  submissionN: (n: number) => `№${n} жұмыс`,
  nextQuiz: "Тестке",
  nextTask: "Тапсырмаға",
  finalQuiz: "Қорытынды",
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
export function day(iso: string | undefined | null, lang: UiLang = "ru"): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  const months = lang === "kz" ? MONTHS_KZ : MONTHS_RU;
  return `${d} ${months[(m ?? 1) - 1]}`;
}

/**
 * 184320 → «180 КБ». Сервер отдаёт размер файла в байтах (`size_bytes`),
 * человеку нужны килобайты и мегабайты.
 */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} КБ`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1).replace(".", ",") : Math.round(mb)} МБ`;
}

/** 260 → «4 ч 20 мин» */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

/**
 * Метки времени приходят из API в UTC (ISO 8601) — показываем их
 * по казахстанскому времени (Asia/Almaty), а не по часовому поясу браузера.
 */
function almaty(iso: string): { d: number; m: number; y: number; hh: string; mm: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    d: Number(get("day")),
    m: Number(get("month")),
    y: Number(get("year")),
    hh: get("hour"),
    mm: get("minute"),
  };
}

/** «2026-08-11T20:12:00Z» → «12 августа» (Алматы: UTC-дата может отличаться). */
export function dayMonth(iso: string | undefined | null, lang: UiLang = "ru"): string {
  if (!iso) return "";
  const { d, m } = almaty(iso);
  const months = lang === "kz" ? MONTHS_KZ : MONTHS_RU;
  return `${d} ${months[m - 1]}`;
}

/** «2026-08-13T16:12:00Z» → «13 августа, 21:12» (Алматы). */
export function dayTime(iso: string | undefined | null, lang: UiLang = "ru"): string {
  if (!iso) return "";
  const { d, m, hh, mm } = almaty(iso);
  const months = lang === "kz" ? MONTHS_KZ : MONTHS_RU;
  return `${d} ${months[m - 1]}, ${hh}:${mm}`;
}

/** «2026-08-13T16:12:00Z» → «13 августа 2026» (Алматы). */
export function dayYear(iso: string | undefined | null, lang: UiLang = "ru"): string {
  if (!iso) return "";
  const { d, m, y } = almaty(iso);
  const months = lang === "kz" ? MONTHS_KZ : MONTHS_RU;
  return `${d} ${months[m - 1]} ${y}`;
}

/** «+77071234567» → «+7 (707) 123-45-67»; чужой формат возвращается как есть. */
export function phoneFmt(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 11) return phone;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}
