/*
 * @Author: steveJobs
 * @Email: icipiqkm@gmail.com
 * @Date: 2021-8-1 01:15:04
 * @Last Modified by: steveJobs
 * @Last Modified time: 2021-8-1 14:35:43
 * @Description: 
 */
import { _decorator, Node, EventTouch, Vec3, Vec2, ScrollView, EventHandler, PageView, EventMouse } from 'cc';
import { SuperLayout } from './super-layout';
import { PageController } from './page-controller';
import { EventTransmitter } from './event-transmitter';
import { PullRefreshManager } from './pull-refresh-manager';
const { ccclass, property } = _decorator;
const quintEaseOut = (time: number) => {
    time -= 1;
    return (time * time * time * time * time + 1)
};
const EPSILON = 1e-4
const OUT_OF_BOUNDARY_BREAKING_FACTOR = 0.015
const _tempVec2 = new Vec2()
export enum ScrollViewDirection {
    HORIZONTAL,
    VERTICAL,
    NONE,
}
@ccclass('SuperScrollview')
export class SuperScrollview extends ScrollView {
    private direction: ScrollViewDirection = ScrollViewDirection.NONE
    private _layout!: SuperLayout
    private _pageController!: PageController
    private _pullRefresh!: PullRefreshManager
    @property({
        tooltip: "注意！向上传递事件只会发送当前滑动相反方向,如果开启horizontal则会发送vertical事件。如果开启vertical则会发送horizontal事件。同时开启horizontal和vertical 不会发送任何事件"
    }) isTransmitEvent: boolean = false
    @property pullRefresh: boolean = false
    @property({
        displayName: "顶部偏移量",
        tooltip: "下拉时超过此偏移会发送下拉事件",
        visible: function () { return (this as any).pullRefresh }
    }) headerOutOffset: number = 200
    @property({
        displayName: "满足触发Header的倍数",
        visible: function () { return (this as any).pullRefresh }
    }) headerMultiple: number = 2
    @property({
        displayName: "底部偏移量",
        tooltip: "上拉时超过此偏移会发送上拉事件",
        visible: function () { return (this as any).pullRefresh }
    }) footerOutOffset: number = 200
    @property({
        displayName: "满足触发Footer的倍数",
        visible: function () { return (this as any).pullRefresh }
    }) footerMultiple: number = 2
    @property({
        type: EventHandler,
        visible: function () { return (this as any).pullRefresh }
    }) headerEvents: EventHandler[] = []
    @property({
        type: EventHandler,
        visible: function () { return (this as any).pullRefresh }
    }) footerEvents: EventHandler[] = []
    prevLocation: Vec2 = new Vec2()
    location: Vec2 = new Vec2()
    set autoScrolling(value: boolean) { this._autoScrolling = value }
    private _touchBeganPosition = new Vec2()
    private _touchEndPosition = new Vec2()
    // 刷新进度与锁定状态已由 PullRefreshManager 管理
    private isCustomScroll: boolean = false
    canTouchMove: boolean = true
    onLoad() {
        if (this.layout.autoCenter) {
            this.brake = 0.7
        }
    }
    public onEnable() {
        super.onEnable()
        this.node.on(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this.dispatchPageTurningEvent, this)
    }
    public onDisable() {
        super.onDisable()
        this.node.off(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this.dispatchPageTurningEvent, this)
    }
    get layout() {
        if (!this._layout) { this._layout = this.content?.getComponent(SuperLayout)! }
        return this._layout
    }
    get pageController() {
        if (!this._pageController) this._pageController = new PageController(this)
        return this._pageController
    }
    get pullRefreshManager() {
        if (!this._pullRefresh) this._pullRefresh = new PullRefreshManager(this)
        return this._pullRefresh
    }
    private isCallSoonFinish: boolean = false
    get curPageIdx() {
        return this.layout["_currPageIndex"]
    }
    getPages() {
        return new Array(this.layout.itemTotal)
    }
    protected _getContentTopBoundary() {
        if (!this._content) {
            return -1
        }
        let offset = this.layout.isOfTopBoundary == 0 ? this._topBoundary : this.layout.isOfTopBoundary
        return offset
    }
    protected _getContentBottomBoundary() {
        if (!this._content) {
            return -1
        }
        let offset = this.layout.isOfButtomBoundary == 0 ? this._bottomBoundary : this.layout.isOfButtomBoundary
        return offset
    }
    protected _getContentLeftBoundary() {
        if (!this._content) {
            return -1
        }
        let offset = this.layout.isOfLeftBoundary == 0 ? this._leftBoundary : this.layout.isOfLeftBoundary
        return offset
    }
    protected _getContentRightBoundary() {
        if (!this._content) {
            return -1
        }
        let offset = this.layout.isOfRightBoundary == 0 ? this._rightBoundary : this.layout.isOfRightBoundary
        return offset
    }
    protected _onTouchBegan(event: EventTouch, captureListeners?: Node[]) {
        this.isCallSoonFinish = false
        this.isCustomScroll = false
        this.layout["onTouchBegin"]()
        if (!this.canTouchMove) return
        this.direction = ScrollViewDirection.NONE
        if (this.layout.isPageView) {
            event.touch!.getUILocation(_tempVec2)
            Vec2.set(this._touchBeganPosition, _tempVec2.x, _tempVec2.y)
        }
        super._onTouchBegan(event, captureListeners)
        if (this.isTransmitEvent) {
            EventTransmitter.transmit(event, Node.EventType.TOUCH_START)
        }
    }
    protected _onTouchMoved(event: EventTouch, captureListeners: any) {
        this.isCallSoonFinish = false
        this.isCustomScroll = false
        if (!this.canTouchMove) return
        if (this.isTransmitEvent) {
            if (this.direction == ScrollViewDirection.NONE) {
                var start = event.getStartLocation()
                var curre = event.getLocation()
                var xOffset = Math.abs(start.x - curre.x)
                var yOffset = Math.abs(start.y - curre.y)
                if (xOffset > yOffset) {
                    // 本ScrollView滑动方向过程中达到一定偏移量是也可以向上发送事件
                    // if (this.vertical) {
                    //     if (xOffset - yOffset > 50) {
                    //         this.direction = UIScrollViewDirection.HORIZONTAL
                    //     }
                    // }
                    this.direction = ScrollViewDirection.HORIZONTAL

                } else if (yOffset > xOffset) {
                    // 本ScrollView滑动方向过程中达到一定偏移量是也可以向上发送事件
                    // if (this.horizontal) {
                    //     if (yOffset - xOffset > 50) {
                    //         this.direction = UIScrollViewDirection.VERTICAL
                    //     }
                    // }
                    this.direction = ScrollViewDirection.VERTICAL
                }
            }
            var canTransmit = (this.vertical && this.direction === ScrollViewDirection.HORIZONTAL) || this.horizontal && this.direction == ScrollViewDirection.VERTICAL
            if (canTransmit) {
                EventTransmitter.transmit(event, Node.EventType.TOUCH_MOVE)
                return
            }
        }
        this.prevLocation = event.touch?.getPreviousLocation()!
        this.location = event.touch?.getLocation()!
        super._onTouchMoved(event, captureListeners)
        if (this.pullRefresh) {
            const outOfBoundary = this._getHowMuchOutOfBoundary()
            const offset = this.vertical ? outOfBoundary.y : -outOfBoundary.x
            this.pullRefreshManager.onTouchMoved(offset)
        }
    }

