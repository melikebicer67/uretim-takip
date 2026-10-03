import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ProductionService } from './production.service.js';

class StartDto {
  @IsInt()
  unitId: number;

  @IsInt()
  workerId: number;
}

class MeasurementsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryHealth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  maxCpuTemp?: number;
}

class FinishDto {
  @IsOptional()
  @IsObject()
  answers?: Record<string, { ok: boolean; note?: string }>;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeasurementsDto)
  measurements?: MeasurementsDto;

  @IsOptional()
  @IsIn(['ACCEPT', 'REJECT'])
  decision?: 'ACCEPT' | 'REJECT';

  @IsOptional()
  @IsString()
  approver?: string;

  @IsOptional()
  @IsString()
  reworkStageCode?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller()
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get('stations/:code')
  station(@Param('code') code: string) {
    return this.production.station(code);
  }

  @Post('operations')
  start(@Body() dto: StartDto) {
    return this.production.start(dto.unitId, dto.workerId);
  }

  @Post('operations/:id/finish')
  finish(@Param('id', ParseIntPipe) id: number, @Body() dto: FinishDto) {
    return this.production.finish(id, dto);
  }

  @Post('operations/:id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.production.cancelOperation(id);
  }

  @Get('units/:serialNo')
  unit(@Param('serialNo') serialNo: string) {
    return this.production.unit(serialNo);
  }

  @Post('work-orders/:id/simulate')
  simulate(@Param('id', ParseIntPipe) id: number) {
    return this.production.simulate(id);
  }
}
