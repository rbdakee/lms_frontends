"use client";

/**
 * Администраторы площадки — «/settings/admins».
 *
 * Отдельной страницей, а не пятой вкладкой настроек: вкладки там сохраняются
 * каждая по-своему и грузятся одним `GET /admin/settings`, а список админов
 * живёт своими двумя ручками и к тем настройкам отношения не имеет.
 *
 * Добавляют по одному телефону: ФИО человек пишет себе сам в профиле,
 * и вписанное за него разошлось бы с тем, что он там укажет. Пока не заходил —
 * в строке стоит номер и подпись «профиль не заполнен».
 *
 * Снятия прав здесь нет — так решил владелец: админов заводят редко и всерьёз,
 * а кнопка, которой можно снять права себе или последнему админу, стоит дороже
 * похода в базу в тот редкий раз, когда это правда нужно.
 *
 * Телефоны админов — персональные данные, поэтому страница живёт в админке
 * на своём домене, а сервер проверяет права у обеих ручек.
 */

import { useState } from "react";
import {
  api,
  isApiError,
  useLoad,
  type AdminAdmin,
  type AdminAdminIn,
  type AdminAdmins,
} from "@lms/api";
import { dayYear, phoneFmt } from "@lms/ui/i18n";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { fieldErrors } from "@/lib/fieldErrors";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Button, Empty, Note } from "@lms/ui";
import { IconPlus } from "@lms/ui/icons";
import { PhoneInput } from "@lms/ui/PhoneInput";

function adminName(a: AdminAdmin): string {
  return [a.last_name, a.first_name, a.middle_name].filter(Boolean).join(" ");
}

function initialsOf(a: AdminAdmin): string {
  return ((a.first_name[0] ?? "") + (a.last_name[0] ?? "")).toUpperCase() || "??";
}

export default function AdminAdminsPage() {
  const toast = useToast();
  const { lang } = useLang();
  const admins = useLoad(() => api<AdminAdmins>("/admin/admins"), []);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!phone.trim() || adding) return;
    setAdding(true);
    setError("");
    try {
      const body: AdminAdminIn = { phone };
      await api<AdminAdmin>("/admin/admins", { method: "POST", json: body });
      setPhone("");
      /* Перечитываем список целиком: порядок и ФИО знает сервер */
      admins.reload();
      toast("Администратор добавлен", "success");
    } catch (e) {
      /* «Уже администратор», «заблокирован» и «проверьте номер» приходят
         подписью к полю — своих формулировок не сочиняем */
      const fields = fieldErrors(e);
      if (fields.phone) setError(fields.phone);
      else toast(isApiError(e) && e.status > 0 ? e.message : "Не удалось добавить", "error");
    } finally {
      setAdding(false);
    }
  };

  const body = () => {
    if (admins.loading && !admins.data) {
      return (
        <div className="card card-pad row center" style={{ minHeight: 200 }}>
          <span
            className="spinner"
            style={{ width: 26, height: 26, color: "var(--primary)" }}
          />
        </div>
      );
    }

    /* Только когда показывать нечего: `useLoad` данные при ошибке не чистит,
       и сорвавшийся `reload` после удачного добавления иначе подменил бы
       весь список карточкой ошибки */
    if (!admins.data) {
      return (
        <div className="card">
          <Empty
            title="Не удалось загрузить список"
            text="Проверьте интернет и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={admins.reload}>
                Повторить
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="card card-pad stack g14">
        <h2 className="h3">Кто сейчас администратор</h2>
        <div className="stack g10">
          {admins.data.items.map((a) => (
            <div key={a.id} className="admins-row">
              <Avatar initials={initialsOf(a)} size={38} tone="neutral" />
              <div className="grow stack g2" style={{ minWidth: 0 }}>
                <span className="small" style={{ fontWeight: 600 }}>
                  {/* Ещё не заходил — зовём по номеру, как в списке учителей */}
                  {adminName(a) || phoneFmt(a.phone)}
                  {a.is_current && <span className="caption muted-3"> · это вы</span>}
                </span>
                <span className="caption muted-3">
                  {adminName(a)
                    ? `в системе с ${dayYear(a.created_at, lang)}`
                    : "профиль не заполнен"}
                </span>
              </div>
              <span className="small nowrap mono">{phoneFmt(a.phone)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AdminShell
      title="Администраторы"
      subtitle="Кто имеет доступ к админке и как добавить нового"
    >
      <div className="stack g20" style={{ maxWidth: 620 }}>
        {body()}

        <div className="card card-pad stack g14">
          <h2 className="h3">Добавить администратора</h2>
          <Note kind="muted">
            <span className="small">
              Новый администратор получает те же права, что и вы: заявки, телефоны
              учителей, курсы и настройки. Войдёт он по этому номеру — кодом из SMS,
              своего пароля у админки нет.
            </span>
          </Note>
          <div className="field">
            <label className="label">Номер телефона</label>
            <PhoneInput
              className={`input mono${error ? " input-error" : ""}`}
              value={phone}
              onChange={(v) => {
                /* Правка номера снимает подпись 422: она относилась к прежнему */
                if (error) setError("");
                setPhone(v);
              }}
            />
            {error ? (
              <span className="error-text">{error}</span>
            ) : (
              <span className="hint">
                ФИО подтянется само, когда человек войдёт и заполнит профиль
              </span>
            )}
          </div>
          <div>
            <Button
              icon={<IconPlus size={16} />}
              disabled={!phone.trim()}
              loading={adding}
              onClick={add}
            >
              Добавить
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .admins-row { display: flex; align-items: center; gap: 12px; }
        @media (max-width: 560px) {
          .admins-row { flex-wrap: wrap; }
          .admins-row .mono { width: 100%; }
        }
      `}</style>
    </AdminShell>
  );
}
