// ÖRNEK ÇALIŞMA.xlsx (Sayfa1) verisiyle başlangıç durumu
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const stages = [
  { code: 'A1', name: '1. Aşama', sequence: 1, kind: 'ASSEMBLY' },
  { code: 'A2', name: '2. Aşama', sequence: 2, kind: 'ASSEMBLY' },
  { code: 'A3', name: '3. Aşama', sequence: 3, kind: 'ASSEMBLY' },
  { code: 'A4', name: '4. Aşama', sequence: 4, kind: 'ASSEMBLY' },
  { code: 'TEST', name: 'Test', sequence: 5, kind: 'TEST' },
  { code: 'KALITE', name: 'Kalite', sequence: 6, kind: 'QUALITY' },
] as const;

const workers = [
  { name: 'Ahmet', stage: 'A1', salary: 25000 },
  { name: 'Mehmet', stage: 'A2', salary: 30000 },
  { name: 'Hüseyin', stage: 'A3', salary: 45000 },
  { name: 'Kemal', stage: 'A4', salary: 35000 },
  { name: 'Mahmut', stage: 'TEST', salary: 40000 },
  { name: 'Hasan', stage: 'KALITE', salary: 25000 },
];

const components = [
  { code: '1.20260001', name: 'Anakart', price: 1000, stage: 'A1' },
  { code: '1.20260002', name: 'İşlemci', price: 500, stage: 'A1' },
  { code: '1.20260003', name: 'RAM', price: 1200, stage: 'A2' },
  { code: '1.20260004', name: 'SSD', price: 750, stage: 'A2' },
  { code: '1.20260005', name: 'Ekran Kartı', price: 1500, stage: 'A3' },
  { code: '1.20260006', name: 'Güç Kaynağı', price: 800, stage: 'A3' },
  { code: '1.20260007', name: 'Soğutma Sistemi', price: 1300, stage: 'A4' },
  { code: '1.20260008', name: 'Kasa', price: 750, stage: 'A4' },
];

async function main() {
  const stageIds = new Map<string, number>();
  for (const s of stages) {
    const row = await prisma.stage.upsert({ where: { code: s.code }, update: s, create: s });
    stageIds.set(s.code, row.id);
  }

  for (const w of workers) {
    const exists = await prisma.worker.findFirst({ where: { name: w.name } });
    if (!exists) {
      await prisma.worker.create({
        data: { name: w.name, stageId: stageIds.get(w.stage)!, monthlySalary: w.salary },
      });
    }
  }

  const [raw] = await Promise.all([
    prisma.warehouse.upsert({
      where: { kind: 'RAW' },
      update: {},
      create: { code: 'HMD', name: 'Hammadde Depo', kind: 'RAW' },
    }),
    prisma.warehouse.upsert({
      where: { kind: 'WIP' },
      update: {},
      create: { code: 'URD', name: 'Üretim Depo', kind: 'WIP' },
    }),
    prisma.warehouse.upsert({
      where: { kind: 'FINISHED' },
      update: {},
      create: { code: 'MMD', name: 'Mamul Depo', kind: 'FINISHED' },
    }),
  ]);

  const product = await prisma.item.upsert({
    where: { code: '3.202600035' },
    update: {},
    create: { code: '3.202600035', name: 'Bilgisayar', type: 'PRODUCT' },
  });

  for (const c of components) {
    const item = await prisma.item.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, name: c.name, type: 'RAW', unitPrice: c.price, serialTracked: true },
    });
    await prisma.bomLine.upsert({
      where: { productId_componentId: { productId: product.id, componentId: item.id } },
      update: {},
      create: {
        productId: product.id,
        componentId: item.id,
        stageId: stageIds.get(c.stage)!,
        quantity: 1,
      },
    });
    const stock = await prisma.stock.findUnique({
      where: { warehouseId_itemId: { warehouseId: raw.id, itemId: item.id } },
    });
    if (!stock) {
      await prisma.stock.create({ data: { warehouseId: raw.id, itemId: item.id, quantity: 10 } });
      await prisma.stockMovement.create({
        data: {
          type: 'RECEIPT',
          itemId: item.id,
          quantity: 10,
          toWarehouseId: raw.id,
          note: 'Açılış stoğu',
        },
      });
    }
  }

  console.log('Seed tamam');
}

await main().finally(() => prisma.$disconnect());
