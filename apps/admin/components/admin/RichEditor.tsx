"use client";

/**
 * Визуальный редактор содержимого — `body` урока (5.18) и `statement`
 * задания (5.20). Оба поля уходят на сервер как `{ "html": "…" }`, поэтому
 * панель кнопок обязана делать разметку, а не изображать её.
 *
 * Новых зависимостей ради этого не заводим: `contentEditable`
 * и `document.execCommand` дают ровно тот набор, что нарисован в брифе
 * и разрешён белым списком сервера — жирный, курсив, заголовок, список,
 * цитата, ссылка, таблица.
 *
 * Чистит разметку сервер и молча: вставка из Word теряет `<span>`, `style`
 * и `<script>` без ошибки. Поэтому после сохранения экран показывает
 * пришедший `html`, а не свой — иначе автор не увидит, что его разметку
 * почистили.
 */

import { useEffect, useRef, useState } from "react";
import {
  IconBold,
  IconHeading,
  IconItalic,
  IconLink,
  IconList,
  IconQuote,
  IconTable,
} from "@lms/ui/icons";

/**
 * Невидимые пробелы, которых не видит `trim()`: для JS это обычные символы,
 * а на экране — такая же пустота. Тот же список вычищает сервер
 * (`domain/content.py`).
 */
const INVISIBLE = /[\u200b\u200c\u200d\ufeff]/g;

/**
 * Именованные сущности, которые раскрываются в пробел. Числовые сервер
 * раскрывает все подряд, а из именованных пробел дают только эти: остальные
 * (`&amp;`, `&quot;`) пустоты не дают ни раскрытыми, ни как есть.
 */
const NAMED_SPACES: Record<string, string> = {
  nbsp: "\u00a0",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  zwnj: "\u200c",
  zwj: "\u200d",
};

/**
 * Пусто ли содержимое — тем же правилом, что и у сервера (`is_blank_html`):
 * снять теги, раскрыть сущности, выбросить невидимые пробелы, обрезать края.
 * Разойтись здесь дорого в обе стороны: экран считает поле заполненным,
 * а сервер отбивает текстовый урок `422`; либо заметку под видео нечем
 * стереть — вместо `null` уезжает строка с одним невидимым символом.
 */
export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);|&#x([0-9a-f]+);|&([a-z]+\d*);/gi, (whole, dec, hex, name) => {
      if (dec === undefined && hex === undefined) {
        return NAMED_SPACES[String(name).toLowerCase()] ?? whole;
      }
      const code = Number(dec ?? `0x${hex}`);
      /* Число вне Юникода — не сущность, а просто текст: пустоты он не даёт */
      return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    })
    .replace(INVISIBLE, "");
  return text.trim() === "";
}

/** `html` из ответа сервера: в схеме это свободный объект, ключ один. */
export function htmlOf(value: { [key: string]: unknown } | null | undefined): string {
  const html = value?.html;
  return typeof html === "string" ? html : "";
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Заготовка таблицы: пустой абзац следом — чтобы было куда писать после неё */
const TABLE_HTML =
  "<table><thead><tr><th>Заголовок</th><th>Заголовок</th></tr></thead>" +
  "<tbody><tr><td>Ячейка</td><td>Ячейка</td></tr>" +
  "<tr><td>Ячейка</td><td>Ячейка</td></tr></tbody></table><p><br></p>";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Поле подсвечено красным: сервер вернул по нему `422` */
  invalid?: boolean;
  minHeight?: number;
  ariaLabel: string;
}

