"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { ErrorBox, btn, input } from "@/components/ui";
import type { Answers, Checklists } from "@/lib/api";
import { useLive } from "@/lib/live";

interface Payload {
  answers: Answers;
  measurements?: { batteryHealth: number; maxCpuTemp: number };
  decision?: "ACCEPT" | "REJECT";
  approver?: string;
  reworkStageCode?: string;
}

export function InspectionForm({ kind, serialNo, worker, reworkStages, onClose, onSubmit }: {
  kind: "TEST" | "QUALITY";
  serialNo: string;
  worker: string;
  reworkStages: { code: string; name: string }[];
  onClose: () => void;
  onSubmit: (payload: Payload) => Promise<void>;
}) {
  const { data } = useLive<Checklists>("/checklists");
  const [answers, setAnswers] = useState<Answers>({});
  const [battery, setBattery] = useState("");
  const [cpuTemp, setCpuTemp] = useState("");
  const [approver, setApprover] = useState("");
  const [rework, setRework] = useState(reworkStages.at(-1)?.code ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!data) return null;
  const sections = data[kind];
  const codes = sections.flatMap((s) => s.items.map((i) => i.code));
  const complete = codes.every((c) => answers[c]);
  const anyRed = codes.some((c) => answers[c] && !answers[c].ok);
  const measurementsFail =
    kind === "TEST" &&
    battery !== "" &&
    cpuTemp !== "" &&
    (Number(battery) < data.limits.minBatteryHealth || Number(cpuTemp) > data.limits.maxCpuTemp);
  const willFail = anyRed || measurementsFail;
  const ready = complete && (kind === "QUALITY" || (battery !== "" && cpuTemp !== ""));

  function set(code: string, ok: boolean) {
    setAnswers((a) => ({ ...a, [code]: { ...a[code], ok } }));
  }

  async function submit(decision?: "ACCEPT" | "REJECT") {
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit({
        answers,
        measurements: kind === "TEST" ? { batteryHealth: Number(battery), maxCpuTemp: Number(cpuTemp) } : undefined,
        decision,
        approver: approver || undefined,
        reworkStageCode: rework,
      });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 md:p-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">QA-LP-2026-01 · {kind === "TEST" ? "Test" : "Kalite"}</div>
            <h2 className="text-lg font-semibold">Kalite Kontrol Formu · <span className="font-mono">{serialNo}</span></h2>
            <p className="text-sm text-zinc-500">Kontrol eden: {worker}</p>
          </div>
          <button onClick={onClose} className={btn.ghost}><X size={18} /></button>
        </header>

        <div className="space-y-6 px-6 py-5">
          {sections.map((s) => (
            <section key={s.no}>
              <h3 className="text-sm font-semibold">{s.no}. {s.title}</h3>
              <p className="mb-2 text-xs text-zinc-500">{s.description}</p>
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {s.items.map((item) => {
                  const a = answers[item.code];
                  return (
                    <li key={item.code} className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <div className="text-sm">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-zinc-500">{item.detail}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => set(item.code, true)}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ${
                            a?.ok === true ? "bg-emerald-600 text-white ring-emerald-600" : "text-zinc-600 ring-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <Check size={14} /> OK
                        </button>
                        <button
                          onClick={() => set(item.code, false)}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ${
                            a?.ok === false ? "bg-rose-600 text-white ring-rose-600" : "text-zinc-600 ring-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <X size={14} /> RED
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {kind === "TEST" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Pil sağlık yüzdesi (%)</span>
                <input type="number" className={input} value={battery} onChange={(e) => setBattery(e.target.value)} placeholder={`en az ${data.limits.minBatteryHealth}`} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Maksimum CPU sıcaklığı (°C)</span>
                <input type="number" className={input} value={cpuTemp} onChange={(e) => setCpuTemp(e.target.value)} placeholder={`en fazla ${data.limits.maxCpuTemp}`} />
              </label>
            </div>
          )}

          {kind === "QUALITY" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">6. Kalite Kontrol (QA) Müdürü onayı</span>
              <input className={input} value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Ad Soyad" />
            </label>
          )}

          {(willFail || kind === "QUALITY") && reworkStages.length > 0 && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Red durumunda tamire gönderilecek aşama</span>
              <select className={input} value={rework} onChange={(e) => setRework(e.target.value)}>
                {reworkStages.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
          )}

          <ErrorBox message={error} />
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-6 py-4">
          <button className={btn.secondary} onClick={onClose}>Vazgeç</button>
          {kind === "TEST" ? (
            <button className={willFail ? btn.danger : btn.success} disabled={!ready || busy} onClick={() => submit()}>
              {willFail ? "Kaldı — tamire gönder" : "Geçti — Kalite'ye aktar"}
            </button>
          ) : (
            <>
              <button className={btn.danger} disabled={!complete || busy} onClick={() => submit("REJECT")}>RED — revizyona gönder</button>
              <button className={btn.success} disabled={!complete || anyRed || busy} onClick={() => submit("ACCEPT")}>
                KABUL — Mamul Depo&apos;ya al
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
