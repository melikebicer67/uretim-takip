"use client";

import { ArrowRight, Check, Play, ScanBarcode, Sparkles, Undo2, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { Badge, Card, ErrorBox, Loading, PageHeader, btn, input, table } from "@/components/ui";
import { post, type Station } from "@/lib/api";
import { RESULT, clock, duration, time, tl } from "@/lib/format";
import { useLive, useNow } from "@/lib/live";
import { InspectionForm } from "./inspection-form";

type Active = NonNullable<Station["queue"][number]["operation"]> & { unitId: number; serialNo: string; installed: string[] };
type SerialInput = { itemCode: string; serialNo: string };

export default function StationPage() {
  const { code } = useParams<{ code: string }>();
  const { data, error, reload } = useLive<Station>(`/stations/${code}`);
  const [workerId, setWorkerId] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [inspecting, setInspecting] = useState<Active>();
  const [flash, setFlash] = useState<string>();

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError(undefined);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;

  const selected = data.workers.find((w) => w.id === workerId) ?? data.workers[0];
  const waiting = data.queue.filter((u) => u.status === "WAITING");
  const active: Active[] = data.queue
    .filter((u) => u.operation)
    .map((u) => ({ ...u.operation!, unitId: u.id, serialNo: u.serialNo, installed: u.installed }));
  const isAssembly = data.stage.kind === "ASSEMBLY";

  function finish(op: Active, componentSerials: SerialInput[]) {
    if (!isAssembly) return setInspecting(op);
    return run(async () => {
      const r = await post<{ movedTo: { name: string } | null }>(`/operations/${op.id}/finish`, { componentSerials });
      setFlash(`${op.serialNo} → ${r.movedTo?.name ?? "Mamul Depo"} aktarıldı`);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${data.stage.name} İstasyonu`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Sonraki aşama: <b>{data.next?.name ?? "Mamul Depo"}</b>
            <span className="text-zinc-300">·</span>
            Bugün {data.today.count} operasyon, {duration(data.today.seconds)}, işçilik {tl(data.today.laborCost)}
          </span>
        }
        actions={<Link href="/istasyon" className={btn.secondary}>Tüm istasyonlar</Link>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-500">Operatör:</span>
        {data.workers.map((w) => (
          <button
            key={w.id}
            onClick={() => setWorkerId(w.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ${
              selected?.id === w.id ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-700 ring-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <User size={14} /> {w.name}
            <span className="text-xs opacity-60">{w.perSecond.toFixed(4)} ₺/sn</span>
          </button>
        ))}
      </div>

      <ErrorBox message={actionError} />
      {flash && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2"><Check size={16} /> {flash}</span>
          <button onClick={() => setFlash(undefined)} className="text-emerald-600">Kapat</button>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((op) => (
            <ActiveCard
              key={op.id}
              op={op}
              components={isAssembly ? data.components : []}
              busy={busy}
              onFinish={(serials) => finish(op, serials)}
              onCancel={() => run(() => post(`/operations/${op.id}/cancel`))}
              finishLabel={isAssembly ? `Bitir → ${data.next?.name ?? "Mamul Depo"}` : "Kontrol formunu doldur"}
            />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={`Sıradaki ürünler (${waiting.length})`} className="xl:col-span-2">
          {waiting.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">Bu istasyonda bekleyen ürün yok.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {waiting.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2 font-mono font-medium">
                      {u.serialNo}
                      {u.reworkCount > 0 && <Badge tone="red"><Wrench size={12} /> Tamir dönüşü</Badge>}
                    </div>
                    <div className="text-xs text-zinc-500">{u.workOrderNo} · {u.product}</div>
                  </div>
                  <button
                    className={btn.primary}
                    disabled={busy || !selected || selected.activeOperationId !== null}
                    title={selected?.activeOperationId ? `${selected.name} başka bir üründe çalışıyor` : undefined}
                    onClick={() => selected && run(() => post("/operations", { unitId: u.id, workerId: selected.id }))}
                  >
                    <Play size={16} /> {selected?.name} başlat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={isAssembly ? "Bu aşamada takılan malzemeler" : "Kontrol"}>
          {isAssembly ? (
            <ul className="space-y-2 text-sm">
              {data.components.map((c) => (
                <li key={c.code} className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2">
                  <span>{c.name} <span className="text-xs text-zinc-400">{c.code}</span></span>
                  <span className="font-medium">{c.quantity} adet</span>
                </li>
              ))}
              <li className="pt-1 text-xs text-zinc-500">Operasyon bitince Üretim Depo&apos;dan sarf edilir.</li>
            </ul>
          ) : (
            <p className="text-sm text-zinc-600">
              {data.stage.kind === "TEST"
                ? "Fonksiyonel testler ve burn-in (QA-LP-2026-01 bölüm 3-4). Kalan ürün seçilen montaj aşamasına tamire döner."
                : "Montaj doğrulama, yazılım kontrolü ve nihai onay (QA-LP-2026-01 bölüm 2, 5, 6). Kabul edilen ürün Mamul Depo'ya girer."}
            </p>
          )}
        </Card>
      </div>

      <Card title="Son tamamlananlar">
        {data.recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">—</p>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Saat</th>
                  <th className={table.th}>Seri No</th>
                  <th className={table.th}>Operatör</th>
                  <th className={`${table.th} text-right`}>Süre</th>
                  <th className={`${table.th} text-right`}>İşçilik</th>
                  <th className={table.th}>Sonuç</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id}>
                    <td className={table.td}>{time(r.finishedAt)}</td>
                    <td className={table.td}><Link href={`/urun/${r.serialNo}`} className="font-mono text-sky-700 hover:underline">{r.serialNo}</Link></td>
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

      {inspecting && (
        <InspectionForm
          kind={data.stage.kind as "TEST" | "QUALITY"}
          serialNo={inspecting.serialNo}
          worker={inspecting.worker.name}
          reworkStages={data.reworkStages}
          onClose={() => setInspecting(undefined)}
          onSubmit={async (payload) => {
            const r = await post<{ passed: boolean; movedTo: { name: string } | null }>(`/operations/${inspecting.id}/finish`, payload);
            setInspecting(undefined);
            setFlash(
              r.passed
                ? `${inspecting.serialNo} → ${r.movedTo?.name ?? "Mamul Depo"} aktarıldı`
                : `${inspecting.serialNo} kaldı, ${r.movedTo?.name} aşamasına tamire gönderildi`,
            );
            await reload();
          }}
        />
      )}
    </div>
  );
}

function ActiveCard({ op, components, busy, onFinish, onCancel, finishLabel }: {
  op: Active;
  components: Station["components"];
  busy: boolean;
  onFinish: (serials: SerialInput[]) => void;
  onCancel: () => void;
  finishLabel: string;
}) {
  const now = useNow();
  const elapsed = (now - new Date(op.startedAt).getTime()) / 1000;
  // Seri takipli her parça adedi için bir alan; tamirden dönen üründe takılı parçalar atlanır
  const slots = components
    .filter((c) => c.serialTracked && !op.installed.includes(c.code))
    .flatMap((c) => Array.from({ length: c.quantity }, (_, i) => ({ key: `${c.code}#${i}`, code: c.code, name: c.name })));
  const reinstall = components.length > 0 && components.every((c) => op.installed.includes(c.code));
  const [serials, setSerials] = useState<Record<string, string>>({});
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const filled = slots.every((s) => serials[s.key]?.trim());

  function submit() {
    if (!filled) return;
    onFinish(slots.map((s) => ({ itemCode: s.code, serialNo: serials[s.key].trim() })));
  }

  function autofill() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const gen = (code: string) =>
      `${code.split(".").at(-1)}-${Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")}`;
    setSerials(Object.fromEntries(slots.map((s) => [s.key, serials[s.key] || gen(s.code)])));
  }

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700">İşlemde · {op.worker.name}</div>
          <div className="mt-1 font-mono text-xl font-semibold">{op.serialNo}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-semibold tabular-nums text-amber-900">{clock(elapsed)}</div>
          <div className="text-xs text-amber-800">İşçilik {tl(elapsed * op.worker.perSecond)}</div>
        </div>
      </div>

      {slots.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-amber-900">
            <span className="flex items-center gap-1"><ScanBarcode size={14} /> Takılan parçaların seri numarasını okutun</span>
            <button type="button" onClick={autofill} className="inline-flex items-center gap-1 rounded px-2 py-1 text-amber-800 hover:bg-amber-100">
              <Sparkles size={12} /> Demo: otomatik doldur
            </button>
          </div>
          {slots.map((slot, i) => (
            <label key={slot.key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm">{slot.name}</span>
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                autoFocus={i === 0}
                className={`${input} font-mono uppercase`}
                placeholder="Seri no"
                value={serials[slot.key] ?? ""}
                onChange={(e) => setSerials((s) => ({ ...s, [slot.key]: e.target.value }))}
                onKeyDown={(e) => {
                  // Barkod okuyucu Enter gönderir: sonraki alana geç, son alanda bitir
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (i < slots.length - 1) refs.current[i + 1]?.focus();
                  else submit();
                }}
              />
            </label>
          ))}
        </div>
      )}
      {reinstall && (
        <p className="mt-4 rounded-md bg-white px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          Tamir dönüşü: bu aşamanın parçaları daha önce takıldı, seri numaraları kayıtlı.
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button className={`${btn.success} flex-1 py-3 text-base`} disabled={busy || !filled} onClick={submit}>
          {finishLabel} <ArrowRight size={18} />
        </button>
        <button className={btn.ghost} disabled={busy} onClick={onCancel} title="Yanlışlıkla başlatıldıysa geri al">
          <Undo2 size={16} />
        </button>
      </div>
    </div>
  );
}
