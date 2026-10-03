const tryFmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat("tr-TR");
const dateFmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" });
const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeStyle: "medium" });

export const tl = (n: number | null | undefined) => (n == null ? "—" : tryFmt.format(n));
export const qty = (n: number) => numFmt.format(n);
export const dt = (s: string | null | undefined) => (s ? dateFmt.format(new Date(s)) : "—");
export const time = (s: string | null | undefined) => (s ? timeFmt.format(new Date(s)) : "—");
export const pct = (n: number | null) => (n == null ? "—" : `%${Math.round(n * 100)}`);

export function duration(sec: number | null | undefined) {
  if (sec == null) return "—";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h} sa ${m} dk`;
  if (m) return `${m} dk ${r} sn`;
  return `${r} sn`;
}

export function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${p(h)}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}

export const WORK_ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PLANNED: { label: "Planlandı", tone: "zinc" },
  RELEASED: { label: "Malzeme aktarıldı", tone: "blue" },
  IN_PROGRESS: { label: "Üretimde", tone: "amber" },
  COMPLETED: { label: "Tamamlandı", tone: "green" },
  CANCELLED: { label: "İptal", tone: "red" },
};

export const UNIT_STATUS: Record<string, { label: string; tone: Tone }> = {
  WAITING: { label: "Sırada", tone: "zinc" },
  IN_PROCESS: { label: "İşlemde", tone: "amber" },
  COMPLETED: { label: "Mamul depoda", tone: "green" },
  SCRAPPED: { label: "Hurda", tone: "red" },
};

export const RESULT: Record<string, { label: string; tone: Tone }> = {
  DONE: { label: "Tamamlandı", tone: "blue" },
  PASSED: { label: "Geçti", tone: "green" },
  FAILED: { label: "Kaldı", tone: "red" },
};

export const MOVEMENT: Record<string, { label: string; tone: Tone }> = {
  RECEIPT: { label: "Giriş", tone: "green" },
  TRANSFER: { label: "Transfer", tone: "blue" },
  CONSUME: { label: "Sarf", tone: "amber" },
  PRODUCE: { label: "Mamul girişi", tone: "green" },
};

export type Tone = "zinc" | "blue" | "amber" | "green" | "red";
