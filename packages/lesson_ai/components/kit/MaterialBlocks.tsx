"use client";

/**
 * Готовый материал блоками — в порядке формы (`order_index`), как в документе.
 *
 * Блоки берутся отдельной ручкой, а не из `material.content` комплекта: только
 * она знает, какой блок правится (`editable`), и отдаёт порядок — ключи
 * `content` база пересортировывает.
 */

import { useCallback, useEffect } from "react";
import { useLoad, type LessonBlock, type LessonBlocks, type LessonKit, type LessonMaterial } from "@lms/api";
import { Button, Empty, Note, Skeleton } from "@lms/ui";
import { IconLayers } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../../access";
import { getBlocks } from "../../api";
import { ANSWER_KEY_SOURCES, contentLang } from "../../labels";
import { BlockCard } from "./BlockCard";
import { hasAnswers } from "./shape";

export function MaterialBlocks({
  material,
  kit,
  onChanged,
}: {
  material: LessonMaterial;
  kit: LessonKit;
  /**
   * Блок поменялся на сервере. Правка задачи пересобирает ключи с ответами
   * той же транзакцией, поэтому комплект стоит перечитать — у ключей
   * сменилось содержимое и `updated_at`.
   */
  onChanged?: () => void;
}) {
  const { t } = useLang();
  const toast = useToast();
  const { handle } = useLessonAiAccess();
  const blocks = useLoad<LessonBlocks>(() => getBlocks(material.id), [material.id]);
  const { setData } = blocks;

  useEffect(() => {
    if (blocks.error) handle(blocks.error);
  }, [blocks.error, handle]);

  const hasKeys = kit.materials.some((m) => m.kind === "answer_key");

  const replace = useCallback(
    (fresh: LessonBlock) => {
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((b) => (b.kind === fresh.kind ? fresh : b)) } : prev,
      );
      if (hasKeys && ANSWER_KEY_SOURCES.includes(material.kind) && hasAnswers(fresh.content)) {
        toast(t.laKeysRebuilt, "info");
      }
      onChanged?.();
    },
    [setData, hasKeys, material.kind, toast, t, onChanged],
  );

  if (blocks.loading) {
    return (
      <div className="stack g12">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card card-pad stack g10">
            <Skeleton w="45%" h={18} />
            <Skeleton w="100%" h={14} />
            <Skeleton w="85%" h={14} />
          </div>
        ))}
      </div>
    );
  }

  if (blocks.error) {
    return (
      <div className="card">
        <Empty
          title={t.laBlocksError}
          text={t.loadErrorText}
          action={
            <Button variant="secondary" onClick={blocks.reload}>
              {t.retry}
            </Button>
          }
        />
      </div>
    );
  }

  const items = [...(blocks.data?.items ?? [])].sort((a, b) => a.order_index - b.order_index);

  if (items.length === 0) {
    return (
      <div className="card">
        <Empty icon={<IconLayers size={38} />} title={t.laBlocksEmpty} />
      </div>
    );
  }

  const lang = contentLang(kit.lang);

  return (
    <div className="stack g12">
      {material.kind === "answer_key" && <Note kind="info">{t.laKeysHint}</Note>}
      {items.map((b) => (
        <BlockCard
          key={b.kind}
          material={material}
          block={b}
          contentLang={lang}
          onReplace={replace}
          onStale={blocks.reload}
        />
      ))}
    </div>
  );
}
