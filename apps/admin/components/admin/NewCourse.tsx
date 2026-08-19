"use client";

/**
 * Шторка «Создать курс» — раздел 5.16 брифа.
 *
 * `POST /admin/courses` просит ровно четыре поля: без них курс нечем
 * показать даже строкой списка. Описание, обложка, цена и дата старта
 * дописываются в редакторе, куда шторка и уводит после создания.
 *
 * Статус в запросе не принимается: новый курс всегда черновик, публикация
 * идёт отдельной кнопкой и проверяет готовность.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  api,
  isApiError,
  useDictionaries,
  type AdminCourseCard,
  type CourseLang,
} from "@lms/api";
import { useStore } from "@lms/prototype";
import { Button, Sheet } from "@lms/ui";
import { fieldErrors } from "@/lib/fieldErrors";

export function NewCourseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useStore();
  const dicts = useDictionaries();

  const [title, setTitle] = useState("");
  const [lang, setLang] = useState<CourseLang>("ru");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [hours, setHours] = useState("36");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = dicts.data?.categories ?? [];
  /* Объём тоже обязателен: стёртое поле ушло бы как `hours: 0`, а на ноль
     сервер отвечает не нашей русской подписью, а текстом валидатора */
  const ready = title.trim() !== "" && categoryId !== "" && Number(hours) >= 1;

  /* Правка поля снимает его ошибку: красная рамка до следующего сохранения
     говорит о запрете, которого уже нет */
  const clearError = (field: string) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));

  const close = () => {
    setTitle("");
    setLang("ru");
    setCategoryId("");
    setHours("36");
    setErrors({});
    onClose();
  };

  const create = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setErrors({});
    try {
      const course = await api<AdminCourseCard>("/admin/courses", {
        method: "POST",
        json: {
          title: title.trim(),
          lang,
          category_id: Number(categoryId),
          hours: Number(hours),
        },
      });
      toast("Курс создан — черновик, в каталоге его пока нет", "success");
      /* Список не перечитываем: уходим сразу в редактор дописывать курс */
      router.push(`/courses/${course.id}/edit`);
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else toast(isApiError(e) ? e.message : "Не удалось создать курс", "error");
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      /* Пока запрос идёт, шторка не закрывается: курс всё равно создастся,
         и человек об этом уже не узнает */
      onClose={() => !busy && close()}
      title="Создать курс"
      footer={
        <div className="stack g8">
          <Button block size="lg" loading={busy} disabled={!ready} onClick={create}>
            Создать и открыть редактор
          </Button>
          <Button variant="secondary" block disabled={busy} onClick={close}>
            Отмена
          </Button>
        </div>
      }
    >
      <div className="stack g14">
        <p className="small muted pretty">
          Курс заводится черновиком. Описание, обложку, цену и программу
          допишете в редакторе — сейчас нужно только то, без чего курс не
          покажешь даже в списке.
        </p>

        <div className="field">
          <label className="label">Название</label>
          <input
            className={`input${errors.title ? " input-error" : ""}`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
            placeholder="Например: Функциональная грамотность"
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        <div className="field">
          <label className="label">Язык курса</label>
          <select
            className={`input${errors.lang ? " input-error" : ""}`}
            value={lang}
            onChange={(e) => {
              setLang(e.target.value as CourseLang);
              clearError("lang");
            }}
          >
            <option value="ru">Русский</option>
            <option value="kz">Қазақша</option>
          </select>
          <span className="hint">
            Курс одноязычный. Вторая версия заводится отдельно из редактора и
            живёт своей программой и ценой.
          </span>
          {errors.lang && <span className="error-text">{errors.lang}</span>}
        </div>

        <div className="field">
          <label className="label">Категория</label>
          <select
            className={`input${errors.category_id ? " input-error" : ""}`}
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value === "" ? "" : Number(e.target.value));
              clearError("category_id");
            }}
            disabled={dicts.loading}
          >
            <option value="">Выберите категорию</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {dicts.error && (
            <div className="row g8" style={{ marginTop: 4 }}>
              <span className="error-text">Справочник категорий не загрузился</span>
              <Button variant="ghost" size="sm" onClick={dicts.reload}>
                Повторить
              </Button>
            </div>
          )}
          {errors.category_id && <span className="error-text">{errors.category_id}</span>}
        </div>

        <div className="field">
          <label className="label">Объём курса, часов</label>
          <input
            className={`input${errors.hours ? " input-error" : ""}`}
            type="number"
            min={1}
            max={999}
            value={hours}
            onChange={(e) => {
              setHours(e.target.value);
              clearError("hours");
            }}
          />
          <span className="hint">
            Печатается в сертификате и работает в фильтре каталога. Это учебный
            объём с самостоятельной работой, а не сумма длительности видео.
          </span>
          {errors.hours && <span className="error-text">{errors.hours}</span>}
        </div>
      </div>
    </Sheet>
  );
}
