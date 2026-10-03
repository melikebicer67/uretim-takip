export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/api";

export class ApiError extends Error {}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("API'ye ulaşılamadı. Sunucu çalışıyor mu?");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new ApiError(message ?? `İstek başarısız (${res.status})`);
  }
  return body as T;
}

export function post<T>(path: string, body?: unknown) {
  return api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function patch<T>(path: string, body: unknown) {
  return api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export type StageKind = "ASSEMBLY" | "TEST" | "QUALITY";
export type UnitStatus = "WAITING" | "IN_PROCESS" | "COMPLETED" | "SCRAPPED";
export type WorkOrderStatus = "PLANNED" | "RELEASED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type OperationResult = "DONE" | "PASSED" | "FAILED" | null;

export interface Worker {
  id: number;
  name: string;
  stageId: number;
  monthlySalary: number;
  perSecond: number;
  stage?: { code: string; name: string };
}

export interface Stage {
  id: number;
  code: string;
  name: string;
  sequence: number;
  kind: StageKind;
  workers: Worker[];
  components: { code: string; name: string; quantity: number; unitPrice: number }[];
}

export interface Product {
  id: number;
  code: string;
  name: string;
  materialCost: number;
  bom: {
    id: number;
    stage: { code: string; name: string };
    code: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export interface Requirements {
  lines: {
    code: string;
    name: string;
    stage: string;
    perUnit: number;
    required: number;
    available: number;
    shortage: number;
    cost: number;
  }[];
  maxProducible: number;
  materialCost: number;
  ok: boolean;
}

export interface WorkOrderRow {
  id: number;
  no: string;
  product: { code: string; name: string };
  quantity: number;
  status: WorkOrderStatus;
  dueDate: string | null;
  createdAt: string;
  completed: number;
  inProcess: number;
}

export interface WorkOrderDetail {
  id: number;
  no: string;
  product: { id: number; code: string; name: string };
  quantity: number;
  status: WorkOrderStatus;
  dueDate: string | null;
  note: string | null;
  createdAt: string;
  releasedAt: string | null;
  completedAt: string | null;
  requirements: Requirements;
  stages: { code: string; name: string; sequence: number; count: number }[];
  units: {
    id: number;
    serialNo: string;
    status: UnitStatus;
    stage: { code: string; name: string; sequence: number } | null;
    activeWorker: string | null;
    reworkCount: number;
    workSeconds: number;
    materialCost: number;
    laborCost: number;
    totalCost: number;
    completedAt: string | null;
  }[];
  totals: { materialCost: number; laborCost: number; completed: number };
}

export interface Station {
  stage: { id: number; code: string; name: string; kind: StageKind; sequence: number };
  next: { code: string; name: string } | null;
  reworkStages: { code: string; name: string }[];
  components: { code: string; name: string; quantity: number }[];
  workers: { id: number; name: string; monthlySalary: number; perSecond: number; activeOperationId: number | null }[];
  queue: {
    id: number;
    serialNo: string;
    status: UnitStatus;
    reworkCount: number;
    workOrderNo: string;
    product: string;
    operation: { id: number; startedAt: string; worker: { id: number; name: string; perSecond: number } } | null;
  }[];
  recent: {
    id: number;
    serialNo: string;
    worker: string;
    finishedAt: string;
    durationSec: number;
    laborCost: number;
    result: OperationResult;
  }[];
  today: { count: number; seconds: number; laborCost: number };
}

export interface ChecklistSection {
  no: number;
  title: string;
  description: string;
  items: { code: string; title: string; detail: string }[];
}

export interface Checklists {
  TEST: ChecklistSection[];
  QUALITY: ChecklistSection[];
  limits: { minBatteryHealth: number; maxCpuTemp: number };
}

export interface Answers {
  [code: string]: { ok: boolean; note?: string };
}

export interface UnitDetail {
  serialNo: string;
  status: UnitStatus;
  reworkCount: number;
  createdAt: string;
  completedAt: string | null;
  stage: { code: string; name: string } | null;
  workOrder: { id: number; no: string };
  product: { code: string; name: string };
  components: { code: string; name: string; quantity: number; unitPrice: number; cost: number; at: string }[];
  operations: {
    id: number;
    stage: { code: string; name: string; kind: StageKind };
    worker: string;
    perSecond: number;
    startedAt: string;
    finishedAt: string | null;
    durationSec: number | null;
    laborCost: number;
    result: OperationResult;
    note: string | null;
    inspection: {
      kind: StageKind;
      answers: Answers;
      measurements: { batteryHealth?: number; maxCpuTemp?: number } | null;
      decision: "ACCEPT" | "REJECT";
      inspector: string;
      approver: string | null;
      createdAt: string;
    } | null;
  }[];
  costs: { material: number; labor: number; total: number; workSeconds: number };
}

export interface Warehouse {
  code: string;
  name: string;
  kind: "RAW" | "WIP" | "FINISHED";
  items: { code: string; name: string; quantity: number; unitPrice: number }[];
}

export interface Movement {
  id: number;
  type: "RECEIPT" | "TRANSFER" | "CONSUME" | "PRODUCE";
  at: string;
  item: { code: string; name: string };
  quantity: number;
  from: string | null;
  to: string | null;
  workOrderNo: string | null;
  serialNo: string | null;
  note: string | null;
}

export interface Dashboard {
  kpis: {
    openOrders: number;
    wip: number;
    completedToday: number;
    completedTotal: number;
    avgCycleSec: number | null;
    avgUnitCost: number | null;
    avgLaborCost: number | null;
    firstPassYield: number | null;
    capacity: number;
    rawValue: number;
    wipValue: number;
  };
  board: {
    code: string;
    name: string;
    kind: StageKind;
    units: { serialNo: string; status: UnitStatus; reworkCount: number; worker: string | null; startedAt: string | null }[];
    doneCount: number;
    avgSec: number | null;
    laborCost: number;
  }[];
  recent: {
    id: number;
    serialNo: string;
    stage: string;
    worker: string;
    finishedAt: string;
    durationSec: number;
    laborCost: number;
    result: OperationResult;
  }[];
}
