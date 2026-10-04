import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { laborCost, num, perSecondWage } from '../common/costing.js';
import { EventsService } from '../events/events.service.js';
import type { Prisma, Stage } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockService } from '../stock/stock.service.js';
import { LIMITS, itemCodes } from './checklists.js';

type Tx = Prisma.TransactionClient;

export interface FinishInput {
  answers?: Record<string, { ok: boolean; note?: string }>;
  measurements?: { batteryHealth?: number; maxCpuTemp?: number };
  decision?: 'ACCEPT' | 'REJECT';
  approver?: string;
  reworkStageCode?: string;
  note?: string;
}

const activeOpInclude = { unit: { include: { workOrder: true } }, stage: true, worker: true } as const;
type ActiveOp = Prisma.OperationGetPayload<{ include: typeof activeOpInclude }>;

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly events: EventsService,
  ) {}

  // ── İstasyon ekranı ────────────────────────────────────────

  async station(code: string) {
    const stage = await this.prisma.stage.findUnique({
      where: { code },
      include: {
        workers: { where: { active: true }, orderBy: { name: 'asc' } },
        bomLines: { include: { component: true }, orderBy: { component: { code: 'asc' } } },
      },
    });
    if (!stage) throw new NotFoundException('İstasyon bulunamadı');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [units, recent, todayOps, next] = await Promise.all([
      this.prisma.productionUnit.findMany({
        where: { currentStageId: stage.id, status: { in: ['WAITING', 'IN_PROCESS'] } },
        orderBy: { serialNo: 'asc' },
        include: {
          workOrder: { include: { product: true } },
          operations: { where: { finishedAt: null }, include: { worker: true } },
        },
      }),
      this.prisma.operation.findMany({
        where: { stageId: stage.id, finishedAt: { not: null } },
        orderBy: { finishedAt: 'desc' },
        take: 8,
        include: { unit: true, worker: true },
      }),
      this.prisma.operation.findMany({
        where: { stageId: stage.id, finishedAt: { gte: startOfDay } },
        select: { durationSec: true, laborCost: true },
      }),
      this.prisma.stage.findFirst({
        where: { sequence: { gt: stage.sequence } },
        orderBy: { sequence: 'asc' },
      }),
    ]);

    const reworkStages = await this.prisma.stage.findMany({
      where: { kind: 'ASSEMBLY', sequence: { lt: stage.sequence } },
      orderBy: { sequence: 'asc' },
    });

    return {
      stage: { id: stage.id, code: stage.code, name: stage.name, kind: stage.kind, sequence: stage.sequence },
      next: next ? { code: next.code, name: next.name } : null,
      reworkStages: reworkStages.map((s) => ({ code: s.code, name: s.name })),
      components: stage.bomLines.map((b) => ({
        code: b.component.code,
        name: b.component.name,
        quantity: num(b.quantity),
      })),
      workers: stage.workers.map((w) => {
        const salary = num(w.monthlySalary);
        const active = units.flatMap((u) => u.operations).find((op) => op.workerId === w.id);
        return {
          id: w.id,
          name: w.name,
          monthlySalary: salary,
          perSecond: perSecondWage(salary),
          activeOperationId: active?.id ?? null,
        };
      }),
      queue: units.map((u) => {
        const op = u.operations[0];
        return {
          id: u.id,
          serialNo: u.serialNo,
          status: u.status,
          reworkCount: u.reworkCount,
          workOrderNo: u.workOrder.no,
          product: u.workOrder.product.name,
          operation: op
            ? {
                id: op.id,
                startedAt: op.startedAt,
                worker: { id: op.worker.id, name: op.worker.name, perSecond: perSecondWage(num(op.worker.monthlySalary)) },
              }
            : null,
        };
      }),
      recent: recent.map((op) => ({
        id: op.id,
        serialNo: op.unit.serialNo,
        worker: op.worker.name,
        finishedAt: op.finishedAt,
        durationSec: op.durationSec,
        laborCost: num(op.laborCost),
        result: op.result,
      })),
      today: {
        count: todayOps.length,
        seconds: todayOps.reduce((s, op) => s + (op.durationSec ?? 0), 0),
        laborCost: todayOps.reduce((s, op) => s + num(op.laborCost), 0),
      },
    };
  }

  async start(unitId: number, workerId: number) {
    const op = await this.prisma.$transaction(async (tx) => {
      const [unit, worker] = await Promise.all([
        tx.productionUnit.findUnique({ where: { id: unitId }, include: { workOrder: true } }),
        tx.worker.findUnique({ where: { id: workerId } }),
      ]);
      if (!unit) throw new NotFoundException('Ürün bulunamadı');
      if (!worker) throw new NotFoundException('Çalışan bulunamadı');
      if (unit.currentStageId !== worker.stageId) {
        throw new BadRequestException(`${worker.name} bu istasyonda çalışmıyor`);
      }
      const busy = await tx.operation.findFirst({
        where: { workerId, finishedAt: null },
        include: { unit: true },
      });
      if (busy) throw new BadRequestException(`${worker.name} şu an ${busy.unit.serialNo} üzerinde çalışıyor`);

      // Aynı birimi iki operatörün aynı anda almasını engeller
      const { count } = await tx.productionUnit.updateMany({
        where: { id: unitId, status: 'WAITING' },
        data: { status: 'IN_PROCESS' },
      });
      if (count === 0) throw new BadRequestException(`${unit.serialNo} şu an işlemde`);

      if (unit.workOrder.status === 'RELEASED') {
        await tx.workOrder.update({ where: { id: unit.workOrderId }, data: { status: 'IN_PROGRESS' } });
      }
      return tx.operation.create({
        data: { unitId, stageId: worker.stageId, workerId },
        include: { unit: true, stage: true },
      });
    });
    this.events.emit({ type: 'unit', id: op.unitId, serialNo: op.unit.serialNo, stage: op.stage.code });
    return { id: op.id, startedAt: op.startedAt };
  }

  async cancelOperation(id: number) {
    const op = await this.prisma.operation.findUnique({ where: { id }, include: { unit: true } });
    if (!op || op.finishedAt) throw new BadRequestException('Aktif operasyon bulunamadı');
    await this.prisma.$transaction([
      this.prisma.operation.delete({ where: { id } }),
      this.prisma.productionUnit.update({ where: { id: op.unitId }, data: { status: 'WAITING' } }),
    ]);
    this.events.emit({ type: 'unit', id: op.unitId, serialNo: op.unit.serialNo });
    return { ok: true };
  }

  async finish(id: number, input: FinishInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      const op = await tx.operation.findUnique({ where: { id }, include: activeOpInclude });
      if (!op || op.finishedAt) throw new BadRequestException('Aktif operasyon bulunamadı');
      return this.complete(tx, op, new Date(), input);
    });
    this.events.emit({ type: 'unit', id: result.unitId, serialNo: result.serialNo });
    this.events.emit({ type: 'work-order', id: result.workOrderId });
    if (result.stockChanged) this.events.emit({ type: 'stock' });
    return result;
  }

  // Operasyonu kapatır, işçiliği hesaplar, aşamaya göre stok/kalite işlemlerini yapar ve
  // birimi bir sonraki aşamaya (ya da tamir için geri) aktarır
  private async complete(tx: Tx, op: ActiveOp, finishedAt: Date, input: FinishInput) {
    const durationSec = Math.max(1, Math.round((finishedAt.getTime() - op.startedAt.getTime()) / 1000));
    const cost = laborCost(num(op.worker.monthlySalary), durationSec);
    const unit = op.unit;
    let stockChanged = false;
    let passed = true;

    if (op.stage.kind === 'ASSEMBLY') {
      const bom = await tx.bomLine.findMany({
        where: { productId: unit.workOrder.productId, stageId: op.stageId },
      });
      // Tamirden dönen birim aynı aşamadan tekrar geçerse malzeme ikinci kez düşülmez
      const consumed = await tx.stockMovement.findMany({
        where: { unitId: unit.id, type: 'CONSUME' },
        select: { itemId: true },
      });
      const done = new Set(consumed.map((m) => m.itemId));
      for (const line of bom.filter((b) => !done.has(b.componentId))) {
        await this.stock.move(tx, {
          type: 'CONSUME',
          itemId: line.componentId,
          quantity: num(line.quantity),
          from: 'WIP',
          workOrderId: unit.workOrderId,
          unitId: unit.id,
          note: `${unit.serialNo} / ${op.stage.name}`,
          at: finishedAt,
        });
        stockChanged = true;
      }
    } else {
      const kind = op.stage.kind;
      const answers = input.answers ?? {};
      const missing = itemCodes(kind).filter((c) => typeof answers[c]?.ok !== 'boolean');
      if (missing.length) throw new BadRequestException('Kontrol formundaki tüm maddeler işaretlenmeli');

      const allOk = itemCodes(kind).every((c) => answers[c].ok);
      if (kind === 'TEST') {
        const m = input.measurements ?? {};
        if (m.batteryHealth == null || m.maxCpuTemp == null) {
          throw new BadRequestException('Pil sağlığı ve maksimum CPU sıcaklığı girilmeli');
        }
        passed = allOk && m.batteryHealth >= LIMITS.minBatteryHealth && m.maxCpuTemp <= LIMITS.maxCpuTemp;
      } else {
        if (!input.decision) throw new BadRequestException('Nihai karar seçilmeli');
        if (input.decision === 'ACCEPT' && !allOk) {
          throw new BadRequestException('Reddedilen madde varken kabul verilemez');
        }
        passed = input.decision === 'ACCEPT';
      }
      await tx.inspection.create({
        data: {
          unitId: unit.id,
          operationId: op.id,
          kind,
          answers,
          measurements: input.measurements,
          decision: passed ? 'ACCEPT' : 'REJECT',
          inspector: op.worker.name,
          approver: input.approver,
          createdAt: finishedAt,
        },
      });
    }

    await tx.operation.update({
      where: { id: op.id },
      data: {
        finishedAt,
        durationSec,
        laborCost: cost,
        result: op.stage.kind === 'ASSEMBLY' ? 'DONE' : passed ? 'PASSED' : 'FAILED',
        note: input.note,
      },
    });

    let movedTo: { code: string; name: string } | null = null;
    let completed = false;

    if (!passed) {
      const target = await this.reworkTarget(tx, op.stage, input.reworkStageCode);
      await tx.productionUnit.update({
        where: { id: unit.id },
        data: { status: 'WAITING', currentStageId: target.id, reworkCount: { increment: 1 } },
      });
      movedTo = { code: target.code, name: target.name };
    } else {
      const next = await tx.stage.findFirst({
        where: { sequence: { gt: op.stage.sequence } },
        orderBy: { sequence: 'asc' },
      });
      if (next) {
        await tx.productionUnit.update({
          where: { id: unit.id },
          data: { status: 'WAITING', currentStageId: next.id },
        });
        movedTo = { code: next.code, name: next.name };
      } else {
        await this.stock.move(tx, {
          type: 'PRODUCE',
          itemId: unit.workOrder.productId,
          quantity: 1,
          to: 'FINISHED',
          workOrderId: unit.workOrderId,
          unitId: unit.id,
          note: `Seri No ${unit.serialNo}`,
          at: finishedAt,
        });
        await tx.productionUnit.update({
          where: { id: unit.id },
          data: { status: 'COMPLETED', currentStageId: null, completedAt: finishedAt },
        });
        stockChanged = true;
        completed = true;
        const open = await tx.productionUnit.count({
          where: { workOrderId: unit.workOrderId, status: { not: 'COMPLETED' } },
        });
        if (open === 0) {
          await tx.workOrder.update({
            where: { id: unit.workOrderId },
            data: { status: 'COMPLETED', completedAt: finishedAt },
          });
        }
      }
    }

    return {
      unitId: unit.id,
      serialNo: unit.serialNo,
      workOrderId: unit.workOrderId,
      durationSec,
      laborCost: cost,
      passed,
      completed,
      movedTo,
      stockChanged,
    };
  }

  private async reworkTarget(tx: Tx, from: Stage, code?: string) {
    const candidates = await tx.stage.findMany({
      where: { kind: 'ASSEMBLY', sequence: { lt: from.sequence } },
      orderBy: { sequence: 'desc' },
    });
    const target = code ? candidates.find((s) => s.code === code) : candidates[0];
    if (!target) throw new BadRequestException('Geçersiz tamir aşaması');
    return target;
  }

  // ── İzlenebilirlik ─────────────────────────────────────────

  async unit(serialNo: string) {
    const unit = await this.prisma.productionUnit.findUnique({
      where: { serialNo },
      include: {
        currentStage: true,
        workOrder: { include: { product: true } },
        operations: {
          orderBy: { startedAt: 'asc' },
          include: { stage: true, worker: true, inspection: true },
        },
        movements: { include: { item: true, fromWarehouse: true, toWarehouse: true }, orderBy: { at: 'asc' } },
      },
    });
    if (!unit) throw new NotFoundException('Seri numarası bulunamadı');

    const components = unit.movements
      .filter((m) => m.type === 'CONSUME')
      .map((m) => ({
        code: m.item.code,
        name: m.item.name,
        quantity: num(m.quantity),
        unitPrice: num(m.item.unitPrice),
        cost: num(m.quantity) * num(m.item.unitPrice),
        at: m.at,
      }));
    const operations = unit.operations.map((op) => ({
      id: op.id,
      stage: { code: op.stage.code, name: op.stage.name, kind: op.stage.kind },
      worker: op.worker.name,
      perSecond: perSecondWage(num(op.worker.monthlySalary)),
      startedAt: op.startedAt,
      finishedAt: op.finishedAt,
      durationSec: op.durationSec,
      laborCost: num(op.laborCost),
      result: op.result,
      note: op.note,
      inspection: op.inspection
        ? {
            kind: op.inspection.kind,
            answers: op.inspection.answers as Record<string, { ok: boolean; note?: string }>,
            measurements: op.inspection.measurements as FinishInput['measurements'] | null,
            decision: op.inspection.decision,
            inspector: op.inspection.inspector,
            approver: op.inspection.approver,
            createdAt: op.inspection.createdAt,
          }
        : null,
    }));
    const materialCost = components.reduce((s, c) => s + c.cost, 0);
    const labor = operations.reduce((s, o) => s + o.laborCost, 0);

    return {
      serialNo: unit.serialNo,
      status: unit.status,
      reworkCount: unit.reworkCount,
      createdAt: unit.createdAt,
      completedAt: unit.completedAt,
      stage: unit.currentStage ? { code: unit.currentStage.code, name: unit.currentStage.name } : null,
      workOrder: { id: unit.workOrder.id, no: unit.workOrder.no },
      product: { code: unit.workOrder.product.code, name: unit.workOrder.product.name },
      components,
      operations,
      costs: {
        material: materialCost,
        labor,
        total: materialCost + labor,
        workSeconds: operations.reduce((s, o) => s + (o.durationSec ?? 0), 0),
      },
    };
  }

  async units() {
    const [units, consumed] = await Promise.all([
      this.prisma.productionUnit.findMany({
        orderBy: { serialNo: 'desc' },
        include: {
          currentStage: true,
          workOrder: { include: { product: true } },
          operations: { select: { durationSec: true, laborCost: true, finishedAt: true, worker: { select: { name: true } } } },
          inspections: { where: { kind: 'QUALITY', decision: 'ACCEPT' }, select: { approver: true } },
        },
      }),
      this.prisma.stockMovement.findMany({
        where: { type: 'CONSUME' },
        select: { unitId: true, quantity: true, item: { select: { unitPrice: true } } },
      }),
    ]);
    const material = new Map<number, number>();
    for (const m of consumed) {
      material.set(m.unitId!, (material.get(m.unitId!) ?? 0) + num(m.quantity) * num(m.item.unitPrice));
    }
    return units.map((u) => {
      const labor = u.operations.reduce((s, op) => s + num(op.laborCost), 0);
      const materialCost = material.get(u.id) ?? 0;
      return {
        serialNo: u.serialNo,
        status: u.status,
        reworkCount: u.reworkCount,
        stage: u.currentStage ? { code: u.currentStage.code, name: u.currentStage.name } : null,
        activeWorker: u.operations.find((op) => !op.finishedAt)?.worker.name ?? null,
        workOrder: { id: u.workOrder.id, no: u.workOrder.no },
        product: { code: u.workOrder.product.code, name: u.workOrder.product.name },
        createdAt: u.createdAt,
        completedAt: u.completedAt,
        approver: u.inspections[0]?.approver ?? null,
        workSeconds: u.operations.reduce((s, op) => s + (op.durationSec ?? 0), 0),
        materialCost,
        laborCost: labor,
        totalCost: materialCost + labor,
      };
    });
  }

  // ── Demo simülasyonu ───────────────────────────────────────
  // Bekleyen birimleri gerçekçi sürelerle (geçmiş tarihli) rotanın sonuna kadar yürütür

  async simulate(workOrderId: number) {
    const order = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { units: { where: { status: 'WAITING' }, orderBy: { serialNo: 'asc' } } },
    });
    if (!order) throw new NotFoundException('İş emri bulunamadı');
    if (order.status === 'PLANNED') throw new BadRequestException('Önce malzeme transferi yapılmalı');
    if (!order.units.length) throw new BadRequestException('Simüle edilecek bekleyen ürün yok');

    const stages = await this.prisma.stage.findMany({
      orderBy: { sequence: 'asc' },
      include: { workers: { where: { active: true }, take: 1 } },
    });
    const minutes = (kind: Stage['kind']) =>
      kind === 'ASSEMBLY' ? rand(6, 14) : kind === 'TEST' ? rand(32, 40) : rand(4, 8);
    const now = Date.now();
    const gapMs = 12 * 60_000;

    for (const [i, u] of order.units.entries()) {
      const unit = await this.prisma.productionUnit.findUniqueOrThrow({ where: { id: u.id } });
      const current = stages.find((s) => s.id === unit.currentStageId);
      if (!current) continue;
      const route = stages.filter((s) => s.sequence >= current.sequence);
      const durations = route.map((s) => minutes(s.kind) * 60_000 + rand(0, 59) * 1000);
      const total = durations.reduce((a, b) => a + b, 0);
      let cursor = now - total - (order.units.length - 1 - i) * gapMs;

      await this.prisma.$transaction(
        async (tx) => {
          await tx.workOrder.updateMany({
            where: { id: order.id, status: 'RELEASED' },
            data: { status: 'IN_PROGRESS' },
          });
          for (const [j, stage] of route.entries()) {
            const worker = stage.workers[0];
            if (!worker) throw new BadRequestException(`${stage.name} için çalışan tanımlı değil`);
            const started = new Date(cursor);
            cursor += durations[j];
            const op = await tx.operation.create({
              data: { unitId: u.id, stageId: stage.id, workerId: worker.id, startedAt: started },
              include: activeOpInclude,
            });
            await this.complete(tx, op, new Date(cursor), simulatedAnswers(stage.kind));
          }
        },
        { timeout: 30_000 },
      );
      this.events.emit({ type: 'unit', id: u.id, serialNo: u.serialNo });
    }
    this.events.emit({ type: 'work-order', id: order.id });
    this.events.emit({ type: 'stock' });
    return { simulated: order.units.length };
  }
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulatedAnswers(kind: Stage['kind']): FinishInput {
  if (kind === 'ASSEMBLY') return {};
  const answers = Object.fromEntries(itemCodes(kind).map((c) => [c, { ok: true }]));
  return kind === 'TEST'
    ? { answers, measurements: { batteryHealth: rand(94, 100), maxCpuTemp: rand(72, 88) } }
    : { answers, decision: 'ACCEPT', approver: 'Kalite Müdürü' };
}
