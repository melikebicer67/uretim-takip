import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CatalogModule } from './catalog/catalog.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { EventsModule } from './events/events.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductionModule } from './production/production.module.js';
import { StockModule } from './stock/stock.module.js';
import { WorkOrdersModule } from './work-orders/work-orders.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventsModule,
    CatalogModule,
    StockModule,
    WorkOrdersModule,
    ProductionModule,
    DashboardModule,
  ],
})
export class AppModule {}
