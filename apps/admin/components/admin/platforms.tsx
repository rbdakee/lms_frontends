"use client";

/**
 * Площадки в админке: справочник имён, метка в строке и фильтр в адресе.
 *
 * Площадок две (`PLATFORMS_BRIEF`, решение владельца 03.09.2026), админка одна
 * на обе и **по умолчанию показывает обе** — фильтр сужает, а не наоборот.
 *
 * Наружу площадка ходит кодом `p1` / `p2`, а человеку показывается имя: `p1`
 * ни о чём не говорит, а ошибка в выборе площадки при выдаче доступа стоит
 * человеку чужой учёбы. Имена приходят справочником `platforms`
 * в `GET /admin/settings` — сессия «Платформы 2» завела его именно ради этого:
 * бренд уехал из базы в код бэкенда, и другого места, где спросить имя, нет.
 *
 * Всё в одном файле нарочно: пяти экранам нужно одно и то же, и три разных
 * чипа площадки на трёх экранах читались бы как три разные сущности.
 */

import { Suspense, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api, useLoad, type Platform, type SettingsPlatform } from "@lms/api";
import { useLang } from "@lms/ui/lang";
import { Badge } from "@lms/ui";

/** Ответ `GET /admin/settings` целиком нам не нужен — берём справочник. */
type SettingsShape = { platforms: SettingsPlatform[] };

/* Один запрос на вкладку: справочник спрашивают пять экранов сразу, и он
   не меняется, пока админ не перезагрузит страницу. Так же кэшируются
   публичные настройки в `@lms/api` и справочники словарей. */
let cached: Promise<SettingsPlatform[]> | null = null;
/* Уже полученный справочник отдельно от обещания: строк в списке двадцать,
   и каждая метка — свой `useLoad`. Без снимка все двадцать успевали бы
   мигнуть кодом до того, как придёт имя. */
let known: SettingsPlatform[] | null = null;

export function fetchPlatforms(): Promise<SettingsPlatform[]> {
  cached ??= api<SettingsShape>("/admin/settings")
    .then((s) => {
      known = s.platforms;
      return s.platforms;
    })
    .catch((e) => {
      /* неудачную загрузку не кэшируем — иначе «Повторить» не поможет */
      cached = null;
      throw e;
    });
  return cached;
}

/** Справочник площадок: `{ data, loading, error, reload }`. */
export function usePlatforms() {
  return useLoad(fetchPlatforms, []);
}

/**
 * Имя площадки по коду — то, что показывают человеку.
 *
 * Справочник ещё не приехал или код в нём не нашёлся — возвращается «Площадка
 * p1». Пустую строку не отдаём: метка, исчезающая на секунду, читается как
 * «площадки нет», а её нет никогда.
 */
export function usePlatformName(): (code: string) => string {
  const { t } = useLang();
  const { data } = usePlatforms();
  const list = data ?? known;
  return (code: string) =>
    list?.find((p) => p.platform === code)?.platform_name || t.pfUnknown(code);
}

/**
 * Метка площадки в строке списка и в карточке.
 *
 * Нейтральный бейдж, а не цветной: площадка — не статус, и раскрашивать её
 * значило бы спорить со статусом, который стоит рядом.
 */
export function PlatformChip({ platform }: { platform: string }) {
  const name = usePlatformName();
  return <Badge kind="neutral">{name(platform)}</Badge>;
}

/* ============ Фильтр площадки ============ */

/**
 * Выбранная площадка живёт в адресе (`?platform=p1`) — решение владельца
 * 03.09.2026 «сделай так чтоб в юрл видно было».
 *
 * Почему в адресе, а не в состоянии экрана: короткий список тогда объясняет
 * сам себя, фильтр переживает перезагрузку и уходит в закладку и в чужую
 * вкладку целиком. Остальные фильтры этих экранов живут в состоянии — их
 * не трогаем, это чужая тема.
 *
 * `useSearchParams` требует границы `Suspense` на статических маршрутах,
 * поэтому экран-потребитель оборачивается `<PlatformFilterBoundary>` —
 * так же, как обёрнут редактор курса ради `?tab=`.
 */
export function usePlatformFilter(): [Platform | null, (next: Platform | null) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("platform");
  const value: Platform | null = raw === "p1" || raw === "p2" ? raw : null;

  const set = (next: Platform | null) => {
    /* Остальные параметры маршрута переносим как есть: площадка не единственное,
       что может лежать в адресе, и затирать соседей она не должна */
    const search = new URLSearchParams(params.toString());
    if (next) search.set("platform", next);
    else search.delete("platform");
    const query = search.toString();
    /* replace, а не push: перебор фильтра не должен набивать историю так,
       чтобы «назад» уводило на пять шагов вместо предыдущего экрана */
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return [value, set];
}

/**
 * Граница `Suspense` для экрана, который читает фильтр из адреса.
 * Оборачивает содержимое страницы целиком — как в редакторе курса.
 */
export function PlatformFilterBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

/**
 * Чипы «Все площадки · Имя 1 · Имя 2» рядом с остальными фильтрами списка.
 *
 * Одна площадка, а не список: так же устроен параметр `?platform=` на сервере.
 * Пока справочник грузится, чипов нет вовсе — рисовать «Площадка p1» в фильтре
 * незачем, список и так показывает обе.
 */
export function PlatformFilter({
  value,
  onChange,
}: {
  value: Platform | null;
  onChange: (next: Platform | null) => void;
}) {
  const { t } = useLang();
  const { data } = usePlatforms();
  if (!data || data.length < 2) return null;
  return (
    <div className="tabs" role="group" aria-label={t.pfLabel}>
      <button type="button" data-active={value === null} onClick={() => onChange(null)}>
        {t.pfAll}
      </button>
      {data.map((p) => (
        <button
          key={p.platform}
          type="button"
          data-active={value === p.platform}
          onClick={() => onChange(p.platform as Platform)}
        >
          {p.platform_name || t.pfUnknown(p.platform)}
        </button>
      ))}
    </div>
  );
}
