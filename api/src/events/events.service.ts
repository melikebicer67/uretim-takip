import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type ProductionEvent =
  | { type: 'work-order'; id: number }
  | { type: 'unit'; id: number; serialNo: string; stage?: string }
  | { type: 'stock' };

// Ekranları canlı güncellemek için tek kanal; istemciler bir olay gelince veriyi yeniden çeker
@Injectable()
export class EventsService {
  readonly stream = new Subject<ProductionEvent>();

  emit(event: ProductionEvent) {
    this.stream.next(event);
  }
}
