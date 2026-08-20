"use client";

/**
 * Поле ввода казахстанского номера с маской «+7 (707) 123-45-67».
 *
 * Состояние — 10 цифр номера без кода страны, маска и позиция каретки
 * считаются от них. Backspace и Delete обработаны сами: браузер стёр бы
 * разделитель («)», «-», пробел), маска тут же вернула бы его обратно,
 * и удаление вставало бы намертво перед разделителем.
 *
 * `value`/`onChange` работают уже готовой маской — так значение уходит
 * и на сервер: `phoneFmt` из любого формата достаёт те же цифры обратно,
 * so менять его не нужно. Пустая строка — это пустое поле, а не «+7»
 * по умолчанию: номер WhatsApp, например, необязателен и должен уметь
 * остаться пустым.
 */

import { useLayoutEffect, useRef, useState } from "react";

function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^8/, "7").replace(/^7/, "").slice(0, 10);
}

function maskPhone(d: string): string {
  if (!d.length) return "";
  let out = `+7 (${d.slice(0, 3)}`;
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

/** Позиция каретки так, чтобы слева от неё осталось ровно `count` цифр номера. */
function caretAfterDigits(masked: string, count: number): number {
  const open = masked.indexOf("(");
  if (count <= 0 || open < 0) return masked.length;
  let seen = 0;
  for (let i = open + 1; i < masked.length; i++) {
    if (!/\d/.test(masked[i])) continue;
    if (++seen < count) continue;
    let j = i + 1;
    while (j < masked.length && !/\d/.test(masked[j])) j++;
    return j;
  }
  return masked.length;
}

export function PhoneInput({
  value,
  onChange,
  id,
  className,
  placeholder = "+7 (___) ___-__-__",
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState(() => phoneDigits(value));
  const el = useRef<HTMLInputElement | null>(null);
  const caretAt = useRef<number | null>(null);

  /* Внешний сброс (форма подставила сохранённые данные, отменили правку) —
     подхватываем, только если цифры и правда другие: свой же onChange
     каждый раз возвращает `value`, совпадающий с текущими цифрами,
     и повторно синхронизироваться не с чем */
  const lastValue = useRef(value);
  if (lastValue.current !== value) {
    lastValue.current = value;
    const incoming = phoneDigits(value);
    if (incoming !== digits) setDigits(incoming);
  }

  // Каретку возвращаем синхронно после коммита DOM: React перерисовывает
  // маску целиком и иначе увёл бы её в конец строки.
  useLayoutEffect(() => {
    if (caretAt.current === null) return;
    el.current?.setSelectionRange(caretAt.current, caretAt.current);
    caretAt.current = null;
  });

  const apply = (next: string, keep: number) => {
    caretAt.current = caretAfterDigits(maskPhone(next), keep);
    setDigits(next);
    onChange(maskPhone(next));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const raw = target.value;
    const caret = target.selectionStart ?? raw.length;
    const next = phoneDigits(raw);
    const keep = phoneDigits(raw.slice(0, caret)).length;

    // Ввод, который не добавил цифр (буква, лишний разделитель): состояние
    // не изменится, перерисовки не будет — возвращаем маску в поле руками.
    if (next === digits) {
      const pos = caretAfterDigits(maskPhone(digits), keep);
      target.value = maskPhone(digits);
      target.setSelectionRange(pos, pos);
      return;
    }
    apply(next, keep);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace" && e.key !== "Delete") return;
    const target = e.currentTarget;
    const { selectionStart: from, selectionEnd: to } = target;
    if (from === null || to === null || from !== to) return; // выделение — обычное поведение

    const left = phoneDigits(target.value.slice(0, from)).length;
    const index = e.key === "Backspace" ? left - 1 : left;
    e.preventDefault();
    if (index < 0 || index >= digits.length) return;
    apply(digits.slice(0, index) + digits.slice(index + 1), index);
  };

  return (
    <input
      ref={el}
      id={id}
      className={className}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      value={maskPhone(digits)}
      onChange={onInputChange}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      disabled={disabled}
    />
  );
}
