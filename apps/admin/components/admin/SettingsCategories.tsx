"use client";

/**
 * Вкладка «Категории» настроек — своя четвёрка ручек, а не часть
 * `PATCH /admin/settings`: категории лежат отдельной таблицей и пагинации
 * не имеют, их единицы.
 *
 * Порядком не управляем: `order_index` в ответе есть, ручки перестановки
 * в контракте нет — показываем список в том порядке, в каком он пришёл.
 *
 * Эти же категории читает каталог у учителя (`GET /dictionaries`):
 * переименовали здесь — сменилось и там, отдельного действия не нужно.
 */

import { useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminCategories,
  type AdminCategory,
  type AdminCategoryIn,
} from "@lms/api";
import { plural } from "@lms/ui/i18n";
import { useToast } from "@lms/ui/toast";
import { Button, Empty, Sheet } from "@lms/ui";
import { IconPlus, IconTrash } from "@lms/ui/icons";

/** Текст ошибки сервера годится как есть; свой нужен только сетевой. */
const errText = (e: unknown, fallback: string) =>
  isApiError(e) && e.status > 0 ? e.message : fallback;

function CategoryRow({
  cat,
  onRenamed,
  onDelete,
}: {
  cat: AdminCategory;
  onRenamed: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(cat.title);
  const [busy, setBusy] = useState(false);

  /* Переименование уходит по уходу из поля и по Enter, а не на каждую букву:
     иначе одна правка названия — это десяток запросов подряд */
  const rename = async () => {
    const next = title.trim();
    if (busy) return;
    /* Пустое название не отправляем: сервер такого не примет, а поле,
       оставленное пустым, выглядит как удавшееся стирание */
    if (!next || next === cat.title) {
      setTitle(cat.title);
      return;
    }
    setBusy(true);
    try {
      const body: AdminCategoryIn = { title: next };
      await api<AdminCategory>(`/admin/categories/${cat.id}`, { method: "PATCH", json: body });
      onRenamed();
      toast("Категория переименована", "success");
    } catch (e) {
      /* Набранное оставляем на месте — из отказа «такая категория уже есть»
         выходят правкой названия, а не начиная заново */
      toast(errText(e, "Не удалось переименовать категорию"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row g8" style={{ alignItems: "flex-start" }}>
      <div className="field grow">
        <input
          className="input"
          value={title}
          disabled={busy}
          aria-label={`Название категории «${cat.title}»`}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <span className="caption muted-3">
          {cat.courses_count > 0
            ? `В категории ${cat.courses_count} ${plural(cat.courses_count, "курс", "курса", "курсов")} — удалить нельзя`
            : "Курсов нет — категорию можно удалить"}
        </span>
      </div>
      {/* Кнопка, которая заведомо ответит 409, не показывается живой —
          то же правило, что у «Разрешить пересдачу». Сервер всё равно
          проверяет: счётчик на экране мог устареть */}
      <button
        className="btn btn-icon"
        style={{ width: 44, flexShrink: 0 }}
        disabled={busy || cat.courses_count > 0}
        onClick={onDelete}
        aria-label={`Удалить категорию «${cat.title}»`}
      >
        <IconTrash size={18} />
      </button>
    </div>
  );
}

export function SettingsCategories() {
  const toast = useToast();
  const cats = useLoad(() => api<AdminCategories>("/admin/categories"), []);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<AdminCategory | null>(null);
  const [removing, setRemoving] = useState(false);

  const add = async () => {
    const title = draft.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const body: AdminCategoryIn = { title };
      await api<AdminCategory>("/admin/categories", { method: "POST", json: body });
      setDraft("");
      /* Порядок и счётчик курсов считает сервер — перечитываем список целиком,
         а не достраиваем его на клиенте */
      cats.reload();
      toast("Категория добавлена", "success");
    } catch (e) {
      toast(errText(e, "Не удалось добавить категорию"), "error");
    } finally {
      setAdding(false);
    }
  };

  const remove = async () => {
    if (!confirm || removing) return;
    setRemoving(true);
    try {
      await api<void>(`/admin/categories/${confirm.id}`, { method: "DELETE" });
      setConfirm(null);
      cats.reload();
      toast("Категория удалена", "success");
    } catch (e) {
      /* 409 объясняет отказ числом курсов лучше, чем любой свой текст */
      toast(errText(e, "Не удалось удалить категорию"), "error");
    } finally {
      setRemoving(false);
    }
  };

  if (cats.loading && !cats.data) {
    return (
      <div className="card card-pad row center" style={{ minHeight: 200, maxWidth: 620 }}>
        <span className="spinner" style={{ width: 26, height: 26, color: "var(--primary)" }} />
      </div>
    );
  }

  /* Только когда показывать нечего: `useLoad` данные при ошибке не чистит,
     и сорвавшийся `reload` после удачного переименования иначе подменил бы
     весь список карточкой ошибки */
  if (!cats.data) {
    return (
      <div className="card" style={{ maxWidth: 620 }}>
        <Empty
          title="Не удалось загрузить категории"
          text="Проверьте интернет и попробуйте ещё раз."
          action={
            <Button variant="secondary" onClick={cats.reload}>
              Повторить
            </Button>
          }
        />
      </div>
    );
  }

  const items = cats.data.items;

  return (
    <div className="card card-pad stack g14" style={{ maxWidth: 620 }}>
      <h2 className="h3">Категории курсов</h2>

      {items.length === 0 ? (
        /* Полноценное пустое состояние здесь не к месту: поле «добавить»
           нужно ровно тогда, когда категорий ещё нет */
        <span className="small muted pretty">
          Категорий пока нет. Первую добавьте здесь — без категории курс
          не заводится.
        </span>
      ) : (
        <div className="stack g12">
          {items.map((c) => (
            <CategoryRow
              /* В ключе и название: сервер мог его нормализовать, и строка
                 должна пересобраться с тем, что реально лежит в базе,
                 а не остаться с набранным */
              key={`${c.id}|${c.title}`}
              cat={c}
              onRenamed={cats.reload}
              onDelete={() => setConfirm(c)}
            />
          ))}
        </div>
      )}

      <div className="row g8">
        <input
          className="input"
          placeholder="Новая категория"
          value={draft}
          aria-label="Новая категория"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Button icon={<IconPlus size={16} />} disabled={!draft.trim()} loading={adding} onClick={add}>
          Добавить
        </Button>
      </div>

      <span className="caption muted-3 pretty">
        Категории используются в фильтрах каталога и в карточке курса. Название меняется
        по выходу из поля — отдельной кнопки «Сохранить» у категорий нет.
      </span>

      <Sheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Удалить категорию?"
        footer={
          <div className="stack g8">
            <Button variant="danger" block size="lg" loading={removing} onClick={remove}>
              Удалить
            </Button>
            <Button variant="secondary" block onClick={() => setConfirm(null)}>
              Отмена
            </Button>
          </div>
        }
      >
        <p className="body muted pretty">
          «{confirm?.title}» пропадёт из фильтров каталога и из карточки курса.
          {confirm && confirm.courses_count > 0
            ? " На категории висят курсы — сервер откажет, пока их не переведут в другую."
            : ""}
        </p>
      </Sheet>
    </div>
  );
}
