"use client";

import { ArrowRightLeft, FastForward, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Card, ErrorBox, Loading, PageHeader, Stat, btn, table } from "@/components/ui";
import { post, type WorkOrderDetail } from "@/lib/api";
import { UNIT_STATUS, WORK_ORDER_STATUS, dt, duration, qty, tl } from "@/lib/format";
import { useLive } from "@/lib/live";

export default function WorkOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useLive<WorkOrderDetail>(`/work-orders/${id}`);
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  async function run(name: string, path: string) {
    setBusy(name);
    setActionError(undefined);
    try {
      await post(path);
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;
  const status = WORK_ORDER_STATUS[data.status];
  const waiting = data.units.filter((u) => u.status === "WAITING").length;
  const n = data.totals.completed;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{data.no}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
        subtitle={`${data.product.code} — ${data.product.name} · ${data.quantity} adet · Oluşturma ${dt(data.createdAt)}`}
        actions={
          <>
            {data.status === "PLANNED" && (
              <>
                <button className={btn.secondary} disabled={!!busy} onClick={() => run("cancel", `/work-orders/${id}/cancel`)}>
                  <X size={16} /> İptal
                </button>
                <button className={btn.primary} disabled={!!busy || !data.requirements.ok} onClick={() => run("release", `/work-orders/${id}/release`)}>
                  <ArrowRightLeft size={16} /> {busy === "release" ? "Aktarılıyor…" : "Malzeme transferi & seri no ver"}
                </button>
              </>
            )}
            {(data.status === "RELEASED" || data.status === "IN_PROGRESS") && waiting > 0 && (
              <button
                className={btn.secondary}
                disabled={!!busy}
                title="Bekleyen ürünleri gerçekçi sürelerle tüm rotadan geçirir"
                onClick={() => run("simulate", `/work-orders/${id}/simulate`)}
              >
                <FastForward size={16} /> {busy === "simulate" ? "Simüle ediliyor…" : `Demo: ${waiting} ürünü simüle et`}
              </button>
            )}
          </>
        }
      />
      <ErrorBox message={actionError} />

      <Stages data={data} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tamamlanan" value={`${n} / ${data.quantity}`} />
        <Stat label="Malzeme maliyeti" value={tl(data.totals.materialCost)} hint="Sarf edilen" />
        <Stat label="İşçilik maliyeti" value={tl(data.totals.laborCost)} hint="Süre × saniye maaşı" />
        <Stat
          label="Ort. birim maliyet"
          value={n ? tl(data.units.filter((u) => u.status === "COMPLETED").reduce((s, u) => s + u.totalCost, 0) / n) : "—"}
          hint="Tamamlananlar"
        />
      </div>

      {data.status === "PLANNED" ? (
        <Card title="Malzeme ihtiyacı (Hammadde Depo → Üretim Depo)">
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Aşama</th>
                  <th className={table.th}>Kalem</th>
                  <th className={`${table.th} text-right`}>İhtiyaç</th>
                  <th className={`${table.th} text-right`}>Stok</th>
                  <th className={`${table.th} text-right`}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {data.requirements.lines.map((l) => (
                  <tr key={l.code} className={l.shortage ? "bg-rose-50" : ""}>
                    <td className={table.td}>{l.stage}</td>
                    <td className={table.td}>{l.name} <span className="text-xs text-zinc-400">{l.code}</span></td>
                    <td className={table.num}>{qty(l.required)}</td>
                    <td className={table.num}>{qty(l.available)}</td>
                    <td className={table.num}>{tl(l.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.requirements.ok && (
            <p className="mt-3 text-sm text-rose-700">
              Stok yetersiz. <Link href="/stok" className="underline">Depolar</Link> sayfasından hammadde girişi yapın.
            </p>
          )}
        </Card>
      ) : (
        <Card title="Seri numaralı ürünler">
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Seri No</th>
                  <th className={table.th}>Konum</th>
                  <th className={table.th}>Durum</th>
                  <th className={`${table.th} text-right`}>Çalışma süresi</th>
                  <th className={`${table.th} text-right`}>Malzeme</th>
                  <th className={`${table.th} text-right`}>İşçilik</th>
                  <th className={`${table.th} text-right`}>Toplam</th>
                </tr>
              </thead>
              <tbody>
                {data.units.map((u) => {
                  const s = UNIT_STATUS[u.status];
                  return (
                    <tr key={u.id} className="hover:bg-zinc-50">
                      <td className={table.td}>
                        <Link href={`/urun/${u.serialNo}`} className="font-mono text-sky-700 hover:underline">{u.serialNo}</Link>
                        {u.reworkCount > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-rose-600"><Wrench size={12} />{u.reworkCount}</span>
                        )}
                      </td>
                      <td className={table.td}>{u.stage ? u.stage.name : "Mamul Depo"}</td>
                      <td className={table.td}>
                        <Badge tone={s.tone}>{s.label}{u.activeWorker ? ` · ${u.activeWorker}` : ""}</Badge>
                      </td>
                      <td className={table.num}>{duration(u.workSeconds)}</td>
                      <td className={table.num}>{tl(u.materialCost)}</td>
                      <td className={table.num}>{tl(u.laborCost)}</td>
                      <td className={`${table.num} font-medium`}>{tl(u.totalCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stages({ data }: { data: WorkOrderDetail }) {
  const done = data.totals.completed;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      <Step label="Hammadde Depo" value={data.status === "PLANNED" ? "Bekliyor" : "Aktarıldı"} active={data.status === "PLANNED"} />
      {data.stages.map((s) => (
        <Link key={s.code} href={`/istasyon/${s.code}`}>
          <Step label={s.name} value={`${s.count} ürün`} active={s.count > 0} />
        </Link>
      ))}
      <Step label="Mamul Depo" value={`${done} adet`} active={done > 0} done />
    </div>
  );
}

function Step({ label, value, active, done }: { label: string; value: string; active?: boolean; done?: boolean }) {
  return (
    <div
      className={`h-full rounded-lg border px-3 py-2 ${
        done && active
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : active
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-zinc-200 bg-white text-zinc-500"
      }`}
    >
      <div className="text-xs font-medium">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
