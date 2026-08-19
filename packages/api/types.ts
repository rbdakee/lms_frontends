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

/* Предпросмотр как учитель: флаг живёт в сессии, экраны узнают о нём из /me. */
export type Preview = S["PreviewOut"];
export type PreviewEnterIn = S["PreviewEnterIn"];
