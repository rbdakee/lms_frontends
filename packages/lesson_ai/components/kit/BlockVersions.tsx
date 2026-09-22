"use client";

/**
 * История блока в шторке: свежие сверху, первая — текущая (`CONTRACT.md`, L4).
 * Откат не переставляет указатель, а пишет новую версию `restored`, поэтому
 * после него историю не перечитываем здесь — шторка закрывается, а блок
 * заменяется ответом сервера.
 */

import { useEffect, useState } from "react";
import { useLoad, type LessonBlock, type LessonBlockVersions, type LessonMaterial } from "@lms/api";
import { Accordion, Badge, Button, Empty, Note, Sheet, Skeleton } from "@lms/ui";
import { dayTime } from "@lms/ui/i18n";
import { IconClock } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../../access";
import { getBlockVersions, restoreBlockVersion } from "../../api";
import { blockTitle } from "../../labels";
import { BlockContent } from "./BlockContent";
import { problemText } from "./problems";

export function BlockVersions({
  material,
  block,
  contentLang,
  onClose,
  onRestored,
  onBusy,
}: {
  material: LessonMaterial;
  block: LessonBlock;
  contentLang: string;
  onClose: () => void;
  onRestored: (b: LessonBlock) => void;
  /** Пока идёт откат, кнопки самого блока тоже заблокированы */
  onBusy: (busy: boolean) => void;
}) {
  const { t, lang } = useLang();
  const toast = useToast();
  const { handle } = useLessonAiAccess();
  const versions = useLoad<LessonBlockVersions>(
    () => getBlockVersions(material.id, block.kind),
    [material.id, block.kind],
  );
  const [restoring, setRestoring] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (versions.error) handle(versions.error);
  }, [versions.error, handle]);

  const restore = async (versionId: number) => {
    setRestoring(versionId);
    setProblem(null);
    onBusy(true);
    try {
      const fresh = await restoreBlockVersion(material.id, block.kind, versionId);
      onRestored(fresh);
      toast(t.laBlockRestored, "success");
      onClose();
    } catch (e) {
      if (handle(e)) return;
      setProblem(problemText(e, t));
    } finally {
      setRestoring(null);
      onBusy(false);
    }
  };

  const items = versions.data?.items ?? [];

  return (
    <Sheet
      open
      wide
      onClose={restoring === null ? onClose : () => undefined}
      title={`${t.laBlockVersions}: ${blockTitle(t, material.kind, block.kind)}`}
    >
      {versions.loading ? (
        <div className="stack g10">
          <Skeleton h={52} r={12} />
          <Skeleton h={52} r={12} />
          <Skeleton h={52} r={12} />
        </div>
      ) : versions.error ? (
        <Empty
          title={t.loadError}
          text={t.loadErrorText}
          action={
            <Button variant="secondary" onClick={versions.reload}>
              {t.retry}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <Empty icon={<IconClock size={38} />} title={t.laVersionsEmpty} />
      ) : (
        <div className="stack g10">
          {problem && <Note kind="danger">{problem}</Note>}
          {items.map((v, i) => (
            <Accordion
              key={v.id}
              defaultOpen={i === 0}
              head={
                <div className="stack g4" style={{ textAlign: "left" }}>
                  <div className="row wrap g6">
                    <strong className="small">{t.laVersionSource[v.source]}</strong>
                    {v.current && <Badge kind="done">{t.laBlockCurrent}</Badge>}
                  </div>
                  <span className="caption muted-3">{dayTime(v.created_at, lang)}</span>
                </div>
              }
            >
              <div className="stack g12">
                {v.instruction && (
                  <p className="small muted pretty" style={{ margin: 0 }}>
                    {t.laVersionAsked(v.instruction)}
                  </p>
                )}
                <div lang={contentLang}>
                  <BlockContent value={v.content} kind={material.kind} />
                </div>
                {!v.current && block.editable && (
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={restoring === v.id}
                      disabled={restoring !== null}
                      onClick={() => restore(v.id)}
                    >
                      {t.laBlockRestore}
                    </Button>
                  </div>
                )}
              </div>
            </Accordion>
          ))}
        </div>
      )}
    </Sheet>
  );
}
