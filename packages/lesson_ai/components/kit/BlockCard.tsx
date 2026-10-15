"use client";

/**
 * Один блок материала: просмотр, ручная правка, «переписать» моделью, история.
 *
 * Всё состояние правки — у самого блока: соседние в это время читаются
 * и правятся независимо (`TEACHER_AI_BRIEF`, раздел 4.1, правило 3). Пока
 * над блоком идёт запрос, заблокированы кнопки только этого блока.
 */

import { useState } from "react";
import { isApiError, type LessonBlock, type LessonMaterial } from "@lms/api";
import { Badge, Button, Note } from "@lms/ui";
import { IconClock, IconEdit, IconLock, IconSparkle } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useLessonAiAccess } from "../../access";
import { regenerateBlock, saveBlock } from "../../api";
import { blockTitle, fieldTitle } from "../../labels";
import { BlockContent } from "./BlockContent";
import { BlockEditor } from "./BlockEditor";
import { BlockVersions } from "./BlockVersions";
import { BLOCK_CHANGED, fieldProblems, problemText } from "./problems";

/** Потолок просьбы у сервера (`CONTRACT.md`, L4) */
const INSTRUCTION_MAX = 500;

type Mode = "view" | "edit" | "regen";

export function BlockCard({
  material,
  block,
  contentLang,
  onReplace,
  onStale,
  onEditGoals,
}: {
  material: LessonMaterial;
  block: LessonBlock;
  /** `lang` разметки для текста документа — язык комплекта, не интерфейса */
  contentLang: string;
  /** Сервер вернул новый блок — заменить его в списке */
  onReplace: (b: LessonBlock) => void;
  /** Блок поменяли в другом окне — список надо перечитать */
  onStale: () => void;
  /** Только у блока целей обучения в рабочем месте: открыть шторку выбора целей */
  onEditGoals?: () => void;
}) {
  const { t } = useLang();
  const toast = useToast();
  const { handle } = useLessonAiAccess();
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<unknown>(null);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [history, setHistory] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fields, setFields] = useState<{ field: string; message: string }[]>([]);

  const title = blockTitle(t, material.kind, block.kind);

  const open = (next: Mode) => {
    setProblem(null);
    setFields([]);
    /* Копия, а не ссылка: отмена правки не должна задеть показанный блок */
    if (next === "edit") setDraft(structuredClone(block.content));
    setMode(next);
  };

  const fail = (e: unknown) => {
    if (handle(e)) return;
    if (isApiError(e, BLOCK_CHANGED)) {
      toast(t.laBlockChanged, "info");
      setMode("view");
      onStale();
      return;
    }
    const rows = fieldProblems(e);
    if (rows.length) setFields(rows);
    else setProblem(problemText(e, t));
  };

  const save = async () => {
    setBusy(true);
    setProblem(null);
    setFields([]);
    try {
      const fresh = await saveBlock(material.id, block.kind, draft);
      onReplace(fresh);
      setMode("view");
      toast(t.laBlockSaved, "success");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    setRegenerating(true);
    setProblem(null);
    try {
      const fresh = await regenerateBlock(material.id, block.kind, instruction);
      onReplace(fresh);
      setMode("view");
      setInstruction("");
      toast(t.laBlockRewritten, "success");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
      setRegenerating(false);
    }
  };

  return (
    <section className="card card-pad stack g12" aria-busy={busy}>
      <div className="row wrap between g8" style={{ alignItems: "center" }}>
        <h3 className="h3" style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>
          {title}
        </h3>
        {!block.editable ? (
          <div className="row wrap g6" style={{ alignItems: "center" }}>
            <Badge kind="locked" icon={<IconLock size={12} />}>
              {t.laBlockLocked}
            </Badge>
            {onEditGoals && (
              <Button variant="ghost" size="sm" icon={<IconEdit size={16} />} onClick={onEditGoals}>
                {t.laGoalsEdit}
              </Button>
            )}
          </div>
        ) : (
          mode === "view" && (
            <div className="row wrap g4">
              <Button variant="ghost" size="sm" icon={<IconEdit size={16} />} disabled={busy} onClick={() => open("edit")}>
                {t.laBlockEdit}
              </Button>
              <Button variant="ghost" size="sm" icon={<IconSparkle size={16} />} disabled={busy} onClick={() => open("regen")}>
                {t.laBlockRegenerate}
              </Button>
              <Button variant="ghost" size="sm" icon={<IconClock size={16} />} disabled={busy} onClick={() => setHistory(true)}>
                {t.laBlockVersions}
              </Button>
            </div>
          )
        )}
      </div>

      {mode === "edit" ? (
        <div className="stack g12" lang={contentLang}>
          <BlockEditor value={draft} onChange={setDraft} field={block.kind} disabled={busy} />
        </div>
      ) : (
        <div lang={contentLang} style={regenerating ? { opacity: 0.5 } : undefined}>
          <BlockContent value={block.content} kind={material.kind} />
        </div>
      )}

      {regenerating && (
        <div className="row g8 small muted" role="status">
          <span className="spinner" />
          {t.laBlockRegenerating}
        </div>
      )}

      {fields.length > 0 && (
        <Note kind="danger">
          <div className="stack g4">
            {fields.map((f, i) => (
              <span key={i}>
                {pathLabel(f.field, (k) => fieldTitle(t, k))}
                {f.message}
              </span>
            ))}
          </div>
        </Note>
      )}
      {problem && <Note kind="danger">{problem}</Note>}

      {mode === "edit" && (
        <div className="row wrap g8">
          <Button loading={busy} onClick={save}>
            {t.laBlockSave}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => setMode("view")}>
            {t.cancel}
          </Button>
        </div>
      )}

      {mode === "regen" && (
        <div className="stack g10">
          <label className="field">
            <span className="label">
              {t.laBlockAsk} <span className="label-optional">· {instruction.length}/{INSTRUCTION_MAX}</span>
            </span>
            <textarea
              className="input"
              value={instruction}
              maxLength={INSTRUCTION_MAX}
              placeholder={t.laBlockRegeneratePh}
              disabled={busy}
              style={{ minHeight: 88 }}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </label>
          <div className="row wrap g8">
            <Button icon={<IconSparkle size={16} />} loading={busy} onClick={regenerate}>
              {t.laBlockRegenerate}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setMode("view")}>
              {t.cancel}
            </Button>
          </div>
        </div>
      )}

      {history && (
        <BlockVersions
          material={material}
          block={block}
          contentLang={contentLang}
          onClose={() => setHistory(false)}
          onRestored={(fresh) => {
            setMode("view");
            onReplace(fresh);
          }}
          onBusy={setBusy}
        />
      )}
    </section>
  );
}

/**
 * `content.1.students` → «2 · Ученики: »: учителю нужно, какой пункт поправить,
 * а не адрес поля в JSON. Блок целиком (`content`) — без приставки.
 */
function pathLabel(path: string, title: (k: string) => string): string {
  const parts = path
    .split(".")
    .filter((p, i) => !(i === 0 && p === "content"))
    .map((p) => (/^\d+$/.test(p) ? String(Number(p) + 1) : title(p)));
  return parts.length ? `${parts.join(" · ")}: ` : "";
}
