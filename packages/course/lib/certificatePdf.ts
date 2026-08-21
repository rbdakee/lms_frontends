/**
 * Скачивание сертификата в PDF — одно на все экраны.
 *
 * Правило проекта — выносить общее по третьему повторению, а не по второму;
 * здесь отступаем сознательно. Повторов два (страница сертификата и экран
 * завершения курса), но это буквально одно действие с ловушкой внутри:
 * blob-адрес нужно отозвать, иначе он висит в памяти вкладки, и отозвать
 * именно следующим тиком — часть браузеров отменяет скачивание, если адрес
 * погас в том же тике, в котором был клик. Копия такого кода означает, что
 * однажды его починят только в одном месте.
 *
 * `GET /certificates/{id}/pdf` отдаёт байты, а не JSON, поэтому обёртка
 * `api()` не подходит и запрос идёт своим `fetch`.
 *
 * Берём файл через `fetch`, а не переходом по ссылке, ради 404: отозванный
 * документ не отдаётся никому, и без `fetch` человек увидел бы служебный JSON
 * вместо объяснения. Плата за это — `Content-Disposition` кросс-доменно
 * не читается, так что имя файла ставим сами; оно совпадает с серверным.
 */

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { useToast } from "@lms/ui/toast";
import { useRoutes } from "../host";

/** Экрану хватает номера и id — форма сертификата у них разная. */
type Downloadable = { id: number; number: string };

export function useCertificatePdf() {
  const { t } = useLang();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const routes = useRoutes();
  const [downloading, setDownloading] = useState(false);

  const download = async (cert: Downloadable) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/certificates/${cert.id}/pdf`, {
        credentials: "include",
      });

      if (!res.ok) {
        let code = "";
        let message = "";
        try {
          const body = (await res.json()) as { error?: { code?: string; message?: string } };
          code = body.error?.code ?? "";
          message = body.error?.message ?? "";
        } catch {
          /* тело не JSON — останется общий текст об ошибке */
        }
        /* Протухшая сессия чинится входом, а не повтором: ведём на вход,
           как это делают остальные экраны кабинета */
        if (code === "unauthorized") {
          router.replace(routes.login(pathname));
          return;
        }
        /* Отозванный сертификат — не сбой, а решение админа: говорим об этом
           прямо. Остальное (403 на чужой документ) объясняет текст сервера */
        toast(code === "not_found" ? t.certRevoked : message || t.certPdfError, "error");
        return;
      }

      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cert.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      /* Без revoke blob висит в памяти вкладки до перезагрузки страницы.
         Отзываем следующим тиком: часть браузеров отменяет скачивание,
         если адрес погас в том же, в котором был клик */
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast(t.certPdfToast, "success");
    } catch {
      toast(t.certPdfError, "error");
    } finally {
      setDownloading(false);
    }
  };

  return { downloading, download };
}
