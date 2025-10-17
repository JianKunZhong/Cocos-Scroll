import { _decorator, Component, Node, UITransform, Vec3, EventHandler, instantiate, Prefab, Size, Vec2 } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

enum Type { HORIZONTAL = 0, VERTICAL = 1 }
enum VerticalAxisDirection { TOP_TO_BOTTOM = 0, BOTTOM_TO_TOP = 1 }
enum HorizontalAxisDirection { LEFT_TO_RIGHT = 0, RIGHT_TO_LEFT = 1 }
enum ScrollDirection { NONE = 0, HEADER = 1, FOOTER = 2 }

@ccclass('VirtualLayout')
@requireComponent(UITransform)
export class VirtualLayout extends Component {
  @property(UITransform) view!: UITransform
  @property(Prefab) prefab!: Prefab
  @property({ type: Type }) layoutType: Type = Type.VERTICAL
  @property({ type: VerticalAxisDirection }) verticalAxisDirection = VerticalAxisDirection.TOP_TO_BOTTOM
  @property({ type: HorizontalAxisDirection }) horizontalAxisDirection = HorizontalAxisDirection.LEFT_TO_RIGHT

  @property({ tooltip: '每组项目数（>=1，>1 为网格）' }) groupItemTotal: number = 1
  @property({ tooltip: '窗口覆盖倍数（决定创建Prefab上限）' }) multiple: number = 2

  @property({ tooltip: '顶部填充' }) paddingTop: number = 0
  @property({ tooltip: '底部填充' }) paddingBottom: number = 0
  @property({ tooltip: '左侧填充' }) paddingLeft: number = 0
  @property({ tooltip: '右侧填充' }) paddingRight: number = 0
  @property({ tooltip: '横轴间距' }) spacingX: number = 0
  @property({ tooltip: '纵轴间距' }) spacingY: number = 0
  @property({ tooltip: '是否计算缩放后的尺寸' }) affectedByScale: boolean = false

  @property({ tooltip: '上/左 无限循环' }) headerLoop: boolean = false
  @property({ tooltip: '下/右 无限循环' }) footerLoop: boolean = false
  @property(EventHandler) refreshItemEvents: EventHandler[] = []

  private _itemTotal = 0
  get itemTotal() { return this._itemTotal }

  private transform!: UITransform
  private prevPos: Vec3 = new Vec3(0, 0, 0)
  private scrollDirection: ScrollDirection = ScrollDirection.NONE

  get vertical() { return this.layoutType === Type.VERTICAL }
  get horizontal() { return this.layoutType === Type.HORIZONTAL }
  get accommodWidth() { return this.view.width - this.paddingLeft - this.paddingRight }
  get accommodHeight() { return this.view.height - this.paddingTop - this.paddingBottom }

  get header(): UITransform | null { return this.node.children[0]?._uiProps.uiTransformComp ?? null }
  get footer(): UITransform | null { const c = this.node.children; return c[c.length - 1]?._uiProps.uiTransformComp ?? null }
  get headerIndex(): number { const n: any = this.header?.node; return n ? n['__index'] ?? -1 : -1 }
  get footerIndex(): number { const n: any = this.footer?.node; return n ? n['__index'] ?? -1 : -1 }

