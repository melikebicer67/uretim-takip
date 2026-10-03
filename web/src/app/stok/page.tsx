"use client";

import { ArrowRight, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, ErrorBox, Loading, PageHeader, btn, input, table } from "@/components/ui";
import { post, type Movement, type Warehouse } from "@/lib/api";
import { MOVEMENT, dt, qty, tl } from "@/lib/format";
import { useLive } from "@/lib/live";

const COLORS = {
  RAW: "border-t-sky-500",
  WIP: "border-t-amber-500",
  FINISHED: "border-t-emerald-500",
};

export default function StockPage() {
  const warehouses = useLive<Warehouse[]>("/stock");
  const movements = useLive<Movement[]>("/stock/movements");

  if (!warehouses.data) return warehouses.error ? <ErrorBox message={warehouses.error} /> : <Loading />;
  const list = warehouses.data;
  const raw = list.find((w) => w.kind === "RAW");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Depolar"
        subtitle="Hammadde Depo → (iş emri transferi) → Üretim Depo → (aşamalarda sarf) → Mamul Depo"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {list.map((w, i) => (
          <div key={w.code} className="contents">
            <section className={`rounded-xl border border-t-4 border-zinc-200 bg-white shadow-sm ${COLORS[w.kind]}`}>
              <header className="flex items-center justify-between px-4 py-3">
                <h2 className="font-semibold">{w.name}</h2>
                {w.kind !== "FINISHED" && (
                  <span className="text-xs text-zinc-500">{tl(w.items.reduce((s, x) => s + x.quantity * x.unitPrice, 0))}</span>
                )}
              </header>
              <table className={table.table}>
                <thead>
                  <tr>
                    <th className={table.th}>Kalem kodu</th>
                    <th className={table.th}>Kalem tanımı</th>
                    <th className={`${table.th} text-right`}>Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {w.items.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-sm text-zinc-400">Boş</td></tr>
                  )}
                  {w.items.map((it) => (
                    <tr key={it.code}>
                      <td className={`${table.td} font-mono text-xs`}>{it.code}</td>
                      <td className={table.td}>{it.name}</td>
                      <td className={`${table.num} font-medium ${w.kind === "RAW" && it.quantity < 3 ? "text-rose-600" : ""}`}>{qty(it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {w.kind === "FINISHED" && (
                <p className="px-4 py-3 text-xs text-zinc-500">Her mamul seri numarasıyla izlenir; seri numaraları iş emri detayında.</p>
              )}
            </section>
            {i < list.length - 1 && <ArrowRight className="hidden self-center text-zinc-300 lg:block" />}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {raw && <Receipt items={raw.items} />}
        <Card title="Stok hareketleri" className="xl:col-span-2">
          {!movements.data ? (
            <Loading />
          ) : (
            <div className={`${table.wrap} max-h-[480px] overflow-y-auto`}>
              <table className={table.table}>
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className={table.th}>Tarih</th>
                    <th className={table.th}>Tür</th>
                    <th className={table.th}>Kalem</th>
                    <th className={`${table.th} text-right`}>Miktar</th>
                    <th className={table.th}>Nereden → Nereye</th>
                    <th className={table.th}>Belge</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data.map((m) => (
                    <tr key={m.id}>
                      <td className={`${table.td} whitespace-nowrap`}>{dt(m.at)}</td>
                      <td className={`${table.td} whitespace-nowrap`}><Badge tone={MOVEMENT[m.type].tone}>{MOVEMENT[m.type].label}</Badge></td>
                      <td className={table.td}>{m.item.name}</td>
                      <td className={table.num}>{qty(m.quantity)}</td>
                      <td className={`${table.td} whitespace-nowrap text-xs text-zinc-600`}>{m.from ?? "—"} → {m.to ?? "—"}</td>
                      <td className={`${table.td} whitespace-nowrap text-xs`}>
                        {m.serialNo ? (
                          <Link href={`/urun/${m.serialNo}`} className="font-mono text-sky-700 hover:underline">{m.serialNo}</Link>
                        ) : (
                          m.workOrderNo ?? m.note
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Receipt({ items }: { items: Warehouse["items"] }) {
  const [code, setCode] = useState(items[0]?.code ?? "");
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(codes: string[]) {
    setBusy(true);
    setError(undefined);
    try {
      for (const c of codes) await post("/stock/receipt", { code: c, quantity: amount });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Hammadde girişi">
      <div className="space-y-3">
        <select className={input} value={code} onChange={(e) => setCode(e.target.value)}>
          {items.map((it) => <option key={it.code} value={it.code}>{it.code} — {it.name}</option>)}
        </select>
        <input type="number" min={1} className={input} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <ErrorBox message={error} />
        <button className={`${btn.primary} w-full`} disabled={busy || amount < 1} onClick={() => submit([code])}>
          <PackagePlus size={16} /> Giriş yap
        </button>
        <button className={`${btn.secondary} w-full`} disabled={busy || amount < 1} onClick={() => submit(items.map((i) => i.code))}>
          Tüm kalemlere {amount} adet ekle
        </button>
      </div>
    </Card>
  );
}
