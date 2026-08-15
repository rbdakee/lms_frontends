"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconClose,
  IconInfo,
  IconLock,
  IconStar,
  IconChevronDown,
  IconGraduation,
} from "./icons";

/* ============ Кнопка ============ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({
  variant = "primary",
  block,
  size = "md",
  loading,
  icon,
  iconRight,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${block ? "btn-block" : ""} ${
        size !== "md" ? `btn-${size}` : ""
      } ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

/** Ссылка, выглядящая как кнопка. */
export function LinkButton({
  href,
  variant = "primary",
  block,
  size = "md",
  icon,
  iconRight,
  children,
  className = "",
  onClick,
}: {
  href: string;
  variant?: ButtonVariant;
  block?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`btn btn-${variant} ${block ? "btn-block" : ""} ${
        size !== "md" ? `btn-${size}` : ""
      } ${className}`}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

/* ============ Бейджи ============ */

export type BadgeKind =
  | "new"
  | "progress"
  | "done"
  | "review"
  | "accepted"
  | "rework"
  | "locked"
  | "neutral";

export function Badge({
  kind = "neutral",
  children,
  icon,
}: {
  kind?: BadgeKind;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span className={`badge badge-${kind}`}>
      {icon}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { kind: BadgeKind; icon?: ReactNode }> = {
    Новый: { kind: "new" },
    "В процессе": { kind: "progress" },
    Пройден: { kind: "done", icon: <IconCheck size={13} /> },
    "На проверке": { kind: "review" },
    Зачтено: { kind: "accepted", icon: <IconCheck size={13} /> },
    "На доработку": { kind: "rework" },
    Заблокирован: { kind: "locked", icon: <IconLock size={12} /> },
    Опубликован: { kind: "accepted" },
    Черновик: { kind: "neutral" },
    Скрыт: { kind: "locked" },
    Новая: { kind: "new" },
    Доработка: { kind: "rework" },
    Сдан: { kind: "accepted" },
    "Не сдан": { kind: "rework" },
    /* Статусы набора на курс */
    "Идёт набор": { kind: "done" },
    Запланирован: { kind: "new" },
    "Набор закрыт": { kind: "locked" },
    /* Статусы заявки */
    Связались: { kind: "progress" },
    Оплачено: { kind: "review" },
    "Доступ выдан": { kind: "accepted", icon: <IconCheck size={13} /> },
    Отказ: { kind: "locked" },
  };
  const cfg = map[status] ?? { kind: "neutral" as BadgeKind };
  return (
    <Badge kind={cfg.kind} icon={cfg.icon}>
      {status}
    </Badge>
  );
}

/* ============ Прогресс ============ */

export function Progress({
  value,
  thick,
  done,
}: {
  value: number;
  thick?: boolean;
  done?: boolean;
}) {
  return (
    <div className={`progress ${thick ? "progress-thick" : ""}`}>
      <div
        className={`progress-bar ${done || value >= 100 ? "done" : ""}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ============ Аватар ============ */

export function Avatar({
  initials,
  size = 40,
  tone = "primary",
}: {
  initials: string;
  size?: number;
  tone?: "primary" | "neutral";
}) {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        ...(tone === "neutral" ? { background: "#f1f5f9", color: "#475569" } : {}),
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/* ============ Звёзды ============ */

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`Оценка ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar key={i} size={size} filled={i <= Math.round(value)} strokeWidth={1.4} />
      ))}
    </span>
  );
}

/* ============ Плашка-заметка ============ */

export function Note({
  kind = "info",
  children,
  icon,
}: {
  kind?: "info" | "warning" | "danger" | "success" | "muted";
  children: ReactNode;
  icon?: ReactNode;
}) {
  const defaultIcon =
    kind === "warning" || kind === "danger" ? (
      <IconAlert size={18} />
    ) : kind === "success" ? (
      <IconCheckCircle size={18} />
    ) : (
      <IconInfo size={18} />
    );
  return (
    <div className={`note note-${kind}`}>
      {icon === null ? null : (icon ?? defaultIcon)}
      <div>{children}</div>
    </div>
  );
}