  get viewStartPoint(): Vec3 {
    const pos = new Vec3()
    if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
      pos.x = this.view.width * -0.5 + this.paddingLeft
    } else {
      pos.x = this.view.width * 0.5 - this.paddingRight
    }
    if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
      pos.y = this.view.height * 0.5 - this.paddingTop
    } else {
      pos.y = this.view.height * -0.5 + this.paddingBottom
    }
    return pos
  }

  get viewHeaderBoundary(): number { return this.vertical ? this.view.height * 0.5 : this.view.width * -0.5 }
  get viewFooterBoundary(): number { return this.vertical ? this.view.height * -0.5 : this.view.width * 0.5 }

  get headerBoundary(): number {
    if (!this.header) return 0
    if (this.vertical) {
      if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
        return this.node.position.y + this.getItemYMax(this.header) + this.paddingTop
      } else {
        return this.node.position.y + this.getItemYMin(this.header) - this.paddingBottom
      }
    } else {
      if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
        return this.node.position.x + this.getItemXMin(this.header) - this.paddingLeft
      } else {
        return this.node.position.x + this.getItemXMax(this.header) + this.paddingRight
      }
    }
  }
  get footerBoundary(): number {
    if (!this.footer) return 0
    if (this.vertical) {
      if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
        return this.node.position.y + this.getItemYMin(this.footer) - this.paddingBottom
      } else {
        return this.node.position.y + this.getItemYMax(this.footer) + this.paddingTop
      }
    } else {
      if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
        return this.node.position.x + this.getItemXMax(this.footer) + this.paddingRight
      } else {
        return this.node.position.x + this.getItemXMin(this.footer) - this.paddingLeft
      }
    }
  }

  get fixedItemHeight(): number {
    if (!this.header || !this.footer) return 0
    if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
      return Math.abs(this.getItemYMax(this.header)) + Math.abs(this.getItemYMin(this.footer))
    } else {
      return Math.abs(this.getItemYMin(this.header)) + Math.abs(this.getItemYMax(this.footer))
    }
  }
  get fixedItemWidth(): number {
    if (!this.header || !this.footer) return 0
    if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
      return Math.abs(this.getItemXMin(this.header)) + Math.abs(this.getItemXMax(this.footer))
    } else {
      return Math.abs(this.getItemXMax(this.header)) + Math.abs(this.getItemXMin(this.footer))
    }
  }

  get contentSize(): Size {
    const size = new Size(this.view.contentSize.width, this.view.contentSize.height)
    if (this.node.children.length === 0) return size
    if (this.vertical) {
      if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
        size.height = this.headerBoundary + -this.footerBoundary
      } else {
        size.height = this.footerBoundary + -this.headerBoundary
      }
    } else {
      if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
        size.width = this.footerBoundary + -this.headerBoundary
      } else {
        size.width = this.headerBoundary + -this.footerBoundary
      }
    }
    size.width = Math.max(size.width, this.view.contentSize.width)
    size.height = Math.max(size.height, this.view.contentSize.height)
    return size
  }

  onLoad() {
    this.transform = this.node._uiProps.uiTransformComp!
    this.transform.setAnchorPoint(new Vec2(0.5, 0.5))
    this.transform.setContentSize(this.view.contentSize)
    this.node.setPosition(Vec3.ZERO)
  }

  total(count: number): this {
    this._itemTotal = Math.max(0, count)
    this.createItems()
    this.updateContainerSize()
    return this
  }

  private updateContainerSize() {
    this.transform.setContentSize(this.contentSize)
  }

  private needAddPrefab(): boolean {
    if (this.node.children.length === 0) return this._itemTotal > 0
    if (this.vertical) {
      return this.contentSize.height < this.view.height * this.multiple && this.node.children.length < this._itemTotal
    } else {
      return this.contentSize.width < this.view.width * this.multiple && this.node.children.length < this._itemTotal
    }
  }

  private createItems() {
    let created = this.node.children.length
    while (this.needAddPrefab()) {
      const itemNode = instantiate(this.prefab)
      const item = itemNode._uiProps.uiTransformComp!
      ;(itemNode as any)['__index'] = created
      const size = this.getItemSize(item)
      item.setContentSize(size)

      if (created === 0) {
        itemNode.setPosition(this.viewStartPoint)
      } else {
        const relative = this.node.children[this.node.children.length - 1]!._uiProps.uiTransformComp!
        this.setItemPosition(item, relative)
      }
      this.node.addChild(itemNode)
      this.notifyRefreshItem(itemNode)
      created++
      this.updateContainerSize()
    }
  }

  private getItemSize(item: UITransform): Size {
    const s = new Size()
    if (this.vertical) {
      const spacing = this.spacingX * (this.groupItemTotal - 1)
      s.width = (this.accommodWidth - spacing) / this.groupItemTotal
      s.height = item.height
    } else {
      const spacing = this.spacingY * (this.groupItemTotal - 1)
      s.height = (this.accommodHeight - spacing) / this.groupItemTotal
      s.width = item.width
    }
    return s
  }

  public onPositionChanged(prev: Vec2, curr: Vec2) {
    const movedToFooter = this.vertical ? curr.y < prev.y : curr.x > prev.x
    const movedToHeader = this.vertical ? curr.y > prev.y : curr.x < prev.x
    this.scrollDirection = movedToFooter ? ScrollDirection.FOOTER : (movedToHeader ? ScrollDirection.HEADER : ScrollDirection.NONE)

    if (this.scrollDirection === ScrollDirection.FOOTER) {
      this.pushToFooter()
    } else if (this.scrollDirection === ScrollDirection.HEADER) {
      this.pushToHeader()
    }
    this.updateContainerSize()
  }

  private pushToFooter(force: boolean = false) {
    if (!this.header || !this.footer) return
    let need = false
    if (this.vertical) {
      if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
        need = this.headerBoundary - this.paddingTop > this.viewHeaderBoundary + this.header.height
      } else {
        need = this.footerBoundary - this.paddingTop > this.viewHeaderBoundary + this.header.height
      }
    } else {
      if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
        need = this.headerBoundary + this.paddingLeft < this.viewHeaderBoundary - this.header.width
      } else {
        need = this.footerBoundary + this.paddingLeft < this.viewHeaderBoundary - this.header.width
      }
    }
    if (force || need) this.pushToFooterHandler()
  }

  private pushToHeader(force: boolean = false) {
    if (!this.header || !this.footer) return
    let need = false
    if (this.vertical) {
      if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
        need = this.footerBoundary + this.paddingBottom < this.viewFooterBoundary - this.footer.height
      } else {
        need = this.headerBoundary + this.paddingBottom < this.viewFooterBoundary - this.footer.height
      }
    } else {
      if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
        need = this.footerBoundary - this.paddingRight > this.viewFooterBoundary + this.footer.width
      } else {
        need = this.headerBoundary - this.paddingRight > this.viewFooterBoundary + this.footer.width
      }
    }
    if (force || need) this.pushToHeaderHandler()
  }

  private pushToFooterHandler() {
    const header = this.header!
    const footer = this.footer!
    const node: any = header.node
    const loop = this.vertical
      ? (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM ? this.footerLoop : this.headerLoop)
      : (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT ? this.footerLoop : this.headerLoop)
    if (loop) {
      node['__index'] = (this.footerIndex >= this.itemTotal - 1) ? 0 : (this.footerIndex + 1)
    } else {
      if (!footer || this.footerIndex >= this.itemTotal - 1) return
      node['__index'] = this.footerIndex + 1
    }
    this.setItemPosition(header, footer)
    header.node.setSiblingIndex(this.node.children.length)
    this.notifyRefreshItem(node)
  }

  private pushToHeaderHandler() {
    const header = this.header!
    const footer = this.footer!
    const node: any = footer.node
    const loop = this.vertical
      ? (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM ? this.headerLoop : this.footerLoop)
      : (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT ? this.headerLoop : this.footerLoop)
    if (loop) {
      node['__index'] = (this.headerIndex === 0) ? (this.itemTotal - 1) : (this.headerIndex - 1)
    } else {
      if (!header || this.headerIndex <= 0) return
      node['__index'] = this.headerIndex - 1
    }
    this.setItemPosition(footer, header, true)
    footer.node.setSiblingIndex(0)
    this.notifyRefreshItem(node)
  }

  private notifyRefreshItem(target: Node | any) {
    const node = (target instanceof Node) ? target : (target as Node)
    const idx: number = (node as any)['__index'] ?? -1
    for (const eh of this.refreshItemEvents) {
      eh.emit([node, idx])
    }
  }

  private getScaleWidth(item: UITransform) { return this.affectedByScale ? item.width * item.node.scale.x : item.width }
  private getScaleHeight(item: UITransform) { return this.affectedByScale ? item.height * item.node.scale.y : item.height }

  private getItemXMin(item: UITransform) { return item.node.position.x - this.getScaleWidth(item) * item.anchorX }
  private getItemXMax(item: UITransform) { return item.node.position.x + this.getScaleWidth(item) * (1 - item.anchorX) }
  private getItemYMin(item: UITransform) { return item.node.position.y - this.getScaleHeight(item) * item.anchorY }
  private getItemYMax(item: UITransform) { return item.node.position.y + this.getScaleHeight(item) * (1 - item.anchorY) }

  private getStartX(item: UITransform): number {
    if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
      const w = this.getScaleWidth(item) * item.anchorX
      return this.viewStartPoint.x + w
    } else {
      const w = this.getScaleWidth(item) * (1 - item.anchorX)
      return this.viewStartPoint.x - w
    }
  }
  private getEndX(item: UITransform): number {
    if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
      const w = this.getScaleWidth(item) * (1 - item.anchorX)
      return -this.viewStartPoint.x - w - this.paddingRight + this.paddingLeft
    } else {
      const w = this.getScaleWidth(item) * item.anchorX
      return -this.viewStartPoint.x + w + this.paddingLeft - this.paddingRight
    }
  }
  private getStartY(item: UITransform): number {
    if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
      const h = this.getScaleHeight(item) * (1 - item.anchorY)
      return this.viewStartPoint.y - h
    } else {
      const h = this.getScaleHeight(item) * item.anchorY
      return this.viewStartPoint.y + h
    }
  }
  private getEndY(item: UITransform): number {
    if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
      const h = this.getScaleHeight(item) * item.anchorY
      return -this.viewStartPoint.y + h + this.paddingBottom - this.paddingTop
    } else {
      const h = this.getScaleHeight(item) * (1 - item.anchorY)
      return -this.viewStartPoint.y - h - this.paddingTop + this.paddingBottom
    }
  }

  private getRelativeByLeft(item: UITransform, relative: UITransform) {
    const x = this.getItemXMin(relative) - this.getScaleWidth(item) * (1 - item.anchorX) - this.spacingX
    return x
  }
  private getRelativeByRight(item: UITransform, relative: UITransform) {
    const x = this.getItemXMax(relative) + this.getScaleWidth(item) * item.anchorX + this.spacingX
    return x
  }
  private getRelativeByTop(item: UITransform, relative: UITransform) {
    const y = this.getItemYMax(relative) + this.getScaleHeight(item) * item.anchorY + this.spacingY
    return y
  }
  private getRelativeByBottom(item: UITransform, relative: UITransform) {
    const y = this.getItemYMin(relative) - this.getScaleHeight(item) * (1 - item.anchorY) - this.spacingY
    return y
  }

  private getVerticalRelativePosition(item: UITransform, relative: UITransform, reverse: boolean) {
    const pos = new Vec3()
    if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
      pos.x = reverse ? this.getRelativeByLeft(item, relative) : this.getStartX(item)
    } else {
      pos.x = reverse ? this.getRelativeByRight(item, relative) : this.getStartX(item)
    }
    if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
      pos.y = reverse ? this.getRelativeByTop(item, relative) : this.getRelativeByBottom(item, relative)
    } else {
      pos.y = reverse ? this.getRelativeByBottom(item, relative) : this.getRelativeByTop(item, relative)
    }
    return pos
  }
  private getHorizontalRelativePosition(item: UITransform, relative: UITransform, reverse: boolean) {
    const pos = new Vec3()
    if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
      pos.y = reverse ? this.getRelativeByTop(item, relative) : this.getStartY(item)
    } else {
      pos.y = reverse ? this.getRelativeByBottom(item, relative) : this.getStartY(item)
    }
    if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
      pos.x = reverse ? this.getRelativeByLeft(item, relative) : this.getRelativeByRight(item, relative)
    } else {
      pos.x = reverse ? this.getRelativeByRight(item, relative) : this.getRelativeByLeft(item, relative)
    }
    return pos
  }

  private setItemPosition(item: UITransform, relative: UITransform, reverse: boolean = false) {
    const pos = this.vertical
      ? this.getVerticalRelativePosition(item, relative, reverse)
      : this.getHorizontalRelativePosition(item, relative, reverse)
    item.node.setPosition(pos)
  }
}