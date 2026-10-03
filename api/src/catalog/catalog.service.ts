import { Injectable, NotFoundException } from '@nestjs/common';
import { num, perSecondWage } from '../common/costing.js';
import { EventsService } from '../events/events.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async stages() {
    const stages = await this.prisma.stage.findMany({
      orderBy: { sequence: 'asc' },
      include: {
        workers: { where: { active: true }, orderBy: { name: 'asc' } },
        bomLines: { include: { component: true }, orderBy: { component: { code: 'asc' } } },
      },
    });
    return stages.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      sequence: s.sequence,
      kind: s.kind,
      workers: s.workers.map((w) => this.mapWorker(w)),
      components: s.bomLines.map((b) => ({
        code: b.component.code,
        name: b.component.name,
        quantity: num(b.quantity),
        unitPrice: num(b.component.unitPrice),
      })),
    }));
  }

  async products() {
    const products = await this.prisma.item.findMany({
      where: { type: 'PRODUCT' },
      orderBy: { code: 'asc' },
      include: {
        bomAsProduct: {
          include: { component: true, stage: true },
          orderBy: [{ stage: { sequence: 'asc' } }, { component: { code: 'asc' } }],
        },
      },
    });
    return products.map((p) => {
      const bom = p.bomAsProduct.map((b) => ({
        id: b.id,
        stage: { code: b.stage.code, name: b.stage.name },
        code: b.component.code,
        name: b.component.name,
        quantity: num(b.quantity),
        unitPrice: num(b.component.unitPrice),
        total: num(b.quantity) * num(b.component.unitPrice),
      }));
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        bom,
        materialCost: bom.reduce((sum, b) => sum + b.total, 0),
      };
    });
  }

  async workers() {
    const workers = await this.prisma.worker.findMany({
      include: { stage: true },
      orderBy: { stage: { sequence: 'asc' } },
    });
    return workers.map((w) => ({
      ...this.mapWorker(w),
      stage: { code: w.stage.code, name: w.stage.name },
    }));
  }

  async updateWorker(id: number, monthlySalary: number) {
    const exists = await this.prisma.worker.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Çalışan bulunamadı');
    const w = await this.prisma.worker.update({ where: { id }, data: { monthlySalary } });
    this.events.emit({ type: 'stock' });
    return this.mapWorker(w);
  }

  async updateItemPrice(code: string, unitPrice: number) {
    const exists = await this.prisma.item.findUnique({ where: { code } });
    if (!exists) throw new NotFoundException('Kalem bulunamadı');
    await this.prisma.item.update({ where: { code }, data: { unitPrice } });
    this.events.emit({ type: 'stock' });
    return { ok: true };
  }

  private mapWorker(w: { id: number; name: string; monthlySalary: unknown; stageId: number }) {
    const salary = Number(w.monthlySalary);
    return {
      id: w.id,
      name: w.name,
      stageId: w.stageId,
      monthlySalary: salary,
      perSecond: perSecondWage(salary),
    };
  }
}
