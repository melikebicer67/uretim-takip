"use client";

import { Barcode, Boxes, ClipboardList, Factory, LayoutDashboard, ListTree, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api, type TraceResult } from "@/lib/api";
import { useLiveStatus } from "@/lib/live";

const LINKS = [
  { href: "/", label: "Üretim Panosu", icon: LayoutDashboard },
  { href: "/is-emirleri", label: "İş Emirleri", icon: ClipboardList },
  { href: "/istasyon", label: "İstasyonlar", icon: Factory },
  { href: "/seri-numaralari", label: "Seri Numaraları", icon: Barcode },
  { href: "/stok", label: "Depolar", icon: Boxes },
  { href: "/tanimlar", label: "Reçete & Rota", icon: ListTree },
];

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const live = useLiveStatus();
  const [serial, setSerial] = useState("");
  const [result, setResult] = useState<TraceResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Mamul seri no ise ürün sayfasına, parça seri no ise takıldığı mamulün sayfasına gider
  async function search(q: string) {
    setNotFound(false);
    setResult(null);
    const r = await api<TraceResult>(`/trace?q=${encodeURIComponent(q)}`).catch(() => null);
    if (!r) return;
    if (r.unit) return go(`/urun/${r.unit}`);
    if (r.components.length === 1) return go(`/urun/${r.components[0].unit.serialNo}?parca=${encodeURIComponent(r.components[0].serialNo)}`);
    if (r.components.length === 0) return setNotFound(true);
    setResult(r);
  }

  function go(href: string) {
    setSerial("");
    setResult(null);
    router.push(href);
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800 bg-zinc-950 text-zinc-300 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r print:hidden">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400 text-zinc-950">
          <Factory size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Üretim Takip</div>
          <div className="text-[11px] text-zinc-500">MES Demo</div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                active ? "bg-zinc-800 text-white" : "hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <form
        className="hidden px-3 md:block"
        onSubmit={(e) => {
          e.preventDefault();
          if (serial.trim()) void search(serial.trim());
        }}
      >
        <label className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm">
          <Search size={14} className="text-zinc-500" />
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Bilgisayar / parça seri no…"
            className="w-full bg-transparent text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </label>
        {notFound && <p className="mt-2 px-1 text-xs text-rose-400">Bu seri numarası bulunamadı</p>}
        {result && (
          <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-zinc-900 p-1 text-xs">
            {result.components.slice(0, 20).map((c) => (
              <li key={c.item.code + c.serialNo}>
                <button
                  type="button"
                  onClick={() => go(`/urun/${c.unit.serialNo}?parca=${encodeURIComponent(c.serialNo)}`)}
                  className="w-full rounded px-2 py-1.5 text-left hover:bg-zinc-800"
                >
                  <div className="font-mono text-zinc-200">{c.serialNo}</div>
                  <div className="text-zinc-500">{c.item.name} → {c.unit.serialNo}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      <div className="mt-auto hidden items-center gap-2 px-5 py-4 text-xs text-zinc-500 md:flex">
        <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-400" : "bg-rose-500"}`} />
        {live ? "Canlı bağlantı" : "Bağlantı yok"}
      </div>
    </aside>
  );
}
