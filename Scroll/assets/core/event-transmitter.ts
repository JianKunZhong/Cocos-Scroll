/*
 * 事件传递工具，封装跨层触摸事件转发。
 */
import { EventTouch } from 'cc';

export class EventTransmitter {
  static transmit(event: EventTouch, eventType: string) {
    const touches = event.getTouches();
    const timeStamp = (event as any).timeStamp ?? Date.now();
    const bubbles = event.bubbles ?? true;
    const e = new EventTouch(touches, bubbles, timeStamp);
    (e as any).type = eventType;
    (e as any).touch = event.touch;
    const target: any = (event as any).target!;
    target?.parent?.dispatchEvent(e);
  }
}