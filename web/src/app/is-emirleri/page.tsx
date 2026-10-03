"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Card, ErrorBox, Loading, PageHeader, btn, input, table } from "@/components/ui";
import { post, type Product, type Requirements, type WorkOrderRow } from "@/lib/api";
import { WORK_ORDER_STATUS, dt, qty, tl } from "@/lib/format";
import { useLive } from "@/lib/live";

export default function WorkOrdersPage() {
  const orders = useLive<WorkOrderRow[]>("/work-orders");
  const products = useLive<Product[]>("/products");

  return (
    <div className="space-y-6">
      <PageHeader title="İş Emirleri" subtitle="Reçeteye göre malzeme ihtiyacı hammadde stoğuyla karşılaştırılır" />
      {products.data && <NewOrder products={products.data} />}
      <Card title="Tüm iş emirleri">
        <ErrorBox message={orders.error} />
        {!orders.data ? (
          <Loading />
        ) : orders.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">Henüz iş emri yok.</p>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>No</th>
                  <th className={table.th}>Mamul</th>
                  <th className={`${table.th} text-right`}>Miktar</th>
                  <th className={table.th}>İlerleme</th>
                  <th className={table.th}>Durum</th>
                  <th className={table.th}>Termin</th>
                  <th className={table.th}>Oluşturma</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((o) => {
                  const s = WORK_ORDER_STATUS[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-zinc-50">
                      <td className={table.td}>
                        <Link href={`/is-emirleri/${o.id}`} className="font-mono font-medium text-sky-700 hover:underline">{o.no}</Link>
                      </td>
                      <td className={table.td}>{o.product.name} <span className="text-xs text-zinc-400">{o.product.code}</span></td>
                      <td className={table.num}>{o.quantity}</td>
                      <td className={table.td}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-zinc-100">
                            <div className="h-full bg-emerald-500" style={{ width: `${(o.completed / o.quantity) * 100}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-zinc-500">{o.completed}/{o.quantity}</span>
                        </div>
                      </td>
                      <td className={table.td}><Badge tone={s.tone}>{s.label}</Badge></td>
                      <td className={table.td}>{o.dueDate ? dt(o.dueDate).split(" ")[0] : "—"}</td>
                      <td className={table.td}>{dt(o.createdAt)}</td>
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

function NewOrder({ products }: { products: Product[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [quantity, setQuantity] = useState(5);
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const valid = productId > 0 && quantity >= 1;
  const preview = useLive<Requirements>(valid ? `/work-orders/preview?productId=${productId}&quantity=${quantity}` : null);

  async function create() {
    setBusy(true);
    setError(undefined);
    try {
      const wo = await post<{ id: number }>("/work-orders", {
        productId,
        quantity,
        dueDate: dueDate || undefined,
      });
      router.push(`/is-emirleri/${wo.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card title="Yeni iş emri">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Mamul</span>
            <select className={input} value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Miktar</span>
            <input
              type="number"
              min={1}
              max={500}
              className={input}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Termin (opsiyonel)</span>
            <input type="date" className={input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <ErrorBox message={error} />
          <button className={`${btn.primary} w-full`} disabled={!valid || busy} onClick={create}>
            <Plus size={16} /> İş emri oluştur
          </button>
          {preview.data && (
            <p className="text-xs text-zinc-500">
              Mevcut hammaddeyle en fazla <b>{preview.data.maxProducible}</b> adet üretilebilir.
            </p>
          )}
        </div>
        <div>
          {preview.data && (
            <>
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead>
                    <tr>
                      <th className={table.th}>Aşama</th>
                      <th className={table.th}>Kalem</th>
                      <th className={`${table.th} text-right`}>İhtiyaç</th>
                      <th className={`${table.th} text-right`}>Hammadde stok</th>
                      <th className={`${table.th} text-right`}>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.lines.map((l) => (
                      <tr key={l.code} className={l.shortage ? "bg-rose-50" : ""}>
                        <td className={table.td}>{l.stage}</td>
                        <td className={table.td}>{l.name} <span className="text-xs text-zinc-400">{l.code}</span></td>
                        <td className={table.num}>{qty(l.required)}</td>
                        <td className={`${table.num} ${l.shortage ? "font-semibold text-rose-700" : ""}`}>
                          {qty(l.available)}
                          {l.shortage > 0 && <span className="ml-1 text-xs">(−{qty(l.shortage)})</span>}
                        </td>
                        <td className={table.num}>{tl(l.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium">Toplam malzeme maliyeti</td>
                      <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">{tl(preview.data.materialCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {!preview.data.ok && (
                <p className="mt-3 text-sm text-rose-700">
                  Stok yetersiz: iş emri oluşturulabilir ancak malzeme transferi için önce hammadde girişi yapılmalı.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