/* ============ Модалка / шторка ============ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`sheet ${wide ? "sheet-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab" />
        {title && (
          <div className="sheet-head">
            <div className="h3">{title}</div>
            <button className="btn btn-icon" onClick={onClose} aria-label="Закрыть">
              <IconClose />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ============ Аккордеон ============ */

export function Accordion({
  head,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
}: {
  head: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = controlledOpen ?? innerOpen;
  return (
    <div className="accordion">
      <button
        className="acc-head"
        onClick={() => (onToggle ? onToggle() : setInnerOpen((v) => !v))}
        aria-expanded={open}
      >
        <div className="grow">{head}</div>
        <IconChevronDown className="acc-chevron" data-open={open} />
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  );
}

/* ============ Пустое состояние ============ */

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-art">{icon ?? <IconGraduation size={38} />}</div>
      <div className="h3">{title}</div>
      {text && (
        <p className="small muted pretty" style={{ maxWidth: 360 }}>
          {text}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ============ Скелетоны ============ */

export function Skeleton({
  w = "100%",
  h = 14,
  r = 8,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  style?: React.CSSProperties;
}) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function CourseCardSkeleton() {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <Skeleton h={0} style={{ aspectRatio: "16 / 9", height: "auto", borderRadius: 0 }} />
      <div className="stack g8 card-pad">
        <Skeleton w="42%" h={12} />
        <Skeleton w="92%" h={17} />
        <Skeleton w="64%" h={13} />
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="card card-pad row g12">
      <Skeleton w={44} h={44} r={12} />
      <div className="stack g8 grow">
        <Skeleton w="58%" h={14} />
        <Skeleton w="34%" h={12} />
      </div>
    </div>
  );
}

/* ============ Обложка курса ============ */

export function Cover({
  tone = "cover-c1",
  children,
  glyph = true,
  style,
}: {
  tone?: string;
  children?: ReactNode;
  glyph?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`cover ${tone}`} style={style}>
      {glyph && (
        <span className="cover-glyph">
          <IconGraduation size={44} strokeWidth={1.4} />
        </span>
      )}
      {children}
    </div>
  );
}

/* ============ Метка языка курса ============ */

export function LangBadge({ langs }: { langs: ("ru" | "kz")[] }) {
  return (
    <span className="badge badge-lang">
      {langs.map((l) => (l === "ru" ? "RU" : "KZ")).join(" · ")}
    </span>
  );
}

/* ============ Хлебные крошки ============ */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="row wrap g6 small muted" aria-label="Хлебные крошки">
      {items.map((it, i) => (
        <span key={i} className="row g6">
          {i > 0 && <span className="muted-3">›</span>}
          {it.href ? (
            <Link href={it.href} style={{ color: "var(--primary)" }}>
              {it.label}
            </Link>
          ) : (
            <span>{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ============ Тип файла ============ */

export function FileTypeChip({ type }: { type: string }) {
  const tone: Record<string, string> = {
    PDF: "#dc2626",
    DOC: "#2563eb",
    DOCX: "#2563eb",
    JPG: "#7c3aed",
    PNG: "#7c3aed",
    MP4: "#0891b2",
  };
  return (
    <span
      className="caption"
      style={{
        background: `${tone[type] ?? "#64748b"}14`,
        color: tone[type] ?? "#64748b",
        padding: "6px 8px",
        borderRadius: 8,
        fontWeight: 800,
        letterSpacing: ".03em",
        flexShrink: 0,
        minWidth: 40,
        textAlign: "center",
      }}
    >
      {type}
    </span>
  );
}

/* ============ Строка файла ============ */

export function FileRow({
  type,
  name,
  size,
  action,
}: {
  type: string;
  name: string;
  size?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="row g10"
      style={{
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--card)",
      }}
    >
      <FileTypeChip type={type} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="small" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {size && <div className="caption muted-3">{size}</div>}
      </div>
      {action}
    </div>
  );
}
