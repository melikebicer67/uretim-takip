"use client";

import { Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, ErrorBox, Loading, PageHeader, input, table } from "@/components/ui";
import type { UnitRow } from "@/lib/api";
import { UNIT_STATUS, dt, duration, tl } from "@/lib/format";
import { useLive } from "@/lib/live";

const FILTERS = [
  { key: "COMPLETED", label: "Mamul depoda" },
  { key: "WIP", label: "Üretimde" },
  { key: "ALL", label: "Tümü" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

export default function SerialsPage() {
  const { data, error } = useLive<UnitRow[]>("/units");
  const [filter, setFilter] = useState<Filter>("COMPLETED");
  const [search, setSearch] = useState("");

  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;

  const counts = {
    COMPLETED: data.filter((u) => u.status === "COMPLETED").length,
    WIP: data.filter((u) => u.status === "WAITING" || u.status === "IN_PROCESS").length,
    ALL: data.length,
  };
  const q = search.trim().toUpperCase();
  const rows = data
    .filter((u) =>
      filter === "ALL" ? true : filter === "COMPLETED" ? u.status === "COMPLETED" : u.status === "WAITING" || u.status === "IN_PROCESS",
    )
    .filter((u) => !q || u.serialNo.includes(q) || u.workOrder.no.includes(q));

  return (
    <div className="space-y-6">
      <PageHeader title="Seri Numaraları" subtitle="Her mamul seri numarasıyla izlenir; satıra tıklayınca rota geçmişi ve kalite formu açılır" />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 ${
              filter === f.key ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {f.label} <span className="ml-1 opacity-60">{counts[f.key]}</span>
          </button>
        ))}
        <div className="ml-auto w-full sm:w-72">
          <input className={input} placeholder="Seri no veya iş emri ara…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            {filter === "COMPLETED" ? "Mamul depoda henüz ürün yok. Kalite onayından geçen ürünler burada listelenir." : "Kayıt yok."}
          </p>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Seri No</th>
                  <th className={table.th}>Mamul</th>
                  <th className={table.th}>İş emri</th>
                  <th className={table.th}>Konum</th>
                  <th className={table.th}>Kalite onayı</th>
                  <th className={`${table.th} text-right`}>Çalışma</th>
                  <th className={`${table.th} text-right`}>Maliyet</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const s = UNIT_STATUS[u.status];
                  return (
                    <tr key={u.serialNo} className="hover:bg-zinc-50">
                      <td className={table.td}>
                        <Link href={`/urun/${u.serialNo}`} className="font-mono font-medium text-sky-700 hover:underline">{u.serialNo}</Link>
                        {u.reworkCount > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-rose-600" title="Tamire dönme sayısı">
                            <Wrench size={12} />{u.reworkCount}
                          </span>
                        )}
                      </td>
                      <td className={table.td}>{u.product.name} <span className="text-xs text-zinc-400">{u.product.code}</span></td>
                      <td className={table.td}>
                        <Link href={`/is-emirleri/${u.workOrder.id}`} className="font-mono text-xs text-sky-700 hover:underline">{u.workOrder.no}</Link>
                      </td>
                      <td className={table.td}>
                        <Badge tone={s.tone}>
                          {u.status === "COMPLETED" ? "Mamul Depo" : `${u.stage?.name ?? "—"} · ${s.label}${u.activeWorker ? ` · ${u.activeWorker}` : ""}`}
                        </Badge>
                      </td>
                      <td className={`${table.td} text-xs`}>
                        {u.completedAt ? <>{dt(u.completedAt)}{u.approver && <div className="text-zinc-500">{u.approver}</div>}</> : "—"}
                      </td>
                      <td className={table.num}>{duration(u.workSeconds)}</td>
                      <td className={`${table.num} font-medium`}>{tl(u.totalCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
