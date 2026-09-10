"use client";

/**
 * «Память ассистента» — второй пункт группы «Ассистент» в меню (раздел 10
 * `ASSISTANT_BRIEF.md`).
 *
 * Страница тонкая нарочно: всё содержимое живёт в `AssistantMemory`, здесь
 * только каркас и общий для всего ассистента гейт по ключу модели. Пустой
 * `OPENAI_API_KEY` значит «страницы нет», а не «страница отвечает 503» —
 * ровно так же устроен экран чата.
 */

import { Empty } from "@lms/ui";
import { IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAssistantEnabled } from "@/components/admin/assistantApi";
import { AssistantMemory } from "@/components/admin/AssistantMemory";

export default function AssistantMemoryPage() {
  const { t } = useLang();
  const enabled = useAssistantEnabled();

  if (!enabled) {
    return (
      <AdminShell title={t.asMemoryName}>
        <div className="card card-pad">
          <Empty icon={<IconSparkle size={36} />} title={t.asOffTitle} text={t.asOffHint} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={t.asMemoryName} subtitle={t.asMemoryTitle}>
      <AssistantMemory />
    </AdminShell>
  );
}
