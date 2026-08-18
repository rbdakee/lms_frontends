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
