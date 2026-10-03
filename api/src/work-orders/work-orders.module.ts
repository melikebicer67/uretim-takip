import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { WorkOrdersController } from './work-orders.controller.js';
import { WorkOrdersService } from './work-orders.service.js';

@Module({
  imports: [StockModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
