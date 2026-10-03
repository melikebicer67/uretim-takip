import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkOrdersService } from './work-orders.service.js';

class CreateWorkOrderDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  @Max(500)
  quantity: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class PreviewQuery {
  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly orders: WorkOrdersService) {}

  @Get()
  list() {
    return this.orders.list();
  }

  @Get('preview')
  preview(@Query() q: PreviewQuery) {
    return this.orders.preview(q.productId, q.quantity);
  }

  @Post()
  create(@Body() dto: CreateWorkOrderDto) {
    return this.orders.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.orders.get(id);
  }

  @Post(':id/release')
  release(@Param('id', ParseIntPipe) id: number) {
    return this.orders.release(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.orders.cancel(id);
  }
}
