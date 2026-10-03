import { Controller, type MessageEvent, Sse } from '@nestjs/common';
import { interval, map, merge, type Observable } from 'rxjs';
import { EventsService } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse()
  stream(): Observable<MessageEvent> {
    const heartbeat = interval(25_000).pipe(map(() => ({ type: 'ping', data: {} })));
    const updates = this.events.stream.pipe(map((e) => ({ type: 'update', data: e })));
    return merge(updates, heartbeat);
  }
}
