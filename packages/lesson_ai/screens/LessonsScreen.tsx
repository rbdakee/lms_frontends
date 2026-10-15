"use client";

/**
 * «Мои уроки» — отдельная страница со списком всех комплектов: поиск, пустые
 * состояния и ошибки живут в `LessonsPanel` (`components/lessons`). В рабочем
 * месте справа не этот список, а материалы текущего разговора; сюда ведёт
 * ссылка из сайдбара и кнопка «назад» комплекта.
 */

import { LinkButton } from "@lms/ui";
import { IconPlus } from "@lms/ui/icons";
import { useLang } from "@lms/ui/lang";
import { AccessUntil } from "../access";
import { useChrome, useRoutes } from "../host";
import { LessonsPanel } from "../components/lessons/LessonsPanel";

export function LessonsScreen() {
  const { t } = useLang();
  const routes = useRoutes();
  const { Shell } = useChrome();

  return (
    <Shell title={t.laMyLessons}>
      <div className="page section stack g16" style={{ maxWidth: 720 }}>
        <div className="row wrap between g10" style={{ alignItems: "center" }}>
          <div className="stack g4">
            <h1 className="h2">{t.laMyLessons}</h1>
            <AccessUntil />
          </div>
          <LinkButton href={routes.home} icon={<IconPlus size={17} />}>
            {t.laNewLesson}
          </LinkButton>
        </div>
        <LessonsPanel />
      </div>
    </Shell>
  );
}