    protected _onTouchEnded(event: EventTouch, captureListeners: any) {
        this.isCallSoonFinish = false
        this.isCustomScroll = false
        if (!this.canTouchMove) return
        if (this.layout.isPageView) {
            event.touch!.getUILocation(_tempVec2)
            Vec2.set(this._touchEndPosition, _tempVec2.x, _tempVec2.y)
        }
        super._onTouchEnded(event, captureListeners)
        if (this.isTransmitEvent) {
            EventTransmitter.transmit(event, Node.EventType.TOUCH_END)
        }
    }
    protected _onTouchCancelled(event: EventTouch, captureListeners: any) {
        this.isCallSoonFinish = false
        this.isCustomScroll = false
        if (!this.canTouchMove) return
        if (this.layout.isPageView) {
            event.touch!.getUILocation(_tempVec2)
            Vec2.set(this._touchEndPosition, _tempVec2.x, _tempVec2.y)
        }
        if (this.isTransmitEvent) {
            EventTransmitter.transmit(event, Node.EventType.TOUCH_CANCEL)
        }
        super._onTouchCancelled(event, captureListeners)
    }
    scrollToAny(moveDelta: Vec3, timeInSecond?: number, attenuated: boolean = true) {
        this.isCustomScroll = true
        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated, true)
        } else {
            this._moveContent(moveDelta)
        }
    }
    release() {
        this.pullRefreshManager.release()
    }
    startAutoScroll() {
        this._autoScrolling = true
        this._outOfBoundaryAmountDirty = true
    }
    protected _startAutoScroll(deltaMove: any, timeInSecond: any, attenuated: any, flag: boolean = false) {
        this.pullRefreshManager.adjustForStartAutoScroll(deltaMove)
        super._startAutoScroll(deltaMove, timeInSecond, attenuated)
        if (!flag && this.layout.autoCenter) {
            const touchMoveVelocity = this._calculateTouchMoveVelocity()
            if (!this.isQuicklyScrollable(touchMoveVelocity)) {
                this.soonFinish()
            }
        }
    }
    protected _updateScrollBar(outOfBoundary: any) {
        super._updateScrollBar(new Vec2(outOfBoundary.x, outOfBoundary.y))
        this.pullRefreshManager.updateScrollBar(new Vec2(outOfBoundary.x, outOfBoundary.y), this._autoScrollBraking, this._autoScrolling, this.vertical)
    }
    private clearProgress() { this.pullRefreshManager.clearProgress() }
    private dispatchPageTurningEvent() {
        this.pageController.dispatchPageTurningEvent()
    }

    protected _handleReleaseLogic(touch: any) {
        if (this.layout.isPageView) {
            this._autoScrollToPage();
            if (this._scrolling) {
                this._scrolling = false;
                if (!this._autoScrolling) {
                    this._dispatchEvent(ScrollView.EventType.SCROLL_ENDED);
                }
            }
        } else {
            super._handleReleaseLogic(touch)
        }

    }
    protected _autoScrollToPage() {
        const bounceBackStarted = this._startBounceBackIfNeeded();
        if (bounceBackStarted) {
            const bounceBackAmount = this._getHowMuchOutOfBoundary()
            this._clampDelta(bounceBackAmount)
            if (bounceBackAmount.x > 0 || bounceBackAmount.y < 0) {
                if (this.layout.horizontal) {
                    if (this.layout.horizontalAxisDirection == SuperLayout.HorizontalAxisDirection.LEFT_TO_RIGHT) {
                        this.layout["_currPageIndex"] = this.layout.itemTotal === 0 ? 0 : this.layout.itemTotal - 1
                    } else {
                        this.layout["_currPageIndex"] = 0
                    }
                } else {
                    if (this.layout.verticalAxisDirection == SuperLayout.VerticalAxisDirection.TOP_TO_BOTTOM) {
                        this.layout["_currPageIndex"] = this.layout.itemTotal === 0 ? 0 : this.layout.itemTotal - 1
                    } else {
                        this.layout["_currPageIndex"] = 0
                    }
                }
            }
            if (bounceBackAmount.x < 0 || bounceBackAmount.y > 0) {
                if (this.layout.horizontal) {
                    if (this.layout.horizontalAxisDirection == SuperLayout.HorizontalAxisDirection.LEFT_TO_RIGHT) {
                        this.layout["_currPageIndex"] = 0
                    } else {
                        this.layout["_currPageIndex"] = this.layout.itemTotal === 0 ? 0 : this.layout.itemTotal - 1
                    }
                } else {
                    if (this.layout.verticalAxisDirection == SuperLayout.VerticalAxisDirection.TOP_TO_BOTTOM) {
                        this.layout["_currPageIndex"] = 0
                    } else {
                        this.layout["_currPageIndex"] = this.layout.itemTotal === 0 ? 0 : this.layout.itemTotal - 1
                    }
                }
            }
            if (this.layout.indicator) {
                this.layout.indicator._changedState()
            }
        } else {
            this.pageController.autoScrollToPage(this._touchBeganPosition, this._touchEndPosition)
        }
    }
    savePageIndex(idx: number) {
        return this.pageController.savePageIndex(idx)
    }
    protected scrollToPage(idx: number, timeInSecond = 0.3) {
        this.pageController.scrollToPage(idx, timeInSecond)
    }
    // 快速滑动
    protected isQuicklyScrollable(touchMoveVelocity: Vec3) {
        return this.pageController.isQuicklyScrollable(touchMoveVelocity)
    }
    protected getDragDirection(moveOffset: Vec2) {
        return this.pageController.getDragDirection(moveOffset)
    }
    // 是否超过自动滚动临界值
    protected isScrollable(offset: Vec2, index: number, nextIndex: number) {
        return this.pageController.isScrollable(offset, index, nextIndex)
    }
    private soonFinish() {
        this.isCallSoonFinish = true
        this.layout["soonFinish"]()
    }
    /**
     * 重写此方法 实际上没有任何改动 只是修改了OUT_OF_BOUNDARY_BREAKING_FACTOR 从0.05 改成0.015
     * 吐槽一下 变量 OUT_OF_BOUNDARY_BREAKING_FACTOR 定义方式
     */
    protected _processAutoScrolling(dt: number) {
        const isAutoScrollBrake = this._isNecessaryAutoScrollBrake();

        const brakingFactor = isAutoScrollBrake ? OUT_OF_BOUNDARY_BREAKING_FACTOR : 1;
        this._autoScrollAccumulatedTime += dt * (1 / brakingFactor);
        let percentage = Math.min(1, this._autoScrollAccumulatedTime / this._autoScrollTotalTime);
        if (this._autoScrollAttenuate) {
            percentage = quintEaseOut(percentage);
        }
        const clonedAutoScrollTargetDelta = this._autoScrollTargetDelta.clone();
        clonedAutoScrollTargetDelta.multiplyScalar(percentage);
        const clonedAutoScrollStartPosition = this._autoScrollStartPosition.clone();
        clonedAutoScrollStartPosition.add(clonedAutoScrollTargetDelta);
        let reachedEnd = Math.abs(percentage - 1) <= EPSILON;

        const fireEvent = Math.abs(percentage - 1) <= this.getScrollEndedEventTiming();
        if (fireEvent && !this._isScrollEndedWithThresholdEventFired) {
            this._dispatchEvent(ScrollView.EventType.SCROLL_ENG_WITH_THRESHOLD);
            this._isScrollEndedWithThresholdEventFired = true;
        }

        if (this.elastic) {
            const brakeOffsetPosition = clonedAutoScrollStartPosition.clone();
            brakeOffsetPosition.subtract(this._autoScrollBrakingStartPosition);
            if (isAutoScrollBrake) {
                brakeOffsetPosition.multiplyScalar(brakingFactor);
            }
            clonedAutoScrollStartPosition.set(this._autoScrollBrakingStartPosition);
            clonedAutoScrollStartPosition.add(brakeOffsetPosition);
        } else {
            const moveDelta = clonedAutoScrollStartPosition.clone();
            moveDelta.subtract(this.getContentPosition());
            const outOfBoundary = this._getHowMuchOutOfBoundary(moveDelta);
            if (!outOfBoundary.equals(Vec3.ZERO, EPSILON)) {
                clonedAutoScrollStartPosition.add(outOfBoundary);
                reachedEnd = true;
            }
        }

        if (reachedEnd) {
            this._autoScrolling = false;
        }

        if (this.layout.autoCenter && !this.isCallSoonFinish && !this.isCustomScroll) {
            if (this._autoScrollTotalTime < 2 || percentage >= 0.8) {
                this.soonFinish()
            }
        }
        const deltaMove = clonedAutoScrollStartPosition.clone();
        deltaMove.subtract(this.getContentPosition());
        this._clampDelta(deltaMove);
        this._moveContent(deltaMove, reachedEnd);
        this._dispatchEvent(ScrollView.EventType.SCROLLING);

        if (!this._autoScrolling) {
            this._isBouncing = false;
            this._scrolling = false;
            this._dispatchEvent(ScrollView.EventType.SCROLL_ENDED);
        }
    }
}
