import { Controller, Get, Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary() {
    return this.dashboard.summary();
  }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
