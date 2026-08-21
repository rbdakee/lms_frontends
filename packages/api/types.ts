/**
 * Короткие имена поверх сгенерированной схемы (`types.gen.ts`).
 * Руками типы ответов не пишем: изменился контракт — перегенерировали
 * (`npm run generate -w @lms/api` при поднятом бэкенде) и поправили экраны.
 */

import type { components } from "./types.gen";

type S = components["schemas"];

export type User = S["UserOut"];
export type UserPatch = S["UserPatch"];

export type Dictionaries = S["DictionariesOut"];
export type Category = S["CategoryOut"];

export type CatalogOut = S["CatalogOut"];
export type CatalogGroup = S["CatalogGroupOut"];
export type CatalogCourse = S["CourseCardOut"];
export type CoursePage = S["CoursePageOut"];
export type CourseAccess = CoursePage["access"];
export type ProgramModule = S["ProgramModuleOut"];
export type ProgramItem = ProgramModule["items"][number];
export type VersionChip = S["VersionChipOut"];

/* Программа со статусами — сайдбар экрана урока (`GET /courses/{id}/program`).
   Те же модули и элементы, что в `program[]` страницы курса, плюс `status`. */
export type Program = S["ProgramOut"];
export type ProgramStatusModule = S["ProgramStatusModuleOut"];
export type ProgramStatusItem = ProgramStatusModule["items"][number];
export type ItemStatus = ProgramStatusItem["status"];

export type Lesson = S["LessonOut"];
export type LessonFile = S["LessonFileOut"];
export type LessonComplete = S["LessonCompleteOut"];
export type Playback = S["PlaybackOut"];
export type FileLink = S["FileLinkOut"];
export type UploadedFile = S["UploadedFileOut"];

export type Review = S["ReviewOut"];
export type ReviewIn = S["ReviewIn"];
export type ReviewsPage = S["ReviewsPageOut"];
export type Lead = S["LeadOut"];

export type MyCourses = S["MyCoursesOut"];
export type MyCourse = S["MyCourseOut"];
export type MyLead = S["MyLeadOut"];

export type Session = S["SessionOut"];
export type SessionList = S["SessionListOut"];

export type AdminLead = S["AdminLeadOut"];
export type AdminLeadsPage = S["AdminLeadsPageOut"];
export type LeadPatch = S["LeadPatchIn"];
export type LeadStatus = NonNullable<LeadPatch["status"]>;
export type EnrollmentIn = S["EnrollmentIn"];
export type Enrollment = S["EnrollmentOut"];

/* Тест (`GET /quizzes/{id}`): правила и состояние. Вопросы приходят только
   внутри активной попытки; правильные ответы — только в разборе. */
export type Quiz = S["QuizOut"];
export type QuizState = Quiz["state"];
export type QuizAttempt = S["QuizAttemptOut"];
export type QuizQuestion = S["QuizQuestionOut"];
export type QuizAnswer = S["QuizAnswerOut"];
export type AnswerIn = S["AnswerIn"];
export type QuizResult = S["QuizResultOut"];
export type QuizAttemptHistory = S["QuizAttemptHistoryOut"];
export type QuizReview = S["QuizReviewOut"];
export type QuizReviewQuestion = S["QuizReviewQuestionOut"];

/* Задание и сдачи (`GET /tasks/{id}`, `POST /tasks/{id}/submissions`). */
export type Task = S["TaskOut"];
export type TaskStatus = Task["status"];
export type Submission = S["SubmissionOut"];
export type SubmissionFile = S["SubmissionFileOut"];
export type SubmissionIn = S["SubmissionIn"];

/* Очередь проверки в админке (`GET /admin/submissions`, карточка, вердикт). */
export type AdminSubmission = S["AdminSubmissionOut"];
export type AdminSubmissionsPage = S["AdminSubmissionsPageOut"];
export type AdminSubmissionCard = S["AdminSubmissionCardOut"];
export type SubmissionReviewIn = S["SubmissionReviewIn"];
export type SubmissionVerdict = SubmissionReviewIn["verdict"];

/* Сертификат: чек-лист условий (`GET /courses/{id}/completion`), выдача
   и публичная проверка. Экран `/certificates/{id}` живёт списком
   `GET /me/certificates` — отдельного эндпоинта за одним документом нет. */
export type Completion = S["CompletionOut"];
export type Condition = Completion["conditions"][number];
export type ConditionStatus = Condition["status"];
export type Blocker = S["BlockerOut"];
export type Certificate = S["CertificateOut"];
export type MyCertificate = S["MyCertificateOut"];
export type MyCertificates = S["MyCertificatesOut"];
export type Verify = S["VerifyOut"];
export type VerifyStatus = Verify["status"];

/* Колокольчик (`GET /notifications`). Текст приходит собранным на языке
   читателя, `params` — чтобы построить адрес перехода. */
