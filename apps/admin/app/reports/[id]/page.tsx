"use client";

/** Отчёт по курсу «/reports/:id» — раздел 5.23 брифа. */

import { useParams } from "next/navigation";
import { funnelData, getCourse } from "@lms/prototype/data";
import { useStore } from "@lms/prototype";
import { AdminShell } from "@/components/layout/AdminShell";
import { Badge, Button, Empty, LinkButton, Note, Progress } from "@lms/ui";
import { IconDownload, IconSearch } from "@lms/ui/icons";

const PARTICIPANTS = [
  {
    name: "Смагулова Гульмира Токтарбековна",
    school: "Гимназия №5 им. Абая",
    region: "Шымкент",
    progress: 100,
    tests: "92 · 88",
    final: "85%",
    cert: "Выдан",
  },
  {
    name: "Нурланова Айгуль Сериковна",
    school: "КГУ «Средняя школа №27»",
    region: "Алматы",
    progress: 67,
    tests: "88 · —",
    final: "не начат",
    cert: "В процессе",
  },
  {
    name: "Жумабаев Асхат Маратович",
    school: "КГУ «ОШ №12», с. Каскелен",
    region: "Алматинская обл.",
    progress: 94,
    tests: "88 · 74",
    final: "35% прерван",
    cert: "Нет",
  },
  {
    name: "Ким Елена Викторовна",
    school: "Школа-лицей №8",
    region: "Караганда",
    progress: 100,
    tests: "94 · 90",
    final: "91%",
    cert: "Выдан",
  },
  {
    name: "Абдрахманов Данияр Ержанович",
    school: "НИШ ФМН г. Алматы",
    region: "Алматы",
    progress: 100,
    tests: "100 · 96",
    final: "96%",
    cert: "Выдан",
  },
];

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useStore();
  const course = getCourse(id);
  const maxFunnel = Math.max(...funnelData.map((f) => f.value));

  if (!course) {
    return (
      <AdminShell title="Отчёт">
        <div className="card">
          <Empty
            title="Курс не найден"
            action={
              <LinkButton href="/courses" variant="secondary">
                К списку курсов
              </LinkButton>
            }
          />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={`Отчёт · ${course.title}`}
      subtitle="Данные на 16 мая 2026"
      actions={
        <Button
          variant="secondary"
          size="sm"
          icon={<IconDownload size={16} />}
          onClick={() => toast("CSV с отчётом скачан", "success")}
        >
          <span className="hide-sm">Скачать CSV</span>
        </Button>
      }
    >
      <div className="stack g24">
        {/* Сводка */}
        <div className="report-kpis">
          {[
            { v: "812", l: "получили доступ" },
            { v: "704", l: "начали" },
            { v: "356", l: "завершили" },
            { v: "61%", l: "средний прогресс" },
            { v: "78%", l: "ср. балл итог. теста" },
            { v: "341", l: "сертификатов" },
            { v: "19 дней", l: "ср. время прохождения" },
          ].map((k) => (
            <div key={k.l} className="card card-pad stack g4" style={{ padding: 14 }}>
              <strong style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{k.v}</strong>
              <span className="caption muted">{k.l}</span>
            </div>
          ))}
        </div>

        {/* Воронка */}
        <section className="card card-pad stack g16">
          <div className="stack g4">
            <h2 className="h3">Воронка по урокам</h2>
            <span className="caption muted">
              Сколько учителей дошло до каждого урока. Заметный отвал — урок 7 (первое задание).
            </span>
          </div>

          <div className="stack g12">
            {funnelData.map((f, i) => {
              const pct = Math.round((f.value / maxFunnel) * 100);
              const drop = i > 0 ? funnelData[i - 1].value - f.value : 0;
              const bigDrop = drop > 100;
              return (
                <div key={f.label} className="stack g6">
                  <div className="row between g10">
                    <span className="small pretty" style={{ fontWeight: 600 }}>
                      {f.label}
                    </span>
                    <span className="row g8 nowrap">
                      {bigDrop && <Badge kind="rework">−{drop}</Badge>}
                      <span className="caption muted-3">{f.value}</span>
                    </span>
                  </div>
                  <div className="progress progress-thick">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${pct}%`,
                        background: bigDrop ? "var(--warning)" : "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Note kind="warning">
            На уроке 7 отсеивается 155 человек — это первое задание с загрузкой файла.
            Стоит проверить формулировку условия и лимит размера.
          </Note>
        </section>

        {/* Участники */}
        <section className="stack g14">
          <div className="row between wrap g12">
            <h2 className="h3">Участники · 812</h2>
            <div className="input-wrap" style={{ maxWidth: 320, flex: 1, minWidth: 200 }}>
              <span className="input-icon">
                <IconSearch size={19} />
              </span>
              <input className="input" placeholder="Поиск по ФИО" />
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Школа · регион</th>
                  <th>Прогресс</th>
                  <th>Тесты модулей</th>
                  <th>Итоговый тест</th>
                  <th>Сертификат</th>
                </tr>
              </thead>
              <tbody>
                {PARTICIPANTS.map((p) => (
                  <tr key={p.name}>
                    <td style={{ maxWidth: 260 }}>
                      <span className="small" style={{ fontWeight: 600 }}>
                        {p.name}
                      </span>
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      <div className="stack g2">
                        <span className="small">{p.school}</span>
                        <span className="caption muted-3">{p.region}</span>
                      </div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="row g8">
                        <Progress value={p.progress} />
                        <span className="caption nowrap" style={{ fontWeight: 700 }}>
                          {p.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="small nowrap">{p.tests}</td>
                    <td className="small nowrap">{p.final}</td>
                    <td>
                      <Badge
                        kind={
                          p.cert === "Выдан" ? "accepted" : p.cert === "Нет" ? "rework" : "progress"
                        }
                      >
                        {p.cert}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-mobile-cards">
            {PARTICIPANTS.map((p) => (
              <div key={p.name} className="card card-pad stack g10">
                <div className="row between wrap g10" style={{ alignItems: "flex-start" }}>
                  <strong className="small pretty grow">{p.name}</strong>
                  <Badge
                    kind={p.cert === "Выдан" ? "accepted" : p.cert === "Нет" ? "rework" : "progress"}
                  >
                    {p.cert}
                  </Badge>
                </div>
                <span className="caption muted">
                  {p.school} · {p.region} · итоговый тест {p.final}
                </span>
                <div className="row g10">
                  <Progress value={p.progress} />
                  <strong className="caption nowrap">{p.progress}%</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .report-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 700px) { .report-kpis { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1200px) { .report-kpis { grid-template-columns: repeat(7, 1fr); } }
        @media (max-width: 640px) { .hide-sm { display: none; } }
      `}</style>
    </AdminShell>
  );
}
