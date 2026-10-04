"use client";

import { Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, ErrorBox, Loading, PageHeader, input, table } from "@/components/ui";
import type { ComponentSerialRow, UnitRow } from "@/lib/api";
import { UNIT_STATUS, dt, duration, tl } from "@/lib/format";
import { useLive } from "@/lib/live";

const FILTERS = [
  { key: "COMPLETED", label: "Mamul depoda" },
  { key: "WIP", label: "Üretimde" },
  { key: "ALL", label: "Tümü" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

export default function SerialsPage() {
  const [mode, setMode] = useState<"units" | "parts">("units");
  return (
    <div className="space-y-6">
      <PageHeader title="Seri Numaraları" subtitle="Bilgisayar seri numarasından takılan parçalara, parça seri numarasından takıldığı bilgisayara ulaşın" />
      <div className="inline-flex rounded-lg bg-zinc-200/70 p-1 text-sm font-medium">
        {([["units", "Bilgisayarlar"], ["parts", "Parça seri no"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded-md px-4 py-1.5 ${mode === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "units" ? <Units /> : <Parts />}
    </div>
  );
}

function Parts() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const { data, error } = useLive<ComponentSerialRow[]>(`/component-serials${query ? `?q=${encodeURIComponent(query)}` : ""}`);

  return (
    <>
      <div className="w-full sm:w-96">
        <input
          autoFocus
          className={`${input} font-mono`}
          placeholder="Parça seri no okutun veya yazın (örn. RAM)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card>
        <ErrorBox message={error} />
        {!data ? (
          <Loading />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            {query ? "Bu seri numarasıyla takılmış parça yok." : "Henüz seri numarası okutulmuş parça yok. Montaj istasyonlarında parça seri numaraları girilir."}
          </p>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Parça seri no</th>
                  <th className={table.th}>Parça</th>
                  <th className={table.th}>Takıldığı bilgisayar</th>
                  <th className={table.th}>Aşama / operatör</th>
                  <th className={table.th}>Takılma zamanı</th>
                  <th className={table.th}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const s = UNIT_STATUS[r.unit.status];
                  return (
                    <tr key={r.item.code + r.serialNo} className="hover:bg-zinc-50">
                      <td className={`${table.td} font-mono font-medium`}>{r.serialNo}</td>
                      <td className={table.td}>{r.item.name} <span className="text-xs text-zinc-400">{r.item.code}</span></td>
                      <td className={table.td}>
                        <Link href={`/urun/${r.unit.serialNo}?parca=${encodeURIComponent(r.serialNo)}`} className="font-mono text-sky-700 hover:underline">
                          {r.unit.serialNo}
                        </Link>
                        <div className="text-xs text-zinc-400">{r.workOrderNo}</div>
                      </td>
                      <td className={table.td}>{r.stage} · {r.worker}</td>
                      <td className={`${table.td} whitespace-nowrap`}>{dt(r.installedAt)}</td>
                      <td className={table.td}><Badge tone={s.tone}>{s.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Units() {
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
    <>
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
    </>
  );
}