export type Notification = S["NotificationOut"];
export type NotificationType = Notification["type"];
export type NotificationsPage = S["NotificationsPageOut"];
export type NotificationsReadIn = S["NotificationsReadIn"];

/* Вопросы под уроком: тред ровно в два уровня. */
export type ThreadQuestion = S["ThreadQuestionOut"];
export type ThreadReply = S["ThreadReplyOut"];
export type QuestionsPage = S["QuestionsPageOut"];
export type ThreadMessageIn = S["ThreadMessageIn"];

/* Админка: дашборд, сводная очередь вопросов и отчёт по курсу. */
export type AdminOverview = S["AdminOverviewOut"];
export type OverviewLead = S["OverviewLeadOut"];
export type OverviewSubmission = S["OverviewSubmissionOut"];
export type OverviewQuestion = S["OverviewQuestionOut"];
export type OverviewTotals = S["OverviewTotalsOut"];
export type AdminQuestion = S["AdminQuestionOut"];
export type AdminQuestionsPage = S["AdminQuestionsPageOut"];
export type AdminReport = S["AdminReportOut"];
export type ReportSummary = S["ReportSummaryOut"];
export type ReportFunnelItem = S["ReportFunnelItemOut"];
export type ReportParticipant = S["ReportParticipantOut"];
export type ReportCertificateState = ReportParticipant["certificate"];

/* ============ Админские редакторы содержания (сессия 7а) ============

   Список курсов, редактор курса с четырьмя вкладками и редакторы урока,
   теста и задания. Это единственное место, где `GET` отдаёт черновик,
   скрытый элемент и правильные ответы теста.

   Ловушка в именах схемы — читается наоборот, чем ожидается:
   `AdminCourse` это ОДНА СТРОКА списка `GET /admin/courses`, а весь
   редактор курса (`GET/PATCH /admin/courses/{id}`, `POST /admin/courses`,
   `/versions`, `/duplicate`) отдаёт `AdminCourseCard`. */

export type AdminCoursesPage = S["AdminCoursesPageOut"];
export type AdminCourse = S["AdminCourseOut"];
export type AdminCourseCard = S["AdminCourseCardOut"];
export type AdminCourseIn = S["AdminCourseIn"];
export type AdminCoursePatch = S["AdminCoursePatchIn"];
export type AdminCourseVersion = S["AdminCourseVersionOut"];
export type CourseVersionIn = S["CourseVersionIn"];
/* Статус набора: пять значений. В ответах сервера `status` приходит просто
   строкой, поэтому подписи ищутся по литеральному типу из тела PATCH. */
export type CourseStatus = NonNullable<AdminCoursePatch["status"]>;
/* Язык версии курса. У курса он один: вторая версия — отдельный курс. */
export type CourseLang = AdminCourseIn["lang"];

/* Чек-лист вкладки «Публикация» считает сервер: `text` — готовая строка,
   `items` — названия, которых не хватает. Свой чек-лист не считаем. */
export type Readiness = S["ReadinessOut"];
export type ReadinessCheck = S["ReadinessCheckOut"];

/* Дерево программы в админке: те же модули, что у учителя, но со скрытыми
   элементами и без статуса прохождения. `AdminProgram` — ответ
   `PUT /program_order`, дерево целиком плюс пересчитанные минуты. */
export type AdminProgramModule = S["AdminProgramModuleOut"];
export type AdminProgramLesson = S["AdminProgramLessonOut"];
export type AdminProgramQuiz = S["AdminProgramQuizOut"];
export type AdminProgramTask = S["AdminProgramTaskOut"];
/** Элемент дерева — размеченное объединение по `kind`. */
export type AdminProgramItem = AdminProgramModule["items"][number];
export type AdminProgram = S["AdminProgramOut"];
export type ModuleIn = S["ModuleIn"];
export type ProgramOrderIn = S["ProgramOrderIn"];
export type ProgramOrderModuleIn = S["ProgramOrderModuleIn"];
export type ProgramOrderItemIn = S["ProgramOrderItemIn"];

/* Редактор урока (`GET/PATCH /admin/lessons/{id}`). */
export type AdminLesson = S["AdminLessonOut"];
export type AdminLessonIn = S["AdminLessonIn"];
export type AdminLessonPatch = S["AdminLessonPatchIn"];
export type LessonBodyIn = S["LessonBodyIn"];
export type LessonFileIn = S["LessonFileIn"];
/** Вид урока: видео или текст. Кнопка добавления одна, вид — переключатель. */
export type LessonKind = AdminLesson["kind"];

/* Редактор теста (`GET/PATCH /admin/quizzes/{id}`) — с правильными
   ответами и пояснениями, которых нет в учительском `QuizOut`. */
