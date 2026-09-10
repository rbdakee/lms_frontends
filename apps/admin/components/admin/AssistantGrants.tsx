"use client";

/**
 * Чипы допусков в шапке чата — раздел 5 `ASSISTANT_BRIEF.md`.
 *
 * Три вещи, которые легко потерять при правке этого файла:
 *
 * 1. **Имя подставляет браузер, а не ответ ассистента.** В допуске приходит
 *    один `subject_user_id`: имён ассистент не видит вовсе, у него везде
 *    стоит `Учитель #418`. Живое имя берёт `useTeacherName` обычной админской
 *    ручкой `/admin/teachers/{id}`, право на которую у админа и так есть.
 *    Отсюда же следует, что имя приезжает позже чипа — до тех пор стоит маска,
 *    а не пустая подпись.
 * 2. **Допуск — это не подтверждение.** Чип «чтение и правка» говорит
 *    «с этим человеком можно работать», а не «изменение сделано»: конкретную
 *    правку подтверждает кнопка «Выполнить» в ленте. Поэтому под чипами стоит
 *    пояснение, а не только подпись уровня.
 * 3. **Пустой список — ничего.** Полоса-заголовок без чипов читалась бы как
 *    «допуски есть, но их не видно».
 *
 * Своих отступов и каймы у блока нет нарочно: он встаёт в шапку чата,
 * а рамку рисует она.
 */

import type { AssistantGrant } from "@lms/api";
import { IconClose } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { teacherMask, useTeacherName } from "@/components/admin/assistantApi";

/**
 * «Сериков Асхат Маратович» → «Сериков А. М.»
 *
 * Чипов в шапке бывает несколько, и полное ФИО каждого их не умещает.
 * Маску сокращать нельзя — «Учитель #418» превратился бы в «Учитель #.»,
 * поэтому её отсеивает вызывающая сторона, а не эта функция.
 */
function shortFio(full: string): string {
  const [last, ...rest] = full.split(/\s+/).filter(Boolean);
  if (!last) return full;
  return [last, ...rest.map((w) => `${w[0]}.`)].join(" ");
}

function GrantChip({
  grant,
  onRevoke,
}: {
  grant: AssistantGrant;
  onRevoke: (userId: number) => void;
}) {
  const { t } = useLang();
  const id = grant.subject_user_id;
  const name = useTeacherName(id);
  /* Имя ещё не приехало или человек не нашёлся — остаётся маска ассистента */
  const who = name === teacherMask(id) ? name : shortFio(name);
  const level = grant.level === "write" ? t.asGrantWrite : t.asGrantRead;

  return (
    <span className="chip as-grant-chip">
      <span>{t.asGrantChip(who, level)}</span>
      <button
        type="button"
        className="as-grant-x"
        onClick={() => onRevoke(id)}
        aria-label={t.asGrantRevoke}
        title={t.asGrantRevoke}
      >
        <IconClose size={13} />
      </button>
    </span>
  );
}

export function AssistantGrants({
  grants,
  onRevoke,
}: {
  grants: AssistantGrant[];
  onRevoke: (userId: number) => void;
}): React.JSX.Element | null {
  const { t } = useLang();
  if (grants.length === 0) return null;

  return (
    <div className="stack g6">
      <div className="row g8 wrap">
        <span className="caption muted-3">{t.asGrantsTitle}</span>
        {grants.map((g) => (
          <GrantChip key={g.subject_user_id} grant={g} onRevoke={onRevoke} />
        ))}
      </div>
      {/* Читается вместе с чипом: открытая дверь — ещё не сделанный шаг */}
      <span className="caption muted-3">{t.asGrantsHint}</span>

      <style>{`
        /* Чип допуска не фильтр — по нему не кликают, кликают по крестику */
        .as-grant-chip { cursor: default; gap: 8px; }
        .as-grant-chip:hover { border-color: var(--border); }
        .as-grant-x { display: inline-flex; align-items: center; justify-content: center;
          width: 20px; height: 20px; margin-right: -4px; padding: 0; border: none;
          border-radius: 999px; background: transparent; color: var(--text-3);
          cursor: pointer; }
        .as-grant-x:hover { background: var(--surface-muted); color: var(--danger); }
      `}</style>
    </div>
  );
}
