"use client";

/**
 * Экран памяти ассистента — разделы 7 и 10 `ASSISTANT_BRIEF.md`.
 *
 * **Экран только читает индекс, и это решение, а не недоделка.** Ручка одна —
 * `GET /admin/assistant/memory`, и отдаёт она `name` и `description` без тел
 * записей: тело грузится, только когда ассистент сам вызвал `memory_read`.
 * Заводит и удаляет записи он же — инструментами `memory_write`
 * и `memory_delete`, и у каждой записи есть автор. Отдельный редактор
 * в админке этого автора стёр бы, поэтому кнопки строки ведут в чат
 * и сами не делают ничего.
 *
 * Персданных в памяти нет и быть не может: сервер отбивает запись
 * с телефоном, с `+7` и с 12 цифрами подряд (раздел 5). Экран говорит это
 * вслух — иначе здесь начнут искать карточку человека.
 *
 * Порядок блоков серверный по смыслу: общая память сверху, память курсов
 * под ней. Пустой блок не рисуется — заголовок без строк читался бы
 * как «записи есть, но не видны».
 */

import Link from "next/link";
import { useLoad, type AssistantMemoryItem } from "@lms/api";
import { Badge, Button, Empty, LinkButton, Note } from "@lms/ui";
import { IconBook } from "@lms/ui/icons";
import { dayMonth } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { isCourseMemory, loadMemory } from "@/components/admin/assistantApi";

function MemoryRow({ item }: { item: AssistantMemoryItem }) {
  const { t, lang } = useLang();

  return (
    <div className="as-mem-row row between g12 wrap">
      <div className="stack g2 grow" style={{ minWidth: 220 }}>
        <div className="row g8 wrap">
          <strong className="small mono">{item.name}</strong>
          {/* Память общая на обе площадки, и запись курса без самого курса
              через месяц соврёт — отсюда ссылка на курс прямо в строке */}
          {item.course_id !== null && (
            <Link href={`/courses/${item.course_id}`} className="caption">
              #{item.course_id}
            </Link>
          )}
        </div>
        <span className="small muted">{item.description}</span>
        <span className="caption muted-3">{dayMonth(item.updated_at, lang)}</span>
      </div>

      {/* Обе кнопки только уводят в чат: правка памяти живёт инструментами
          ассистента, а не этим экраном */}
      <div className="row g6 wrap">
        <LinkButton href="/assistant" variant="secondary" size="sm">
          {t.asMemoryRead}
        </LinkButton>
        <LinkButton href="/assistant" variant="secondary" size="sm">
          {t.asMemoryDrop}
        </LinkButton>
      </div>
    </div>
  );
}

function MemoryBlock({ title, items }: { title: string; items: AssistantMemoryItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="card card-pad stack g12">
      <h2 className="h3">{title}</h2>
      <div className="stack g10">
        {items.map((m) => (
          <MemoryRow key={m.id} item={m} />
        ))}
      </div>
    </div>
  );
}

export function AssistantMemory(): React.JSX.Element {
  const { t } = useLang();
  const memory = useLoad(loadMemory, []);
  const items = memory.data?.items ?? [];

  const body = () => {
    if (memory.loading) {
      return (
        <div className="card card-pad row center" style={{ minHeight: 180 }}>
          <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
        </div>
      );
    }

    if (memory.error || !memory.data) {
      return (
        <div className="card">
          <Empty
            title={t.loadError}
            text={t.loadErrorText}
            action={
              <Button variant="secondary" onClick={memory.reload}>
                {t.retry}
              </Button>
            }
          />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="card">
          <Empty
            icon={<IconBook size={34} />}
            title={t.asMemoryEmpty}
            text={t.asMemoryEmptyHint}
            action={
              <LinkButton href="/assistant" variant="secondary">
                {t.asAsk}
              </LinkButton>
            }
          />
        </div>
      );
    }

    return (
      <>
        <div className="row between g10 wrap">
          {/* Потолок в сотне записей — свойство индекса: то, что не прочесть
              за один взгляд, индексом быть перестаёт (раздел 7) */}
          <span className="small muted">{t.asMemoryCount(items.length)}</span>
          <Badge kind="neutral">{t.asMemoryEditViaChat}</Badge>
        </div>
        <MemoryBlock title={t.asMemoryGlobal} items={items.filter((m) => !isCourseMemory(m))} />
        <MemoryBlock title={t.asMemoryCourse} items={items.filter(isCourseMemory)} />
      </>
    );
  };

  return (
    <div className="stack g16" style={{ maxWidth: 760 }}>
      <Note kind="muted">
        <div className="stack g6">
          <span>{t.asMemoryEditHint}</span>
          <span className="caption muted-3">{t.asMemoryHint}</span>
        </div>
      </Note>

      {body()}

      <span className="caption muted-3">{t.asMemoryNoPd}</span>

      <style>{`
        .as-mem-row + .as-mem-row { padding-top: 10px; border-top: 1px solid var(--border); }
      `}</style>
    </div>
  );
}
