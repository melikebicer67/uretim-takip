import { Injectable } from '@nestjs/common';
import { num } from '../common/costing.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [stages, wip, ops, completedUnits, openOrders, stocks, bom, recent] = await Promise.all([
      this.prisma.stage.findMany({ orderBy: { sequence: 'asc' } }),
      this.prisma.productionUnit.findMany({
        where: { status: { in: ['WAITING', 'IN_PROCESS'] } },
        orderBy: { serialNo: 'asc' },
        include: { operations: { where: { finishedAt: null }, include: { worker: true } } },
      }),
      this.prisma.operation.findMany({
        where: { finishedAt: { not: null } },
        select: { stageId: true, durationSec: true, laborCost: true, result: true },
      }),
      this.prisma.productionUnit.findMany({
        where: { status: 'COMPLETED' },
        select: {
          id: true,
          completedAt: true,
          operations: { select: { startedAt: true, laborCost: true }, orderBy: { startedAt: 'asc' } },
        },
      }),
      this.prisma.workOrder.count({ where: { status: { in: ['PLANNED', 'RELEASED', 'IN_PROGRESS'] } } }),
      this.prisma.stock.findMany({ include: { warehouse: true, item: true } }),
      this.prisma.bomLine.findMany({ include: { component: true } }),
      this.prisma.operation.findMany({
        where: { finishedAt: { not: null } },
        orderBy: { finishedAt: 'desc' },
        take: 12,
        include: { unit: true, stage: true, worker: true },
      }),
    ]);

    const consumed = await this.prisma.stockMovement.findMany({
      where: { type: 'CONSUME', unitId: { in: completedUnits.map((u) => u.id) } },
      include: { item: true },
    });
    const materialTotal = consumed.reduce((s, m) => s + num(m.quantity) * num(m.item.unitPrice), 0);
    const laborTotal = completedUnits.reduce(
      (s, u) => s + u.operations.reduce((a, op) => a + num(op.laborCost), 0),
      0,
    );
    const cycleTimes = completedUnits
      .filter((u) => u.completedAt && u.operations.length)
      .map((u) => (u.completedAt!.getTime() - u.operations[0].startedAt.getTime()) / 1000);

    const rawStock = new Map(
      stocks.filter((s) => s.warehouse.kind === 'RAW').map((s) => [s.itemId, num(s.quantity)]),
    );
    const capacity = bom.length
      ? Math.min(...bom.map((b) => Math.floor((rawStock.get(b.componentId) ?? 0) / num(b.quantity))))
      : 0;

    const testOps = ops.filter((op) => op.result === 'PASSED' || op.result === 'FAILED');
    const firstPassYield = testOps.length
      ? testOps.filter((op) => op.result === 'PASSED').length / testOps.length
      : null;

    const warehouseValue = (kind: string) =>
      stocks
        .filter((s) => s.warehouse.kind === kind)
        .reduce((sum, s) => sum + num(s.quantity) * num(s.item.unitPrice), 0);

    return {
      kpis: {
        openOrders,
        wip: wip.length,
        completedToday: completedUnits.filter((u) => u.completedAt && u.completedAt >= startOfDay).length,
        completedTotal: completedUnits.length,
        avgCycleSec: cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : null,
        avgUnitCost: completedUnits.length ? (materialTotal + laborTotal) / completedUnits.length : null,
        avgLaborCost: completedUnits.length ? laborTotal / completedUnits.length : null,
        firstPassYield,
        capacity,
        rawValue: warehouseValue('RAW'),
        wipValue: warehouseValue('WIP'),
      },
      board: stages.map((s) => {
        const here = wip.filter((u) => u.currentStageId === s.id);
        const done = ops.filter((op) => op.stageId === s.id);
        return {
          code: s.code,
          name: s.name,
          kind: s.kind,
          units: here.map((u) => ({
            serialNo: u.serialNo,
            status: u.status,
            reworkCount: u.reworkCount,
            worker: u.operations[0]?.worker.name ?? null,
            startedAt: u.operations[0]?.startedAt ?? null,
          })),
          doneCount: done.length,
          avgSec: done.length ? done.reduce((a, op) => a + (op.durationSec ?? 0), 0) / done.length : null,
          laborCost: done.reduce((a, op) => a + num(op.laborCost), 0),
        };
      }),
      recent: recent.map((op) => ({
        id: op.id,
        serialNo: op.unit.serialNo,
        stage: op.stage.name,
        worker: op.worker.name,
        finishedAt: op.finishedAt,
        durationSec: op.durationSec,
        laborCost: num(op.laborCost),
        result: op.result,
      })),
    };
  }
}
