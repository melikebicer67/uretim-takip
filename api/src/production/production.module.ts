import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module.js';
import { ProductionController } from './production.controller.js';
import { ProductionService } from './production.service.js';

@Module({
  imports: [StockModule],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
