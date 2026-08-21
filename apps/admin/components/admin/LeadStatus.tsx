"use client";

/**
 * Статус заявки и кнопки связи — раздел 5.26 брифа.
 *
 * Статус меняется одним кликом прямо в строке — `PATCH /admin/leads/{id}`.
 * «Отказ» требует причины (она сохраняется в заметку заявки), «Доступ выдан»
 * ставится только через модалку «Открыть доступ»: перевод в `granted` этим
 * эндпоинтом сервер запрещает — иначе заявка закроется, а курс у учителя
 * так и не появится.
 *
 * «Доступ выдан» — конечный статус: enrollment уже создан, откатывать
 * заявку в другой статус нельзя (сервер это тоже отклоняет). Пикер здесь
 * превращается в обычный пузырёк без выпадающего меню.
 *
 * Выглядит статус пузырьком в тонах StatusBadge, а не селектом с рамкой
 * (просьба владельца 20.08.2026): рамка читалась как поле формы, а длинные
 * подписи в узкой колонке обрезались.
 */

import { useState } from "react";
import { api, isApiError, type AdminLead, type LeadStatus } from "@lms/api";
import { phoneFmt } from "@lms/ui/i18n";
import { useToast } from "@lms/ui/toast";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "./leadsApi";
import { Button, Sheet } from "@lms/ui";
import { IconChevronDown, IconPhone, IconWhatsapp } from "@lms/ui/icons";

/* Тона пузырька — ровно те классы, что StatusBadge даёт этим же статусам:
   один язык цвета на списке, карточке и канбане */
const STATUS_BADGE: Record<LeadStatus, string> = {
  new: "badge-new",
  contacted: "badge-progress",
  paid: "badge-review",
  granted: "badge-accepted",
  declined: "badge-locked",
};

/* Цвет текста пузырька — для стрелки: она лежит рядом с select
   и цвет его класса не наследует */
const STATUS_FG: Record<LeadStatus, string> = {
  new: "var(--primary-pressed)",
  contacted: "#b45309",
  paid: "#b45309",
  granted: "#15803d",
  declined: "var(--text-2)",
};

export function LeadStatusPicker({
  lead,
  onGrant,
  onChanged,
}: {
  lead: AdminLead;
  /** «Доступ выдан» проходит через модалку выдачи доступа */
  onGrant: () => void;
  /** PATCH вернул обновлённую заявку — экран подставляет её на место старой */
  onChanged: (updated: AdminLead) => void;
}) {
  const toast = useToast();
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);

  const change = async (next: LeadStatus) => {
    if (next === lead.status) return;
    if (next === "granted") return onGrant();
    if (next === "declined") return setDeclining(true);
    setBusy(true);
    try {
      const updated = await api<AdminLead>(`/admin/leads/${lead.id}`, {
        method: "PATCH",
        json: { status: next },
      });
      onChanged(updated);
      toast(`Статус заявки: ${LEAD_STATUS_LABEL[next]}`);
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось изменить статус", "error");
    } finally {
      setBusy(false);
    }
  };

  const status = lead.status as LeadStatus;

  /* Доступ уже выдан — дальше статусу деваться некуда, меню не нужно */
  if (status === "granted") {
    return (
      <span
        className={`badge ${STATUS_BADGE.granted}`}
        style={{ color: STATUS_FG.granted, alignSelf: "flex-start" }}
      >
        {LEAD_STATUS_LABEL.granted}
      </span>
    );
  }

  return (
    <>
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          /* Во флекс-колонке (карточки, стеки) обёртку растянуло бы на всю
             ширину — пузырёк оставался бы по содержимому, а стрелка,
             прибитая к правому краю обёртки, уезжала бы далеко от него */
          alignSelf: "flex-start",
          color: STATUS_FG[status],
          opacity: busy ? 0.6 : 1,
        }}
      >
        {/* Настоящий select под видом пузырька: нативное меню бесплатно,
            а appearance: none снимает рамку и системную стрелку */}
        <select
          className={`badge ${STATUS_BADGE[status]}`}
          aria-label="Статус заявки"
          value={status}
          disabled={busy}
          onChange={(e) => void change(e.target.value as LeadStatus)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            border: "none",
            cursor: "pointer",
            padding: "7px 28px 7px 12px",
            fontSize: 13,
            lineHeight: "18px",
          }}
        >
          {LEAD_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={14}
          style={{
            position: "absolute",
            right: 9,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
      </span>

      {declining && (
        <DeclineLeadSheet
          lead={lead}
          onClose={() => setDeclining(false)}
          onDone={(updated) => {
            setDeclining(false);
            onChanged(updated);
          }}
        />
      )}
    </>
  );
}

/* ============ Отказ с обязательной причиной ============ */

/**
 * Открыта, пока отрисована, — как GrantLeadSheet. Своя, а не внутри пикера,
 * потому что в отказ ведут два пути: селект статуса и перенос карточки
 * в колонку «Отказ» на канбане.
 */
export function DeclineLeadSheet({
  lead,
  onClose,
  onDone,
}: {
  lead: AdminLead;
  onClose: () => void;
  onDone: (updated: AdminLead) => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const decline = async () => {
    const note = reason.trim();
    setBusy(true);
    try {
      const updated = await api<AdminLead>(`/admin/leads/${lead.id}`, {
        method: "PATCH",
        json: { status: "declined", note },
      });
      toast(`Заявка закрыта: ${note}`);
      onDone(updated);
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось изменить статус", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      /* Пока запрос идёт, шторка не закрывается: отказ всё равно запишется,
         и человек об этом уже не узнает */
      onClose={() => !busy && onClose()}
      title="Отказ по заявке"
      footer={
        <div className="stack g8">
          <Button
            block
            size="lg"
            variant="danger"
            disabled={!reason.trim()}
            loading={busy}
            onClick={() => void decline()}
          >
            Отметить отказ
          </Button>
          <Button variant="secondary" block disabled={busy} onClick={onClose}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="field">
        <label className="label">Причина отказа</label>
        <textarea
          className="input"
          style={{ minHeight: 90 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: передумала — выбрала курс по инклюзии"
        />
        <span className="hint">Причина обязательна — она сохраняется в заметке заявки</span>
      </div>
    </Sheet>
  );
}

/* ============ Телефон и WhatsApp прямо в строке ============ */

/**
 * На ПК номер — просто текст: кнопке «Позвонить» с десктопа звонить нечем
 * (решение владельца 20.08.2026). На мобильном тот же номер — ссылка `tel:`
 * с трубкой: нажал — позвонил. Классы phone-text/phone-call живут в admin.css.
 */
export function PhoneActions({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, "");
  return (
    <div className="row g8 wrap" style={{ alignItems: "center" }}>
      <span className="small mono nowrap phone-text">{phoneFmt(phone)}</span>
      <a
        href={`tel:${phone}`}
        className="btn btn-secondary btn-sm phone-call"
        style={{ minHeight: 44, paddingInline: 12 }}
      >
        <IconPhone size={16} />
        <span className="mono">{phoneFmt(phone)}</span>
      </a>
      <a
        href={`https://wa.me/${digits}`}
        target="_blank"
        rel="noreferrer"
        className="btn btn-secondary btn-sm"
        style={{ minHeight: 44, paddingInline: 12 }}
      >
        <IconWhatsapp size={16} />
        WhatsApp
      </a>
    </div>
  );
}
