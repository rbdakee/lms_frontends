/**
 * Всё про курс глазами учителя. Экраны целиком — в `@lms/course/screens`,
 * кадр и адреса приложения — в `@lms/course/host`.
 */

export { AttemptsHistory } from "./components/Attempts";
export { CertificateSheet, CertificateThumb } from "./components/CertificateSheet";
export {
  CourseCard,
  CourseRow,
  MyCourseCard,
  PendingCourseCard,
  ReviewsBlock,
  isUnavailable,
  pickVersion,
  type AccessState,
} from "./components/CourseCard";
export { ContactAdmin, EnrollBadge, Price } from "./components/CourseMeta";
export {
  ConditionRow,
  CourseCertChecklist,
  CourseProgram,
  continueHref,
  itemHref,
} from "./components/CourseProgram";
export { QrCode } from "./components/QrCode";
export { ScoreRing } from "./components/ScoreRing";
export { VideoPlayer, youtubeId } from "./components/VideoPlayer";
export { useCertificatePdf } from "./lib/certificatePdf";
