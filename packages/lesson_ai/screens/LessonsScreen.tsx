"use client";

/**
 * «Мои уроки» — то же рабочее место, что вход в продукт, только на телефоне
 * открыта вкладка уроков; на широком экране чат и уроки видны рядом.
 * Сам список — поиск, пустые состояния и ошибки — в `LessonsPanel`
 * (`components/lessons`), раскладка — в `WorkspaceScreen`. Экран остался
 * под прежним именем и на прежнем адресе: на него ведут ссылки площадок
 * и кнопка «назад» комплекта.
 */

import { WorkspaceScreen } from "./WorkspaceScreen";

export function LessonsScreen() {
  return <WorkspaceScreen tab="lessons" />;
}
