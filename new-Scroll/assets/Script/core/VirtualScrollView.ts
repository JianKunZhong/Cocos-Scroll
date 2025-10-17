import { _decorator, Component, Input, Layout, Node, Prefab, ScrollView, SystemEventType, UITransform, Vec2 } from 'cc';
import { createReactiveArray, ArrayChange } from '../utils/reactiveArray';
const { ccclass, property } = _decorator;

@ccclass('VirtualScrollView')
export class VirtualScrollView extends ScrollView {
    /**渲染预制体必需挂载 ItemRenderer子类 */
    @property({ type: Prefab, serializable: true, displayName: "渲染预制体" })
    itemPrefab: Prefab = null;

    dataList: any[] = [];
    private _reactiveDataList: any[] = null;
    private _dataWatchers = new Set<(c: ArrayChange) => void>();

    /**节点高度 */
    itemH: number = 100;

    /**节点锚点 */
    private anchorPoint: Vec2;

    private _uiTransform: UITransform;
    /**布局*/
    private contentLayout: Layout;
    /**垂直可见节点数量 */
    private verticalCount: number = 0;

    onLoad() {
        // 使用抽离出的响应式实现创建代理
        this._reactiveDataList = createReactiveArray(this.dataList, (change) => {
            this._dataWatchers.forEach(fn => fn(change));
        });
        this.contentLayout = this.content.getComponent(Layout);
        // 订阅并在内部处理变更
        this.onDataListChange(this._onDataListChanged.bind(this));
        this.content.on(Node.EventType.TRANSFORM_CHANGED, this.onPositionChanged, this)
        this._uiTransform = this.node.getComponent(UITransform);
    }

    // 对外返回响应式对象
    getDataList() {
        return this._reactiveDataList;
    }

    // 订阅数据变更，返回取消订阅函数
    onDataListChange(cb: (change: ArrayChange) => void): () => void {
        this._dataWatchers.add(cb);
        return () => this._dataWatchers.delete(cb);
    }

    private _onDataListChanged(change: ArrayChange) {
        console.log('dataList changed:', change);
    }

    onPositionChanged() {
        console.log("位置改变了1")
    }
    getStart() {
        let start: number = 0;
        /**节点高度 */
        let value: number = 0;
        start = Math.floor(Math.abs(this.content.position.y) / this.itemH);
        return start;
    }
    resetSize() {
        let nodeUITransform: UITransform = this.itemPrefab.data._uiProps.uiTransformComp;
        this.anchorPoint = nodeUITransform.anchorPoint.clone();
        let nodeWidth = nodeUITransform.width;
        let nodeHeight = nodeUITransform.height;
        let vCount = (this._uiTransform.height + this.contentLayout.spacingY - this.contentLayout.paddingTop) / this.itemH;
        this.verticalCount = Math.ceil(vCount) + 2;

    }
    refreshVertical(){
        let start = this.getStart();
        let end = start + this.verticalCount;
        if (end > this._reactiveDataList.length) {
            end = this._reactiveDataList.length;
            start = Math.max(end - this.verticalCount, 0);
        }
    }
}

