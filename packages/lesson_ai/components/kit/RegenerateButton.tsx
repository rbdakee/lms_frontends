"use client";

/**
 * «Пересобрать урок» в шапке панели материалов: все материалы заново с текущими
 * целями. Решение необратимо по стоимости (комплект из суточного лимита, несколько
 * минут сборки), поэтому перед запуском — подтверждение шторкой, как в тесте,
 * а не `window.confirm`. Пока комплект собирается, кнопки нет: сервер ответил бы 409.
 */

import { useState } from "react";
import { NETWORK_ERROR, isApiError } from "@lms/api";
import { Button, Note, Sheet } from "@lms/ui";
import { IconRefresh } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../../access";
import { regenerateKit } from "../../api";

export function RegenerateButton({
  kitId,
  generating,
  onStarted,
}: {
  kitId: number;
  generating: boolean;
  /** Пересборка поставлена (или комплект уже собирается): перечитать чат и комплект */
  onStarted: () => void;
}) {
  const { t } = useLang();
  const toast = useToast();
  const { handle } = useLessonAiAccess();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (generating) return null;

  const go = async () => {
    setBusy(true);
    try {
      await regenerateKit(kitId);
      setOpen(false);
      onStarted();
    } catch (e) {
      if (handle(e)) return;
      setOpen(false);
      if (isApiError(e) && e.status === 409) {
        /* Комплект уже собирается — экран просто отстал */
        onStarted();
      } else if (isApiError(e) && e.status === 429) {
        toast(e.message, "error");
      } else if (isApiError(e) && e.code === NETWORK_ERROR) {
        toast(t.loadErrorText, "error");
      } else {
        toast(t.laRegenerateError, "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" icon={<IconRefresh size={16} />} onClick={() => setOpen(true)}>
        {t.laRegenerate}
      </Button>
      <Sheet
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={t.laRegenerateTitle}
        footer={
          <div className="stack g8">
            <Button block size="lg" loading={busy} onClick={() => void go()}>
              {t.laRegenerateGo}
            </Button>
            <Button block variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
              {t.laRegenerateCancel}
            </Button>
          </div>
        }
      >
        <Note kind="warning">{t.laRegenerateText}</Note>
      </Sheet>
    </>
  );
}
