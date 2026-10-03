import type { Tone } from "@/lib/format";

const TONES: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function Badge({ tone = "zinc", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ title, actions, children, className = "" }: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
}

export function Loading() {
  return <div className="py-16 text-center text-sm text-zinc-400">Yükleniyor…</div>;
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40",
  success:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40",
};

export const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

export const table = {
  wrap: "overflow-x-auto",
  table: "w-full text-sm",
  th: "border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500",
  td: "border-b border-zinc-100 px-3 py-2",
  num: "border-b border-zinc-100 px-3 py-2 text-right tabular-nums",
};
