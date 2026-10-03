import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { num, pad, year } from '../common/costing.js';
import { EventsService } from '../events/events.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockService } from '../stock/stock.service.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly events: EventsService,
  ) {}

  async list() {
    const orders = await this.prisma.workOrder.findMany({
      orderBy: { id: 'desc' },
      include: { product: true, units: { select: { status: true } } },
    });
    return orders.map((o) => ({
      id: o.id,
      no: o.no,
      product: { code: o.product.code, name: o.product.name },
      quantity: o.quantity,
      status: o.status,
      dueDate: o.dueDate,
      createdAt: o.createdAt,
      completed: o.units.filter((u) => u.status === 'COMPLETED').length,
      inProcess: o.units.filter((u) => u.status === 'IN_PROCESS').length,
    }));
  }

  // Reçete × miktar ihtiyacını hammadde stoğuyla karşılaştırır
  async requirements(productId: number, quantity: number) {
    const [bom, raw] = await Promise.all([
      this.prisma.bomLine.findMany({
        where: { productId },
        include: { component: true, stage: true },
        orderBy: [{ stage: { sequence: 'asc' } }, { component: { code: 'asc' } }],
      }),
      this.prisma.warehouse.findUniqueOrThrow({
        where: { kind: 'RAW' },
        include: { stocks: true },
      }),
    ]);
    const available = new Map(raw.stocks.map((s) => [s.itemId, num(s.quantity)]));
    const lines = bom.map((b) => {
      const required = num(b.quantity) * quantity;
      const inStock = available.get(b.componentId) ?? 0;
      return {
        code: b.component.code,
        name: b.component.name,
        stage: b.stage.name,
        perUnit: num(b.quantity),
        required,
        available: inStock,
        shortage: Math.max(0, required - inStock),
        cost: required * num(b.component.unitPrice),
      };
    });
    const maxProducible = bom.length
      ? Math.min(...bom.map((b) => Math.floor((available.get(b.componentId) ?? 0) / num(b.quantity))))
      : 0;
    return {
      lines,
      maxProducible,
      materialCost: lines.reduce((s, l) => s + l.cost, 0),
      ok: lines.every((l) => l.shortage === 0),
    };
  }

  async preview(productId: number, quantity: number) {
    await this.prisma.item.findUniqueOrThrow({ where: { id: productId } });
    return this.requirements(productId, quantity);
  }

  async create(input: { productId: number; quantity: number; dueDate?: string; note?: string }) {
    const product = await this.prisma.item.findUnique({ where: { id: input.productId } });
    if (!product || product.type !== 'PRODUCT') throw new BadRequestException('Mamul bulunamadı');
    const prefix = `UE-${year()}-`;
    const count = await this.prisma.workOrder.count({ where: { no: { startsWith: prefix } } });
    const order = await this.prisma.workOrder.create({
      data: {
        no: prefix + pad(count + 1, 4),
        productId: product.id,
        quantity: input.quantity,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        note: input.note,
      },
    });
    this.events.emit({ type: 'work-order', id: order.id });
    return { id: order.id, no: order.no };
  }

  async get(id: number) {
    const order = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        product: true,
        units: {
          orderBy: { serialNo: 'asc' },
          include: {
            currentStage: true,
            operations: { include: { worker: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('İş emri bulunamadı');

    const [requirements, consumed, stages] = await Promise.all([
      this.requirements(order.productId, order.quantity),
      this.prisma.stockMovement.findMany({
        where: { workOrderId: id, type: 'CONSUME' },
        include: { item: true },
      }),
      this.prisma.stage.findMany({ orderBy: { sequence: 'asc' } }),
    ]);

    const materialByUnit = new Map<number, number>();
    for (const m of consumed) {
      const cost = num(m.quantity) * num(m.item.unitPrice);
      materialByUnit.set(m.unitId!, (materialByUnit.get(m.unitId!) ?? 0) + cost);
    }

    const units = order.units.map((u) => {
      const labor = u.operations.reduce((s, op) => s + num(op.laborCost), 0);
      const material = materialByUnit.get(u.id) ?? 0;
      const active = u.operations.find((op) => !op.finishedAt);
      return {
        id: u.id,
        serialNo: u.serialNo,
        status: u.status,
        stage: u.currentStage ? { code: u.currentStage.code, name: u.currentStage.name, sequence: u.currentStage.sequence } : null,
        activeWorker: active?.worker.name ?? null,
        reworkCount: u.reworkCount,
        workSeconds: u.operations.reduce((s, op) => s + (op.durationSec ?? 0), 0),
        materialCost: material,
        laborCost: labor,
        totalCost: material + labor,
        completedAt: u.completedAt,
      };
    });

    return {
      id: order.id,
      no: order.no,
      product: { id: order.product.id, code: order.product.code, name: order.product.name },
      quantity: order.quantity,
      status: order.status,
      dueDate: order.dueDate,
      note: order.note,
      createdAt: order.createdAt,
      releasedAt: order.releasedAt,
      completedAt: order.completedAt,
      requirements,
      stages: stages.map((s) => ({
        code: s.code,
        name: s.name,
        sequence: s.sequence,
        count: units.filter((u) => u.stage?.code === s.code).length,
      })),
      units,
      totals: {
        materialCost: units.reduce((s, u) => s + u.materialCost, 0),
        laborCost: units.reduce((s, u) => s + u.laborCost, 0),
        completed: units.filter((u) => u.status === 'COMPLETED').length,
      },
    };
  }

  // Malzemeyi hammadde deposundan üretim deposuna aktarır ve her mamul için seri numarası açar
  async release(id: number) {
    const order = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('İş emri bulunamadı');
    if (order.status !== 'PLANNED') throw new BadRequestException('İş emri zaten serbest bırakılmış');

    await this.prisma.$transaction(async (tx) => {
      const bom = await tx.bomLine.findMany({ where: { productId: order.productId } });
      for (const line of bom) {
        await this.stock.move(tx, {
          type: 'TRANSFER',
          itemId: line.componentId,
          quantity: num(line.quantity) * order.quantity,
          from: 'RAW',
          to: 'WIP',
          workOrderId: order.id,
          note: `${order.no} malzeme transferi`,
        });
      }
      const first = await tx.stage.findFirstOrThrow({ orderBy: { sequence: 'asc' } });
      const serials = await this.nextSerials(tx, order.quantity);
      await tx.productionUnit.createMany({
        data: serials.map((serialNo) => ({
          serialNo,
          workOrderId: order.id,
          currentStageId: first.id,
        })),
      });
      await tx.workOrder.update({
        where: { id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    });

    this.events.emit({ type: 'work-order', id });
    this.events.emit({ type: 'stock' });
    return this.get(id);
  }

  async cancel(id: number) {
    const order = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('İş emri bulunamadı');
    if (order.status !== 'PLANNED') {
      throw new BadRequestException('Yalnızca malzemesi aktarılmamış iş emirleri iptal edilebilir');
    }
    await this.prisma.workOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    this.events.emit({ type: 'work-order', id });
    return { ok: true };
  }

  private async nextSerials(tx: Tx, count: number) {
    const prefix = `PC-${year()}-`;
    const last = await tx.productionUnit.findFirst({
      where: { serialNo: { startsWith: prefix } },
      orderBy: { serialNo: 'desc' },
    });
    const start = last ? Number(last.serialNo.slice(prefix.length)) + 1 : 1;
    return Array.from({ length: count }, (_, i) => prefix + pad(start + i, 6));
  }
}
