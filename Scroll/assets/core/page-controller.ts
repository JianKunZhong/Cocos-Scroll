/*
 * 页面滚动与翻页相关的控制器，负责计算方向、阈值判断、翻页与事件派发。
 */
import { Vec2, Vec3, PageView, EventHandler } from 'cc';
import { SuperLayout } from './super-layout';
import { SuperScrollview } from './super-scrollview';

export class PageController {
  constructor(private owner: SuperScrollview) {}

  dispatchPageTurningEvent() {
    const layout = this.owner.layout;
    if ((layout as any)["_lastPageIndex"] === (layout as any)["_currPageIndex"]) return;
    (layout as any)["_lastPageIndex"] = (layout as any)["_currPageIndex"];
    EventHandler.emitEvents(layout.pageEvents, this.owner, PageView.EventType.PAGE_TURNING);
    this.owner.node.emit(PageView.EventType.PAGE_TURNING, this.owner);
  }

  isQuicklyScrollable(touchMoveVelocity: Vec3) {
    const layout = this.owner.layout;
    if (this.owner.horizontal) {
      return Math.abs(touchMoveVelocity.x) > layout.autoPageTurningThreshold;
    }
    if (this.owner.vertical) {
      return Math.abs(touchMoveVelocity.y) > layout.autoPageTurningThreshold;
    }
    return false;
  }

  getDragDirection(moveOffset: Vec2) {
    const layout = this.owner.layout;
    if (this.owner.horizontal) {
      if (moveOffset.x === 0) return 0;
      if (layout.horizontalAxisDirection == SuperLayout.HorizontalAxisDirection.LEFT_TO_RIGHT) {
        return (moveOffset.x > 0 ? layout.groupItemTotal : -layout.groupItemTotal);
      } else {
        return (moveOffset.x < 0 ? layout.groupItemTotal : -layout.groupItemTotal);
      }
    } else {
      if (moveOffset.y === 0) return 0;
      if (layout.verticalAxisDirection == SuperLayout.VerticalAxisDirection.TOP_TO_BOTTOM) {
        return (moveOffset.y < 0 ? layout.groupItemTotal : -layout.groupItemTotal);
      } else {
        return (moveOffset.y > 0 ? layout.groupItemTotal : -layout.groupItemTotal);
      }
    }
  }

  isScrollable(offset: Vec2, index: number, nextIndex: number) {
    const viewTrans = this.owner.view;
    const layout = this.owner.layout;
    if (!viewTrans) return false;
    if (this.owner.horizontal) {
      return Math.abs(offset.x) >= viewTrans.width * layout.scrollThreshold;
    } else if (this.owner.vertical) {
      return Math.abs(offset.y) >= viewTrans.height * layout.scrollThreshold;
    }
    return false;
  }

  savePageIndex(idx: number) {
    const layout = this.owner.layout;
    if (idx < 0 || idx >= layout.itemTotal) return false;
    (layout as any)["_currPageIndex"] = idx;
    if (layout.indicator) {
      layout.indicator._changedState();
    }
    return true;
  }

  scrollToPage(idx: number, timeInSecond = 0.3) {
    const layout = this.owner.layout;
    if (idx < 0 || idx >= layout.itemTotal) return;
    if (this.savePageIndex(idx)) {
      layout.scrollToIndex(idx, timeInSecond);
    }
  }

  autoScrollToPage(_touchBeganPosition: Vec2, _touchEndPosition: Vec2) {
    const layout = this.owner.layout;
    const bounceBackStarted = (this.owner as any)._startBounceBackIfNeeded();
    if (bounceBackStarted) {
      const bounceBackAmount = (this.owner as any)._getHowMuchOutOfBoundary();
      (this.owner as any)._clampDelta(bounceBackAmount);
      if (bounceBackAmount.x > 0 || bounceBackAmount.y < 0) {
        if (layout.horizontal) {
          if (layout.horizontalAxisDirection == SuperLayout.HorizontalAxisDirection.LEFT_TO_RIGHT) {
            (layout as any)["_currPageIndex"] = layout.itemTotal === 0 ? 0 : layout.itemTotal - 1;
          } else {
            (layout as any)["_currPageIndex"] = 0;
          }
        } else {
          if (layout.verticalAxisDirection == SuperLayout.VerticalAxisDirection.TOP_TO_BOTTOM) {
            (layout as any)["_currPageIndex"] = layout.itemTotal === 0 ? 0 : layout.itemTotal - 1;
          } else {
            (layout as any)["_currPageIndex"] = 0;
          }
        }
      }
      if (bounceBackAmount.x < 0 || bounceBackAmount.y > 0) {
        if (layout.horizontal) {
          if (layout.horizontalAxisDirection == SuperLayout.HorizontalAxisDirection.LEFT_TO_RIGHT) {
            (layout as any)["_currPageIndex"] = 0;
          } else {
            (layout as any)["_currPageIndex"] = layout.itemTotal === 0 ? 0 : layout.itemTotal - 1;
          }
        } else {
          if (layout.verticalAxisDirection == SuperLayout.VerticalAxisDirection.TOP_TO_BOTTOM) {
            (layout as any)["_currPageIndex"] = 0;
          } else {
            (layout as any)["_currPageIndex"] = layout.itemTotal === 0 ? 0 : layout.itemTotal - 1;
          }
        }
      }
      if (layout.indicator) {
        layout.indicator._changedState();
      }
    } else {
      const moveOffset = new Vec2();
      Vec2.subtract(moveOffset, _touchBeganPosition, _touchEndPosition);
      const index = (layout as any)["_currPageIndex"];
      let nextIndex = index + this.getDragDirection(moveOffset);
      const timeInSecond = layout.pageTurningSpeed * Math.abs(index - nextIndex);
      if (layout.footerLoop) {
        if (nextIndex >= layout.itemTotal) nextIndex = 0;
      }
      if (layout.headerLoop) {
        if (nextIndex < 0) nextIndex = layout.itemTotal - 1;
      }
      const count = layout.itemTotal;
      if (nextIndex < count) {
        if (this.isScrollable(moveOffset, index, nextIndex)) {
          this.scrollToPage(nextIndex, timeInSecond);
          return;
        } else {
          const touchMoveVelocity = (this.owner as any)._calculateTouchMoveVelocity();
          if (this.isQuicklyScrollable(touchMoveVelocity)) {
            this.scrollToPage(nextIndex, timeInSecond);
            return;
          }
        }
      }
      this.scrollToPage(index, timeInSecond);
    }
  }
}