import { _decorator, Component, Input, instantiate, Layout, Node, Prefab, ScrollView, SystemEventType, UITransform, Vec2 } from 'cc';
import { ReactiveData } from '../utils/reactiveArray';
import { PrefabPool } from './PrefabPool';
const { ccclass, property } = _decorator;

@ccclass('VirtualScrollView')
export class VirtualScrollView extends ScrollView {
    /**渲染预制体必需挂载 ItemRenderer子类 */
    @property({ type: Prefab, serializable: true, displayName: "渲染预制体" })
    itemPrefab: Prefab = null;

    dataList: any[] = [];
    private _dataSource: ReactiveData<any[]>;

    /**节点高度 */
    itemHeight;

    /**节点锚点 */
    private anchorPoint: Vec2;

    private _uiTransform: UITransform;
    /**布局*/
    private contentLayout: Layout;
    /**垂直可见节点数量 */
    private verticalCount: number = 0;


    itemList: Node[] = [];
    prefabPool: PrefabPool = null;
    onLoad() {
        // 使用抽离出的响应式实现创建代理
        this._dataSource = new ReactiveData<any[]>([]);
        // 监听数据变化，自动刷新视图
        this._dataSource.onChange((newValue) => {
            this.onDataListChange(newValue);
        });
        this.contentLayout = this.content.getComponent(Layout);
        this._uiTransform = this.node.getComponent(UITransform);
        // 订阅并在内部处理变更
        // this.onDataListChange(this._onDataListChanged.bind(this));
        this.content.on(Node.EventType.TRANSFORM_CHANGED, this.onPositionChanged, this)
        this.resetSize();
        this.prefabPool = new PrefabPool({
            prefab: this.itemPrefab,
            parent: this.content,
            initialSize: this.verticalCount,
            maxSize: this.verticalCount * 2,
        });
    }

    // 对外返回响应式对象
  // 获取响应式数据对象
    public getReactiveData(): ReactiveData<any[]> {
        return this._dataSource;
    }

    // 订阅数据变更，返回取消订阅函数
    onDataListChange(data: any[]) {
        console.log(data,'数据变动')
        if (!this.itemList.length) {
            this.firstInitItems()
        }
    }

    // private _onDataListChanged(change: ArrayChange) {
    //     console.log('dataList changed:', change);
    //     //如果这个数组为空，说明没有进行生成过节点
    //     if (this.itemList.length) {
    //         // this.firstInitItems()
    //     }
    // }

    onPositionChanged() {
        console.log("位置改变了1")
    }
    getStart() {
        let start: number = 0;
        /**节点高度 */
        let value: number = 0;
        start = Math.floor(Math.abs(this.content.position.y) / this.itemHeight);
        return start;
    }
    resetSize() {
        let nodeUITransform: UITransform = this.itemPrefab.data._uiProps.uiTransformComp;
        this.anchorPoint = nodeUITransform.anchorPoint.clone();
        this.itemHeight = nodeUITransform.height;
        let vCount = (this._uiTransform.height + this.contentLayout.spacingY - this.contentLayout.paddingTop) / this.itemHeight;
        this.verticalCount = Math.ceil(vCount) + 2;
    }
    
    // 初始化节点
    private firstInitItems() {
        // 创建足够的节点
        const count = Math.min(this.verticalCount, this._dataSource.value.length);
        for (let i = 0; i < count; i++) {
            let item:Node = this.prefabPool.acquire();
            this.itemList.push(item);
        }
    }
    refreshVertical() {
        let start = this.getStart();
        let end = start + this.verticalCount;
        if (end > this._dataSource.value.length) {
            end = this._dataSource.value.length;
            start = Math.max(end - this.verticalCount, 0);
        }
    }
}

