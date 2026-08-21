"use client";

/**
 * Предпросмотр курса «/preview/:courseId» — раздел 12 BACKEND_NOTES.
 *
 * Экраны здесь общие с кабинетом учителя (`@lms/course`), а режим включается
 * на сервере: `POST /admin/preview/enter` выдаёт админу синтетический доступ
 * к курсу и делает видимым черновик. Без включённого режима эти же экраны
 * ответили бы 404 — курс в редакторе почти всегда черновик, а его для
 * площадки не существует.
 *
 * Уход с маршрута режим гасит: он живёт в серверной сессии и, оставшись
 * включённым, подмешивал бы черновик в обычные ответы админки.
 */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, isApiError, useMe } from "@lms/api";
import { AdminShell } from "@/components/layout/AdminShell";
import { PreviewBar } from "@/components/layout/PreviewBar";
import { PreviewHost } from "@/components/layout/PreviewHost";
import { Button, Empty, LinkButton } from "@lms/ui";
import { IconEye } from "@lms/ui/icons";

/**
 * Вход и выход идут строго по очереди.
 *
 * Режим — одно поле серверной сессии, и порядок запросов решает всё.
 * В разработке React прогоняет эффект дважды («вход → выход → вход»), да и
 * переход между курсами делает то же самое; отправленные разом, эти запросы
 * могут прийти в любом порядке, и режим останется выключенным, а экраны —
 * с 404. Очередь на модуле стоит дешевле, чем разбирательство с таким 404.
 */
let queue: Promise<unknown> = Promise.resolve();

function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

export default function PreviewLayout({ children }: { children: ReactNode }) {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { me } = useMe();
  const [entering, setEntering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setEntering(true);
    setError(null);
    serial(() =>
      api<undefined>("/admin/preview/enter", {
        method: "POST",
        json: { course_id: Number(courseId) },
      }),
    )
      .then(() => {
        if (alive) setEntering(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(isApiError(e) ? e.message : "Не удалось открыть предпросмотр");
        setEntering(false);
      });

    return () => {
      alive = false;
      void serial(() => api<undefined>("/admin/preview/exit", { method: "POST" })).catch(
        () => {
          /* Сессия могла кончиться вместе с уходом — гасить уже нечего */
        },
      );
    };
  }, [courseId]);

  /* Гостя и учителя без прав каркас разворачивает сам */
  if (!me?.is_admin) return <AdminShell title="Предпросмотр">{null}</AdminShell>;

  if (entering) {
    return (
      <div className="row center" style={{ minHeight: "100dvh" }}>
        <span className="spinner" style={{ width: 28, height: 28, color: "var(--primary)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="row center" style={{ minHeight: "100dvh", padding: 16 }}>
        <div className="card" style={{ maxWidth: 480, width: "100%" }}>
          <Empty
            icon={<IconEye size={36} />}
            title="Предпросмотр не открылся"
            text={error}
            action={
              <div className="row center g10">
                <Button variant="secondary" onClick={() => router.refresh()}>
                  Повторить
                </Button>
                <LinkButton href={`/courses/${courseId}/edit`}>В редактор курса</LinkButton>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <PreviewHost>
      <PreviewBar courseId={courseId} />
      {children}
    </PreviewHost>
  );
}
