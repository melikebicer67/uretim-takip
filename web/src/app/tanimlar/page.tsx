"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Card, ErrorBox, Loading, PageHeader, btn, input, table } from "@/components/ui";
import { patch, type Product, type Stage } from "@/lib/api";
import { tl } from "@/lib/format";
import { useLive } from "@/lib/live";

export default function DefinitionsPage() {
  const products = useLive<Product[]>("/products");
  const stages = useLive<Stage[]>("/stages");

  if (!products.data || !stages.data) return products.error ? <ErrorBox message={products.error} /> : <Loading />;
  const product = products.data[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reçete & Rota"
        subtitle="Mamul reçetesi rota aşamalarına bağlıdır; her aşamanın malzemesi o aşamada sarf edilir"
      />

      {product && (
        <Card title={`Reçete: ${product.code} — ${product.name}`}>
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Rota</th>
                  <th className={table.th}>Kalem kodu</th>
                  <th className={table.th}>Kalem tanımı</th>
                  <th className={`${table.th} text-right`}>Miktar</th>
                  <th className={`${table.th} text-right`}>Fiyat</th>
                  <th className={`${table.th} text-right`}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {product.bom.map((b, i) => (
                  <tr key={b.id}>
                    <td className={`${table.td} font-medium`}>{product.bom[i - 1]?.stage.code === b.stage.code ? "" : b.stage.name}</td>
                    <td className={`${table.td} font-mono text-xs`}>{b.code}</td>
                    <td className={table.td}>{b.name}</td>
                    <td className={table.num}>{b.quantity}</td>
                    <td className={table.num}><PriceInput code={b.code} value={b.unitPrice} /></td>
                    <td className={table.num}>{tl(b.total)}</td>
                  </tr>
                ))}
                {stages.data.filter((s) => s.kind !== "ASSEMBLY").map((s) => (
                  <tr key={s.code} className="text-zinc-500">
                    <td className={`${table.td} font-medium`}>{s.name}</td>
                    <td colSpan={5} className={table.td}>Malzeme yok — kalite kontrol formu (QA-LP-2026-01)</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right text-sm font-medium">Birim malzeme maliyeti</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">{tl(product.materialCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <Card title="Çalışanlar ve saniye maaşı (maaş / 225 saat / 60 / 60)">
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th}>Aşama</th>
                <th className={table.th}>Çalışan</th>
                <th className={`${table.th} text-right`}>Aylık maaş</th>
                <th className={`${table.th} text-right`}>Saniye maliyeti</th>
                <th className={`${table.th} text-right`}>Saatlik</th>
              </tr>
            </thead>
            <tbody>
              {stages.data.flatMap((s) =>
                s.workers.map((w) => (
                  <tr key={w.id}>
                    <td className={`${table.td} font-medium`}>{s.name}</td>
                    <td className={table.td}>{w.name}</td>
                    <td className={table.num}><SalaryInput id={w.id} value={w.monthlySalary} /></td>
                    <td className={`${table.num} font-mono`}>{w.perSecond.toFixed(6)} ₺</td>
                    <td className={table.num}>{tl(w.perSecond * 3600)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SalaryInput({ id, value }: { id: number; value: number }) {
  return <InlineNumber initial={value} onSave={(v) => patch(`/workers/${id}`, { monthlySalary: v })} />;
}

function PriceInput({ code, value }: { code: string; value: number }) {
  return <InlineNumber initial={value} onSave={(v) => patch(`/items/${code}`, { unitPrice: v })} />;
}

function InlineNumber({ initial, onSave }: { initial: number; onSave: (v: number) => Promise<unknown> }) {
  const [value, setValue] = useState(String(initial));
  const [busy, setBusy] = useState(false);
  const dirty = Number(value) !== initial;
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        className={`${input} w-28 py-1 text-right`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className={`${btn.ghost} px-2 ${dirty ? "" : "invisible"}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onSave(Number(value)).finally(() => setBusy(false));
        }}
      >
        <Save size={14} />
      </button>
    </span>
  );
}
