import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsNumber, IsString, Min } from 'class-validator';
import { StockService } from './stock.service.js';

class ReceiptDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get()
  warehouses() {
    return this.stock.warehouses();
  }

  @Get('movements')
  movements() {
    return this.stock.movements();
  }

  @Post('receipt')
  receipt(@Body() dto: ReceiptDto) {
    return this.stock.receipt(dto.code, dto.quantity);
  }
}
