"use client";

/**
 * Ручная правка блока — по форме текущего содержимого (почему не по схеме —
 * в `shape.ts`). Редактор отдаёт блок целиком: так его и принимает
 * `PUT /blocks/{block}`, и так его проверяет сервер той же схемой, что ответ
 * модели. Здесь ничего не валидируется — вторая, отстающая копия правил
 * сервера хуже его `422` с понятным текстом.
 */

import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@lms/ui";
import { IconCheck, IconPlus, IconTrash } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { enumValue, fieldTitle } from "../../labels";
import { ENUMS, emptyLike, isObj, itemForEmptyList, orderedKeys } from "./shape";

interface Props {
  value: unknown;
  onChange: (v: unknown) => void;
  field?: string;
  disabled?: boolean;
}

export function BlockEditor({ value, onChange, field, disabled }: Props) {
  const { t } = useLang();

  if (typeof value === "boolean") {
    return (
      <label className="check" style={{ minHeight: 36 }}>
        <input
          type="checkbox"
          checked={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="check-box" aria-hidden="true">
          <IconCheck size={14} />
        </span>
        <span className="check-label">{value ? t.laYes : t.laNo}</span>
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <input
        className="input"
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ""}
        disabled={disabled}
        style={{ maxWidth: 140 }}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    );
  }

  if (typeof value === "string") {
    const options = field ? ENUMS[field] : undefined;
    if (options) {
      return (
        <select
          className="input"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {/* Значение не из списка оставляем выбираемым — иначе селект молча подменит его первым */}
          {!options.includes(value) && <option value={value}>{value}</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {enumValue(t, o)}
            </option>
          ))}
        </select>
      );
    }
    return <AutoTextarea value={value} onChange={onChange} disabled={disabled} />;
  }

  if (Array.isArray(value)) {
    return <ListEditor items={value} onChange={onChange} field={field} disabled={disabled} />;
  }

  if (isObj(value)) {
    return (
      <div className="stack g12">
        {orderedKeys(value).map((k) => (
          <div key={k} className="field">
            <span className="label">{fieldTitle(t, k)}</span>
            <BlockEditor
              value={value[k]}
              field={k}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, [k]: v })}
            />
          </div>
        ))}
      </div>
    );
  }

  /* `null` и прочее в схемах не встречается; показываем, но не правим */
  return <span className="caption muted-3">{t.laBlockEmpty}</span>;
}

function ListEditor({
  items,
  onChange,
  field,
  disabled,
}: {
  items: unknown[];
  onChange: (v: unknown[]) => void;
  field?: string;
  disabled?: boolean;
}) {
  const { t } = useLang();
  /* Образец запоминается при открытии: убрали все элементы — «Добавить»
     всё равно знает, из чего состоит список */
  const [template] = useState<unknown>(() =>
    items.length ? emptyLike(items[items.length - 1], field) : itemForEmptyList(field),
  );
  const nested = items.some((v) => isObj(v) || Array.isArray(v));

  const add = () =>
    onChange([...items, items.length ? emptyLike(items[items.length - 1], field) : template]);

  return (
    <div className="stack g8">
      {items.map((v, i) => (
        <div
          key={i}
          className={nested ? "card-flat stack g10" : "row g6"}
          style={nested ? { padding: 12 } : { alignItems: "flex-start" }}
        >
          {nested && (
            <div className="row between g8">
              <span className="caption muted-3" style={{ fontWeight: 700 }}>
                {i + 1}
              </span>
              <RemoveButton disabled={disabled} onClick={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          )}
          <div className="grow" style={{ minWidth: 0 }}>
            <BlockEditor
              value={v}
              field={field}
              disabled={disabled}
              onChange={(nv) => onChange(items.map((x, j) => (j === i ? nv : x)))}
            />
          </div>
          {!nested && (
            <RemoveButton disabled={disabled} onClick={() => onChange(items.filter((_, j) => j !== i))} />
          )}
        </div>
      ))}
      <div>
        <Button variant="ghost" size="sm" icon={<IconPlus size={16} />} disabled={disabled} onClick={add}>
          {t.laBlockAdd}
        </Button>
      </div>
    </div>
  );
}

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useLang();
  return (
    <button
      type="button"
      className="btn btn-icon"
      aria-label={t.laBlockRemove}
      title={t.laBlockRemove}
      disabled={disabled}
      onClick={onClick}
    >
      <IconTrash size={16} />
    </button>
  );
}

/** Поле растёт вместе с текстом: шаг урока в три строки не прячется за прокруткой. */
function AutoTextarea({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="input"
      rows={1}
      value={value}
      disabled={disabled}
      style={{ minHeight: 48, resize: "none", overflow: "hidden" }}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