export function RichEditor({
  value,
  onChange,
  placeholder,
  invalid,
  minHeight = 170,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  /**
   * Последнее, что редактор сам отдал наружу. Пока значение возвращается
   * тем же, DOM не трогаем — иначе каретка прыгала бы в начало на каждом
   * набранном символе. Пришло другое (сервер почистил разметку) — DOM
   * переписывается целиком.
   */
  const emitted = useRef<string | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  /* Последнее выделение внутри редактора. Панель работает только с ним:
     клик по кнопке уводит фокус, а выделение в соседнем поле формы — это
     не текст урока, и команда редактора попасть в него не должна */
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    /* Иначе жирный приезжает как `<span style="font-weight:700">`, а `span`
       и `style` сервер вырезает — начертание пропало бы вместе с ними */
    try {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      /* старые движки команду не знают — разметка выйдет грубее, но выйдет */
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === emitted.current) return;
    emitted.current = value;
    el.innerHTML = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    emitted.current = el.innerHTML;
    onChange(el.innerHTML);
  };

  const insideEditor = (node: Node | null | undefined) =>
    !!node && !!ref.current && ref.current.contains(node);

  /** Запоминаем выделение, только пока оно в редакторе. */
  const rememberSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (insideEditor(range.commonAncestorContainer)) savedRange.current = range.cloneRange();
  };

  /** Фокус в редактор и то выделение, которое было в нём до клика по панели. */
  const focusEditor = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const current = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (current && insideEditor(current.commonAncestorContainer)) return;
    const saved = savedRange.current;
    if (saved && insideEditor(saved.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(saved);
      return;
    }
    /* Редактора ещё не касались — или его разметку переписал ответ сервера,
       и запомненный диапазон висит на выброшенных узлах. Пишем в конец:
       каретка в начале вставила бы ссылку перед готовым текстом */
    const end = document.createRange();
    end.selectNodeContents(el);
    end.collapse(false);
    sel.removeAllRanges();
    sel.addRange(end);
  };

  const syncActive = () => {
    rememberSelection();
    try {
      const block = String(document.queryCommandValue("formatBlock")).toLowerCase();
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        list: document.queryCommandState("insertUnorderedList"),
        h2: block === "h2",
        quote: block === "blockquote",
      });
    } catch {
      setActive({});
    }
  };

  const exec = (cmd: string, arg?: string) => {
    focusEditor();
    document.execCommand(cmd, false, arg);
    emit();
    syncActive();
  };

  /**
   * Заголовок и цитата — переключатели: повторный клик возвращает абзац.
   * Текущий блок читается уже после возврата фокуса — иначе панель смотрела бы
   * на выделение в соседнем поле формы, а меняла разметку урока.
   */
  const block = (tag: "h2" | "blockquote") => {
    focusEditor();
    const cur = String(document.queryCommandValue("formatBlock")).toLowerCase();
    exec("formatBlock", cur === tag ? "<p>" : `<${tag}>`);
  };

  const openLink = () => {
    /* Кнопка панели фокус не забирает, выделение ещё живо — но берём его,
       только если оно в редакторе */
    rememberSelection();
    setLinkUrl("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const raw = linkUrl.trim();
    if (!raw) return;
    /* У ссылки сервер оставляет только http, https и mailto — адрес без схемы
       он вырежет вместе со ссылкой */
    const href = /^(https?:|mailto:)/i.test(raw) ? raw : `https://${raw}`;
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${escapeHtml(href)}">${escapeHtml(raw)}</a>`,
      );
    } else {
      document.execCommand("createLink", false, href);
    }
    setLinkOpen(false);
    emit();
    syncActive();
  };

  const buttons: { key: string; icon: typeof IconBold; label: string; run: () => void }[] = [
    { key: "bold", icon: IconBold, label: "Жирный", run: () => exec("bold") },
    { key: "italic", icon: IconItalic, label: "Курсив", run: () => exec("italic") },
    { key: "h2", icon: IconHeading, label: "Заголовок", run: () => block("h2") },
    {
      key: "list",
      icon: IconList,
      label: "Список",
      run: () => exec("insertUnorderedList"),
    },
    { key: "quote", icon: IconQuote, label: "Цитата", run: () => block("blockquote") },
    { key: "link", icon: IconLink, label: "Ссылка", run: openLink },
    {
      key: "table",
      icon: IconTable,
      label: "Таблица",
      run: () => exec("insertHTML", TABLE_HTML),
    },
  ];

  return (
    <div className={`rich${invalid ? " rich-invalid" : ""}`}>
      <div className="rich-bar">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className="btn btn-icon rich-btn"
            style={{ minHeight: 34, width: 34 }}
            data-active={active[btn.key] === true}
            aria-label={btn.label}
            title={btn.label}
            /* Кнопка не должна забирать фокус: иначе выделение в тексте
               пропадёт раньше, чем команда до него доберётся */
            onMouseDown={(e) => e.preventDefault()}
            onClick={btn.run}
          >
            <btn.icon size={17} />
          </button>
        ))}
      </div>

      {linkOpen && (
        <div className="rich-link">
          <input
            className="input"
            style={{ height: 38 }}
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://… или mailto:…"
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={applyLink}>
            Вставить
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setLinkOpen(false)}
          >
            Отмена
          </button>
        </div>
      )}

      <div
        ref={ref}
        className="rich-body"
        style={{ minHeight }}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-empty={isEmptyHtml(value)}
        data-placeholder={placeholder ?? ""}
        onInput={emit}
        onBlur={emit}
        onKeyUp={syncActive}
        onMouseUp={syncActive}
        onFocus={syncActive}
      />

      <style>{`
        .rich {
          border: 1px solid var(--border);
          border-radius: var(--r-input);
          background: var(--card);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .rich:focus-within { border-color: var(--primary); box-shadow: var(--ring-primary); }
        .rich-invalid { border-color: var(--danger); }
        .rich-invalid:focus-within { border-color: var(--danger); box-shadow: var(--ring-danger); }
        .rich-bar {
          display: flex; flex-wrap: wrap; gap: 4px;
          padding: 6px; border-bottom: 1px solid var(--border);
        }
        .rich-btn[data-active="true"] { background: var(--primary); border-color: var(--primary); color: var(--text-on-fill); }
        .rich-link {
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
          padding: 8px; border-bottom: 1px solid var(--border);
        }
        .rich-link .input { flex: 1 1 220px; }
        .rich-body { position: relative; padding: 12px 14px; font-size: 16px; line-height: 26px; outline: none; }
        /* Подсказка лежит поверх пустого поля: в contentEditable пустота — это
           «<p><br></p>», под :empty она не подходит */
        .rich-body[data-empty="true"]::before {
          content: attr(data-placeholder);
          position: absolute;
          top: 12px; left: 14px; right: 14px;
          color: var(--text-3);
          pointer-events: none;
        }
        .rich-body > *:first-child { margin-top: 0; }
        .rich-body h2 { font-size: 19px; line-height: 26px; font-weight: 700; margin: 14px 0 6px; }
        .rich-body p { margin: 0 0 10px; }
        .rich-body ul, .rich-body ol { margin: 0 0 10px; padding-left: 22px; }
        .rich-body blockquote {
          margin: 0 0 10px; padding: 4px 0 4px 12px;
          border-left: 3px solid var(--border-strong); color: var(--text-2);
        }
        .rich-body a { color: var(--primary); text-decoration: underline; }
        .rich-body table { border-collapse: collapse; width: 100%; margin: 0 0 10px; }
        .rich-body th, .rich-body td {
          border: 1px solid var(--border); padding: 6px 8px; text-align: left; font-size: 15px;
        }
        .rich-body th { background: var(--bg); font-weight: 700; }
      `}</style>
    </div>
  );
}