export type AdminQuiz = S["AdminQuizOut"];
export type AdminQuizIn = S["AdminQuizIn"];
export type AdminQuizPatch = S["AdminQuizPatchIn"];
export type AdminQuizQuestion = S["AdminQuizQuestionOut"];
export type AdminQuizOption = S["AdminQuizOptionOut"];
export type QuizQuestionIn = S["QuizQuestionIn"];
export type QuizQuestionPatch = S["QuizQuestionPatchIn"];
export type QuizOptionIn = S["QuizOptionIn"];
/** Тип вопроса: один ответ, несколько или «да/нет». */
export type QuestionType = AdminQuizQuestion["type"];

/* Редактор задания (`GET/PATCH /admin/tasks/{id}`). */
export type AdminTask = S["AdminTaskOut"];
export type AdminTaskIn = S["AdminTaskIn"];
export type AdminTaskPatch = S["AdminTaskPatchIn"];
export type TaskStatementIn = S["TaskStatementIn"];
export type TaskTemplateIn = S["TaskTemplateIn"];
/** Формат сдачи: текстом, файлом или и тем и другим. */
export type SubmitFormat = AdminTask["submit_format"];

/* Предпросмотр как учитель: флаг живёт в сессии, экраны узнают о нём из /me. */
export type Preview = S["PreviewOut"];
export type PreviewEnterIn = S["PreviewEnterIn"];

/* ============ Люди и площадка (сессия 7б) ============

   Учителя, отзывы, настройки площадки и категории. Здесь живут персональные
   данные: ФИО, телефоны, школы и регионы. Наружу они не уходят никак — ни
   в адрес страницы, ни в текст ошибки, ни в аналитику.

   Ловушка в именах та же, что у курсов: `AdminTeacher` — это ОДНА СТРОКА
   списка `GET /admin/teachers`, а карточка (`GET/PATCH /admin/teachers/{id}`,
   `POST /retakes`) отдаёт `AdminTeacherCard`. */

export type AdminTeachersPage = S["AdminTeachersPageOut"];
export type AdminTeacher = S["AdminTeacherOut"];
export type AdminTeacherCard = S["AdminTeacherCardOut"];
export type AdminTeacherPatch = S["AdminTeacherPatchIn"];
/* Вкладки карточки — все четыре приходят внутри `AdminTeacherCard`,
   пагинации у них нет. */
export type AdminTeacherEnrollment = S["AdminTeacherEnrollmentOut"];
export type AdminTeacherQuiz = S["AdminTeacherQuizOut"];
export type AdminTeacherAttempt = S["AdminTeacherAttemptOut"];
export type AdminTeacherSubmission = S["AdminTeacherSubmissionOut"];
export type AdminTeacherCertificate = S["AdminTeacherCertificateOut"];
export type TeacherRetakeIn = S["TeacherRetakeIn"];
/** Почему пересдачу разрешить нельзя — коды те же, что у ошибок `POST /retakes`. */
export type RetakeBlocker = NonNullable<AdminTeacherQuiz["retake_blocker"]>;

/* Лента отзывов админа. Не путать с `Review` — это тот же отзыв, но в публичном
   ответе `GET /courses/{id}/reviews`: там автор одной строкой и без телефона. */
export type AdminReview = S["AdminReviewOut"];
export type AdminReviewsPage = S["AdminReviewsPageOut"];
export type ReviewReply = S["ReviewReplyOut"];
export type ReviewReplyIn = S["ReviewReplyIn"];

/* Настройки площадки. `AdminSettings` — четыре вкладки экрана целиком,
   `PublicSettings` — то немногое, что `GET /settings` отдаёт без входа. */
export type AdminSettings = S["AdminSettingsOut"];
export type AdminSettingsPatch = S["AdminSettingsPatchIn"];
export type PublicSettings = S["PublicSettingsOut"];
export type SettingsContacts = S["SettingsContactsOut"];
export type SettingsContactsIn = S["SettingsContactsIn"];
/** Картинка настроек: наружу `url` публичной раздачи, внутрь — `{key, name}` из `POST /files`. */
export type SettingsImage = S["SettingsImageOut"];
export type SettingsImageIn = S["SettingsImageIn"];
export type CertificateImages = S["AdminCertificateImagesOut"];
export type CertificateImagesIn = S["AdminCertificateImagesIn"];
/* Привязка бота: `chat_id` наружу не отдаётся вовсе, статус виден
   по `connected` и `chat_title`. Меняется своими ручками, не через PATCH. */
export type SettingsTelegram = S["AdminSettingsTelegramOut"];
export type SettingsTelegramIn = S["AdminSettingsTelegramIn"];
export type TelegramBindCode = S["TelegramBindCodeOut"];

/* Категории в настройках. Не путать с `Category` из `GET /dictionaries`:
   там только `id` и `title`, здесь ещё порядок и число курсов. */
export type AdminCategories = S["AdminCategoriesOut"];
export type AdminCategory = S["AdminCategoryOut"];
export type AdminCategoryIn = S["AdminCategoryIn"];
