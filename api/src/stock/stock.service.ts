import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { num } from '../common/costing.js';
import type { MovementType, Prisma, WarehouseKind } from '../generated/prisma/client.js';
import { EventsService } from '../events/events.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

export interface MoveInput {
  type: MovementType;
  itemId: number;
  quantity: number;
  from?: WarehouseKind;
  to?: WarehouseKind;
  workOrderId?: number;
  unitId?: number;
  note?: string;
  at?: Date;
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async warehouses() {
    const warehouses = await this.prisma.warehouse.findMany({
      orderBy: { id: 'asc' },
      include: { stocks: { include: { item: true }, orderBy: { item: { code: 'asc' } } } },
    });
    return warehouses.map((w) => ({
      code: w.code,
      name: w.name,
      kind: w.kind,
      items: w.stocks
        .filter((s) => num(s.quantity) !== 0 || w.kind === 'RAW')
        .map((s) => ({
          code: s.item.code,
          name: s.item.name,
          quantity: num(s.quantity),
          unitPrice: num(s.item.unitPrice),
        })),
    }));
  }

  async movements(limit = 100) {
    const rows = await this.prisma.stockMovement.findMany({
      take: limit,
      orderBy: { id: 'desc' },
      include: { item: true, fromWarehouse: true, toWarehouse: true, workOrder: true, unit: true },
    });
    return rows.map((m) => ({
      id: m.id,
      type: m.type,
      at: m.at,
      item: { code: m.item.code, name: m.item.name },
      quantity: num(m.quantity),
      from: m.fromWarehouse?.name ?? null,
      to: m.toWarehouse?.name ?? null,
      workOrderNo: m.workOrder?.no ?? null,
      serialNo: m.unit?.serialNo ?? null,
      note: m.note,
    }));
  }

  async receipt(code: string, quantity: number) {
    const item = await this.prisma.item.findUnique({ where: { code } });
    if (!item) throw new NotFoundException('Kalem bulunamadı');
    await this.prisma.$transaction((tx) =>
      this.move(tx, { type: 'RECEIPT', itemId: item.id, quantity, to: 'RAW', note: 'Hammadde girişi' }),
    );
    this.events.emit({ type: 'stock' });
    return { ok: true };
  }

  // Tüm stok hareketleri buradan geçer: kaynak depoda yeterli stok yoksa işlem geri alınır
  async move(tx: Tx, input: MoveInput) {
    const [from, to] = await Promise.all([
      input.from ? tx.warehouse.findUniqueOrThrow({ where: { kind: input.from } }) : null,
      input.to ? tx.warehouse.findUniqueOrThrow({ where: { kind: input.to } }) : null,
    ]);
    if (from) {
      const { count } = await tx.stock.updateMany({
        where: { warehouseId: from.id, itemId: input.itemId, quantity: { gte: input.quantity } },
        data: { quantity: { decrement: input.quantity } },
      });
      if (count === 0) {
        const item = await tx.item.findUnique({ where: { id: input.itemId } });
        throw new BadRequestException(`${from.name}: ${item?.name ?? 'kalem'} için yeterli stok yok`);
      }
    }
    if (to) {
      await tx.stock.upsert({
        where: { warehouseId_itemId: { warehouseId: to.id, itemId: input.itemId } },
        update: { quantity: { increment: input.quantity } },
        create: { warehouseId: to.id, itemId: input.itemId, quantity: input.quantity },
      });
    }
    await tx.stockMovement.create({
      data: {
        type: input.type,
        itemId: input.itemId,
        quantity: input.quantity,
        fromWarehouseId: from?.id,
        toWarehouseId: to?.id,
        workOrderId: input.workOrderId,
        unitId: input.unitId,
        note: input.note,
        at: input.at,
      },
    });
  }
}
