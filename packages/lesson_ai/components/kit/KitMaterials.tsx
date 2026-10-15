"use client";

/**
 * Материалы комплекта: вкладки по видам, шапка выбранного, блоки, просмотр
 * и скачивание. Один и тот же вид — на странице комплекта и в правой панели
 * рабочего места.
 *
 * `flash` — правка из чата: панель переключается на изменённый материал,
 * а он перечитывает и подсвечивает блок (`MaterialBlocks`).
 */

import { useEffect, useState } from "react";
import type { LessonKit, LessonMaterial, LessonMaterialKind } from "@lms/api";
import { Button } from "@lms/ui";
import { IconEye } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { KIND_ORDER, kindTitle } from "../../labels";
import { useWide } from "../chat/util";
import { DownloadButton } from "../DownloadButton";
import { PreviewSheet } from "../PreviewSheet";
import { MaterialBlocks } from "./MaterialBlocks";
import { MaterialHeader, MaterialStatusIcon } from "./MaterialHeader";
import { MaterialPending } from "./MaterialPending";

const STATUS_COLOR: Record<LessonMaterial["status"], string> = {
  queued: "var(--text-3)",
  generating: "var(--warning-text)",
  ready: "var(--success)",
  failed: "var(--danger)",
};

/** Что поправил помощник: материал, блок и номер правки. Без материала и блока —
    сменились цели урока: перечитать комплект целиком, подсвечивать нечего. */
export interface MaterialFlash {
  material_id: number | null;
  block: string | null;
  nonce: number;
}

/**
 * Материал ждёт плана урока: соседи строятся по нему (бриф, 4.2), ключи —
 * по заданиям. Учителю важно видеть, что «в очереди» — это не зависание.
 */
function planPending(kit: LessonKit, m: LessonMaterial): boolean {
  if (m.status !== "queued" || m.kind === "lesson_plan") return false;
  const plan = kit.materials.find((x) => x.kind === "lesson_plan");
  return plan !== undefined && (plan.status === "queued" || plan.status === "generating");
}

export function KitMaterials({
  kit,
  onChanged,
  flash,
  onEditGoals,
  fill = false,
}: {
  kit: LessonKit;
  onChanged: () => void;
  flash?: MaterialFlash | null;
  /** Есть только в рабочем месте: шторка выбора целей живёт в чате */
  onEditGoals?: () => void;
  /**
   * Панель рабочего места: высота задана снаружи, вкладки и шапка материала стоят
   * на месте, а прокручиваются только блоки — одна прокрутка на материал. На странице
   * комплекта (`false`) прокручивается сама страница.
   */
  fill?: boolean;
}) {
  const { t } = useLang();
  /* Пока панель не на весь экран, подписи у кнопок есть; уже панели и телефону — значки */
  const roomy = useWide();
  const materials = [...kit.materials].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );
  const [selected, setSelected] = useState<LessonMaterialKind | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const current = materials.find((m) => m.kind === selected) ?? materials[0];

  /* Помощник правил другой материал — идём за ним, иначе правки не видно */
  const flashNonce = flash?.nonce;
  const flashMaterial = flash?.material_id;
  useEffect(() => {
    if (flashNonce === undefined) return;
    const target = kit.materials.find((m) => m.id === flashMaterial);
    if (target) setSelected(target.kind);
    // Вкладку переключает только новая правка, а не каждое обновление комплекта
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashNonce, flashMaterial]);

  if (!current) return null;

  const side = fill ? "0 16px" : undefined;
  return (
    <section
      className={fill ? undefined : "stack g16"}
      style={fill ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : undefined}
    >
      {/* Вкладки прокручиваются вбок: семь видов на 390px в строку не встают */}
      <div style={{ padding: side, flexShrink: 0 }}>
      <div className="tabs" role="tablist" aria-label={t.laKitMaterials}>
        {materials.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === current.id}
            data-active={m.id === current.id}
            title={t.laMaterialStatus[m.status]}
            onClick={() => setSelected(m.kind)}
          >
            <span className="row g6" style={{ alignItems: "center" }}>
              <span style={{ color: STATUS_COLOR[m.status], display: "inline-flex" }} aria-hidden="true">
                <MaterialStatusIcon status={m.status} />
              </span>
              {kindTitle(t, m.kind)}
              <span className="sr-only">, {t.laMaterialStatus[m.status]}</span>
            </span>
          </button>
        ))}
      </div>
      </div>

      <div
        className="stack g14"
        role="tabpanel"
        style={fill ? { flex: 1, minHeight: 0, paddingTop: 12 } : undefined}
      >
        <div style={{ padding: side, flexShrink: 0 }}>
        <MaterialHeader
          material={current}
          compact={fill}
          actions={
            current.status === "ready" ? (
              <>
                {/* Посмотреть — первым: чаще всего учителю нужно прочитать,
                    а не нести файл в Word. Кнопки — в строке с заголовком, наверху:
                    до них не надо долистывать, и липкого низа нет */}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<IconEye size={17} />}
                  onClick={() => setPreviewing(true)}
                  aria-label={t.laPreview}
                  title={t.laPreview}
                >
                  {roomy && t.laPreview}
                </Button>
                <DownloadButton kit={kit} material={current} size="sm" compact={!roomy} />
              </>
            ) : undefined
          }
        />
        </div>
        <div
          style={fill ? { flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "0 16px 16px" } : undefined}
        >
        {current.status === "ready" ? (
          <MaterialBlocks
            key={current.id}
            material={current}
            kit={kit}
            flash={flash && flash.material_id === current.id ? flash : null}
            onChanged={onChanged}
            onEditGoals={onEditGoals}
          />
        ) : (
          <MaterialPending material={current} kitId={kit.id} planPending={planPending(kit, current)} />
        )}
        </div>
      </div>
      <PreviewSheet
        open={previewing}
        onClose={() => setPreviewing(false)}
        kit={kit}
        materials={kit.materials}
        initialId={current.id}
      />
    </section>
  );
}
