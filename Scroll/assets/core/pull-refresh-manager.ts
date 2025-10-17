/*
 * 下拉/上拉刷新逻辑管理器，封装进度、锁定与边界调整及事件派发。
 */
import { EventHandler, Vec2, Vec3 } from 'cc';
import { SuperScrollview } from './super-scrollview';

const EPSILON = 1e-4;

export class PullRefreshManager {
  private isMoveHeader = false;
  private isMoveFooter = false;
  private isLockHeader = false;
  private isLockFooter = false;
  private headerProgress = 0;
  private footerProgress = 0;

  constructor(private owner: SuperScrollview) {}

  onTouchMoved(offset: number) {
    if (!this.owner.pullRefresh) return;
    if (offset > 0 && !this.isLockHeader && !this.isLockFooter) {
      this.headerProgress = offset < EPSILON ? 0 : offset / this.owner.headerOutOffset;
      this.isMoveHeader = this.headerProgress >= this.owner.headerMultiple;
      EventHandler.emitEvents(this.owner.headerEvents, this.owner, { action: false, progress: this.headerProgress, stage: this.isMoveHeader ? 'wait' : 'touch' });
      EventHandler.emitEvents(this.owner.footerEvents, this.owner, { action: false, progress: 0, stage: 'release' });
    } else if (offset < 0 && !this.isLockHeader && !this.isLockFooter) {
      this.footerProgress = -offset < EPSILON ? 0 : -offset / this.owner.footerOutOffset;
      this.isMoveFooter = this.footerProgress >= this.owner.footerMultiple;
      EventHandler.emitEvents(this.owner.footerEvents, this.owner, { action: false, progress: this.footerProgress, stage: this.isMoveFooter ? 'wait' : 'touch' });
      EventHandler.emitEvents(this.owner.headerEvents, this.owner, { action: false, progress: 0, stage: 'release' });
    } else if (offset === 0 && !this.isLockHeader && !this.isLockFooter) {
      this.clearProgress();
    }
  }

  updateScrollBar(outOfBoundary: Vec2, autoScrollBraking: boolean, autoScrolling: boolean, vertical: boolean) {
    if (autoScrollBraking) return;
    if (!autoScrolling) return;
    if (!this.owner.pullRefresh) return;
    const offset = vertical ? outOfBoundary.y : -outOfBoundary.x;
    if (offset > 0) {
      const progress = offset < EPSILON ? 0 : offset / this.owner.headerOutOffset;
      if (this.isLockHeader) {
        this.headerProgress = this.headerProgress == 1 ? this.headerProgress : Math.max(progress, 1);
        EventHandler.emitEvents(this.owner.headerEvents, this.owner, { action: false, progress: this.headerProgress, stage: 'lock' });
      } else {
        this.headerProgress = progress < this.headerProgress ? progress : this.headerProgress;
        EventHandler.emitEvents(this.owner.headerEvents, this.owner, { action: false, progress: this.headerProgress, stage: 'release' });
      }
    } else if (offset < 0) {
      const progress = -offset < EPSILON ? 0 : -offset / this.owner.footerOutOffset;
      if (this.isLockFooter) {
        this.footerProgress = this.footerProgress == 1 ? this.footerProgress : Math.max(progress, 1);
        EventHandler.emitEvents(this.owner.footerEvents, this.owner, { action: false, progress: this.footerProgress, stage: 'lock' });
      } else {
        this.footerProgress = progress < this.footerProgress ? progress : this.footerProgress;
        EventHandler.emitEvents(this.owner.footerEvents, this.owner, { action: false, progress: this.footerProgress, stage: 'release' });
      }
    } else if (offset == 0) {
      if (!this.isLockHeader && !this.isLockFooter) this.clearProgress();
    }
  }

  adjustForStartAutoScroll(deltaMove: Vec3) {
    if (!this.owner.pullRefresh) return;
    if (this.isMoveHeader && !this.isLockHeader) {
      if (this.owner.vertical) {
        (this.owner as any)._topBoundary -= this.owner.headerOutOffset;
        deltaMove.y -= this.owner.headerOutOffset;
      }
      if (this.owner.horizontal) {
        (this.owner as any)._leftBoundary += this.owner.headerOutOffset;
        deltaMove.x += this.owner.headerOutOffset;
      }
      this.isLockHeader = true;
      EventHandler.emitEvents(this.owner.headerEvents, this.owner, { action: true, progress: this.headerProgress, stage: 'lock' });
    } else if (this.isMoveFooter && !this.isLockFooter) {
      if (this.owner.vertical) {
        (this.owner as any)._bottomBoundary += this.owner.footerOutOffset;
        deltaMove.y += this.owner.footerOutOffset;
      }
      if (this.owner.horizontal) {
        (this.owner as any)._rightBoundary -= this.owner.footerOutOffset;
        deltaMove.x -= this.owner.footerOutOffset;
      }
      this.isLockFooter = true;
      EventHandler.emitEvents(this.owner.footerEvents, this.owner, { action: true, progress: this.footerProgress, stage: 'lock' });
    }
  }

  release() {
    this.isMoveHeader = false;
    this.isMoveFooter = false;
    if (this.isLockHeader || this.isLockFooter) {
      if (this.owner.vertical && this.isLockHeader) (this.owner as any)._topBoundary += this.owner.headerOutOffset;
      if (this.owner.vertical && this.isLockFooter) (this.owner as any)._bottomBoundary -= this.owner.footerOutOffset;
      if (this.owner.horizontal && this.isLockHeader) (this.owner as any)._leftBoundary -= this.owner.headerOutOffset;
      if (this.owner.horizontal && this.isLockFooter) (this.owner as any)._rightBoundary += this.owner.footerOutOffset;
      this.clearProgress();
      (this.owner.layout as any)["onPositionChanged"]();
      this.isLockHeader = false;
      this.isLockFooter = false;
      this.owner.startAutoScroll();
    }
  }

  clearProgress() {
    EventHandler.emitEvents(this.owner.headerEvents, this.owner, { action: false, progress: 0, stage: 'release' });
    EventHandler.emitEvents(this.owner.footerEvents, this.owner, { action: false, progress: 0, stage: 'release' });
  }
}