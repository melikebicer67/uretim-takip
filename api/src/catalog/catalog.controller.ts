import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { IsNumber, Min } from 'class-validator';
import { QUALITY_SECTIONS, TEST_SECTIONS, LIMITS } from '../production/checklists.js';
import { CatalogService } from './catalog.service.js';

class SalaryDto {
  @IsNumber()
  @Min(0)
  monthlySalary: number;
}

class PriceDto {
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('stages')
  stages() {
    return this.catalog.stages();
  }

  @Get('products')
  products() {
    return this.catalog.products();
  }

  @Get('workers')
  workers() {
    return this.catalog.workers();
  }

  @Patch('workers/:id')
  updateWorker(@Param('id', ParseIntPipe) id: number, @Body() dto: SalaryDto) {
    return this.catalog.updateWorker(id, dto.monthlySalary);
  }

  @Patch('items/:code')
  updateItem(@Param('code') code: string, @Body() dto: PriceDto) {
    return this.catalog.updateItemPrice(code, dto.unitPrice);
  }

  @Get('checklists')
  checklists() {
    return { TEST: TEST_SECTIONS, QUALITY: QUALITY_SECTIONS, limits: LIMITS };
  }
}
