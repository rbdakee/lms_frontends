"use client";

/**
 * Статус заявки и кнопки связи — раздел 5.26 брифа.
 *
 * Статус меняется одним кликом прямо в строке — `PATCH /admin/leads/{id}`.
 * «Отказ» требует причины (она сохраняется в заметку заявки), «Доступ выдан»
 * ставится только через модалку «Открыть доступ»: перевод в `granted` этим
 * эндпоинтом сервер запрещает — иначе заявка закроется, а курс у учителя
 * так и не появится.
 */

import { useState } from "react";
import { api, isApiError, type AdminLead, type LeadStatus } from "@lms/api";
import { useStore } from "@lms/prototype";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "./leadsApi";
import { Button, Sheet } from "@lms/ui";
import { IconPhone, IconWhatsapp } from "@lms/ui/icons";

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
  const { toast } = useStore();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const patch = async (json: { status: LeadStatus; note?: string }) => {
    setBusy(true);
    try {
      const updated = await api<AdminLead>(`/admin/leads/${lead.id}`, {
        method: "PATCH",
        json,
      });
      onChanged(updated);
      return updated;
    } catch (e) {
      toast(isApiError(e) ? e.message : "Не удалось изменить статус", "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const change = async (next: LeadStatus) => {
    if (next === lead.status) return;
    if (next === "granted") return onGrant();
    if (next === "declined") return setDeclining(true);
    const updated = await patch({ status: next });
    if (updated) toast(`Статус заявки: ${LEAD_STATUS_LABEL[next]}`);
  };

  return (
    <>
      <select
        className="input"
        aria-label="Статус заявки"
        value={lead.status}
        disabled={busy}
        onChange={(e) => void change(e.target.value as LeadStatus)}
        style={{ minHeight: 44 }}
      >
        {LEAD_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <Sheet
        open={declining}
        onClose={() => setDeclining(false)}
        title="Отказ по заявке"
        footer={
          <div className="stack g8">
            <Button
              block
              size="lg"
              variant="danger"
              disabled={!reason.trim()}
              loading={busy}
              onClick={async () => {
                const updated = await patch({ status: "declined", note: reason.trim() });
                if (updated) {
                  setDeclining(false);
                  toast(`Заявка закрыта: ${reason.trim()}`);
                  setReason("");
                }
              }}
            >
              Отметить отказ
            </Button>
            <Button variant="secondary" block onClick={() => setDeclining(false)}>
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
    </>
  );
}

/* ============ «Позвонить» и «WhatsApp» прямо в строке ============ */

export function PhoneActions({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, "");
  return (
    <div className="row g6">
      <a
        href={`tel:${phone}`}
        className="btn btn-secondary btn-sm"
        style={{ minHeight: 44, paddingInline: 12 }}
      >
        <IconPhone size={16} />
        Позвонить
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
