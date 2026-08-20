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
  /* Бренд.
     `brandLine1` + `brandLine2` — то же название, разбитое для логотипа:
     в одну строку оно рвёт шапку, а на автоматический перенос полагаться
     нельзя — он оставляет «и» в конце строки. */
  brandName: "Академия педагогов и психологов",
  brandLine1: "Академия педагогов",
  brandLine2: "и психологов",

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
  /* Курс уведён с платформы (черновик или скрыт): доступ и прогресс за учителем
     остались, но страница курса на такой статус отвечает «не найден» */
  stUnavailable: "Курс временно недоступен",
  unavailableHint:
    "Доступ сохранён, прогресс на месте. Курс временно убран с платформы — уроки откроются, когда он вернётся.",

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

  /* Сертификаты (5.11) */
  certsSubtitle:
    "Скачивайте PDF или отправляйте ссылку для проверки — комиссия увидит запись в реестре без регистрации.",
  academicHours: (n: number) =>
    `${n} ${plural(n, "академический час", "академических часа", "академических часов")}`,
  certIssuedOn: (date: string) => `Выдан ${date}`,
  courseNotFound: "Курс не найден",
  certNotFound: "Сертификат не найден",
  certNotFoundText: "Возможно, курс ещё не завершён или ссылка устарела",
  certMine: "Мои сертификаты",
  certDownloadPdf: "Скачать PDF",
  certCopyLink: "Скопировать ссылку для проверки",
  certLinkCopied: "Ссылка для проверки скопирована",
  certPdfToast: "Сертификат скачивается в PDF",
  certPdfError: "Не удалось скачать сертификат — попробуйте ещё раз",
  certRevoked: "Сертификат отозван и больше не выдаётся",
  certViewCourse: "Посмотреть курс",
  certLangRu: "на русском языке",
  certLangKz: "на казахском языке",
  certForHours: (n: number) => `Сертификат на ${n} ${plural(n, "час", "часа", "часов")}`,
  certPassScore: (n: number) => `проходной балл ${n}%`,
  certGet: "Получить сертификат",
  certReady: "Все условия выполнены — документ можно забрать",
  certAlreadyIssued: "Сертификат выдан",
  certOpen: "Открыть сертификат",

  /* Проверка сертификата (5.12) */
  vfTitle: "Проверка сертификата",
  vfLead: "Введите номер с сертификата — покажем, кому и за какой курс он выдан. Регистрация не нужна.",
  vfNumberLabel: "Номер сертификата",
  vfHint:
    "Номер напечатан под подписью, формат KZ-ГОД-6 символов: буквы и цифры без похожих начертаний — нет 0, O, 1, I. Регистр и дефисы можно не соблюдать.",
  vfCheck: "Проверить",
  vfValid: "Сертификат подлинный",
  vfValidSub: "Выдан Академией педагогов и психологов · запись в реестре есть",
  vfRevoked: "Сертификат отозван",
  vfRevokedSub: "Запись в реестре есть, но документ недействителен",
  vfRevokedOn: (date: string) => `Отозван ${date}`,
  vfNotFound: "Сертификат не найден",
  vfNotFoundSub: "в реестре нет",
  vfHolder: "ФИО",
  vfCourse: "Курс",
  vfHours: "Объём",
  vfIssued: "Дата выдачи",
  vfNumber: "Номер",
  vfPrivacy:
    "Персональные данные, кроме ФИО, не показываем. Если данные на бумаге отличаются от этих — документ подделан.",
  vfWhatToDo: "Что можно сделать",
  vfTip1: "Сверьте символы: в номере латиница и цифры, похожих начертаний в нём нет — ни нуля, ни «O», ни единицы, ни «I».",
  vfTip2: "Отсканируйте QR-код с сертификата — он подставит номер сам.",
  vfTip3: "Если номер точно верный, напишите нам — проверим вручную:",
  vfSupport: "Написать в поддержку",
  vfAnother: "Проверить другой номер",
  vfAgain: "Проверить ещё раз",
  vfQr: "На бумажном сертификате есть QR-код — камера телефона откроет эту страницу с готовым результатом.",
  vfCheckedAt: (dt: string) => `Проверено ${dt}`,
  vfTooOften: (sec: number) => `Слишком много проверок — повторите через ${sec} с`,

  /* Уведомления (5.14) */
  notifMarkAll: "Отметить все как прочитанные",
  notifMarkAllShort: "Прочитать все",
  notifAll: "Все уведомления",
  notifUnread: "Не прочитано",
  notifAdminNote:
    "Колокольчик есть только у учителя. Администратор свои уведомления — новые заявки и работы на проверку — получает в Telegram-бот.",

  /* Вопросы под уроком */
  qAskPlaceholder: "Задайте вопрос по этому уроку — ответит администратор или коллега",
  qAskHint: "Отвечаем в рабочие дни",
  qWaiting: "Ожидает ответа",
  qAdmin: "Администратор",
  reviewReply: "Ответ администратора",
  qAnswerPlaceholder: "Ваш ответ увидят все, кто откроет этот урок",
  qSendAnswer: "Отправить ответ",
  qEmptyTitle: "Пока вопросов нет",
  qEmptyText: "Задайте первый — ответит администратор или коллега с этого курса",
  qSent: "Вопрос отправлен — ответит администратор или коллега",
  qReplySent: "Ответ добавлен — его увидят все, кто откроет этот урок",
  qSendError: "Не удалось отправить — попробуйте ещё раз",
  qTooOften: (sec: number) => `Слишком часто — повторите через ${sec} с`,

  /* Завершение курса (5.10) */
  cmpTitle: "Поздравляем! Курс пройден",
  cmpSub: (title: string, hours: number) =>
    `«${title}» · ${hours} ${plural(hours, "академический час", "академических часа", "академических часов")}. Сертификат уже в вашем профиле.`,
  cmpIssuing: "Готовим сертификат…",
  cmpIssuingHint: "Обычно занимает несколько секунд",
  cmpDownload: "Скачать сертификат",
  cmpAllCerts: "Все мои сертификаты",
  cmpRate: "Оцените курс",
  cmpReviewPlaceholder: "Что было полезно, чего не хватило? Ваш отзыв увидят другие учителя",
  cmpReviewSent: "Спасибо! Отзыв опубликован на странице курса.",
  cmpSendReview: "Отправить отзыв",
  cmpReviewToast: "Отзыв отправлен",
  cmpNext: "Что пройти дальше",
  cmpNotIssued: "Сертификат пока не выдан",
  cmpConditionsLeft: "Осталось выполнить условия курса:",
  cmpFillProfile: "Заполнить профиль",
  cmpToProgram: "К программе курса",

  /* Админка · дашборд (5.15) */
  dashTitle: "Дашборд",
  dashSubtitle: "Что требует действия прямо сейчас",
  dashLeads: "новых заявок",
  dashLeadsHint: "учителя нажали «Записаться»",
  dashSubs: "работ ждут проверки",
  dashSubsHint: "задания с зачётом и доработкой",
  dashQuestions: "вопросов без ответа",
  dashQuestionsHint: "под уроками курсов",
  dashLeadsList: "Новые заявки",
  dashQueueList: "Работы на проверке",
  dashQuestionsList: "Вопросы без ответа",
  dashAll: (n: number) => `Все · ${n}`,
  dashNoLeads: "Новых заявок нет — все разобраны.",
  dashNoQueue: "Работ на проверке нет — очередь пуста.",
  dashNoQuestions: "Все вопросы разобраны.",
  dashTeachers: "Учителей",
  dashCourses: "Курсов опубликовано",
  dashCerts: "Выдано сертификатов",

  /* Админка · очередь вопросов (5.24) */
  qaTitle: "Вопросы от учителей",
  qaUnanswered: (n: number) => `${n} без ответа`,
  qaOnlyOpen: "Только без ответа",
  qaSearch: "Поиск по вопросу или ФИО",
  qaEmptyTitle: "Все вопросы отвечены",
  qaEmptyText: "Вопрос — это тред: отвечать может админ и любой учитель с доступом к курсу.",
  qaShowAll: "Показать все вопросы",
  qaNoMatchTitle: "Вопросов не нашли",
  qaNoMatchText: "Попробуйте снять фильтры или очистить поиск.",
  qaInThread: (n: number) => `${n} в треде`,
  qaNoAnswer: "Без ответа",
  qaAnswerPlaceholder: "Ответ увидит автор вопроса и все, кто откроет этот урок",
  qaWhoAnswers: "Отвечать может админ и любой учитель с доступом к курсу",
  qaSent: "Ответ отправлен — учитель получит уведомление",
  qaSendError: "Не удалось отправить ответ — попробуйте ещё раз",
  qaCourseEmpty: "Вопросов по курсу нет",
  qaAllPlatform: "Все вопросы платформы",
  /* Урок под вопросом мог стать скрытым — тогда номера у него нет (`number: 0`) */
  qaLesson: (n: number, title: string) => (n > 0 ? `Урок ${n} · ${title}` : title),

  /* Админка · отчёт по курсу (5.23) */
  repTitle: "Отчёт",
  repGeneratedAt: (dt: string) => `Данные на ${dt}`,
  repGranted: "получили доступ",
  repStarted: "начали",
  repCompleted: "завершили",
  repAvgProgress: "средний прогресс",
  repAvgFinal: "ср. балл итог. теста",
  repCerts: "сертификатов",
  repAvgDays: "ср. время прохождения",
  repDays: (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`,
  repFunnel: "Воронка по программе",
  repFunnelHint: "Сколько учителей прошло каждый элемент программы",
  repFunnelEmpty: "Программа пока пустая",
  repBiggestDrop: (title: string, n: number, pct: number) =>
    `Больше всего людей теряется на «${title}» — минус ${n} (${pct}%) к предыдущему шагу.`,
  repParticipants: (n: number) => `Участники · ${n}`,
  repSearchName: "Поиск по ФИО",
  repFio: "ФИО",
  repSchool: "Школа · регион",
  repProgress: "Прогресс",
  repModuleQuizzes: "Тесты модулей",
  repFinalQuiz: "Итоговый тест",
  repCertificate: "Сертификат",
  repCertIssued: "Выдан",
  repCertReady: "Готов",
  repCertProgress: "В процессе",
  repFinalNotStarted: "не начат",
  repFinalInProgress: "идёт",
  repFinalFailed: "не сдан",
  repNobodyTitle: "На курс ещё никто не записался",
  repNobodyText: "Участники появятся здесь, как только администратор откроет доступ.",
  repNoMatch: "Участников не нашли",
  repPickTitle: "Выберите курс",
  repPickText: "Отчёт считается по версии курса — выберите её в списке наверху.",
  repPickBtn: "Выбрать курс",
  repCourseField: "Курс",

  /* Предпросмотр как учитель */
  pvTitle: "Предпросмотр как учитель",
  pvPickTitle: "Какой курс открыть как учитель?",
  pvPickText:
    "Режим включается на сервере: записи по этому курсу не сохранятся, а уроки откроются подряд, без строгого порядка.",
  pvError: "Не удалось включить предпросмотр — попробуйте ещё раз",
};

type Dict = typeof ru;

const kz: Dict = {
  brandName: "Педагогтар мен психологтар академиясы",
  brandLine1: "Педагогтар мен психологтар",
  brandLine2: "академиясы",

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
  stUnavailable: "Курс уақытша қолжетімсіз",
  unavailableHint:
    "Қолжетімділік сақталды, үлгеріміңіз орнында. Курс платформадан уақытша алынды — ол оралғанда сабақтар қайта ашылады.",

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

  certsSubtitle:
    "PDF жүктеп алыңыз немесе тексеру сілтемесін жіберіңіз — комиссия тіркеуден өтпей-ақ тізілімнен көреді.",
  academicHours: (n: number) => `${n} академиялық сағат`,
  certIssuedOn: (date: string) => `Берілген күні: ${date}`,
  courseNotFound: "Курс табылмады",
  certNotFound: "Сертификат табылмады",
  certNotFoundText: "Курс аяқталмаған немесе сілтеме ескірген болуы мүмкін",
  certMine: "Менің сертификаттарым",
  certDownloadPdf: "PDF жүктеп алу",
  certCopyLink: "Тексеру сілтемесін көшіру",
  certLinkCopied: "Тексеру сілтемесі көшірілді",
  certPdfToast: "Сертификат PDF түрінде жүктеліп жатыр",
  certPdfError: "Сертификатты жүктеп алу мүмкін болмады — қайталап көріңіз",
  certRevoked: "Сертификат кері қайтарылған және бұдан былай берілмейді",
  certViewCourse: "Курсты қарау",
  certLangRu: "орыс тілінде",
  certLangKz: "қазақ тілінде",
  certForHours: (n: number) => `${n} сағаттық сертификат`,
  certPassScore: (n: number) => `өту балы ${n}%`,
  certGet: "Сертификатты алу",
  certReady: "Барлық шарт орындалды — құжатты алуға болады",
  certAlreadyIssued: "Сертификат берілді",
  certOpen: "Сертификатты ашу",

  vfTitle: "Сертификатты тексеру",
  vfLead: "Сертификаттағы нөмірді енгізіңіз — кімге және қай курс үшін берілгенін көрсетеміз. Тіркелу қажет емес.",
  vfNumberLabel: "Сертификат нөмірі",
  vfHint:
    "Нөмір қолтаңба астында жазылған, форматы KZ-ЖЫЛ-6 таңба: ұқсас таңбаларсыз әріптер мен цифрлар — 0, O, 1, I жоқ. Регистр мен дефисті сақтамауға болады.",
  vfCheck: "Тексеру",
  vfValid: "Сертификат түпнұсқа",
  vfValidSub: "Педагогтар мен психологтар академиясы берген · тізілімде жазба бар",
  vfRevoked: "Сертификат кері қайтарылған",
  vfRevokedSub: "Тізілімде жазба бар, бірақ құжат жарамсыз",
  vfRevokedOn: (date: string) => `Кері қайтарылған күні: ${date}`,
  vfNotFound: "Сертификат табылмады",
  vfNotFoundSub: "тізілімде жоқ",
  vfHolder: "Аты-жөні",
  vfCourse: "Курс",
  vfHours: "Көлемі",
  vfIssued: "Берілген күні",
  vfNumber: "Нөмірі",
  vfPrivacy:
    "Аты-жөнінен басқа дербес деректерді көрсетпейміз. Қағаздағы деректер бұдан өзгеше болса — құжат жалған.",
  vfWhatToDo: "Не істеуге болады",
  vfTip1: "Таңбаларды салыстырыңыз: нөмірде латын әріптері мен цифрлар, ұқсас таңбалар жоқ — нөл де, «O» да, бір де, «I» да кездеспейді.",
  vfTip2: "Сертификаттағы QR-кодты сканерлеңіз — нөмірді өзі қояды.",
  vfTip3: "Нөмір дұрыс болса, бізге жазыңыз — қолмен тексереміз:",
  vfSupport: "Қолдау қызметіне жазу",
  vfAnother: "Басқа нөмірді тексеру",
  vfAgain: "Қайта тексеру",
  vfQr: "Қағаз сертификатта QR-код бар — телефон камерасы осы бетті дайын нәтижемен ашады.",
  vfCheckedAt: (dt: string) => `Тексерілді: ${dt}`,
  vfTooOften: (sec: number) => `Тексеру тым жиі — ${sec} с кейін қайталаңыз`,

  notifMarkAll: "Барлығын оқылды деп белгілеу",
  notifMarkAllShort: "Барлығын оқу",
  notifAll: "Барлық хабарламалар",
  notifUnread: "Оқылмаған",
  notifAdminNote:
    "Қоңырауша тек мұғалімде. Әкімші өз хабарламаларын — жаңа өтінімдер мен тексеруге түскен жұмыстарды — Telegram-ботта алады.",

  qAskPlaceholder: "Осы сабақ бойынша сұрақ қойыңыз — әкімші немесе әріптес жауап береді",
  qAskHint: "Жұмыс күндері жауап береміз",
  qWaiting: "Жауап күтуде",
  qAdmin: "Әкімші",
  reviewReply: "Әкімшінің жауабы",
  qAnswerPlaceholder: "Жауабыңызды осы сабақты ашқандардың бәрі көреді",
  qSendAnswer: "Жауапты жіберу",
  qEmptyTitle: "Әзірге сұрақ жоқ",
  qEmptyText: "Бірінші болып сұраңыз — әкімші немесе осы курстағы әріптес жауап береді",
  qSent: "Сұрақ жіберілді — әкімші немесе әріптес жауап береді",
  qReplySent: "Жауап қосылды — оны осы сабақты ашқандардың бәрі көреді",
  qSendError: "Жіберу мүмкін болмады — қайталап көріңіз",
  qTooOften: (sec: number) => `Тым жиі — ${sec} с кейін қайталаңыз`,

  cmpTitle: "Құттықтаймыз! Курс аяқталды",
  cmpSub: (title: string, hours: number) =>
    `«${title}» · ${hours} академиялық сағат. Сертификат профиліңізде.`,
  cmpIssuing: "Сертификат дайындалуда…",
  cmpIssuingHint: "Әдетте бірнеше секунд алады",
  cmpDownload: "Сертификатты жүктеп алу",
  cmpAllCerts: "Барлық сертификаттарым",
  cmpRate: "Курсты бағалаңыз",
  cmpReviewPlaceholder: "Не пайдалы болды, не жетіспеді? Пікіріңізді басқа мұғалімдер көреді",
  cmpReviewSent: "Рақмет! Пікір курс бетінде жарияланды.",
  cmpSendReview: "Пікір жіберу",
  cmpReviewToast: "Пікір жіберілді",
  cmpNext: "Әрі қарай не өтуге болады",
  cmpNotIssued: "Сертификат әзірге берілмеді",
  cmpConditionsLeft: "Курс шарттарын орындау керек:",
  cmpFillProfile: "Профильді толтыру",
  cmpToProgram: "Курс бағдарламасына",

  dashTitle: "Дашборд",
  dashSubtitle: "Дәл қазір әрекет талап ететіні",
  dashLeads: "жаңа өтінім",
  dashLeadsHint: "мұғалімдер «Тіркелу» батырмасын басты",
  dashSubs: "жұмыс тексеруді күтуде",
  dashSubsHint: "есепке алу мен пысықтауға арналған тапсырмалар",
  dashQuestions: "жауапсыз сұрақ",
  dashQuestionsHint: "курс сабақтарының астында",
  dashLeadsList: "Жаңа өтінімдер",
  dashQueueList: "Тексерудегі жұмыстар",
  dashQuestionsList: "Жауапсыз сұрақтар",
  dashAll: (n: number) => `Барлығы · ${n}`,
  dashNoLeads: "Жаңа өтінім жоқ — бәрі қаралды.",
  dashNoQueue: "Тексерудегі жұмыс жоқ — кезек бос.",
  dashNoQuestions: "Барлық сұрақ қаралды.",
  dashTeachers: "Мұғалімдер",
  dashCourses: "Жарияланған курстар",
  dashCerts: "Берілген сертификаттар",

  qaTitle: "Мұғалімдердің сұрақтары",
  qaUnanswered: (n: number) => `${n} жауапсыз`,
  qaOnlyOpen: "Тек жауапсыздар",
  qaSearch: "Сұрақ немесе аты-жөні бойынша іздеу",
  qaEmptyTitle: "Барлық сұраққа жауап берілді",
  qaEmptyText:
    "Сұрақ — бұл тред: әкімші де, курсқа қолжетімділігі бар кез келген мұғалім де жауап бере алады.",
  qaShowAll: "Барлық сұрақты көрсету",
  qaNoMatchTitle: "Сұрақ табылмады",
  qaNoMatchText: "Сүзгілерді алып тастап немесе іздеуді тазалап көріңіз.",
  qaInThread: (n: number) => `тредте ${n}`,
  qaNoAnswer: "Жауапсыз",
  qaAnswerPlaceholder: "Жауапты сұрақ авторы және осы сабақты ашқандардың бәрі көреді",
  qaWhoAnswers: "Әкімші де, курсқа қолжетімділігі бар кез келген мұғалім де жауап бере алады",
  qaSent: "Жауап жіберілді — мұғалімге хабарлама барады",
  qaSendError: "Жауапты жіберу мүмкін болмады — қайталап көріңіз",
  qaCourseEmpty: "Курс бойынша сұрақ жоқ",
  qaAllPlatform: "Платформаның барлық сұрағы",
  qaLesson: (n: number, title: string) => (n > 0 ? `${n}-сабақ · ${title}` : title),

  repTitle: "Есеп",
  repGeneratedAt: (dt: string) => `Дерек ${dt} жағдайына`,
  repGranted: "қолжетімділік алды",
  repStarted: "бастады",
  repCompleted: "аяқтады",
  repAvgProgress: "орташа үлгерім",
  repAvgFinal: "қорытынды тест орташа балы",
  repCerts: "сертификат",
  repAvgDays: "өтудің орташа уақыты",
  repDays: (n: number) => `${n} күн`,
  repFunnel: "Бағдарлама бойынша воронка",
  repFunnelHint: "Бағдарламаның әр элементін қанша мұғалім өтті",
  repFunnelEmpty: "Бағдарлама әзірге бос",
  repBiggestDrop: (title: string, n: number, pct: number) =>
    `Ең көп адам «${title}» тұсында түсіп қалады — алдыңғы қадамға қарағанда ${n} (${pct}%) кем.`,
  repParticipants: (n: number) => `Қатысушылар · ${n}`,
  repSearchName: "Аты-жөні бойынша іздеу",
  repFio: "Аты-жөні",
  repSchool: "Мектеп · өңір",
  repProgress: "Үлгерім",
  repModuleQuizzes: "Модуль тестері",
  repFinalQuiz: "Қорытынды тест",
  repCertificate: "Сертификат",
  repCertIssued: "Берілді",
  repCertReady: "Дайын",
  repCertProgress: "Орындалуда",
  repFinalNotStarted: "басталмаған",
  repFinalInProgress: "жүріп жатыр",
  repFinalFailed: "тапсырылмаған",
  repNobodyTitle: "Курсқа әзірге ешкім тіркелмеген",
  repNobodyText: "Әкімші қолжетімділік ашқан бойда қатысушылар осында пайда болады.",
  repNoMatch: "Қатысушы табылмады",
  repPickTitle: "Курсты таңдаңыз",
  repPickText: "Есеп курс нұсқасы бойынша есептеледі — оны жоғарыдағы тізімнен таңдаңыз.",
  repPickBtn: "Курсты таңдау",
  repCourseField: "Курс",

  pvTitle: "Мұғалім көзімен қарау",
  pvPickTitle: "Қай курсты мұғалім көзімен ашамыз?",
  pvPickText:
    "Режим серверде қосылады: осы курс бойынша жазбалар сақталмайды, ал сабақтар қатаң реттілiксіз, қатарынан ашылады.",
  pvError: "Алдын ала қарауды қосу мүмкін болмады — қайталап көріңіз",
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
