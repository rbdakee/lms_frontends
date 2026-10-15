/**
 * Справочник учебной программы — формы ответов, описанные руками.
 *
 * Обычно типы ответов не пишутся руками вовсе: `types.ts` — короткие имена
 * поверх `types.gen.ts`, а тот генерируется из OpenAPI-схемы бэкенда. Здесь
 * исключение и оно временное: экран сверки (сессия L2) писался параллельно
 * с бэкендом, живого `/openapi.json` со справочником ещё нет — генерировать
 * нечего.
 *
 * Поэтому формы переписаны буквально из `backend/CONTRACT.md`, раздел
 * «Справочник учебной программы (сессия L2)»: те же имена через `_`, тот же
 * порядок полей, те же `null`. Когда бэкенд поднимется и схема
 * перегенерируется, этот файл удаляется, а имена ниже становятся обычными
 * псевдонимами `S["..."]` в `types.ts`. Несовпадение при перегенерации —
 * это разошедшийся контракт, и разбирается оно правкой контракта,
 * а не подгонкой экрана.
 */

/** Язык обучения программы. Не язык интерфейса: у справочника он свой. */
export type CurriculumLang = "ru" | "kz";

/** `loaded` — импортирована, видна только в админке; `published` — открыта генерации. */
export type CurriculumStatus = "loaded" | "published";

/**
 * Программа в списке. Площадки у неё нет: государственная программа одна
 * на обе (`TEACHER_AI_BRIEF`, раздел 8).
 *
 * `issues_open` — сколько подозрений ещё не разобрано, `errors_open` —
 * сколько из них ошибок. Пока `errors_open` больше нуля, публикация закрыта.
 */
export interface CurriculumProgram {
  id: number;
  subject_code: string;
  subject_title: string;
  lang: CurriculumLang;
  grade_from: number;
  grade_to: number;
  order_number: string;
  order_date: string;
  /** Готовая строка «от 16 сентября 2022 года № 399» — печатается как есть. */
  order_date_text: string;
  /** Приказ в «Әділет»: вычитка — это сверка с первоисточником. */
  source_url: string;
  title: string;
  status: CurriculumStatus;
  imported_at: string;
  published_at: string | null;
  objectives_count: number;
  issues_open: number;
  errors_open: number;
}

export interface CurriculumProgramsPage {
  items: CurriculumProgram[];
  total: number;
  page: number;
  per_page: number;
}

export interface CurriculumSubsection {
  id: number;
  code: string;
  title: string;
  objectives_count: number;
}

/** Раздел программы. Уровня ровно два: раздел и его подразделы. */
export interface CurriculumSection {
  id: number;
  code: string;
  title: string;
  subsections: CurriculumSubsection[];
}

/** Одна программа: та же форма, что в списке, плюс дерево разделов. */
export interface CurriculumProgramCard extends CurriculumProgram {
  sections: CurriculumSection[];
}

/**
 * Цель обучения.
 *
 * `code` — строка, а не число: `1.1.2.3` числом не бывает, а ведущие нули
 * значащие. `quarters` пустой — цели нет в долгосрочном плане приказа, так
 * бывает. `marker` — пометка приказа (`**` — «реализуется частично»), пустая
 * строка, если её нет. `edited_at` — когда текст правили руками.
 */
export interface LearningObjective {
  id: number;
  code: string;
  grade: number;
  index: number;
  marker: string;
  text: string;
  quarters: number[];
  /** Вместо математического знака в тексте осталась метка `[img]`. */
  has_image: boolean;
  edited_at: string | null;
  subsection_code: string;
  subsection_title: string;
}

export interface LearningObjectivesPage {
  items: LearningObjective[];
  total: number;
  page: number;
  per_page: number;
}

/** Правится только текст: код, класс и подраздел заданы приказом. */
export interface LearningObjectivePatch {
  text: string;
}

/**
 * Машинный код проверки. По нему экран подбирает человеческую подсказку:
 * голое сообщение из базы говорит мало.
 */
export type CurriculumIssueKind =
  | "missing_in_ru"
  | "missing_in_kz"
  | "subsection_mismatch"
  | "quarters_mismatch"
  | "count_mismatch"
  | "duplicate_code"
  | "grade_mismatch"
  | "empty_text"
  | "short_text"
  | "code_inside_text"
  | "truncated_text"
  | "image_in_text"
  | "suspicious_symbol"
  | "no_quarter"
  | "numbering_gap"
  | "empty_section"
  | "empty_subsection";

export type CurriculumIssueSeverity = "error" | "warning";

/**
 * Подозрение автопроверки. `objective_code` — `null` у тех, что относятся
 * к программе целиком (`count_mismatch`, `empty_section`).
 *
 * «Разобрано» не исправляет данные — это отметка «я посмотрел, так и должно
 * быть». `resolved_by` — ФИО админа, чтобы через месяц было видно, кто принял
 * решение.
 */
export interface CurriculumIssue {
  id: number;
  kind: CurriculumIssueKind;
  severity: CurriculumIssueSeverity;
  objective_code: string | null;
  message: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CurriculumIssuesPage {
  items: CurriculumIssue[];
  total: number;
  page: number;
  per_page: number;
}
