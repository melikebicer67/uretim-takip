import type { Prisma } from '../generated/prisma/client.js';

// Excel'deki "SANİYE MAAŞ" formülü: maaş / 225 saat / 60 / 60
export const MONTHLY_WORK_HOURS = 225;

export function perSecondWage(monthlySalary: number): number {
  return monthlySalary / MONTHLY_WORK_HOURS / 3600;
}

export function laborCost(monthlySalary: number, durationSec: number): number {
  return Math.round(perSecondWage(monthlySalary) * durationSec * 10000) / 10000;
}

export function num(value: Prisma.Decimal | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export function year(): number {
  return new Date().getFullYear();
}

export function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}
