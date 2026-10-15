"use client";

/**
 * Общее для списка «/curriculum» и программы «/curriculum/:id»: одинаково
 * подписанные состояние программы и важность подозрения, человеческая
 * подсказка к машинному коду проверки и показ текста цели с меткой `[img]`.
 *
 * Справочник учебной программы — ядро «Жоспара» (`TEACHER_AI_BRIEF`,
 * решение владельца 19.09.2026; в коде и в базе продукт зовётся `lesson_ai`).
 * Импорт приказа идёт в две ступени: машинный разбор → сверка здесь →
 * публикация.
 *
 * Персональных данных учителей в этих экранах нет вовсе: справочник —
 * государственный документ. Единственное живое имя — ФИО админа
 * в `resolved_by`, и оно приходит с сервера готовой строкой.
 */

import type { CurriculumIssueKind, CurriculumIssueSeverity, CurriculumStatus } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { Badge, type BadgeKind } from "@lms/ui";
import { IconAlert, IconInfo } from "@lms/ui/icons";

type Dict = ReturnType<typeof useLang>["t"];

/** Метка, которой разбор заменил не прочитавшийся математический знак. */
export const IMG_MARK = "[img]";

/**
 * Знаки, которые приказ вставляет картинками, — их и вписывают руками.
 * Список из контракта (`PATCH /admin/curriculum/objectives/{id}`): другие
 * знаки математика 1–4 класса не требует, формул в ней нет (раздел 2 брифа).
 */
export const MATH_SIGNS = ["≠", "∩", "∪", "∅", "≥"] as const;

/* `Record<…, …>` нарочно: новое состояние или новый вид проверки в контракте
   сломает typecheck, а не пропадёт с экрана молча. */
const STATUS_KIND: Record<CurriculumStatus, BadgeKind> = {
  loaded: "new",
  published: "accepted",
};

export function CurriculumStatusBadge({ status }: { status: CurriculumStatus }) {
  const { t } = useLang();
  return (
    <Badge kind={STATUS_KIND[status]}>
      {status === "published" ? t.curStPublished : t.curStLoaded}
    </Badge>
  );
}

/**
 * Ошибка и предупреждение — разные вещи, и разница должна читаться
 * с одного взгляда: ошибка держит публикацию, предупреждение — нет.
 */
export function SeverityBadge({ severity }: { severity: CurriculumIssueSeverity }) {
  const { t } = useLang();
  return severity === "error" ? (
    <Badge kind="rework" icon={<IconAlert size={13} />}>
      {t.curSeverityError}
    </Badge>
  ) : (
    <Badge kind="progress" icon={<IconInfo size={13} />}>
      {t.curSeverityWarning}
    </Badge>
  );
}

/**
 * Подсказка к виду подозрения: что это значит и что с этим делать.
 * Сообщение из базы («[ru] в подразделе 5.2 у 4 класса пропущены номера: 2»)
 * говорит, что нашла машина, но не говорит, ошибка это или норма.
 *
 * `often_ok` — те три вида, которые чаще оказываются свойством самого
 * приказа, а не ошибкой разбора: цель без четверти, дыра в нумерации,
 * оборванная формулировка (раздел 3.1 брифа). Их не чинят — их помечают
 * разобранными, и человека не надо пугать красным там, где всё в порядке.
 */
interface IssueHint {
  title: (t: Dict) => string;
  hint: (t: Dict) => string;
  often_ok?: true;
}

const KIND: Record<CurriculumIssueKind, IssueHint> = {
  missing_in_ru: { title: (t) => t.curKindMissingRu, hint: (t) => t.curHintMissingRu },
  missing_in_kz: { title: (t) => t.curKindMissingKz, hint: (t) => t.curHintMissingKz },
  subsection_mismatch: { title: (t) => t.curKindSubsection, hint: (t) => t.curHintSubsection },
  quarters_mismatch: { title: (t) => t.curKindQuarters, hint: (t) => t.curHintQuarters },
  count_mismatch: { title: (t) => t.curKindCount, hint: (t) => t.curHintCount },
  duplicate_code: { title: (t) => t.curKindDuplicate, hint: (t) => t.curHintDuplicate },
  grade_mismatch: { title: (t) => t.curKindGrade, hint: (t) => t.curHintGrade },
  empty_text: { title: (t) => t.curKindEmptyText, hint: (t) => t.curHintEmptyText },
  short_text: { title: (t) => t.curKindShortText, hint: (t) => t.curHintShortText },
  code_inside_text: { title: (t) => t.curKindCodeInside, hint: (t) => t.curHintCodeInside },
  truncated_text: {
    title: (t) => t.curKindTruncated,
    hint: (t) => t.curHintTruncated,
    often_ok: true,
  },
  image_in_text: { title: (t) => t.curKindImage, hint: (t) => t.curHintImage },
  suspicious_symbol: {
    title: (t) => t.curKindSymbol,
    hint: (t) => t.curHintSymbol,
  },
  no_quarter: { title: (t) => t.curKindNoQuarter, hint: (t) => t.curHintNoQuarter, often_ok: true },
  numbering_gap: { title: (t) => t.curKindGap, hint: (t) => t.curHintGap, often_ok: true },
  empty_section: { title: (t) => t.curKindEmptySection, hint: (t) => t.curHintEmptySection },
  empty_subsection: {
    title: (t) => t.curKindEmptySubsection,
    hint: (t) => t.curHintEmptySubsection,
  },
};

export function useIssueHint(kind: CurriculumIssueKind) {
  const { t } = useLang();
  const cfg = KIND[kind];
  return { title: cfg.title(t), hint: cfg.hint(t), often_ok: cfg.often_ok === true };
}

/**
 * Текст цели: метка `[img]` подсвечена, потому что ради неё текст и правят.
 * Ровные строки читать глазами, чтобы найти одну кривую, — не работа
 * человека (раздел 3.1 брифа).
 */
export function ObjectiveText({ text }: { text: string }) {
  const parts = text.split(IMG_MARK);
  return (
    <span className="pretty">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <mark className="cur-img">{IMG_MARK}</mark>}
        </span>
      ))}
    </span>
  );
}
