"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card, ErrorBox, Loading, PageHeader, Stat, btn, table } from "@/components/ui";
import type { Answers, Checklists, UnitDetail } from "@/lib/api";
import { RESULT, UNIT_STATUS, dt, duration, time, tl } from "@/lib/format";
import { useLive } from "@/lib/live";

export default function UnitPage() {
  const { serial } = useParams<{ serial: string }>();
  const { data, error } = useLive<UnitDetail>(`/units/${encodeURIComponent(decodeURIComponent(serial))}`);
  const checklists = useLive<Checklists>("/checklists");

  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;
  const s = UNIT_STATUS[data.status];

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <span className="font-mono">{data.serialNo}</span>
              <Badge tone={s.tone}>{s.label}</Badge>
            </span>
          }
          subtitle={
            <>
              {data.product.code} — {data.product.name} · İş emri{" "}
              <Link href={`/is-emirleri/${data.workOrder.id}`} className="font-mono text-sky-700 hover:underline">{data.workOrder.no}</Link>
              {data.stage && <> · Şu an: <b>{data.stage.name}</b></>}
            </>
          }
          actions={
            <button className={btn.secondary} onClick={() => window.print()}>
              <Printer size={16} /> Kalite formunu yazdır
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Malzeme maliyeti" value={tl(data.costs.material)} />
          <Stat label="İşçilik maliyeti" value={tl(data.costs.labor)} />
          <Stat label="Toplam üretim maliyeti" value={tl(data.costs.total)} />
          <Stat label="Toplam çalışma süresi" value={duration(data.costs.workSeconds)} hint={data.reworkCount ? `${data.reworkCount} kez tamire döndü` : undefined} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Card title="Rota geçmişi" className="xl:col-span-2">
            <ol className="relative space-y-4 border-l border-zinc-200 pl-6">
              {data.operations.map((op) => (
                <li key={op.id} className="relative">
                  <span
                    className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                      !op.finishedAt ? "bg-amber-500" : op.result === "FAILED" ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">
                      {op.stage.name} <span className="text-sm font-normal text-zinc-500">· {op.worker}</span>
                    </div>
                    {op.result ? <Badge tone={RESULT[op.result].tone}>{RESULT[op.result].label}</Badge> : <Badge tone="amber">İşlemde</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {dt(op.startedAt)} → {op.finishedAt ? time(op.finishedAt) : "…"} · {duration(op.durationSec)} · {tl(op.laborCost)}
                    <span className="ml-1 text-zinc-400">({op.perSecond.toFixed(4)} ₺/sn)</span>
                  </div>
                  {op.inspection?.measurements && (
                    <div className="mt-1 text-xs text-zinc-600">
                      Pil sağlığı %{op.inspection.measurements.batteryHealth} · Maks. CPU {op.inspection.measurements.maxCpuTemp}°C
                    </div>
                  )}
                  {op.inspection && Object.values(op.inspection.answers).some((a) => !a.ok) && checklists.data && (
                    <div className="mt-1 text-xs text-rose-700">
                      RED: {failedTitles(op.inspection.answers, checklists.data, op.inspection.kind as "TEST" | "QUALITY").join(", ")}
                    </div>
                  )}
                </li>
              ))}
              {data.status === "COMPLETED" && (
                <li className="relative">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-emerald-700 ring-4 ring-white" />
                  <div className="font-medium text-emerald-800">Mamul Depo&apos;ya giriş</div>
                  <div className="text-xs text-zinc-500">{dt(data.completedAt)}</div>
                </li>
              )}
            </ol>
          </Card>
          <Card title="Takılan bileşenler">
            <table className={table.table}>
              <tbody>
                {data.components.map((c) => (
                  <tr key={c.code}>
                    <td className={table.td}>{c.name}<div className="font-mono text-[11px] text-zinc-400">{c.code}</div></td>
                    <td className={table.num}>{tl(c.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-3 py-2 text-sm font-medium">Toplam</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">{tl(data.costs.material)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      </div>

      {checklists.data && <PrintableForm unit={data} checklists={checklists.data} />}
    </div>
  );
}

function failedTitles(answers: Answers, lists: Checklists, kind: "TEST" | "QUALITY") {
  return lists[kind].flatMap((s) => s.items).filter((i) => answers[i.code] && !answers[i.code].ok).map((i) => i.title);
}

// Sayfa2'deki QA-LP-2026-01 formunun doldurulmuş hali; ekranda önizleme, yazdırırken tek başına basılır
function PrintableForm({ unit, checklists }: { unit: UnitDetail; checklists: Checklists }) {
  const last = (kind: "TEST" | "QUALITY") =>
    unit.operations.filter((o) => o.inspection?.kind === kind).at(-1)?.inspection ?? null;
  const test = last("TEST");
  const quality = last("QUALITY");
  const comp = (name: string) => {
    const c = unit.components.find((x) => x.name === name);
    return c ? `${c.name} (${c.code})` : "—";
  };
  const mark = (ok: boolean | undefined) => (ok === undefined ? "[   ]" : ok ? "[ OK ]" : "[ RED ]");

  const sections = [...checklists.QUALITY.filter((s) => s.no === 2), ...checklists.TEST, ...checklists.QUALITY.filter((s) => s.no === 5)];

  return (
    <Card title="Laptop Üretim Kalite Kontrol ve Onay Formu" className="print:border-0 print:shadow-none">
      <div className="mx-auto max-w-3xl space-y-5 text-sm print:max-w-none">
        <div className="text-center print:block">
          <div className="text-base font-bold">LAPTOP ÜRETİM KALİTE KONTROL VE ONAY FORMU</div>
          <div className="text-xs text-zinc-600">
            Form No: QA-LP-2026-01 | Tarih: {quality ? dt(quality.createdAt).split(" ")[0] : "—"} | Vardiya: A
          </div>
        </div>

        <FormSection title="1. Ürün ve Seri Numarası Bilgileri">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
            <dt className="text-zinc-500">Ürün Modeli / Serisi</dt><dd>{unit.product.name} ({unit.product.code})</dd>
            <dt className="text-zinc-500">Cihaz Seri No (S/N)</dt><dd className="font-mono">{unit.serialNo}</dd>
            <dt className="text-zinc-500">İş Emri</dt><dd className="font-mono">{unit.workOrder.no}</dd>
            <dt className="text-zinc-500">Anakart / İşlemci</dt><dd>{comp("Anakart")} / {comp("İşlemci")}</dd>
            <dt className="text-zinc-500">RAM / Depolama</dt><dd>{comp("RAM")} / {comp("SSD")}</dd>
          </dl>
        </FormSection>

        {sections.map((s) => {
          const source = checklists.TEST.includes(s) ? test : quality;
          return (
            <FormSection key={s.no} title={`${s.no}. ${s.title}`}>
              <p className="mb-2 text-xs text-zinc-500">{s.description}</p>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {s.items.map((i) => {
                    const a = source?.answers[i.code];
                    return (
                      <tr key={i.code} className="border-b border-zinc-100">
                        <td className="py-1.5 pr-3 font-medium">{i.title}</td>
                        <td className="py-1.5 pr-3 text-zinc-600">{i.detail}</td>
                        <td className={`py-1.5 text-right font-mono font-semibold ${a?.ok === false ? "text-rose-700" : "text-emerald-700"}`}>{mark(a?.ok)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {s.no === 4 && test?.measurements && (
                <p className="mt-2 text-xs">
                  Pil Sağlık Yüzdesi: <b>%{test.measurements.batteryHealth}</b> · Maksimum CPU Sıcaklığı: <b>{test.measurements.maxCpuTemp} °C</b>
                </p>
              )}
            </FormSection>
          );
        })}

        <FormSection title="6. Kalite Departmanı Onayı">
          <p className="text-xs text-zinc-600">
            Bu dokümanda belirtilen laptop, fabrikamızın ISO 9001 ve ISO 14001 kalite standartlarına uygun olarak üretilmiş ve tüm test aşamalarını
            başarıyla tamamlamıştır.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
            <dt className="text-zinc-500">Testi Gerçekleştiren Teknisyen</dt><dd>{test?.inspector ?? "—"}</dd>
            <dt className="text-zinc-500">Kalite Kontrol Sorumlusu</dt><dd>{quality?.inspector ?? "—"}</dd>
            <dt className="text-zinc-500">Kalite Kontrol (QA) Müdürü</dt><dd>{quality?.approver ?? "—"}</dd>
            <dt className="text-zinc-500">Nihai Karar</dt>
            <dd className="font-semibold">
              {quality ? (quality.decision === "ACCEPT" ? "[X] KABUL (Sevkiyata Uygun)" : "[X] RED (Revizyona Gönderildi)") : "—"}
            </dd>
          </dl>
        </FormSection>
      </div>
    </Card>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="mb-2 border-b border-zinc-300 pb-1 text-xs font-bold uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  );
}
