"use client";

/** Список учителей «/teachers» — раздел 5.22 брифа. */

import Link from "next/link";
import { useState } from "react";
import { adminTeachers, regions } from "@lms/prototype/data";
import { fmt } from "@lms/ui/i18n";
import { useStore } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Button, Empty } from "@lms/ui";
import { IconChevronRight, IconDownload, IconSearch } from "@lms/ui/icons";

export default function TeachersPage() {
  const { toast } = useStore();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");

  const list = adminTeachers.filter((t) => {
    if (region !== "all" && t.region !== region) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.school.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AdminShell
      title="Учителя"
      subtitle={`${fmt(4316)} зарегистрировано`}
      actions={
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={16} />}
          onClick={() => toast("CSV со списком учителей скачан", "success")}
        >
          <span className="hide-sm">Скачать CSV</span>
        </Button>
      }
    >
      <div className="stack g16">
        <div className="row wrap g10">
          <div className="input-wrap" style={{ flex: 1, minWidth: 240, maxWidth: 420 }}>
            <span className="input-icon">
              <IconSearch size={19} />
            </span>
            <input
              className="input"
              placeholder="Поиск по ФИО, школе, региону"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input"
            style={{ width: "auto", minWidth: 200 }}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="all">Все регионы</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        {list.length === 0 ? (
          <div className="card">
            <Empty
              icon={<IconSearch size={34} />}
              title="Никого не нашли"
              text={`По запросу «${query}»${region !== "all" ? ` с фильтром «${region}»` : ""} учителей нет.`}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setRegion("all");
                  }}
                >
                  Сбросить фильтры
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Учитель</th>
                    <th>Телефон</th>
                    <th>Школа · регион</th>
                    <th>Курсов</th>
                    <th>Завершил</th>
                    <th>Сертификатов</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td style={{ maxWidth: 280 }}>
                        <Link href={`/teachers/${t.id}`} className="row g10">
                          <Avatar initials={t.initials} size={34} tone="neutral" />
                          <span className="small" style={{ fontWeight: 600 }}>
                            {t.name}
                          </span>
                        </Link>
                      </td>
                      <td className="small nowrap mono">{t.phone}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div className="stack g2">
                          <span className="small">{t.school}</span>
                          <span className="caption muted-3">{t.region}</span>
                        </div>
                      </td>
                      <td className="small">{t.courses}</td>
                      <td className="small">{t.finished}</td>
                      <td className="small">{t.certs}</td>
                      <td style={{ width: 44 }}>
                        <Link href={`/teachers/${t.id}`} className="btn btn-icon" style={{ minHeight: 34, width: 34 }} aria-label="Открыть">
                          <IconChevronRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-mobile-cards">
              {list.map((t) => (
                <Link key={t.id} href={`/teachers/${t.id}`} className="card card-link card-pad stack g10">
                  <div className="row g10">
                    <Avatar initials={t.initials} size={40} tone="neutral" />
                    <div className="grow stack g2" style={{ minWidth: 0 }}>
                      <span className="small" style={{ fontWeight: 700 }}>
                        {t.name}
                      </span>
                      <span className="caption muted-3">
                        {t.school} · {t.region}
                      </span>
                    </div>
                    <IconChevronRight size={18} className="muted-3" />
                  </div>
                  <div className="row wrap g12 caption muted">
                    <span>{t.courses} курса</span>
                    <span className="dot-sep">·</span>
                    <span>завершил {t.finished}</span>
                    <span className="dot-sep">·</span>
                    <span>{t.certs} сертификата</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`@media (max-width: 640px) { .hide-sm { display: none; } }`}</style>
    </AdminShell>
  );
}
