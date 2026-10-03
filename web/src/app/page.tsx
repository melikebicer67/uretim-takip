"use client";

import { ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";
import { Badge, Card, ErrorBox, Loading, PageHeader, Stat, table } from "@/components/ui";
import type { Dashboard } from "@/lib/api";
import { RESULT, clock, duration, pct, time, tl } from "@/lib/format";
import { useLive, useNow } from "@/lib/live";

export default function DashboardPage() {
  const { data, error } = useLive<Dashboard>("/dashboard");
  const now = useNow();

  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;
  const { kpis, board, recent } = data;

  return (
    <div className="space-y-6">
      <PageHeader title="Üretim Panosu" subtitle="Hat durumu, istasyon yükleri ve maliyetler canlı güncellenir" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Stat label="Açık iş emri" value={kpis.openOrders} />
        <Stat label="Hattaki ürün" value={kpis.wip} hint="Yarı mamul (WIP)" />
        <Stat label="Bugün üretilen" value={kpis.completedToday} hint={`Toplam ${kpis.completedTotal} adet`} />
        <Stat label="Ort. üretim süresi" value={duration(kpis.avgCycleSec)} hint="İlk operasyondan kalite onayına" />
        <Stat label="Ort. birim maliyet" value={tl(kpis.avgUnitCost)} hint={`İşçilik ${tl(kpis.avgLaborCost)}`} />
        <Stat label="İlk seferde geçme" value={pct(kpis.firstPassYield)} hint={`Stokla üretilebilir: ${kpis.capacity} adet`} />
      </div>

      <Card title="Üretim hattı">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {board.map((stage, i) => (
            <div key={stage.code} className="flex min-w-44 flex-1 items-stretch gap-2">
              <Link
                href={`/istasyon/${stage.code}`}
                className="flex flex-1 flex-col rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition hover:border-zinc-400"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{stage.name}</span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-lg font-semibold tabular-nums ring-1 ring-zinc-200">
                    {stage.units.length}
                  </span>
                </div>
                <div className="mt-3 flex min-h-24 flex-1 flex-col gap-1.5">
                  {stage.units.length === 0 && <div className="py-6 text-center text-xs text-zinc-400">Boş</div>}
                  {stage.units.map((u) => (
                    <div
                      key={u.serialNo}
                      className={`rounded-md px-2 py-1.5 text-xs ${
                        u.status === "IN_PROCESS"
                          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                          : "bg-white text-zinc-700 ring-1 ring-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-mono">
                        {u.serialNo.slice(-6)}
                        {u.reworkCount > 0 && <Wrench size={12} className="text-rose-600" />}
                      </div>
                      {u.status === "IN_PROCESS" && u.startedAt && (
                        <div className="mt-0.5 flex justify-between">
                          <span>{u.worker}</span>
                          <span className="font-mono tabular-nums">
                            {clock((now - new Date(u.startedAt).getTime()) / 1000)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-0.5 border-t border-zinc-200 pt-2 text-[11px] text-zinc-500">
                  <div className="flex justify-between"><span>Tamamlanan</span><span className="tabular-nums">{stage.doneCount}</span></div>
                  <div className="flex justify-between"><span>Ort. süre</span><span>{duration(stage.avgSec)}</span></div>
                  <div className="flex justify-between"><span>İşçilik</span><span>{tl(stage.laborCost)}</span></div>
                </div>
              </Link>
              {i < board.length - 1 && <ChevronRight className="shrink-0 self-center text-zinc-300" size={18} />}
            </div>
          ))}
          <ChevronRight className="shrink-0 self-center text-zinc-300" size={18} />
          <Link
            href="/stok"
            className="flex min-w-32 flex-col items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-emerald-800"
          >
            <span className="text-sm font-semibold">Mamul Depo</span>
            <span className="mt-1 text-3xl font-semibold tabular-nums">{kpis.completedTotal}</span>
            <span className="text-xs">seri numaralı</span>
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Son operasyonlar" className="xl:col-span-2">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Henüz operasyon yok. Bir iş emri açıp malzeme transferi yapın.</p>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Saat</th>
                    <th className={table.th}>Seri No</th>
                    <th className={table.th}>Aşama</th>
                    <th className={table.th}>Operatör</th>
                    <th className={`${table.th} text-right`}>Süre</th>
                    <th className={`${table.th} text-right`}>İşçilik</th>
                    <th className={table.th}>Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td className={table.td}>{time(r.finishedAt)}</td>
                      <td className={table.td}>
                        <Link href={`/urun/${r.serialNo}`} className="font-mono text-sky-700 hover:underline">{r.serialNo}</Link>
                      </td>
                      <td className={table.td}>{r.stage}</td>
                      <td className={table.td}>{r.worker}</td>
                      <td className={table.num}>{duration(r.durationSec)}</td>
                      <td className={table.num}>{tl(r.laborCost)}</td>
                      <td className={table.td}>{r.result && <Badge tone={RESULT[r.result].tone}>{RESULT[r.result].label}</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Stok değeri">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Hammadde depo</dt><dd className="font-medium tabular-nums">{tl(kpis.rawValue)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Üretim depo (WIP)</dt><dd className="font-medium tabular-nums">{tl(kpis.wipValue)}</dd></div>
            <div className="flex justify-between border-t border-zinc-100 pt-3"><dt className="text-zinc-500">Stokla üretilebilir</dt><dd className="font-medium">{kpis.capacity} adet</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
