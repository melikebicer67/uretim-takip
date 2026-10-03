"use client";

import { ClipboardCheck, Cpu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";
import type { Dashboard } from "@/lib/api";
import { useLive } from "@/lib/live";

const ICONS = { ASSEMBLY: Cpu, TEST: ClipboardCheck, QUALITY: ShieldCheck };

export default function StationsPage() {
  const { data, error } = useLive<Dashboard>("/dashboard");
  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;

  return (
    <div>
      <PageHeader title="İstasyonlar" subtitle="Operatör ekranı: istasyonu seçin, sıradaki ürünü başlatın ve bitirin" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.board.map((s, i) => {
          const Icon = ICONS[s.kind];
          const active = s.units.filter((u) => u.status === "IN_PROCESS").length;
          return (
            <Link
              key={s.code}
              href={`/istasyon/${s.code}`}
              className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400 hover:shadow"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-zinc-900 text-amber-400">
                  <Icon size={22} />
                </div>
                <span className="text-xs text-zinc-400">Rota {i + 1}</span>
              </div>
              <div className="mt-4 text-lg font-semibold">{s.name}</div>
              <div className="mt-1 flex gap-4 text-sm text-zinc-500">
                <span><b className="text-zinc-900">{s.units.length - active}</b> sırada</span>
                <span><b className="text-amber-700">{active}</b> işlemde</span>
                <span><b className="text-zinc-900">{s.doneCount}</b> tamamlandı</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
