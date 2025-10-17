import { _decorator, Component, UITransform, ScrollView, Vec2, EventHandler } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

import { VirtualLayout } from './super-layout';

@ccclass('VirtualScrollView')
@requireComponent(ScrollView)
export class VirtualScrollView extends Component {
  @property(ScrollView) scrollView!: ScrollView
  @property(UITransform) content!: UITransform
  @property(VirtualLayout) layout!: VirtualLayout
  @property(EventHandler) onScrollEvents: EventHandler[] = []

  private prevPos = new Vec2(0, 0)

  onLoad() {
    if (!this.scrollView) this.scrollView = this.getComponent(ScrollView)!
    this.scrollView.node.on('scrolling', this.onScrolling, this)
    this.scrollView.node.on('scroll-ended', this.onScrollEnded, this)
  }

  start() {
    if (this.layout && this.content) {
      this.layout.view = this.content
    }
  }

  onDestroy() {
    this.scrollView?.node.off('scrolling', this.onScrolling, this)
    this.scrollView?.node.off('scroll-ended', this.onScrollEnded, this)
  }

  private onScrolling() {
    const curr = this.scrollView.getScrollOffset()
    this.layout?.onPositionChanged(this.prevPos, curr)
    for (const eh of this.onScrollEvents) eh.emit([curr])
    this.prevPos.set(curr)
  }

  private onScrollEnded() {
    const curr = this.scrollView.getScrollOffset()
    this.layout?.onPositionChanged(this.prevPos, curr)
    for (const eh of this.onScrollEvents) eh.emit([curr])
    this.prevPos.set(curr)
  }
}