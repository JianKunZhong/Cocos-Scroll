
import { _decorator, Component, Node, Sprite, Label, Size, Overflow, Widget } from 'cc';
import { SuperLayout } from '../core/super-layout';
const { ccclass, property } = _decorator;

@ccclass('ChatItem')
export class ChatItem extends Component {
    @property(Node) me: Node = null!
    @property(Node) other: Node = null!
    get transform() { return this.node._uiProps.uiTransformComp! }
    start() {

    }
    show(data: any, index: number, layout: SuperLayout) {
        var obj: Node = data.me ? this.me : this.other
        this.me.active = data.me
        this.other.active = !data.me
        var background: Sprite = obj.getChildByName("background")?.getComponent(Sprite)!
        var label: Label = background.node.getChildByName("label")?.getComponent(Label)!
        label.string = data.msg
        label.updateRenderData(true)
        var labelTrans = label.node._uiProps.uiTransformComp!
        var backgroundTrans = background.node._uiProps.uiTransformComp!
        if (labelTrans.width > this.transform.width - 150) {
            labelTrans.width = this.transform.width - 150
            label.overflow = Overflow.RESIZE_HEIGHT
        } else {
            label.overflow = Overflow.NONE
        }
        label.updateRenderData(true)

        backgroundTrans.width = labelTrans.width + 20
        backgroundTrans.height = labelTrans.height + 10
        this.transform.height = backgroundTrans.height
        layout.updateItemSize(this.node, this.transform.contentSize)
        obj.getComponent(Widget)?.updateAlignment()
    }
}

