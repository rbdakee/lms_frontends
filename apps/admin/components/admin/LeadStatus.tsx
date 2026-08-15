"use client";

/**
 * Статус заявки и кнопки связи — раздел 5.26 брифа.
 *
 * Статус меняется одним кликом прямо в строке. «Отказ» требует причины,
 * «Доступ выдан» ставится только через модалку «Открыть доступ»: иначе
 * заявка закроется, а курс у учителя так и не появится.
 */

import { useState } from "react";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import type { LeadRow } from "./leads";
import { Button, Sheet } from "@lms/ui";
import { IconPhone, IconWhatsapp } from "@lms/ui/icons";

const ORDER: LeadStatus[] = ["new", "contacted", "paid", "granted", "declined"];

export function LeadStatusPicker({
  lead,
  onGrant,
}: {
  lead: LeadRow;
  /** «Доступ выдан» проходит через модалку выдачи доступа */
  onGrant: () => void;
}) {
  const { setLeadStatus, toast } = useStore();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const change = (next: LeadStatus) => {
    if (next === lead.status) return;
    if (next === "granted") return onGrant();
    if (next === "declined") return setDeclining(true);
    setLeadStatus(lead.id, next);
    toast(`Статус заявки: ${LEAD_STATUS_LABEL[next]}`);
  };

  return (
    <>
      <select
        className="input"
        aria-label="Статус заявки"
        value={lead.status}
        onChange={(e) => change(e.target.value as LeadStatus)}
        style={{ minHeight: 44 }}
      >
        {ORDER.map((s) => (
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
              onClick={() => {
                setLeadStatus(lead.id, "declined");
                setDeclining(false);
                toast(`Заявка закрыта: ${reason.trim()}`);
                setReason("");
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
          <span className="hint">Причина обязательна — она остаётся в истории заявки</span>
        </div>
      </Sheet>
    </>
  );
}

/* ============ «Позвонить» и «WhatsApp» прямо в строке ============ */

export function PhoneActions({ phoneRaw }: { phoneRaw: string }) {
  const digits = phoneRaw.replace(/\D/g, "");
  return (
    <div className="row g6">
      <a
        href={`tel:${phoneRaw}`}
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
